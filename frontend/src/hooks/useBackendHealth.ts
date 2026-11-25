import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchHealth } from '../services/health'
import type { BackendStatus, HealthResponse } from '../types'

export interface BackendHealthState {
  status: BackendStatus
  /** Last successful health payload, if any. */
  health: HealthResponse | null
  /** Why the last check failed, when offline. */
  error: string | null
  checkedAt: Date | null
  /** True while a request is in flight (including background polls). */
  isChecking: boolean
  /** Run a check now. */
  recheck: () => void
}

/**
 * Checks the backend health endpoint on mount, then every `intervalMs`.
 * The status always reflects a real HTTP response (or its absence).
 */
export function useBackendHealth(intervalMs = 30_000): BackendHealthState {
  const [status, setStatus] = useState<BackendStatus>('checking')
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [checkedAt, setCheckedAt] = useState<Date | null>(null)
  const [isChecking, setIsChecking] = useState(true)
  const controllerRef = useRef<AbortController | null>(null)

  const check = useCallback(async () => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setIsChecking(true)

    try {
      const result = await fetchHealth({ signal: controller.signal })
      if (controller.signal.aborted) return
      setHealth(result)
      setError(null)
      setStatus('online')
    } catch (err) {
      if (controller.signal.aborted) return // superseded or unmounted
      setError(err instanceof Error ? err.message : 'Unknown error')
      setStatus('offline')
    }
    setCheckedAt(new Date())
    setIsChecking(false)
  }, [])

  useEffect(() => {
    void check()
    const id = setInterval(() => void check(), intervalMs)
    return () => {
      clearInterval(id)
      controllerRef.current?.abort()
    }
  }, [check, intervalMs])

  const recheck = useCallback(() => void check(), [check])

  return { status, health, error, checkedAt, isChecking, recheck }
}
