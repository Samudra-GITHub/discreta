import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { usePageVisible, useReducedMotion } from '../../hooks/useEnvironment'
import { ANALYSIS_PATH, SETTINGS_PATH, WORKSPACE_PATH } from '../../layouts/navigation'
import { useSession } from '../../session/sessionContext'
import { hexLines } from './hex'

export type AtmosphereVariant = 'overview' | 'workspace' | 'analysis' | 'settings'

export function variantFor(pathname: string): AtmosphereVariant {
  if (pathname === WORKSPACE_PATH) return 'workspace'
  if (pathname === ANALYSIS_PATH) return 'analysis'
  if (pathname === SETTINGS_PATH) return 'settings'
  return 'overview'
}

/**
 * Annotations that rotate slowly in the margin. Every one is a true statement about the
 * mathematics or the app: no logs, no alerts, nothing that pretends to be happening.
 */
const LABELS: Record<AtmosphereVariant, readonly string[]> = {
  overview: ['ENCRYPTION', 'ANALYSIS', 'KEYSPACE 312', 'MOD 26'],
  workspace: ['x + k  mod 26', 'gcd(a, 26) = 1', 'a · a⁻¹ ≡ 1', 'ENCRYPTION'],
  analysis: ['FREQUENCY', 'χ² · 25 DOF', 'KEYSPACE 26', 'KEYSPACE 312'],
  settings: [],
}

const BINARY = ['01001101', '10110010', '00101110'] as const

// Texture only: fixed seeds keep the columns identical between renders.
const STREAM_LEFT = hexLines(96, 26)
const STREAM_RIGHT = hexLines(96, 312)

/** One slowly changing margin label. Static when motion is reduced or the tab is hidden. */
function CyclingLabel({ labels, frozen }: { labels: readonly string[]; frozen: boolean }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (frozen || labels.length < 2) return
    const id = setInterval(() => setIndex((i) => (i + 1) % labels.length), 7000)
    return () => clearInterval(id)
  }, [frozen, labels])

  if (labels.length === 0) return null
  return (
    <span key={index} className="atmo-label">
      {labels[index % labels.length]}
    </span>
  )
}

/** A faint row of bars, like a letter-frequency distribution; decorative, carries no data. */
function BarsMotif() {
  const heights = [34, 52, 28, 70, 44, 22, 58, 80, 36, 48, 26, 62]
  return (
    <div className="atmo-bars">
      {heights.map((h, i) => (
        <span key={i} style={{ height: `${h}%`, animationDelay: `${i * -1.3}s` }} />
      ))}
    </div>
  )
}

/** The backend work the app is really doing right now, shown as a quiet margin tag. */
function StatusTag() {
  const { lab, analysis } = useSession()
  const busy =
    lab.run.status === 'loading' ||
    analysis.frequency.status === 'loading' ||
    analysis.caesar.status === 'loading' ||
    analysis.affine.status === 'loading'
  return (
    <span className="atmo-status" data-busy={busy}>
      <i aria-hidden="true" />
      {busy ? 'PROCESSING' : 'STANDBY'}
    </span>
  )
}

/**
 * The background layer: a faint technical grid everywhere, and, only in the empty side
 * margins of wide screens, hexadecimal columns, a few slowly changing annotations and
 * fading binary groups. Nothing here is ever placed behind text, controls or charts.
 *
 * It is decorative: hidden from assistive technology, never takes pointer events or focus,
 * paused while the tab is hidden, and static under `prefers-reduced-motion`.
 */
export function Atmosphere() {
  const { pathname } = useLocation()
  const variant = variantFor(pathname)
  const reduced = useReducedMotion()
  const visible = usePageVisible()
  const quiet = variant === 'settings'
  const labels = LABELS[variant]

  return (
    <div
      aria-hidden="true"
      data-testid="atmosphere"
      data-variant={variant}
      data-paused={!visible || reduced}
      className="atmo"
    >
      <div className="atmo-grid" />

      {!quiet && (
        <>
          <div className="atmo-gutter atmo-gutter-left">
            <div className="atmo-stream">
              <div className="atmo-track">
                <pre>{STREAM_LEFT.join('\n')}</pre>
                <pre>{STREAM_LEFT.join('\n')}</pre>
              </div>
            </div>
            <div className="atmo-slot" style={{ top: '26%' }}>
              <CyclingLabel labels={labels} frozen={!visible || reduced} />
            </div>
            {variant === 'analysis' && (
              <div className="atmo-slot" style={{ top: '62%' }}>
                <BarsMotif />
              </div>
            )}
            <span className="atmo-binary" style={{ top: '48%', animationDelay: '0s' }}>
              {BINARY[0]}
            </span>
          </div>

          <div className="atmo-gutter atmo-gutter-right">
            <div className="atmo-stream atmo-stream-reverse">
              <div className="atmo-track">
                <pre>{STREAM_RIGHT.join('\n')}</pre>
                <pre>{STREAM_RIGHT.join('\n')}</pre>
              </div>
            </div>
            <span className="atmo-binary" style={{ top: '22%', animationDelay: '-4s' }}>
              {BINARY[1]}
            </span>
            <span className="atmo-binary" style={{ top: '58%', animationDelay: '-8s' }}>
              {BINARY[2]}
            </span>
            <div className="atmo-slot" style={{ top: '84%' }}>
              <StatusTag />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
