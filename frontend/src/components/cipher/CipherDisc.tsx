import { Lock, LockOpen, RotateCw, Sigma } from 'lucide-react'
import { useId, useRef, type CSSProperties } from 'react'
import { letterOf, MODULUS } from '../../modules/algebra/cipherMath'
import type { CipherId, CipherOperation } from '../../types/cipher'

export type DiscState = 'ready' | 'incomplete' | 'invalid'

interface CipherDiscProps {
  cipher: CipherId
  operation: CipherOperation
  /** For each outer letter number, the inner letter number the operation gives; null if no valid key. */
  map: number[] | null
  /** Caesar only: the shift k mod 26, used to turn the inner ring. */
  shift: number | null
  state: DiscState
  /** Short labels shown in the hub and in the callouts. */
  hubLabel: string
  hubValue: string
  keyCallout: string
}

const W = 520
const H = 440
const CX = 260
const CY = 192
const STEP = 360 / MODULUS

/** Letters placed around a circle, each turned so its baseline follows the ring. */
function Ring({ letters, radius, className }: { letters: string[]; radius: number; className: string }) {
  return (
    <>
      {letters.map((letter, i) => (
        <text
          key={i}
          x={CX}
          y={CY - radius}
          transform={`rotate(${i * STEP} ${CX} ${CY})`}
          textAnchor="middle"
          dominantBaseline="central"
          className={className}
        >
          {letter}
        </text>
      ))}
    </>
  )
}

/** Keeps an angle continuous so the ring turns the short way round instead of spinning back. */
function useUnwrappedAngle(target: number): number {
  const state = useRef({ last: target, angle: target })
  if (state.current.last !== target) {
    const delta = ((((target - state.current.last) % 360) + 540) % 360) - 180
    state.current.angle += delta
    state.current.last = target
  }
  return state.current.angle
}

const PLAIN = Array.from({ length: MODULUS }, (_, i) => letterOf(i))

/**
 * The hero of the laboratory: a frosted cipher disc. The outer ring holds the letters that go
 * in, the inner ring the letters that come out, aligned letter for letter. For the Caesar
 * cipher the inner ring simply turns by the shift; for the affine cipher its letters are
 * rearranged. The rings are a live preview of the chosen key, drawn locally; the actual
 * result always comes from the backend.
 */
