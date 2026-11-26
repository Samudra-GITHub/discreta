import { createContext, useContext } from 'react'
import type { CipherLab } from '../modules/algebra/useCipherLab'
import type { AffineCandidate, CaesarCandidate, VigenereKeyCandidate } from '../types/analysis'
import type { AnalysisSession } from './useAnalysisSession'

export interface Session {
  /** The Cipher Workspace: inputs, last result and the single run action. */
  lab: CipherLab
  /** The Analysis Lab: ciphertext, active tab and the three analyses. */
  analysis: AnalysisSession
  /** Send text to the Analysis Lab and open it; the frequency analysis runs straight away. */
  sendToAnalysis: (text: string) => void
  /**
   * Send a candidate back to the Cipher Workspace and open it. The workspace is set up to
   * *encrypt* the candidate plaintext with the candidate key, which reproduces the ciphertext.
   */
  sendCandidateToWorkspace: (
    candidate:
      | { cipher: 'caesar'; candidate: CaesarCandidate }
      | { cipher: 'affine'; candidate: AffineCandidate }
      | { cipher: 'vigenere'; candidate: VigenereKeyCandidate },
    plaintext: string,
  ) => void
  /** Forget everything: workspace inputs and results, the analysis text and its results. */
  clearSession: () => void
}

export const SessionContext = createContext<Session | null>(null)

export function useSession(): Session {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession must be used inside <SessionProvider>')
  return value
}
