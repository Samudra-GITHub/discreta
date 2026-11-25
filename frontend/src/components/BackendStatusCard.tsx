import { RefreshCw } from 'lucide-react'
import { useBackendHealthContext } from '../hooks/backendHealthContext'
import { API_BASE_URL } from '../services/config'
import { HEALTH_PATH } from '../services/health'
import { STATUS_DOT, STATUS_LABEL } from './BackendStatusBadge'
import { Tile } from './Tile'

/** Dashboard panel showing the live result of the backend health check. */
export function BackendStatusCard({ rise = 0 }: { rise?: number }) {
  const { status, health, error, checkedAt, isChecking, recheck } = useBackendHealthContext()

  return (
    <Tile
      title="Backend connection"
      rise={rise}
      action={
        <button
          type="button"
          onClick={recheck}
          disabled={isChecking}
          className="aurora-chip inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-bold text-fg-muted transition-colors duration-150 hover:text-accent-strong disabled:opacity-50"
        >
          <RefreshCw aria-hidden="true" className={`size-3.5 ${isChecking ? 'animate-spin' : ''}`} />
          Check again
        </button>
      }
    >
      <p className="flex items-center gap-2 text-sm font-bold text-fg" role="status">
        <span aria-hidden="true" className={`size-2.5 rounded-full ${STATUS_DOT[status]}`} />
        {STATUS_LABEL[status]}
      </p>

      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
        <dt className="font-bold text-fg-subtle">Endpoint</dt>
        <dd className="font-mono font-medium break-all text-fg-muted">
          {API_BASE_URL}
          {HEALTH_PATH}
        </dd>
        {status === 'online' && health && (
          <>
            <dt className="font-bold text-fg-subtle">Service</dt>
            <dd className="font-medium text-fg-muted">
              {health.service} v{health.version}
            </dd>
            <dt className="font-bold text-fg-subtle">Message</dt>
            <dd className="font-medium text-fg-muted">{health.message}</dd>
          </>
        )}
        {checkedAt && (
          <>
            <dt className="font-bold text-fg-subtle">Last checked</dt>
            <dd className="font-medium text-fg-muted">{checkedAt.toLocaleTimeString()}</dd>
          </>
        )}
      </dl>

      {status === 'offline' && (
        <div className="aurora-inset mt-3 rounded-2xl p-3 text-xs font-medium text-fg-muted">
          <p>{error}</p>
          <p className="mt-2">
            Start the backend from the <code className="font-mono text-fg">backend</code> folder:
          </p>
          <pre className="mt-1.5 overflow-x-auto font-mono text-fg">uvicorn app.main:app --reload --port 8000</pre>
        </div>
      )}
    </Tile>
  )
}
