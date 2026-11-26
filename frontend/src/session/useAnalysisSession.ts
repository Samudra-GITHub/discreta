import { useCallback, useEffect, useRef, useState } from 'react'
import { describeLabError, type LabError } from '../modules/algebra/labErrors'
import {
  runAffineSearch,
  runCaesarCrack,
  runFrequency,
  runVigenereCandidates,
  runVigenereLengths,
} from '../services/analysis'
import type {
  AffineSearchResponse,
  AnalysisKind,
  CaesarCrackResponse,
  FrequencyResponse,
  VigenereCandidatesResponse,
  VigenereLengthsResponse,
} from '../types/analysis'

/** One analysis request. `ranFor` is the text it was run on, so staleness can be detected. */
export type AnalysisRun<T> =
  | { status: 'idle' }
  | { status: 'loading'; ranFor: string }
  | { status: 'success'; result: T; ranFor: string }
  | { status: 'error'; error: LabError; ranFor: string }

const IDLE = { status: 'idle' } as const

export interface AnalysisSession {
  /** The ciphertext under investigation, shared by every tab. */
  text: string
  setText: (text: string) => void
  tab: AnalysisKind
  setTab: (tab: AnalysisKind) => void
  frequency: AnalysisRun<FrequencyResponse>
  caesar: AnalysisRun<CaesarCrackResponse>
  affine: AnalysisRun<AffineSearchResponse>
  /** Vigenère step 1: index of coincidence, Kasiski examination and ranked key lengths. */
  vigenereLengths: AnalysisRun<VigenereLengthsResponse>
  /** Vigenère step 2: key-letter estimates and candidate keys for the chosen length. */
  vigenereCandidates: AnalysisRun<VigenereCandidatesResponse>
  /** The key length being investigated, or null before one is chosen. */
  vigenereLength: number | null
  /**
   * Run one analysis on the current text (or on `text`, when given). Always an explicit action.
   * For `vigenere` this runs the key-length investigation and, if it suggests a length, analyses it.
   */
  run: (kind: AnalysisKind, text?: string) => Promise<void>
  /** Investigate one key length of the Vigenère cipher. */
  investigateLength: (length: number, text?: string) => Promise<void>
  /** True when the run for `kind` was made on text that has since changed. */
  isStale: (kind: AnalysisKind) => boolean
  /** Forget the text and every result. */
  clear: () => void
}

/** Analysis state that lives for the whole visit, so it survives moving between pages. */
export function useAnalysisSession(): AnalysisSession {
  const [text, setTextState] = useState('')
  const [tab, setTab] = useState<AnalysisKind>('frequency')
  const [frequency, setFrequency] = useState<AnalysisRun<FrequencyResponse>>(IDLE)
  const [caesar, setCaesar] = useState<AnalysisRun<CaesarCrackResponse>>(IDLE)
  const [affine, setAffine] = useState<AnalysisRun<AffineSearchResponse>>(IDLE)
  const [vigenereLengths, setVigenereLengths] = useState<AnalysisRun<VigenereLengthsResponse>>(IDLE)
  const [vigenereCandidates, setVigenereCandidates] = useState<AnalysisRun<VigenereCandidatesResponse>>(IDLE)
  const [vigenereLength, setVigenereLength] = useState<number | null>(null)
  const controllers = useRef<Partial<Record<string, AbortController>>>({})
  // `run` is often called right after `setText` (for example when a result is sent here),
  // before React re-renders, so it reads the latest text from a ref instead of a stale closure.
  const textRef = useRef(text)

  useEffect(() => {
    const live = controllers.current
    return () => Object.values(live).forEach((controller) => controller?.abort())
  }, [])

  /** Run one request under `slot`, replacing any earlier request in the same slot. */
  const track = useCallback(
    async <T,>(
      slot: string,
      input: string,
      call: (signal: AbortSignal) => Promise<T>,
      set: (value: AnalysisRun<T>) => void,
    ): Promise<T | null> => {
      controllers.current[slot]?.abort()
      const controller = new AbortController()
      controllers.current[slot] = controller
      set({ status: 'loading', ranFor: input })
      try {
        const result = await call(controller.signal)
        if (controller.signal.aborted) return null
        set({ status: 'success', result, ranFor: input })
        return result
      } catch (error) {
        if (!controller.signal.aborted) set({ status: 'error', error: describeLabError(error), ranFor: input })
        return null
      }
    },
    [],
  )

  const investigateLength = useCallback(
    async (length: number, override?: string) => {
      const input = override ?? textRef.current
      setVigenereLength(length)
      await track('vigenere-candidates', input, (signal) => runVigenereCandidates(input, length, { signal }), setVigenereCandidates)
    },
    [track],
  )

  const run = useCallback(
    async (kind: AnalysisKind, override?: string) => {
      const input = override ?? textRef.current
      if (kind === 'frequency') {
        await track('frequency', input, (signal) => runFrequency(input, { signal }), setFrequency)
      } else if (kind === 'caesar') {
        await track('caesar', input, (signal) => runCaesarCrack(input, { signal }), setCaesar)
      } else if (kind === 'affine') {
        await track('affine', input, (signal) => runAffineSearch(input, undefined, { signal }), setAffine)
      } else {
        controllers.current['vigenere-candidates']?.abort()
        setVigenereCandidates(IDLE)
        setVigenereLength(null)
        const lengths = await track('vigenere-lengths', input, (signal) => runVigenereLengths(input, { signal }), setVigenereLengths)
        if (lengths?.suggested_length != null) await investigateLength(lengths.suggested_length, input)
      }
    },
    [track, investigateLength],
  )

  const setText = useCallback((next: string) => {
    textRef.current = next
    setTextState(next)
  }, [])

  const isStale = useCallback(
    (kind: AnalysisKind) => {
      const runs = {
        frequency,
        caesar,
        affine,
        vigenere: vigenereLengths,
      }
      const current = runs[kind]
      return current.status !== 'idle' && current.ranFor !== text
    },
    [frequency, caesar, affine, vigenereLengths, text],
  )

  const clear = useCallback(() => {
    Object.values(controllers.current).forEach((controller) => controller?.abort())
    textRef.current = ''
    setTextState('')
    setFrequency(IDLE)
    setCaesar(IDLE)
    setAffine(IDLE)
    setVigenereLengths(IDLE)
    setVigenereCandidates(IDLE)
    setVigenereLength(null)
    setTab('frequency')
  }, [])

  return {
    text,
    setText,
    tab,
    setTab,
    frequency,
    caesar,
    affine,
    vigenereLengths,
    vigenereCandidates,
    vigenereLength,
    run,
    investigateLength,
    isStale,
    clear,
  }
}
