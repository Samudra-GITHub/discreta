import { CircleCheck, CircleX, KeyRound, Minus, Plus } from 'lucide-react'
import { collisionFor, letterOf, mod26, VALID_MULTIPLIERS } from '../../modules/algebra/cipherMath'
import type { CipherLab } from '../../modules/algebra/useCipherLab'
import { Tile } from '../Tile'

interface NumberFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  onNudge: (delta: number) => void
  error?: string
  hint?: string
}

/** A whole-number field with minus and plus buttons. Keys can be negative or large. */
function NumberField({ id, label, value, onChange, onNudge, error, hint }: NumberFieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  const button =
    'aurora-chip flex size-11 shrink-0 items-center justify-center rounded-xl text-fg-muted transition-colors duration-150 hover:text-accent-strong active:translate-y-px'
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-bold text-fg">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <button type="button" className={button} aria-label={`Decrease ${label}`} onClick={() => onNudge(-1)}>
          <Minus aria-hidden="true" className="size-4" />
        </button>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`aurora-inset h-11 min-w-0 flex-1 rounded-xl px-3 text-center text-lg font-bold tabular-nums text-fg outline-offset-2 [font-family:var(--font-display)] ${
            error ? 'border-err!' : ''
          }`}
        />
        <button type="button" className={button} aria-label={`Increase ${label}`} onClick={() => onNudge(1)}>
          <Plus aria-hidden="true" className="size-4" />
        </button>
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-semibold text-err">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1.5 text-xs font-medium text-fg-muted">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

/** "k ≡ 23 (mod 26)": the key reduced into 0..25, which is all the arithmetic ever uses. */
function reducedHint(label: string, raw: string, big: bigint | null): string | undefined {
  if (big === null) return undefined
  const residue = mod26(big)
  return big === BigInt(residue)
    ? `${label} = ${residue}, already in 0 to 25.`
    : `${label} = ${raw.trim()} acts as ${residue} (mod 26).`
}

export function KeyPanel({ lab, flat = false }: { lab: CipherLab; flat?: boolean }) {
  const { inputs, validation, setField, nudge } = lab
  const { key, a, b, multiplier, messages } = validation

  if (inputs.cipher === 'caesar') {
    const residue = key.ok ? mod26(key.big) : 0
    return (
      <Tile title="Key" icon={KeyRound} rise={3} flat={flat}>
        <NumberField
          id="caesar-key"
          label="Shift k"
          value={inputs.key}
          onChange={(value) => setField('key', value)}
          onNudge={(delta) => nudge('key', delta)}
          error={messages.key}
          hint={reducedHint('k', inputs.key, key.ok ? key.big : null)}
        />
        <input
          type="range"
          min={0}
          max={25}
          step={1}
          value={residue}
          onChange={(event) => setField('key', event.target.value)}
          aria-label="Shift from 0 to 25"
          className="mt-4 h-2 w-full cursor-pointer accent-accent"
        />
        <div className="mt-1 flex justify-between text-[11px] font-bold text-fg-subtle" aria-hidden="true">
          <span>0</span>
          <span>13</span>
          <span>25</span>
        </div>
      </Tile>
    )
  }

  const collision = a.ok && b.ok ? collisionFor(a.big, b.big) : null
  const aValid = multiplier?.valid === true
  return (
    <Tile title="Key" icon={KeyRound} rise={3} flat={flat}>
      <div className="space-y-5">
        <div>
          <NumberField
            id="affine-a"
            label="Multiplier a"
            value={inputs.a}
            onChange={(value) => setField('a', value)}
            onNudge={(delta) => nudge('a', delta)}
            error={messages.a && !multiplier ? messages.a : undefined}
          />

          <div className="mt-2.5 flex flex-wrap gap-1.5" role="group" aria-label="Valid multipliers">
            {VALID_MULTIPLIERS.map((value) => {
              const selected = a.ok && a.value === value
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setField('a', String(value))}
                  className={`h-8 min-w-9 rounded-full px-2 text-sm font-bold tabular-nums transition-colors duration-150 ${
                    selected ? 'bg-accent text-white shadow-sm' : 'aurora-chip text-fg-muted hover:text-accent-strong'
                  }`}
                >
                  {value}
                </button>
              )
            })}
          </div>
          <p className="mt-1.5 text-xs font-medium text-fg-muted">Only these 12 values have gcd(a, 26) = 1.</p>

          {multiplier && (
            <p
              className={`mt-2 flex items-center gap-1.5 text-sm font-bold ${aValid ? 'text-ok' : 'text-err'}`}
              role="status"
            >
              {aValid ? <CircleCheck aria-hidden="true" className="size-4" /> : <CircleX aria-hidden="true" className="size-4" />}
              gcd({inputs.a.trim()}, 26) = {multiplier.gcd}
              {aValid ? ' · valid' : ' · not allowed'}
            </p>
          )}

          {multiplier && !aValid && (
            <div className="mt-2 rounded-xl border border-err/30 bg-err/8 p-3 text-xs leading-relaxed font-medium text-fg" data-testid="invalid-multiplier">
              {collision ? (
                <p>
                  <strong>Why this is refused.</strong> With a = {multiplier.residue}, the letters{' '}
                  <b>{letterOf(collision.first)}</b> ({collision.first}) and <b>{letterOf(collision.second)}</b> ({collision.second}){' '}
                  both become <b>{letterOf(collision.image)}</b>, because {multiplier.residue}·{collision.second} ={' '}
                  {multiplier.residue * collision.second} ≡ 0 (mod 26). A ciphertext letter that could come from two
                  different letters can never be decrypted, so the app will not send this key, and the server would
                  reject it too (HTTP 422, <code>invalid_key</code>).
                </p>
              ) : (
                <p>Enter a whole number to see why it is or is not allowed.</p>
              )}
            </div>
          )}
        </div>

        <NumberField
          id="affine-b"
          label="Offset b"
          value={inputs.b}
          onChange={(value) => setField('b', value)}
          onNudge={(delta) => nudge('b', delta)}
          error={messages.b}
          hint={reducedHint('b', inputs.b, b.ok ? b.big : null)}
        />
      </div>
    </Tile>
  )
}
