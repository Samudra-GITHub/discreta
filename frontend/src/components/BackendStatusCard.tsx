import { RefreshCw } from 'lucide-react'
import { useBackendHealthContext } from '../hooks/backendHealthContext'
import { API_BASE_URL } from '../services/config'
import { HEALTH_PATH } from '../services/health'
import { STATUS_DOT, STATUS_LABEL } from './BackendStatusBadge'

/** Dashboard panel showing the live result of the backend health check. */
export function BackendStatusCard() {
  const { status, health, error, checkedAt, isChecking, recheck } = useBackendHealthContext()

  return (
    <section
      aria-labelledby="backend-status-title"
      className="rounded-xl border border-line bg-surface p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="backend-status-title" className="text-sm font-medium text-fg">
            Backend connection
          </h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-fg-muted" role="status">
            <span aria-hidden="true" className={`size-2 rounded-full ${STATUS_DOT[status]}`} />
            {STATUS_LABEL[status]}
          </p>
        </div>
        <button
          type="button"
          onClick={recheck}
          disabled={isChecking}
          className="inline-flex items-center gap-1.5 rounded-md border border-line-strong px-2.5 py-1.5 text-xs text-fg-muted transition-colors duration-150 hover:border-fg-subtle hover:text-fg disabled:opacity-50"
        >
          <RefreshCw aria-hidden="true" className={`size-3.5 ${isChecking ? 'animate-spin' : ''}`} />
          Check again
        </button>
      </div>

      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
        <dt className="text-fg-subtle">Endpoint</dt>
        <dd className="font-mono break-all text-fg-muted">
          {API_BASE_URL}
          {HEALTH_PATH}
        </dd>
        {status === 'online' && health && (
          <>
            <dt className="text-fg-subtle">Service</dt>
            <dd className="text-fg-muted">
              {health.service} v{health.version}
            </dd>
            <dt className="text-fg-subtle">Message</dt>
            <dd className="text-fg-muted">{health.message}</dd>
          </>
        )}
        {checkedAt && (
          <>
            <dt className="text-fg-subtle">Last checked</dt>
            <dd className="text-fg-muted">{checkedAt.toLocaleTimeString()}</dd>
          </>
        )}
      </dl>

      {status === 'offline' && (
        <div className="mt-4 rounded-lg border border-line bg-canvas p-3 text-xs text-fg-muted">
          <p>{error}</p>
          <p className="mt-2">
            Start the backend from the <code className="font-mono text-fg">backend</code> folder:
          </p>
          <pre className="mt-1.5 overflow-x-auto font-mono text-fg">
            uvicorn app.main:app --reload --port 8000
          </pre>
        </div>
      )}
    </section>
  )
}
