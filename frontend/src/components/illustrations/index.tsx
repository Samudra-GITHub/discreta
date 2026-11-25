import type { ModuleId } from '../../types'
import { Frame, GlassRect, Sphere } from './primitives'

/** Two-line hairline from (x1, y1) to (x2, y2), used to tie callouts to a focal object. */
const Hairline = ({ d }: { d: string }) => (
  <path d={d} fill="none" stroke="var(--color-fg-subtle)" strokeOpacity="0.45" strokeWidth="1" />
)

/** Dashboard focal object: an iridescent orb on a frosted pedestal, circled by the five modules. */
export function HeroOrb() {
  const chips: { x: number; y: number; w: number; text: string; line: string }[] = [
    { x: 14, y: 40, w: 92, text: 'p ∧ q', line: 'M106 58 H150 L186 110' },
    { x: 372, y: 40, w: 92, text: 'A ∪ B', line: 'M372 58 H330 L294 110' },
    { x: 384, y: 168, w: 92, text: 'C(n, k)', line: 'M384 186 H340' },
    { x: 8, y: 270, w: 112, text: 'G = (V, E)', line: 'M120 288 H170 L196 246' },
    { x: 344, y: 290, w: 96, text: 'ℤ₂₆', line: 'M344 308 H300 L282 250' },
  ]
  return (
    <div className="@container aurora-float">
      <Frame label="Decorative illustration: an iridescent orb circled by the five module symbols" viewBox="0 0 480 380">
        {(p) => (
          <>
            <ellipse cx="240" cy="338" rx="190" ry="26" fill="none" stroke={`url(#${p}-line)`} strokeWidth="1.5" />
            <ellipse cx="240" cy="334" rx="120" ry="18" fill="rgb(70 60 150 / 0.28)" filter={`url(#${p}-soft)`} />
            <ellipse cx="240" cy="318" rx="118" ry="22" fill={`url(#${p}-floor)`} stroke="#ffffff" strokeOpacity="0.8" />
            <circle cx="240" cy="168" r="100" fill={`url(#${p}-iris)`} opacity="0.5" filter={`url(#${p}-glow)`} />
            <circle cx="240" cy="168" r="96" fill={`url(#${p}-iris)`} />
            <path d="M160 150 C190 90 290 90 322 150" fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="14" strokeLinecap="round" />
            <path d="M176 214 C210 250 280 246 308 196" fill="none" stroke="#ffffff" strokeOpacity="0.22" strokeWidth="10" strokeLinecap="round" />
            <ellipse cx="204" cy="112" rx="40" ry="16" fill="#ffffff" opacity="0.5" transform="rotate(-32 204 112)" />
            <circle cx="240" cy="168" r="96" fill="none" stroke="#ffffff" strokeOpacity="0.5" />
            <Sphere prefix={p} cx={96} cy={140} r={13} tone="mint" shadow />
            <Sphere prefix={p} cx={398} cy={118} r={9} tone="pink" />
            <Sphere prefix={p} cx={148} cy={262} r={8} tone="white" />
            <Sphere prefix={p} cx={338} cy={248} r={10} tone="blue" />
            <g className="hidden @sm:block">
              {chips.map((c) => (
                <g key={c.text}>
                  <Hairline d={c.line} />
                  <GlassRect prefix={p} x={c.x} y={c.y} w={c.w} h={36} r={18} />
                  <text x={c.x + c.w / 2} y={c.y + 18} textAnchor="middle" dominantBaseline="central" fontSize="15" className="fill-fg font-serif italic">
                    {c.text}
                  </text>
                </g>
              ))}
            </g>
          </>
        )}
      </Frame>
    </div>
  )
}

