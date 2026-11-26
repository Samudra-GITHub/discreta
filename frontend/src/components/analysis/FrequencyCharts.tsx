import { useState } from 'react'
import { fmtPercent, fmtSigned } from '../../modules/analysis/interpret'
import type { LetterRow } from '../../types/analysis'

export type Metric = 'percent' | 'count'

const W = 780
const LEFT = 44
const RIGHT = 8

/** Round `value` up to a tidy axis maximum (1, 2, 2.5, 5 times a power of ten). */
function niceMax(value: number): number {
  if (value <= 0) return 1
  const power = 10 ** Math.floor(Math.log10(value))
  const fraction = value / power
  const step = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10
  return step * power
}

const tick = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1))

interface ChartProps {
  rows: LetterRow[]
}

/**
 * Ciphertext letter frequencies as bars, with the English expectation drawn as an accent
 * marker on each letter. Bars and markers differ in shape, so the comparison does not rely
 * on colour. The same numbers are in the ranked table below the chart.
 */
export function FrequencyChart({ rows, metric }: ChartProps & { metric: Metric }) {
  const [active, setActive] = useState<number | null>(null)
  const H = 250
  const TOP = 14
  const BOTTOM = 30
  const plotH = H - TOP - BOTTOM
  const plotW = W - LEFT - RIGHT
  const slot = plotW / 26

  const observed = (row: LetterRow) => (metric === 'percent' ? row.percent : row.count)
  const expected = (row: LetterRow) => (metric === 'percent' ? row.english_percent : row.expected_count)
  const max = niceMax(Math.max(...rows.map((row) => Math.max(observed(row), expected(row)))))
  const y = (value: number) => TOP + plotH - (value / max) * plotH
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max)

  const top = [...rows].sort((a, b) => a.rank - b.rank)[0]
  const focus = active !== null ? rows[active] : undefined
  const shown = focus ?? top
  const unit = metric === 'percent' ? '%' : ''

  const summary = `Bar chart of letter ${metric === 'percent' ? 'percentages' : 'counts'} for A to Z with the expected English value marked on each letter. The most frequent letter is ${top?.letter}.`

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={summary}
        className="block h-auto w-full text-fg-muted"
        onMouseLeave={() => setActive(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={LEFT} x2={W - RIGHT} y1={y(t)} y2={y(t)} className="stroke-line" strokeWidth={t === 0 ? 1.2 : 1} />
            <text x={LEFT - 8} y={y(t) + 4} textAnchor="end" className="num fill-current" fontSize="11">
              {tick(t)}
              {unit}
            </text>
          </g>
        ))}
        {rows.map((row, i) => {
          const x = LEFT + i * slot
          const barW = slot * 0.58
          const bx = x + (slot - barW) / 2
          const value = observed(row)
          const isActive = active === i
          return (
            <g key={row.letter} onMouseEnter={() => setActive(i)}>
              <rect x={x} y={TOP} width={slot} height={plotH + BOTTOM} fill="transparent" />
              {value > 0 && (
                <rect
                  x={bx}
                  y={y(value)}
                  width={barW}
                  height={y(0) - y(value)}
                  rx={1.5}
                  className={isActive ? 'fill-fg' : 'fill-slate'}
                />
              )}
              <line
                x1={bx - 3}
                x2={bx + barW + 3}
                y1={y(expected(row))}
                y2={y(expected(row))}
                className="stroke-accent"
                strokeWidth={2.5}
                strokeLinecap="round"
              />
              <text
                x={x + slot / 2}
                y={H - 10}
                textAnchor="middle"
                fontSize="12"
                className={`num ${isActive ? 'fill-fg' : 'fill-current'}`}
                fontWeight={isActive ? 600 : 400}
              >
                {row.letter}
              </text>
            </g>
          )
        })}
      </svg>

      <figcaption className="mt-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs">
        <span className="flex items-center gap-4 text-fg-muted">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-3 w-2.5 rounded-[2px] bg-slate" />
            Ciphertext
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-0.5 w-4 rounded-full bg-accent" />
            Expected in English
          </span>
        </span>
        {shown && (
          <span className="num text-fg" aria-live="polite" data-testid="chart-readout">
            {shown.letter}: {metric === 'percent' ? fmtPercent(shown.percent) : `${shown.count} letters`} · English{' '}
            {metric === 'percent' ? fmtPercent(shown.english_percent) : shown.expected_count.toFixed(1)} (
            {fmtSigned(shown.difference)} pts)
          </span>
        )}
      </figcaption>
    </figure>
  )
}

/**
 * Observed minus expected, in percentage points. Bars above the line are letters that occur
 * more often than in English, bars below it less often; the biggest gap is marked in accent.
 */
export function DifferenceChart({ rows }: ChartProps) {
  const H = 170
  const TOP = 12
  const BOTTOM = 26
  const plotH = H - TOP - BOTTOM
  const plotW = W - LEFT - RIGHT
  const slot = plotW / 26
  const max = niceMax(Math.max(1, ...rows.map((row) => Math.abs(row.difference))))
  const mid = TOP + plotH / 2
  const y = (value: number) => mid - (value / max) * (plotH / 2)
  const widest = rows.reduce((a, b) => (Math.abs(b.difference) > Math.abs(a.difference) ? b : a), rows[0]!)

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Bar chart of the difference between ciphertext and English letter percentages. The largest gap is ${widest.letter}, ${fmtSigned(widest.difference)} percentage points.`}
        className="block h-auto w-full text-fg-muted"
      >
        {[max, 0, -max].map((t) => (
          <g key={t}>
            <line x1={LEFT} x2={W - RIGHT} y1={y(t)} y2={y(t)} className={t === 0 ? 'stroke-line-strong' : 'stroke-line'} strokeWidth={1} />
            <text x={LEFT - 8} y={y(t) + 4} textAnchor="end" className="num fill-current" fontSize="11">
              {t > 0 ? '+' : t < 0 ? '−' : ''}
              {tick(Math.abs(t))}
            </text>
          </g>
        ))}
        {rows.map((row, i) => {
          const x = LEFT + i * slot
          const barW = slot * 0.58
          const h = Math.abs(y(row.difference) - mid)
          const isWidest = row.letter === widest.letter && Math.abs(row.difference) > 0
          return (
            <g key={row.letter}>
              {h > 0 && (
                <rect
                  x={x + (slot - barW) / 2}
                  y={row.difference >= 0 ? y(row.difference) : mid}
                  width={barW}
                  height={h}
                  rx={1.5}
                  className={isWidest ? 'fill-accent' : 'fill-slate'}
                />
              )}
              <text x={x + slot / 2} y={H - 8} textAnchor="middle" fontSize="12" className="num fill-current">
                {row.letter}
              </text>
            </g>
          )
        })}
      </svg>
      <figcaption className="caption mt-1">
        Percentage points above (+) or below (−) English. Largest gap: {widest.letter} ({fmtSigned(widest.difference)}).
      </figcaption>
    </figure>
  )
}
