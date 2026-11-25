import { useBackendHealthContext } from '../hooks/backendHealthContext'
import type { BackendStatus } from '../types'

export const STATUS_LABEL: Record<BackendStatus, string> = {
  checking: 'Checking backend…',
  online: 'Backend online',
  offline: 'Backend offline',
}

export const STATUS_DOT: Record<BackendStatus, string> = {
  checking: 'bg-warn animate-pulse',
  online: 'bg-ok',
  offline: 'bg-err',
}

/** Compact connection indicator for the header. Reflects a real health check. */
export function BackendStatusBadge() {
  const { status } = useBackendHealthContext()
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-fg-muted"
    >
      <span aria-hidden="true" className={`size-2 rounded-full ${STATUS_DOT[status]}`} />
      <span className="whitespace-nowrap">{STATUS_LABEL[status]}</span>
    </div>
  )
}