/** Logic: an AND gate whose two true inputs give a true output. */
export function LogicIllustration() {
  return (
    <Frame label="Decorative illustration: an AND gate with two true inputs and a true output" viewBox="0 0 420 300">
      {(p) => (
        <>
          <ellipse cx="210" cy="262" rx="150" ry="16" fill="rgb(70 60 150 / 0.2)" filter={`url(#${p}-soft)`} />
          <Hairline d="M80 112 H150" />
          <Hairline d="M80 188 H150" />
          <Hairline d="M272 150 H330" />
          <path d="M150 90 H210 A60 60 0 0 1 210 210 H150 Z" fill="rgb(70 60 150 / 0.22)" transform="translate(0 7)" filter={`url(#${p}-soft)`} />
          <path d="M150 90 H210 A60 60 0 0 1 210 210 H150 Z" fill={`url(#${p}-glass)`} stroke="#ffffff" strokeWidth="1.5" />
          <path d="M150 90 H210 A60 60 0 0 1 210 210 H150 Z" fill="none" stroke={`url(#${p}-iris)`} strokeWidth="3" opacity="0.8" />
          <text x="196" y="150" textAnchor="middle" dominantBaseline="central" fontSize="30" className="fill-accent-strong font-serif italic">∧</text>
          <Sphere prefix={p} cx={62} cy={112} r={20} tone="mint" shadow label="T" />
          <Sphere prefix={p} cx={62} cy={188} r={20} tone="mint" shadow label="T" />
          <Sphere prefix={p} cx={352} cy={150} r={22} tone="mint" shadow label="T" />
          <text x="62" y="62" textAnchor="middle" fontSize="17" className="fill-fg-muted font-serif italic">p</text>
          <text x="62" y="248" textAnchor="middle" fontSize="17" className="fill-fg-muted font-serif italic">q</text>
          <text x="352" y="104" textAnchor="middle" fontSize="17" className="fill-fg-muted font-serif italic">p ∧ q</text>
        </>
      )}
    </Frame>
  )
}

/** Sets: three translucent overlapping circles. */
export function SetsIllustration() {
  const circle = (cx: number, cy: number, tone: string, label: string, lx: number, ly: number) => (
    <g key={label}>
      <circle cx={cx} cy={cy} r={86} fill={tone} fillOpacity="0.5" stroke="#ffffff" strokeOpacity="0.9" strokeWidth="1.5" />
      <text x={lx} y={ly} textAnchor="middle" fontSize="22" className="fill-fg font-serif italic">{label}</text>
    </g>
  )
  return (
    <Frame label="Decorative illustration: three overlapping sets A, B and C" viewBox="0 0 420 320">
      {(p) => (
        <>
          <ellipse cx="210" cy="296" rx="140" ry="14" fill="rgb(70 60 150 / 0.2)" filter={`url(#${p}-soft)`} />
          {circle(158, 128, 'var(--color-iris-blue)', 'A', 112, 96)}
          {circle(262, 128, 'var(--color-iris-pink)', 'B', 308, 96)}
          {circle(210, 208, 'var(--color-iris-mint)', 'C', 210, 262)}
          <circle cx="210" cy="152" r="26" fill="#ffffff" fillOpacity="0.55" />
          <text x="210" y="152" textAnchor="middle" dominantBaseline="central" fontSize="13" className="fill-accent-strong font-bold">A∩B∩C</text>
        </>
      )}
    </Frame>
  )
}

/** Combinatorics: all 3! = 6 orderings of three spheres. */
export function CombinatoricsIllustration() {
  const tones = ['blue', 'pink', 'mint'] as const
  const orders = [
    [0, 1, 2],
    [0, 2, 1],
    [1, 0, 2],
    [1, 2, 0],
    [2, 0, 1],
    [2, 1, 0],
  ]
  return (
    <Frame label="Decorative illustration: the six orderings of three spheres, 3! = 6" viewBox="0 0 420 300">
      {(p) => (
        <>
          {orders.map((order, i) => {
            const col = i % 2
            const row = Math.floor(i / 2)
            const x = 28 + col * 190
            const y = 20 + row * 80
            return (
              <g key={i}>
                <GlassRect prefix={p} x={x} y={y} w={174} h={62} r={18} />
                {order.map((t, j) => (
                  <Sphere key={j} prefix={p} cx={x + 38 + j * 49} cy={y + 31} r={15} tone={tones[t] ?? 'blue'} />
                ))}
              </g>
            )
          })}
          <text x="210" y="285" textAnchor="middle" fontSize="20" className="fill-accent-strong font-serif italic">3! = 6</text>
        </>
      )}
    </Frame>
  )
}

