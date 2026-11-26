import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { runAffine, runCaesar } from '../../services/cipher'
import type { CipherId, CipherOperation, CipherResponse } from '../../types/cipher'
import {
  checkMultiplier,
  describeKeyProblem,
  MAX_KEY,
  MAX_TEXT_LENGTH,
  parseKey,
  textLength,
  type KeyParse,
  type MultiplierCheck,
} from './cipherMath'
import { describeLabError, type LabError, type LabField } from './labErrors'

/** What the user has entered. Keys stay as text until they are parsed. */
export interface LabInputs {
  cipher: CipherId
  operation: CipherOperation
  text: string
  key: string
  a: string
  b: string
}

export type LabRun =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; result: CipherResponse; ranWith: LabInputs }
  | { status: 'error'; error: LabError; ranWith: LabInputs }

const INITIAL: LabInputs = { cipher: 'caesar', operation: 'encrypt', text: '', key: '3', a: '5', b: '8' }

export interface CipherLab {
  inputs: LabInputs
  run: LabRun
  /** Local, instant checks of the current input (no network). */
  validation: {
    textLength: number
    textTooLong: boolean
    key: KeyParse
    a: KeyParse
    b: KeyParse
    multiplier: MultiplierCheck | null
    /** Message to show next to each field, if any. Backend messages are merged in after a run. */
    messages: Partial<Record<LabField, string>>
  }
  canRun: boolean
  /** True when a result exists but the inputs have changed since it was produced. */
  stale: boolean
  setCipher: (cipher: CipherId) => void
  setOperation: (operation: CipherOperation) => void
  setText: (text: string) => void
  setField: (field: 'key' | 'a' | 'b', value: string) => void
  /** Nudge a key by `delta` (for the ± buttons), staying inside the API's range. */
  nudge: (field: 'key' | 'a' | 'b', delta: number) => void
  clear: () => void
  /** Move the latest result into the input box and flip encrypt/decrypt. */
  reuseResult: () => void
  /** Replace several inputs at once (for example a candidate sent from the Analysis Lab). */
  load: (patch: Partial<LabInputs>) => void
  /** Back to the initial inputs, discarding any result. */
  reset: () => void
  /** Call the backend. Only ever invoked by an explicit user action. */
  execute: () => Promise<void>
}

const sameInputs = (x: LabInputs, y: LabInputs) =>
  x.cipher === y.cipher &&
  x.operation === y.operation &&
  x.text === y.text &&
  (x.cipher === 'caesar' ? x.key === y.key : x.a === y.a && x.b === y.b)

