import { useId, type ReactNode } from 'react'

/** Colours of the glossy spheres, taken from the design system's iridescent accents. */
export type Tone = 'blue' | 'violet' | 'pink' | 'mint' | 'white'

const STOPS: Record<Tone, [string, string]> = {
  blue: ['#9cc6ee', '#3f72b4'],
  violet: ['#a58cf0', '#4a35a0'],
  pink: ['#f6a6c6', '#b64d80'],
  mint: ['#9fe6dc', '#2f9f92'],
  white: ['#ffffff', '#cfcfec'],
}

/**
 * Shared gradient and filter definitions for one illustration. Render this once inside the
 * <svg>; spheres and glass shapes then refer to it by `prefix`.
 */
export function Defs({ prefix }: { prefix: string }) {
  return (
    <defs>
      {(Object.keys(STOPS) as Tone[]).map((tone) => (
        <radialGradient key={tone} id={`${prefix}-${tone}`} cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" stopColor={STOPS[tone][0]} />
          <stop offset="1" stopColor={STOPS[tone][1]} />
        </radialGradient>
      ))}
      <linearGradient id={`${prefix}-iris`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="var(--color-iris-blue)" />
        <stop offset="0.5" stopColor="var(--color-iris-violet)" />
        <stop offset="1" stopColor="var(--color-iris-pink)" />
      </linearGradient>
      <linearGradient id={`${prefix}-glass`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
        <stop offset="1" stopColor="#e4e3f6" stopOpacity="0.8" />
      </linearGradient>
      <linearGradient id={`${prefix}-line`} x1="0" x2="1">
        <stop offset="0" stopColor="var(--color-iris-blue)" stopOpacity="0.2" />
        <stop offset="0.5" stopColor="var(--color-iris-violet)" stopOpacity="0.85" />
        <stop offset="1" stopColor="var(--color-iris-pink)" stopOpacity="0.2" />
      </linearGradient>
      <radialGradient id={`${prefix}-floor`} cx="0.5" cy="0.35" r="0.7">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="1" stopColor="#dcdcf2" />
      </radialGradient>
      <filter id={`${prefix}-soft`} x="-30%" y="-80%" width="160%" height="260%">
        <feGaussianBlur stdDeviation="8" />
      </filter>
      <filter id={`${prefix}-glow`} x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="20" />
      </filter>
    </defs>
  )
}

interface SphereProps {
  prefix: string
  cx: number
  cy: number
  r: number
  tone: Tone
  /** Draw a soft contact shadow on the floor below the sphere. */
  shadow?: boolean
  label?: string
}

/** A glossy sphere: radial gradient, specular highlight and an optional contact shadow. */
export function Sphere({ prefix, cx, cy, r, tone, shadow = false, label }: SphereProps) {
  return (
    <g>
      {shadow && (
        <ellipse cx={cx} cy={cy + r * 1.15} rx={r * 0.9} ry={r * 0.22} fill="rgb(70 60 150 / 0.3)" filter={`url(#${prefix}-soft)`} />
      )}
      <circle cx={cx} cy={cy} r={r} fill={`url(#${prefix}-${tone})`} />
      <ellipse cx={cx - r * 0.3} cy={cy - r * 0.42} rx={r * 0.38} ry={r * 0.22} fill="#ffffff" opacity="0.55" transform={`rotate(-30 ${cx - r * 0.3} ${cy - r * 0.42})`} />
      {label && (
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={r * 0.95} className="fill-white font-bold [font-family:var(--font-display)]">
          {label}
        </text>
      )}
    </g>
  )
}

/** A frosted glass rounded rectangle. */
export function GlassRect({ prefix, x, y, w, h, r = 14 }: { prefix: string; x: number; y: number; w: number; h: number; r?: number }) {
  return (
    <g>
      <rect x={x} y={y + 5} width={w} height={h} rx={r} fill="rgb(70 60 150 / 0.22)" filter={`url(#${prefix}-soft)`} />
      <rect x={x} y={y} width={w} height={h} rx={r} fill={`url(#${prefix}-glass)`} stroke="#ffffff" strokeOpacity="0.9" />
    </g>
  )
}

interface FrameProps {
  /** Short description for assistive technology. */
  label: string
  viewBox: string
  /** Called with a unique prefix for gradient ids. */
  children: (prefix: string) => ReactNode
  className?: string
}

/** The outer <svg> for an illustration. Illustrations are decorative, so they only get a label. */
export function Frame({ label, viewBox, children, className = '' }: FrameProps) {
  const prefix = `il${useId().replace(/:/g, '')}`
  return (
    <svg viewBox={viewBox} role="img" aria-label={label} className={`h-auto w-full overflow-visible ${className}`}>
      <Defs prefix={prefix} />
      {children(prefix)}
    </svg>
  )
}