/** Graphs: glossy nodes and edges with one highlighted path. */
export function GraphIllustration() {
  const nodes = [
    { x: 80, y: 140 },
    { x: 170, y: 60 },
    { x: 290, y: 70 },
    { x: 350, y: 160 },
    { x: 260, y: 240 },
    { x: 130, y: 232 },
  ]
  const edges: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [1, 4], [2, 5]]
  const path = [0, 1, 4, 3]
  const pt = (i: number) => nodes[i] ?? { x: 0, y: 0 }
  return (
    <Frame label="Decorative illustration: a graph of six vertices with one highlighted path" viewBox="0 0 430 300">
      {(p) => (
        <>
          {edges.map(([a, b]) => (
            <line key={`${a}-${b}`} x1={pt(a).x} y1={pt(a).y} x2={pt(b).x} y2={pt(b).y} stroke="var(--color-fg-subtle)" strokeOpacity="0.4" strokeWidth="1.5" />
          ))}
          <polyline
            points={path.map((i) => `${pt(i).x},${pt(i).y}`).join(' ')}
            fill="none"
            stroke={`url(#${p}-iris)`}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {nodes.map((n, i) => (
            <Sphere key={i} prefix={p} cx={n.x} cy={n.y} r={path.includes(i) ? 20 : 16} tone={path.includes(i) ? 'violet' : 'white'} shadow label={path.includes(i) ? String(i + 1) : undefined} />
          ))}
        </>
      )}
    </Frame>
  )
}

/** Algebra: a clock of ℤ₂₆ with the move 0 → 3 (adding 3 mod 26). */
export function AlgebraIllustration() {
  const n = 26
  const c = 150
  const R = 110
  const at = (i: number, r = R) => ({
    x: 210 + r * Math.sin((i / n) * 2 * Math.PI),
    y: c + 4 - r * Math.cos((i / n) * 2 * Math.PI),
  })
  const a0 = at(0)
  const a3 = at(3)
  return (
    <Frame label="Decorative illustration: the integers modulo 26 on a clock, with the step from 0 to 3" viewBox="0 0 420 320">
      {(p) => (
        <>
          <ellipse cx="210" cy="296" rx="130" ry="13" fill="rgb(70 60 150 / 0.2)" filter={`url(#${p}-soft)`} />
          <circle cx="210" cy={c + 4} r={R + 24} fill={`url(#${p}-glass)`} stroke="#ffffff" strokeWidth="1.5" />
          <circle cx="210" cy={c + 4} r={R + 24} fill="none" stroke={`url(#${p}-iris)`} strokeWidth="3" opacity="0.7" />
          {Array.from({ length: n }, (_, i) => {
            const pos = at(i)
            return <circle key={i} cx={pos.x} cy={pos.y} r={i === 0 || i === 3 ? 6 : 3.2} className={i === 0 || i === 3 ? 'fill-iris-violet' : 'fill-fg-subtle'} opacity={i === 0 || i === 3 ? 1 : 0.5} />
          })}
          <path d={`M${a0.x} ${a0.y} A${R} ${R} 0 0 1 ${a3.x} ${a3.y}`} fill="none" stroke={`url(#${p}-iris)`} strokeWidth="4" strokeLinecap="round" />
          <circle cx="210" cy={c + 4} r="52" fill={`url(#${p}-floor)`} stroke="#ffffff" strokeWidth="1.5" />
          <text x="210" y={c - 6} textAnchor="middle" fontSize="12" className="fill-fg-subtle font-bold">MOD</text>
          <text x="210" y={c + 22} textAnchor="middle" fontSize="34" className="fill-fg font-bold [font-family:var(--font-display)]">26</text>
          <text x={a0.x - 14} y={a0.y - 12} textAnchor="middle" fontSize="13" className="fill-fg-muted font-bold">0</text>
          <text x={a3.x + 16} y={a3.y - 8} textAnchor="middle" fontSize="13" className="fill-fg-muted font-bold">3</text>
        </>
      )}
    </Frame>
  )
}

/** Frequency analysis: bars for the twelve most common English letters, in rank order. */
export function FrequencyIllustration() {
  // Typical English letter frequencies in percent, ETAOINSHRDLU order.
  const data: [string, number][] = [['E', 12.7], ['T', 9.1], ['A', 8.2], ['O', 7.5], ['I', 7.0], ['N', 6.7], ['S', 6.3], ['H', 6.1], ['R', 6.0], ['D', 4.3], ['L', 4.0], ['U', 2.8]]
  const base = 250
  return (
    <Frame label="Decorative illustration: bars for the twelve most common English letters" viewBox="0 0 420 300">
      {(p) => (
        <>
          <GlassRect prefix={p} x={14} y={20} w={392} h={262} r={22} />
          {data.map(([letter, value], i) => {
            const h = value * 15
            const x = 34 + i * 30.5
            return (
              <g key={letter}>
                <rect x={x} y={base - h} width="20" height={h} rx="10" fill={`url(#${p}-iris)`} opacity={0.35 + 0.65 * (value / 12.7)} />
                <text x={x + 10} y={base + 18} textAnchor="middle" fontSize="12" className="fill-fg-muted font-bold">{letter}</text>
              </g>
            )
          })}
        </>
      )}
    </Frame>
  )
}