export function CipherDisc({ cipher, operation, map, shift, state, hubLabel, hubValue, keyCallout }: CipherDiscProps) {
  const uid = useId().replace(/:/g, '')
  const turn = shift === null ? 0 : (operation === 'encrypt' ? -shift : shift) * STEP
  const angle = useUnwrappedAngle(turn)

  const usable = state === 'ready' && map !== null
  const innerLetters =
    cipher === 'caesar' && usable ? PLAIN : PLAIN.map((_, x) => (usable && map ? letterOf(map[x] ?? 0) : '·'))
  const summary =
    usable && map
      ? `Cipher disc. ${operation === 'encrypt' ? 'Plain' : 'Cipher'} letter A becomes ${letterOf(map[0] ?? 0)}, B becomes ${letterOf(map[1] ?? 0)}, C becomes ${letterOf(map[2] ?? 0)}.`
      : 'Cipher disc. Enter a valid key to see how the alphabet is mapped.'

  const inputName = operation === 'encrypt' ? 'plaintext' : 'ciphertext'
  const outputName = operation === 'encrypt' ? 'ciphertext' : 'plaintext'
  const OpIcon = operation === 'encrypt' ? Lock : LockOpen
  const KeyIcon = cipher === 'caesar' ? RotateCw : Sigma

  const pill =
    'absolute z-10 hidden items-center gap-1.5 rounded-full bg-raised/90 py-1 pr-2 pl-1 text-[11px] font-bold whitespace-nowrap text-fg shadow-[0_6px_14px_-8px_rgb(66_56_150/0.5),inset_0_1px_0_rgb(255_255_255/0.9)] @md:flex'
  const pillWidth = `${(150 / W) * 100}%`
  const dot = 'flex size-5 items-center justify-center rounded-full bg-iris-mint/35 text-ok'
  const at = (x: number, y: number): CSSProperties => ({ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` })

  return (
    <div className="@container aurora-rise relative mx-auto w-full max-w-[34rem]" style={{ '--rise-i': 1 } as CSSProperties}>
      <div className="relative" style={{ aspectRatio: `${W} / ${H}` }}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary} className="absolute inset-0 size-full overflow-visible">
          <defs>
            <linearGradient id={`${uid}-iris`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="var(--color-iris-blue)" />
              <stop offset="0.5" stopColor="var(--color-iris-violet)" />
              <stop offset="1" stopColor="var(--color-iris-pink)" />
            </linearGradient>
            <linearGradient id={`${uid}-line`} x1="0" x2="1">
              <stop offset="0" stopColor="var(--color-iris-blue)" stopOpacity="0.15" />
              <stop offset="0.5" stopColor="var(--color-iris-violet)" stopOpacity="0.8" />
              <stop offset="1" stopColor="var(--color-iris-pink)" stopOpacity="0.15" />
            </linearGradient>
            <radialGradient id={`${uid}-pedestal`} cx="0.5" cy="0.35" r="0.7">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="1" stopColor="#dcdcf2" />
            </radialGradient>
            <radialGradient id={`${uid}-hub`} cx="0.35" cy="0.3" r="0.9">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="1" stopColor="#e4e3f6" />
            </radialGradient>
            <filter id={`${uid}-glow`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="22" />
            </filter>
            <filter id={`${uid}-soft`} x="-20%" y="-50%" width="140%" height="200%">
              <feGaussianBlur stdDeviation="9" />
            </filter>
          </defs>

          {/* Hairline connectors from the callouts to the rim, as in the reference */}
          <g fill="none" stroke="var(--color-fg-subtle)" strokeOpacity="0.45" strokeWidth="1" className="hidden @md:block">
            <polyline points="150,36 184,36 164,80" />
            <polyline points="370,36 336,36 356,80" />
            <polyline points="150,356 180,356 164,306" />
            <polyline points="370,356 340,356 356,306" />
          </g>
          <g fill="var(--color-iris-violet)" className="hidden @md:block">
            <circle cx="164" cy="80" r="3" />
            <circle cx="356" cy="80" r="3" />
            <circle cx="164" cy="306" r="3" />
            <circle cx="356" cy="306" r="3" />
          </g>

          {/* Pedestal and the thin orbit line beneath it */}
          <ellipse cx={CX} cy="372" rx="200" ry="30" fill="none" stroke={`url(#${uid}-line)`} strokeWidth="1.5" />
          <ellipse cx={CX} cy="368" rx="150" ry="22" fill="rgb(70 60 150 / 0.28)" filter={`url(#${uid}-soft)`} />
          <ellipse cx={CX} cy="352" rx="150" ry="26" fill={`url(#${uid}-pedestal)`} stroke="#ffffff" strokeOpacity="0.8" />

          {/* Iridescent glow behind the disc */}
          <circle cx={CX} cy={CY} r="140" fill={`url(#${uid}-iris)`} opacity="0.5" filter={`url(#${uid}-glow)`} />

          {/* Disc: iridescent bezel, frosted outer band, inner band, hub */}
          <circle cx={CX} cy={CY} r="152" fill={`url(#${uid}-iris)`} />
          <circle cx={CX} cy={CY} r="147" fill="none" stroke="#ffffff" strokeOpacity="0.55" />
          <circle cx={CX} cy={CY} r="140" fill="#f7f7fd" fillOpacity="0.92" />
          <circle cx={CX} cy={CY} r="104" fill="#e7e6f8" />
          <circle cx={CX} cy={CY} r="104" fill="none" stroke="#ffffff" strokeOpacity="0.9" strokeWidth="1.5" />
          <circle cx={CX} cy={CY} r="138" fill="none" stroke="var(--color-line-strong)" strokeOpacity="0.5" />
          {/* Specular arcs on the bezel: a bright one top left, a cool one bottom right */}
          <path d={`M ${CX - 116.4} ${CY - 97.7} A 152 152 0 0 1 ${CX - 26.4} ${CY - 149.7}`} fill="none" stroke="#ffffff" strokeOpacity="0.75" strokeWidth="4" strokeLinecap="round" />
          <path d={`M ${CX + 116.4} ${CY + 97.7} A 152 152 0 0 1 ${CX + 26.4} ${CY + 149.7}`} fill="none" stroke="#9fe9f2" strokeOpacity="0.65" strokeWidth="4" strokeLinecap="round" />

          <Ring letters={PLAIN} radius={122} className="fill-fg text-[13px] font-bold [font-family:var(--font-display)]" />

          <g
            key={cipher === 'affine' ? `${operation}-${innerLetters.join('')}` : 'caesar-ring'}
            className={cipher === 'affine' ? 'aurora-swap' : undefined}
            style={
              cipher === 'caesar'
                ? {
                    transform: `rotate(${angle}deg)`,
                    transformOrigin: `${CX}px ${CY}px`,
                    transition: 'transform 700ms cubic-bezier(0.22, 1, 0.36, 1)',
                  }
                : undefined
            }
          >
            <Ring
              letters={innerLetters}
              radius={86}
              className={`text-[13px] font-bold [font-family:var(--font-display)] ${usable ? 'fill-accent' : 'fill-fg-subtle'}`}
            />
          </g>

          <circle cx={CX} cy={CY} r="58" fill={`url(#${uid}-hub)`} stroke="#ffffff" strokeWidth="1.5" />
          <circle cx={CX} cy={CY} r="58" fill="none" stroke="var(--color-line-strong)" strokeOpacity="0.35" />
          <ellipse cx="216" cy="122" rx="62" ry="14" fill="#ffffff" opacity="0.35" transform="rotate(-28 216 122)" />
        </svg>

        {/* Hub text sits above the SVG so it stays crisp and selectable */}
        <div
          className="pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center"
          style={at(CX, CY)}
          aria-hidden="true"
        >
          <span className="text-[10px] font-bold tracking-[0.14em] text-fg-subtle uppercase">{hubLabel}</span>
          <span className="text-3xl leading-none font-bold text-fg @md:text-4xl [font-family:var(--font-display)]">{hubValue}</span>
        </div>

        <div className={pill} style={{ ...at(0, 36), width: pillWidth, transform: 'translateY(-50%)' }} data-testid="callout-key">
          <span className={dot}>
            <KeyIcon aria-hidden="true" className="size-3" />
          </span>
          {keyCallout}
        </div>
        <div className={pill} style={{ ...at(W, 36), width: pillWidth, transform: 'translate(-100%, -50%)' }}>
          <span className={dot}>
            <OpIcon aria-hidden="true" className="size-3" />
          </span>
          {operation === 'encrypt' ? 'Encrypting' : 'Decrypting'}
        </div>
        <div className={pill} style={{ ...at(0, 356), width: pillWidth, transform: 'translateY(-50%)' }}>
          <span className={dot}>
            <span className="size-1.5 rounded-full bg-current" />
          </span>
          Outer · {inputName}
        </div>
        <div className={pill} style={{ ...at(W, 356), width: pillWidth, transform: 'translate(-100%, -50%)' }}>
          <span className={dot}>
            <span className="size-1.5 rounded-full bg-current" />
          </span>
          Inner · {outputName}
        </div>
      </div>

      {/* On narrow screens the callouts are replaced by this legend */}
      <p className="mt-2 text-center text-xs font-semibold text-fg-muted @md:hidden">
        Outer ring: {inputName} · Inner ring: {outputName}
      </p>
    </div>
  )
}
