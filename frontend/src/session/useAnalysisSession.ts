import { useCallback, useEffect, useRef, useState } from 'react'
import { describeLabError, type LabError } from '../modules/algebra/labErrors'
import { runAffineSearch, runCaesarCrack, runFrequency } from '../services/analysis'
import type {
  AffineSearchResponse,
  AnalysisKind,
  CaesarCrackResponse,
  FrequencyResponse,
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
  /** Run one analysis on the current text (or on `text`, when given). Always an explicit action. */
  run: (kind: AnalysisKind, text?: string) => Promise<void>
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
  const controllers = useRef<Partial<Record<AnalysisKind, AbortController>>>({})

  useEffect(() => {
    const live = controllers.current
    return () => Object.values(live).forEach((controller) => controller?.abort())
  }, [])

  const run = useCallback(async (kind: AnalysisKind, override?: string) => {
    const input = override ?? textRef.current
    controllers.current[kind]?.abort()
    const controller = new AbortController()
    controllers.current[kind] = controller
    const options = { signal: controller.signal }

    // Each kind has its own state type; this small helper keeps the three branches identical.
    async function go<T>(
      call: () => Promise<T>,
      set: (value: AnalysisRun<T>) => void,
    ): Promise<void> {
      set({ status: 'loading', ranFor: input })
      try {
        const result = await call()
        if (!controller.signal.aborted) set({ status: 'success', result, ranFor: input })
      } catch (error) {
        if (!controller.signal.aborted) set({ status: 'error', error: describeLabError(error), ranFor: input })
      }
    }

    if (kind === 'frequency') await go(() => runFrequency(input, options), setFrequency)
    else if (kind === 'caesar') await go(() => runCaesarCrack(input, options), setCaesar)
    else await go(() => runAffineSearch(input, undefined, options), setAffine)
  }, [])

  // `run` is called right after `setText` (for example when a result is sent here), before
  // React re-renders, so it reads the latest text from a ref instead of a stale closure.
  const textRef = useRef(text)
  const setText = useCallback((next: string) => {
    textRef.current = next
    setTextState(next)
  }, [])

  const isStale = useCallback(
    (kind: AnalysisKind) => {
      const current = kind === 'frequency' ? frequency : kind === 'caesar' ? caesar : affine
      return current.status !== 'idle' && current.ranFor !== text
    },
    [frequency, caesar, affine, text],
  )

  const clear = useCallback(() => {
    Object.values(controllers.current).forEach((controller) => controller?.abort())
    textRef.current = ''
    setTextState('')
    setFrequency(IDLE)
    setCaesar(IDLE)
    setAffine(IDLE)
    setTab('frequency')
  }, [])

  return { text, setText, tab, setTab, frequency, caesar, affine, run, isStale, clear }
}