/** Secure Message Journey: sender, a locked channel and receiver. */
export function JourneyIllustration() {
  return (
    <Frame label="Decorative illustration: a message travelling from a sender through a locked channel to a receiver" viewBox="0 0 440 280">
      {(p) => (
        <>
          <ellipse cx="220" cy="250" rx="170" ry="14" fill="rgb(70 60 150 / 0.2)" filter={`url(#${p}-soft)`} />
          <path d="M70 160 C 140 60, 300 60, 370 160" fill="none" stroke={`url(#${p}-iris)`} strokeWidth="3.5" strokeLinecap="round" strokeDasharray="2 9" />
          <Sphere prefix={p} cx={62} cy={168} r={30} tone="mint" shadow label="A" />
          <Sphere prefix={p} cx={378} cy={168} r={30} tone="blue" shadow label="B" />
          <GlassRect prefix={p} x={178} y={72} w={84} h={52} r={20} />
          <rect x="209" y="99" width="22" height="16" rx="4" className="fill-accent" />
          <path d="M213 99 v-5 a7 7 0 0 1 14 0 v5" fill="none" strokeWidth="3" className="stroke-accent" />
          <GlassRect prefix={p} x={190} y={190} w={60} h={40} r={12} />
          <path d="M194 196 L220 216 L246 196" fill="none" stroke="var(--color-iris-violet)" strokeWidth="2" strokeLinejoin="round" />
        </>
      )}
    </Frame>
  )
}

/** Theory and proofs: stacked glass slabs carrying the symbols of a proof. */
export function TheoryIllustration() {
  const rows = [
    { y: 150, text: '∀ a, n:  gcd(a, n) = 1', x: 28 },
    { y: 95, text: '⇒  ∃ x:  a·x ≡ 1  (mod n)', x: 58 },
    { y: 40, text: '∎', x: 88 },
  ]
  return (
    <Frame label="Decorative illustration: stacked panels carrying the steps of a proof" viewBox="0 0 420 260">
      {(p) => (
        <>
          {rows.map((row) => (
            <g key={row.y}>
              <GlassRect prefix={p} x={row.x} y={row.y} w={row.text.length > 2 ? 300 : 80} h={56} r={20} />
              <text x={row.x + (row.text.length > 2 ? 24 : 40)} y={row.y + 28} textAnchor={row.text.length > 2 ? 'start' : 'middle'} dominantBaseline="central" fontSize={row.text.length > 2 ? 17 : 26} className="fill-fg font-serif italic">
                {row.text}
              </text>
            </g>
          ))}
          <Sphere prefix={p} cx={372} cy={52} r={14} tone="violet" shadow />
        </>
      )}
    </Frame>
  )
}

/** A small orb used on pages that have nothing else to show, such as "not found". */
export function QuietOrb() {
  return (
    <Frame label="Decorative illustration: a glossy sphere" viewBox="0 0 200 180">
      {(p) => (
        <>
          <Sphere prefix={p} cx={100} cy={80} r={52} tone="violet" shadow />
          <text x="100" y="82" textAnchor="middle" dominantBaseline="central" fontSize="48" className="fill-white font-bold [font-family:var(--font-display)]">?</text>
        </>
      )}
    </Frame>
  )
}

const BY_MODULE: Record<ModuleId, () => React.JSX.Element> = {
  logic: LogicIllustration,
  sets: SetsIllustration,
  combinatorics: CombinatoricsIllustration,
  graphs: GraphIllustration,
  algebra: AlgebraIllustration,
}

/** The focal illustration for a mathematical module. */
export function ModuleIllustration({ id }: { id: ModuleId }) {
  const Illustration = BY_MODULE[id]
  return <Illustration />
}
