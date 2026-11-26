import { useCallback, useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCipherLab } from '../modules/algebra/useCipherLab'
import { ANALYSIS_PATH, WORKSPACE_PATH } from '../layouts/navigation'
import { SessionContext, type Session } from './sessionContext'
import { useAnalysisSession } from './useAnalysisSession'

/**
 * One shared session for the whole app. The workspace and the analysis lab are separate
 * pages but one investigation, so their state lives here and survives navigation. Nothing
 * is persisted: closing the tab ends the session.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const lab = useCipherLab()
  const analysis = useAnalysisSession()
  const navigate = useNavigate()

  const { setText, setTab, run, clear: clearAnalysis } = analysis
  const { load, reset } = lab

  const sendToAnalysis = useCallback(
    (text: string) => {
      setText(text)
      setTab('frequency')
      navigate(ANALYSIS_PATH)
      void run('frequency', text)
    },
    [setText, setTab, run, navigate],
  )

  const sendCandidateToWorkspace = useCallback<Session['sendCandidateToWorkspace']>(
    (selection, plaintext) => {
      if (selection.cipher === 'caesar') {
        load({ cipher: 'caesar', operation: 'encrypt', text: plaintext, key: String(selection.candidate.key) })
      } else if (selection.cipher === 'vigenere') {
        load({
          cipher: 'vigenere',
          operation: 'encrypt',
          text: plaintext,
          keyword: selection.candidate.shortest_equivalent_key,
        })
      } else {
        load({
          cipher: 'affine',
          operation: 'encrypt',
          text: plaintext,
          a: String(selection.candidate.a),
          b: String(selection.candidate.b),
        })
      }
      navigate(WORKSPACE_PATH)
    },
    [load, navigate],
  )

  const clearSession = useCallback(() => {
    reset()
    clearAnalysis()
  }, [reset, clearAnalysis])

  const value = useMemo<Session>(
    () => ({ lab, analysis, sendToAnalysis, sendCandidateToWorkspace, clearSession }),
    [lab, analysis, sendToAnalysis, sendCandidateToWorkspace, clearSession],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
