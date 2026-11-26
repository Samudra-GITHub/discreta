import { Monitor, Moon, RefreshCw, Sun } from 'lucide-react'
import { useState } from 'react'
import { PageHeader, Section, Segmented } from '../components/ui'
import { useBackendHealthContext } from '../hooks/backendHealthContext'
import { API_BASE_URL, APP_VERSION } from '../services/config'
import { HEALTH_PATH } from '../services/health'
import { useSession } from '../session/sessionContext'
import { useTheme, type ThemeChoice } from '../theme/themeContext'

const THEMES = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
] as const satisfies readonly { value: ThemeChoice; label: string; icon: typeof Sun }[]

const STATUS_TEXT = {
  checking: 'Checking…',
  online: 'Connected',
  offline: 'Not reachable',
} as const

export function SettingsPage() {
  const { choice, resolved, setChoice } = useTheme()
  const { clearSession } = useSession()
  const { status, health, error, isChecking, recheck } = useBackendHealthContext()
  const [cleared, setCleared] = useState(false)

  return (
    <>
      <PageHeader eyebrow="03 · Settings" title="Settings">
        Appearance, the current session and the backend connection.
      </PageHeader>

      <div className="grid max-w-[44rem] gap-8">
        <Section title="Appearance">
          <Segmented legend="Theme" name="theme" value={choice} options={THEMES} onChange={setChoice} />
          <p className="caption mt-2">
            {choice === 'system'
              ? `Following your system preference, currently ${resolved}.`
              : `Always ${choice}. The choice is saved in this browser.`}
          </p>
        </Section>

        <Section title="Session">
          <p className="m-0 text-sm text-fg-muted">
            The workspace and the Analysis Lab share one in-memory session. It is never saved or sent anywhere except to
            the backend when you run something, and it ends when you close the tab.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="btn"
              onClick={() => {
                clearSession()
                setCleared(true)
              }}
            >
              Clear session
            </button>
            {cleared && (
              <p role="status" className="caption m-0">
                Session cleared: all text, keys and results are gone.
              </p>
            )}
          </div>
        </Section>

        <Section
          title="Backend"
          aside={
            <button type="button" className="btn btn-sm" onClick={recheck} disabled={isChecking}>
              <RefreshCw aria-hidden="true" className={`size-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              Check again
            </button>
          }
        >
          <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-1.5 text-sm">
            <dt className="text-fg-muted">Status</dt>
            <dd className="m-0 font-medium" role="status">
              {STATUS_TEXT[status]}
            </dd>
            <dt className="text-fg-muted">Endpoint</dt>
            <dd className="num m-0 text-[0.8125rem] break-all">
              {API_BASE_URL}
              {HEALTH_PATH}
            </dd>
            {status === 'online' && health && (
              <>
                <dt className="text-fg-muted">Service</dt>
                <dd className="m-0">
                  {health.service} v{health.version}
                </dd>
              </>
            )}
          </dl>
          {status === 'offline' && (
            <p className="mt-3 mb-0 text-sm text-fg-muted">
              {error}. Start the backend from the <span className="num">backend</span> folder with{' '}
              <span className="num">uvicorn app.main:app --port 8000</span>.
            </p>
          )}
        </Section>

        <Section title="About DISCRETA">
          <p className="m-0 text-sm text-fg-muted">
            DISCRETA is a laboratory for classical encryption, decryption, frequency analysis and cryptanalysis, built by
            team BugSquad. The mathematics is modular arithmetic: the Euclidean algorithm, modular inverses and the
            chi-squared statistic. The ciphers are teaching tools and are not secure encryption.
          </p>
          <p className="num mt-3 mb-0 text-xs text-fg-muted">Version {APP_VERSION}</p>
        </Section>
      </div>
    </>
  )
}
