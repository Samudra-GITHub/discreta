import { Minus, Plus } from 'lucide-react'
import { collisionFor, letterOf, mod26, VALID_MULTIPLIERS } from '../../modules/algebra/cipherMath'
import type { CipherLab } from '../../modules/algebra/useCipherLab'

interface KeyFieldProps {
  id: string
  label: string
  value: string
  /** 0..25 position of the slider. */
  slider: number
  onChange: (value: string) => void
  onNudge: (delta: number) => void
  error?: string
  hint?: string
}

/** A key as a slider over 0..25 and a text field that also accepts negative and huge integers. */
function KeyField({ id, label, value, slider, onChange, onNudge, error, hint }: KeyFieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  const step =
    'btn btn-sm size-8 shrink-0 px-0'
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <button type="button" className={step} aria-label={`Decrease ${label}`} onClick={() => onNudge(-1)}>
          <Minus aria-hidden="true" className="size-3.5" />
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
          className="field num h-8 w-28 px-2 text-center"
        />
        <button type="button" className={step} aria-label={`Increase ${label}`} onClick={() => onNudge(1)}>
          <Plus aria-hidden="true" className="size-3.5" />
        </button>
        <input
          type="range"
          min={0}
          max={25}
          step={1}
          value={slider}
          onChange={(event) => onChange(event.target.value)}
          aria-label={`${label}, slider from 0 to 25`}
          className="ml-2 hidden h-8 min-w-0 flex-1 cursor-pointer accent-[var(--c-accent)] sm:block"
        />
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-err" role="alert">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="caption mt-1.5">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

function reduced(label: string, raw: string, big: bigint | null): string | undefined {
  if (big === null) return undefined
  const residue = mod26(big)
  return big === BigInt(residue)
    ? `${label} = ${residue} (already between 0 and 25)`
    : `${label} = ${raw.trim()} acts as ${residue} (mod 26)`
}

/** Key controls for the selected cipher. Affine multipliers are restricted to the 12 valid ones. */
export function KeyControls({ lab }: { lab: CipherLab }) {
  const { inputs, validation, setField, nudge } = lab
  const { key, a, b, multiplier, messages } = validation

  if (inputs.cipher === 'caesar') {
    return (
      <KeyField
        id="caesar-key"
        label="Shift k"
        value={inputs.key}
        slider={key.ok ? mod26(key.big) : 0}
        onChange={(v) => setField('key', v)}
        onNudge={(d) => nudge('key', d)}
        error={messages.key}
        hint={reduced('k', inputs.key, key.ok ? key.big : null)}
      />
    )
  }

  const collision = a.ok && b.ok && multiplier && !multiplier.valid ? collisionFor(a.big, b.big) : null
  const chosen = a.ok && multiplier?.valid ? multiplier.residue : null

  return (
    <div className="grid gap-5">
      <div>
        <KeyField
          id="affine-a"
          label="Multiplier a"
          value={inputs.a}
          slider={a.ok ? mod26(a.big) : 1}
          onChange={(v) => setField('a', v)}
          onNudge={(d) => nudge('a', d)}
          error={messages.a}
          hint={multiplier?.valid ? reduced('a', inputs.a, a.ok ? a.big : null) : undefined}
        />
        <div className="mt-3" role="group" aria-label="Valid multipliers, gcd(a, 26) = 1">
          <p className="caption mb-1.5">Valid multipliers (12 of 26):</p>
          <div className="flex flex-wrap gap-1">
            {VALID_MULTIPLIERS.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={chosen === m}
                onClick={() => setField('a', String(m))}
                className={`num h-7 min-w-9 rounded-md border px-2 text-xs transition-colors duration-150 ${
                  chosen === m
                    ? 'border-fg bg-fg text-canvas'
                    : 'border-line-strong text-fg-muted hover:border-fg-muted hover:text-fg'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        {collision && multiplier && (
          <div className="mt-3 border-l-2 border-err pl-3 text-sm" role="alert">
            <p className="m-0 text-fg-muted">
              With gcd({inputs.a.trim()}, 26) = {multiplier.gcd}, the letters {letterOf(collision.first)} and {letterOf(collision.second)} would both encrypt to{' '}
              {letterOf(collision.image)}, so a message could not be decrypted uniquely. Pick one of the multipliers
              above.
            </p>
          </div>
        )}
      </div>
      <KeyField
        id="affine-b"
        label="Offset b"
        value={inputs.b}
        slider={b.ok ? mod26(b.big) : 0}
        onChange={(v) => setField('b', v)}
        onNudge={(d) => nudge('b', d)}
        error={messages.b}
        hint={reduced('b', inputs.b, b.ok ? b.big : null)}
      />
    </div>
  )
}
