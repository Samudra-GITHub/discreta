import { ArrowRight, FlaskConical } from 'lucide-react'
import { useMemo } from 'react'
import { buildWorkedExample, MODULUS, type WorkedStep } from '../../modules/algebra/cipherMath'
import type { CipherLab } from '../../modules/algebra/useCipherLab'
import { Tile } from '../Tile'

function Step({ step, index }: { step: WorkedStep; index: number }) {
  const wrapped = step.raw < 0 || step.raw >= MODULUS
  return (
    <li
      className="aurora-rise flex min-w-0 flex-col gap-2 rounded-2xl bg-raised/80 p-3 ring-1 ring-white/70 ring-inset"
      style={{ '--rise-i': index } as React.CSSProperties}
      data-testid="worked-step"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex size-9 items-center justify-center rounded-xl bg-accent-wash text-lg font-bold text-accent-strong [font-family:var(--font-display)]">
          {step.input}
        </span>
        <ArrowRight aria-hidden="true" className="size-4 text-fg-subtle" />
        <span className="flex size-9 items-center justify-center rounded-xl bg-linear-to-br from-iris-blue to-iris-violet text-lg font-bold text-white [font-family:var(--font-display)]">
          {step.output}
        </span>
      </div>
      <dl className="space-y-1 text-xs leading-snug font-medium text-fg-muted">
        <div>
          <dt className="sr-only">Number</dt>
          <dd>
            {step.input} is letter number <b className="text-fg">{step.number}</b>
          </dd>
        </div>
        <div>
          <dt className="sr-only">Arithmetic</dt>
          <dd className="font-serif text-sm text-fg">
            {step.expression} = <b>{step.raw}</b>
          </dd>
        </div>
        <div>
          <dt className="sr-only">Reduced</dt>
          <dd>
            {wrapped ? (
              <>
                {step.raw} mod 26 = <b className="text-fg">{step.result}</b>
              </>
            ) : (
              <>already in 0 to 25</>
            )}{' '}
            → <b className="text-accent-strong">{step.output}</b>
          </dd>
        </div>
      </dl>
    </li>
  )
}

/**
 * The arithmetic for the first few letters of the message, using the reduced keys (and the
 * inverse) that the backend reported. Each step is checked against the backend's output before
 * it is shown, so it can never contradict the result.
 */
export function WorkedExample({ lab, flat = false }: { lab: CipherLab; flat?: boolean }) {
  const { run } = lab
  const result = run.status === 'success' ? run.result : null
  const example = useMemo(() => (result ? buildWorkedExample(result) : null), [result])

  return (
    <Tile title="Worked example" icon={FlaskConical} rise={6} flat={flat} className={`@container ${flat ? 'border-t border-line pt-6' : ''}`}>
      {!example && (
        <p className="text-sm font-medium text-fg-muted" data-testid="worked-empty">
          Run an operation to see the arithmetic for the first letters of your message, with your own numbers.
        </p>
      )}

      {example?.status === 'no-letters' && (
        <p className="text-sm font-medium text-fg-muted" data-testid="worked-none">
          This text has no letters from A to Z, so there is no arithmetic to show: every character was left unchanged.
        </p>
      )}

      {example?.status === 'unverified' && (
        <p className="text-sm font-medium text-warn" role="status" data-testid="worked-unverified">
          The worked example is hidden: the arithmetic could not be matched against the backend&apos;s output, and a
          mismatched explanation would be misleading.
        </p>
      )}

      {example?.status === 'ok' && (
        <>
          {lab.stale && (
            <p className="mb-3 text-xs font-bold text-warn" role="status" data-testid="worked-stale">
              These steps belong to the previous run; the inputs have changed since.
            </p>
          )}
          <ol className="grid grid-cols-2 gap-2.5 @lg:grid-cols-3 @3xl:grid-cols-5">
            {example.steps.map((step, i) => (
              <Step key={i} step={step} index={i} />
            ))}
          </ol>
          <p className="mt-3 text-xs font-medium text-fg-muted">
            {example.lettersTotal > example.steps.length
              ? `The first ${example.steps.length} of ${example.lettersTotal} letters. `
              : ''}
            Spaces, digits and punctuation are copied unchanged; lower-case letters use the same numbers as upper-case
            ones.
          </p>
        </>
      )}
    </Tile>
  )
}
