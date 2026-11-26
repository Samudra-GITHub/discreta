import type { IcResult, LengthRow } from '../../types/analysis'

const fmtIc = (value: number) => value.toFixed(4)

const W = 640
const LEFT = 16
const RIGHT = 16
const SCALE_MAX = 0.08

/**
 * The index of coincidence of the text on a scale from 0 to 0.08, between the value for random
 * letters and the value for English. Position, ticks and labels all carry the information, so it
 * never depends on colour.
 */
export function IcGauge({ ic }: { ic: IcResult }) {
  const x = (value: number) => LEFT + (value / SCALE_MAX) * (W - LEFT - RIGHT)
  const axis = 44
  const summary =
    ic.ic === null
      ? `Scale of the index of coincidence: random letters ${fmtIc(ic.random_ic)}, English ${fmtIc(ic.english_ic)}. This text has too few letters to measure.`
      : `Scale of the index of coincidence: random letters ${fmtIc(ic.random_ic)}, English ${fmtIc(ic.english_ic)}, this text ${fmtIc(ic.ic)}.`

  return (
    <svg viewBox={`0 0 ${W} 84`} role="img" aria-label={summary} className="block h-auto w-full max-w-[40rem] text-fg-muted">
      <line x1={x(0)} x2={x(SCALE_MAX)} y1={axis} y2={axis} className="stroke-line-strong" strokeWidth={1.5} />
      {[0, 0.02, 0.04, 0.06, 0.08].map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={axis - 3} y2={axis + 3} className="stroke-line-strong" />
          <text x={x(t)} y={axis + 16} textAnchor="middle" fontSize="10" className="num fill-current">
            {t.toFixed(2)}
          </text>
        </g>
      ))}
      <g>
        <line x1={x(ic.random_ic)} x2={x(ic.random_ic)} y1={axis - 16} y2={axis} className="stroke-slate" strokeWidth={2} />
        <text x={x(ic.random_ic)} y={axis - 22} textAnchor="middle" fontSize="11" className="num fill-current">
          random {fmtIc(ic.random_ic)}
        </text>
      </g>
      <g>
        <line x1={x(ic.english_ic)} x2={x(ic.english_ic)} y1={axis - 16} y2={axis} className="stroke-accent" strokeWidth={2.5} />
        <text x={x(ic.english_ic)} y={axis - 22} textAnchor="middle" fontSize="11" className="num fill-current">
          English {fmtIc(ic.english_ic)}
        </text>
      </g>
      {ic.ic !== null && (
        <g>
          <circle cx={x(Math.min(ic.ic, SCALE_MAX))} cy={axis} r={5.5} className="fill-fg" />
          <text x={x(Math.min(ic.ic, SCALE_MAX))} y={axis + 34} textAnchor="middle" fontSize="12" className="num fill-fg" fontWeight={600}>
            this text {fmtIc(ic.ic)}
          </text>
        </g>
      )}
    </svg>
  )
}

const H = 190
const TOP = 12
const BOTTOM = 28
const LEFT_PAD = 44
const RIGHT_PAD = 64

/**
 * Mean index of coincidence of the columns for each candidate key length. A bar near the English
 * line means each column looks like English, which is what the true key length produces. The
 * suggested length is in accent; plausible lengths are darker than the rest.
 */
export function LengthChart({ rows, suggested }: { rows: LengthRow[]; suggested: number | null }) {
  const byLength = [...rows].sort((a, b) => a.length - b.length)
  const plotH = H - TOP - BOTTOM
  const plotW = W - LEFT_PAD - RIGHT_PAD
  const slot = plotW / byLength.length
  const y = (value: number) => TOP + plotH - (value / SCALE_MAX) * plotH
  const english = 0.0655
  const random = 1 / 26

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Bar chart of the mean index of coincidence for key lengths 1 to ${byLength.length}, with the English value ${fmtIc(english)} and the random value ${fmtIc(random)} marked.${suggested ? ` The suggested length is ${suggested}.` : ' No length is suggested.'}`}
      className="block h-auto w-full text-fg-muted"
    >
      {[0, 0.02, 0.04, 0.06, 0.08].map((t) => (
        <g key={t}>
          <line x1={LEFT_PAD} x2={W - RIGHT_PAD} y1={y(t)} y2={y(t)} className="stroke-line" />
          <text x={LEFT_PAD - 8} y={y(t) + 4} textAnchor="end" fontSize="10" className="num fill-current">
            {t.toFixed(2)}
          </text>
        </g>
      ))}
      {byLength.map((row, i) => {
        const x = LEFT_PAD + i * slot
        const barW = slot * 0.6
        const value = row.mean_ic ?? 0
        const cls = row.length === suggested ? 'fill-accent' : row.plausible ? 'fill-fg' : 'fill-slate'
        return (
          <g key={row.length}>
            {value > 0 && <rect x={x + (slot - barW) / 2} y={y(value)} width={barW} height={y(0) - y(value)} rx={1.5} className={cls} />}
            <text x={x + slot / 2} y={H - 10} textAnchor="middle" fontSize="11" className="num fill-current">
              {row.length}
            </text>
          </g>
        )
      })}
      <line x1={LEFT_PAD} x2={W - RIGHT_PAD} y1={y(english)} y2={y(english)} className="stroke-accent" strokeWidth={1.5} strokeDasharray="5 4" />
      <line x1={LEFT_PAD} x2={W - RIGHT_PAD} y1={y(random)} y2={y(random)} className="stroke-line-strong" strokeWidth={1.5} strokeDasharray="2 4" />
      <text x={W - RIGHT_PAD + 6} y={y(english) + 3} fontSize="10" className="num fill-current">
        English
      </text>
      <text x={W - RIGHT_PAD + 6} y={y(random) + 3} fontSize="10" className="num fill-current">
        random
      </text>
    </svg>
  )
}
