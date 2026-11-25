import { ChartLine } from 'lucide-react'
import { MODULUS } from '../../modules/algebra/cipherMath'
import { Tile } from '../Tile'

const W = 260
const H = 150
const PAD = { left: 24, right: 10, top: 10, bottom: 22 }

const px = (x: number) => PAD.left + (x / (MODULUS - 1)) * (W - PAD.left - PAD.right)
const py = (y: number) => H - PAD.bottom - (y / (MODULUS - 1)) * (H - PAD.top - PAD.bottom)

/**
 * Plots every letter number x (across) against the letter number the operation gives (up).
 * A Caesar shift is one line that wraps around; a valid affine key scatters the 26 points so
 * that each row and column holds exactly one.
 */
export function MappingChart({ map, connect, flat = false }: { map: number[] | null; connect: boolean; flat?: boolean }) {
  // Break the line wherever the shift wraps past Z.
  const segments: string[][] = []
  if (map && connect) {
    let current: string[] = []
    map.forEach((y, x) => {
      const prev = map[x - 1]
      if (prev !== undefined && Math.abs(y - prev) > MODULUS / 2) {
        segments.push(current)
        current = []
      }
      current.push(`${px(x)},${py(y)}`)
    })
    segments.push(current)
  }

  return (
    <Tile title="Letter map" icon={ChartLine} rise={4} flat={flat}>
      {map ? (
        <>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label="Plot of the 26 letter numbers against the result of the operation"
            className="h-auto w-full"
          >
            <defs>
              <linearGradient id="map-line" x1="0" x2="1">
                <stop offset="0" stopColor="var(--color-iris-blue)" />
                <stop offset="1" stopColor="var(--color-iris-pink)" />
              </linearGradient>
            </defs>
            {[0, 13, 25].map((tick) => (
              <g key={tick}>
                <line x1={px(tick)} x2={px(tick)} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--color-line)" strokeWidth="1" />
                <line x1={PAD.left} x2={W - PAD.right} y1={py(tick)} y2={py(tick)} stroke="var(--color-line)" strokeWidth="1" />
                <text x={px(tick)} y={H - 7} textAnchor="middle" className="fill-fg-subtle text-[9px] font-bold">
                  {tick}
                </text>
                <text x={PAD.left - 6} y={py(tick) + 3} textAnchor="end" className="fill-fg-subtle text-[9px] font-bold">
                  {tick}
                </text>
              </g>
            ))}
            {segments.map((points, i) => (
              <polyline
                key={i}
                points={points.join(' ')}
                fill="none"
                stroke="url(#map-line)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.7"
              />
            ))}
            {map.map((y, x) => (
              <circle key={x} cx={px(x)} cy={py(y)} r="3" fill="var(--color-iris-violet)" stroke="#ffffff" strokeWidth="1" />
            ))}
          </svg>
          <p className="mt-1 text-xs font-medium text-fg-muted">
            Letter number across, result up. {connect ? 'The line wraps at 26.' : 'Each row and column has exactly one dot.'}
          </p>
        </>
      ) : (
        <p className="py-6 text-center text-sm font-medium text-fg-muted">
          No map: this key does not give a one-to-one substitution.
        </p>
      )}
    </Tile>
  )
}
