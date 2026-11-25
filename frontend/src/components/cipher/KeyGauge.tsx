import { Gauge } from 'lucide-react'
import { mod26 } from '../../modules/algebra/cipherMath'
import type { CipherLab } from '../../modules/algebra/useCipherLab'
import { Tile } from '../Tile'

const RADIUS = 36
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/** A progress ring like the reference's donut widget. */
function Ring({ fraction, tone, value, caption }: { fraction: number; tone: 'ok' | 'err' | 'accent'; value: string; caption: string }) {
  const color = tone === 'ok' ? 'var(--color-ok)' : tone === 'err' ? 'var(--color-err)' : 'var(--color-iris-violet)'
  return (
    <div className="relative size-24 shrink-0" aria-hidden="true">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="var(--color-line)" strokeWidth="9" />
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${CIRCUMFERENCE * fraction} ${CIRCUMFERENCE}`}
          style={{ transition: 'stroke-dasharray 600ms cubic-bezier(0.22, 1, 0.36, 1), stroke 300ms' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl leading-none font-bold text-fg [font-family:var(--font-display)]">{value}</span>
        <span className="mt-0.5 text-[10px] font-bold tracking-wide text-fg-subtle uppercase">{caption}</span>
      </div>
    </div>
  )
}

/** Key status at a glance: the reduced shift for Caesar, the gcd test for affine. */
export function KeyGauge({ lab, flat = false }: { lab: CipherLab; flat?: boolean }) {
  const { inputs, validation, run, stale } = lab
  const result = run.status === 'success' && !stale ? run.result : null

  if (inputs.cipher === 'caesar') {
    const k = validation.key.ok ? mod26(validation.key.big) : null
    return (
      <Tile title="Key status" icon={Gauge} rise={3} flat={flat}>
        <div className="flex items-center gap-4">
          <Ring fraction={k === null ? 0 : k / 26} tone="accent" value={k === null ? '–' : String(k)} caption="of 26" />
          <div className="text-sm leading-relaxed font-medium text-fg-muted">
            <p className="font-bold text-fg">Shift k mod 26</p>
            <p>Adding 26 changes nothing, so there are only 26 different Caesar keys.</p>
          </div>
        </div>
      </Tile>
    )
  }

  const check = validation.multiplier
  const tone = check === null ? 'accent' : check.valid ? 'ok' : 'err'
  return (
    <Tile title="Key status" icon={Gauge} rise={3} flat={flat}>
      <div className="flex items-center gap-4">
        <Ring
          fraction={check === null ? 0 : check.valid ? 1 : check.gcd / 26}
          tone={tone}
          value={check === null ? '–' : String(check.gcd)}
          caption="gcd"
        />
        <div className="text-sm leading-relaxed font-medium text-fg-muted">
          <p className="font-bold text-fg">gcd(a, 26)</p>
          <p>
            {check === null && 'Enter a multiplier a.'}
            {check?.valid && 'Equal to 1, so a has an inverse and decryption works.'}
            {check && !check.valid && 'Not 1: this multiplier cannot be decrypted.'}
          </p>
          <p className="mt-1 text-xs">12 multipliers × 26 offsets = 312 keys.</p>
          {result?.cipher === 'affine' && (
            <p className="mt-1.5 font-bold text-accent-strong" data-testid="gauge-inverse">
              a⁻¹ = {result.a_inverse} (from the backend)
            </p>
          )}
        </div>
      </div>
    </Tile>
  )
}
