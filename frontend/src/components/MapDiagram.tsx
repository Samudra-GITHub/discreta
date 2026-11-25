import { letterOf, MODULUS, multiplicationTable } from '../modules/algebra/cipherMath'

const W = 232
const H = 308
const LEFT = 44
const RIGHT = W - 44
const y = (i: number) => 14 + (i * (H - 28)) / (MODULUS - 1)

/**
 * Draws x -> a·x mod 26 for all 26 letters as lines from a left column to a right column.
 * When gcd(a, 26) = 1 every result is reached exactly once; otherwise lines converge on the
 * same result and other results are never reached, so the map cannot be undone.
 */
export function MapDiagram({ a }: { a: number }) {
  const { images, hits } = multiplicationTable(a)
  const unreached = hits.filter((count) => count === 0).length
  const shared = hits.filter((count) => count > 1).length
  const summary =
    unreached === 0
      ? `Multiplying by ${a}: each of the 26 results is reached by exactly one letter.`
      : `Multiplying by ${a}: ${shared} results are each reached by two or more letters and ${unreached} results are never reached.`

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary} className="mx-auto h-auto w-full max-w-[16rem] overflow-visible">
        {images.map((target, x) => (
          <line
            key={x}
            x1={LEFT}
            y1={y(x)}
            x2={RIGHT}
            y2={y(target)}
            stroke={(hits[target] ?? 0) > 1 ? 'var(--color-iris-pink)' : 'var(--color-iris-blue)'}
            strokeOpacity={(hits[target] ?? 0) > 1 ? 0.75 : 0.5}
            strokeWidth="1.3"
          />
        ))}
        {Array.from({ length: MODULUS }, (_, i) => (
          <g key={i}>
            <text x={LEFT - 12} y={y(i) + 3} textAnchor="end" fontSize="8" className="fill-fg-subtle font-bold">
              {letterOf(i)}
            </text>
            <circle cx={LEFT} cy={y(i)} r="3" className="fill-iris-violet" />
            <text x={RIGHT + 12} y={y(i) + 3} fontSize="8" className="fill-fg-subtle font-bold">
              {letterOf(i)}
            </text>
            <circle
              cx={RIGHT}
              cy={y(i)}
              r="3"
              strokeWidth="1.3"
              className={(hits[i] ?? 0) === 0 ? 'fill-none stroke-fg-subtle' : (hits[i] ?? 0) > 1 ? 'fill-iris-pink stroke-iris-pink' : 'fill-iris-blue stroke-iris-blue'}
            />
          </g>
        ))}
      </svg>
      <figcaption className="mt-2 text-center text-xs leading-snug font-semibold text-fg-muted">{summary}</figcaption>
    </figure>
  )
}
