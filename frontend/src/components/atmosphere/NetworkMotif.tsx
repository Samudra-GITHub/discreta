const NODES: Record<string, [number, number]> = {
  a: [30, 50], b: [140, 26], c: [250, 88], d: [360, 40], e: [460, 120],
  f: [90, 150], g: [220, 200], h: [350, 180], i: [450, 280],
  j: [60, 280], k: [190, 330], l: [320, 350],
}

// Orthogonal, circuit-like runs: horizontal first, then vertical.
const EDGES: [string, string][] = [
  ['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'e'], ['a', 'f'], ['f', 'g'], ['c', 'g'],
  ['g', 'h'], ['e', 'h'], ['h', 'i'], ['f', 'j'], ['j', 'k'], ['g', 'k'], ['k', 'l'], ['h', 'l'], ['l', 'i'],
]

const path = ([from, to]: [string, string]) => {
  const [x1, y1] = NODES[from]!
  const [x2, y2] = NODES[to]!
  return `M${x1} ${y1} H${x2} V${y2}`
}

/** Pulses travel along these edges, each on its own slow loop. */
const PULSES = [1, 4, 7, 10, 13]

/**
 * A quiet network diagram for the Overview: nodes joined by thin right-angled lines, a few
 * slow pulses and three labels. It is purely a motif, placed beside the headline (never
 * behind text), hidden below the large breakpoint, and static under reduced motion.
 */
export function NetworkMotif() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 500 400"
      data-testid="network-motif"
      className="atmo-network pointer-events-none absolute top-0 right-0 hidden h-auto w-[min(36vw,30rem)] lg:block"
    >
      <g className="atmo-net-lines" fill="none" strokeWidth="1">
        {EDGES.map((edge, i) => (
          <path key={i} d={path(edge)} />
        ))}
      </g>
      <g className="atmo-net-pulses" fill="none" strokeWidth="1.6" strokeLinecap="round">
        {PULSES.map((edgeIndex, i) => (
          <path
            key={edgeIndex}
            d={path(EDGES[edgeIndex]!)}
            pathLength={100}
            style={{ animationDelay: `${i * -2.6}s`, animationDuration: `${9 + (i % 3) * 2}s` }}
          />
        ))}
      </g>
      <g className="atmo-net-nodes">
        {Object.entries(NODES).map(([id, [x, y]]) => (
          <circle key={id} cx={x} cy={y} r={3} />
        ))}
      </g>
      <g className="atmo-net-text" fontSize="9">
        <text x="368" y="32">KEYSPACE</text>
        <text x="358" y="172">MOD 26</text>
        <text x="198" y="348">CIPHERTEXT</text>
      </g>
    </svg>
  )
}