export function useCipherLab(initial: Partial<LabInputs> = {}): CipherLab {
  const [inputs, setInputs] = useState<LabInputs>({ ...INITIAL, ...initial })
  const [run, setRun] = useState<LabRun>({ status: 'idle' })
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => () => controllerRef.current?.abort(), [])

  const validation = useMemo(() => {
    const length = textLength(inputs.text)
    const key = parseKey(inputs.key)
    const a = parseKey(inputs.a)
    const b = parseKey(inputs.b)
    const multiplier = a.ok ? checkMultiplier(a.big) : null

    const messages: Partial<Record<LabField, string>> = {}
    if (length > MAX_TEXT_LENGTH) {
      messages.text = `The message is ${length.toLocaleString('en-US')} characters; the limit is ${MAX_TEXT_LENGTH.toLocaleString('en-US')}.`
    }
    if (inputs.cipher === 'caesar') {
      if (!key.ok) messages.key = describeKeyProblem(key.problem, 'The shift k')
    } else {
      if (!a.ok) messages.a = describeKeyProblem(a.problem, 'The multiplier a')
      else if (multiplier && !multiplier.valid) {
        messages.a = `a = ${inputs.a.trim()} is not allowed: gcd(${inputs.a.trim()}, 26) = ${multiplier.gcd}, not 1.`
      }
      if (!b.ok) messages.b = describeKeyProblem(b.problem, 'The offset b')
    }

    return { textLength: length, textTooLong: length > MAX_TEXT_LENGTH, key, a, b, multiplier, messages }
  }, [inputs])

  const canRun =
    run.status !== 'loading' &&
    inputs.text.length > 0 &&
    !validation.textTooLong &&
    (inputs.cipher === 'caesar'
      ? validation.key.ok
      : validation.a.ok && validation.b.ok && validation.multiplier?.valid === true)

  const stale = run.status === 'success' && !sameInputs(run.ranWith, inputs)

  const resetRun = useCallback(() => {
    controllerRef.current?.abort()
    setRun({ status: 'idle' })
  }, [])

  const setCipher = useCallback(
    (cipher: CipherId) => {
      setInputs((current) => (current.cipher === cipher ? current : { ...current, cipher }))
      resetRun()
    },
    [resetRun],
  )

  const setOperation = useCallback(
    (operation: CipherOperation) => {
      setInputs((current) => (current.operation === operation ? current : { ...current, operation }))
      resetRun()
    },
    [resetRun],
  )

  // Editing anything dismisses an error from the previous attempt, including its field messages.
  const dismissError = useCallback(() => setRun((r) => (r.status === 'error' ? { status: 'idle' } : r)), [])

  const setText = useCallback(
    (text: string) => {
      setInputs((current) => ({ ...current, text }))
      dismissError()
    },
    [dismissError],
  )
  const setField = useCallback(
    (field: 'key' | 'a' | 'b', value: string) => {
      setInputs((current) => ({ ...current, [field]: value }))
      dismissError()
    },
    [dismissError],
  )

  const nudge = useCallback(
    (field: 'key' | 'a' | 'b', delta: number) => {
      dismissError()
      setInputs((current) => {
        const parsed = parseKey(current[field])
        const base = parsed.ok ? parsed.big : 0n
        let next = base + BigInt(delta)
        const limit = BigInt(MAX_KEY)
        if (next > limit) next = limit
        if (next < -limit) next = -limit
        return { ...current, [field]: next.toString() }
      })
    },
    [dismissError],
  )

  const clear = useCallback(() => {
    setInputs((current) => ({ ...current, text: '' }))
    resetRun()
  }, [resetRun])

  const reuseResult = useCallback(() => {
    if (run.status !== 'success') return
    setInputs((current) => ({
      ...current,
      text: run.result.output,
      operation: run.result.operation === 'encrypt' ? 'decrypt' : 'encrypt',
    }))
    resetRun()
  }, [run, resetRun])

  const load = useCallback(
    (patch: Partial<LabInputs>) => {
      setInputs((current) => ({ ...current, ...patch }))
      resetRun()
    },
    [resetRun],
  )

  const reset = useCallback(() => {
    setInputs({ ...INITIAL, ...initial })
    resetRun()
    // `initial` is only the starting value; resetting always returns to it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetRun])

  const execute = useCallback(async () => {
    if (!canRun) return
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    const ranWith = inputs
    setRun({ status: 'loading' })

    try {
      let result: CipherResponse
      if (ranWith.cipher === 'caesar') {
        if (!validation.key.ok) return
        result = await runCaesar(
          ranWith.operation,
          { text: ranWith.text, key: validation.key.value },
          { signal: controller.signal },
        )
      } else {
        if (!validation.a.ok || !validation.b.ok) return
        result = await runAffine(
          ranWith.operation,
          { text: ranWith.text, a: validation.a.value, b: validation.b.value },
          { signal: controller.signal },
        )
      }
      if (controller.signal.aborted) return
      setRun({ status: 'success', result, ranWith })
    } catch (error) {
      if (controller.signal.aborted) return
      setRun({ status: 'error', error: describeLabError(error), ranWith })
    }
  }, [canRun, inputs, validation])

  // Backend field problems are shown next to the field, until the input changes.
  const merged = useMemo(() => {
    if (run.status !== 'error') return validation
    return { ...validation, messages: { ...run.error.fieldErrors, ...validation.messages } }
  }, [run, validation])

  return {
    inputs,
    run,
    validation: merged,
    canRun,
    stale,
    setCipher,
    setOperation,
    setText,
    setField,
    nudge,
    clear,
    reuseResult,
    load,
    reset,
    execute,
  }
}
