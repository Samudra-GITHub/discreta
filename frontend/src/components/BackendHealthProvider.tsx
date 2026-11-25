import type { ReactNode } from 'react'
import { BackendHealthContext } from '../hooks/backendHealthContext'
import { useBackendHealth } from '../hooks/useBackendHealth'

export function BackendHealthProvider({ children }: { children: ReactNode }) {
  const state = useBackendHealth()
  return <BackendHealthContext.Provider value={state}>{children}</BackendHealthContext.Provider>
}
