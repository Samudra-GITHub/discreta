import { WifiOff } from 'lucide-react'
import { useBackendHealthContext } from '../../hooks/backendHealthContext'

/**
 * Shown only when the background health check says the backend is unreachable. It is a
 * heads-up, not a lock: the run button still tries, because the health check may be a few
 * seconds out of date.
 */
export function ConnectionNotice() {
  const { status, recheck, isChecking } = useBackendHealthContext()
  if (status !== 'offline') return null

  return (
    <div
      role="status"
      className="aurora-tile flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 text-sm font-medium text-fg"
      data-testid="connection-notice"
    >
      <WifiOff aria-hidden="true" className="size-4 shrink-0 text-err" />
      <p className="min-w-0 flex-1">
        The backend is not reachable, so nothing can be computed yet. Start it from the <code>backend</code> folder with{' '}
        <code>uvicorn app.main:app --port 8000</code>.
      </p>
      <button
        type="button"
        onClick={recheck}
        disabled={isChecking}
        className="aurora-chip h-8 rounded-full px-3 text-xs font-bold text-accent-strong disabled:opacity-50"
      >
        Check again
      </button>
    </div>
  )
}
