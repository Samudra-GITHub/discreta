import { createContext, useContext } from 'react'
import type { BackendHealthState } from './useBackendHealth'

export const BackendHealthContext = createContext<BackendHealthState | null>(null)

/** Shared backend health state (one poller for the whole app). */
export function useBackendHealthContext(): BackendHealthState {
  const value = useContext(BackendHealthContext)
  if (!value) {
    throw new Error('useBackendHealthContext must be used inside <BackendHealthProvider>')
  }
  return value
}
