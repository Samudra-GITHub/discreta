import { LoaderCircle, Play } from 'lucide-react'
import type { CipherLab } from '../../modules/algebra/useCipherLab'

/** Why the button is disabled, in words; null when it can be pressed. */
export function blockReason(lab: CipherLab): string | null {
  const { inputs, validation, run } = lab
  if (run.status === 'loading') return null
  if (inputs.text.length === 0) return 'Enter a message to continue.'
  if (validation.textTooLong) return validation.messages.text ?? 'The message is too long.'
  if (inputs.cipher === 'caesar') return validation.key.ok ? null : (validation.messages.key ?? 'Fix the shift k.')
  if (!validation.a.ok || validation.multiplier?.valid !== true) return validation.messages.a ?? 'Choose a valid multiplier a.'
  return validation.b.ok ? null : (validation.messages.b ?? 'Fix the offset b.')
}

/** The one action that talks to the backend. A round orb on wide layouts, a pill on narrow ones. */
export function RunButton({ lab }: { lab: CipherLab }) {
  const loading = lab.run.status === 'loading'
  const reason = blockReason(lab)
  const label = lab.inputs.operation === 'encrypt' ? 'Encrypt' : 'Decrypt'

  return (
    <div className="flex flex-col items-center gap-2 @3xl:self-center">
      <button
        type="button"
        onClick={() => void lab.execute()}
        disabled={!lab.canRun}
        aria-describedby={reason ? 'run-reason' : undefined}
        className="group relative flex h-12 w-full items-center justify-center gap-2 rounded-full bg-linear-to-br from-iris-blue via-iris-violet to-iris-pink px-6 text-base font-bold text-white shadow-[0_14px_26px_-12px_rgb(91_67_214/0.75),inset_0_1px_0_rgb(255_255_255/0.45)] transition-[transform,box-shadow,opacity] duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none disabled:hover:translate-y-0 @3xl:h-[4.5rem] @3xl:w-[4.5rem] @3xl:px-0"
      >
        {loading ? (
          <LoaderCircle aria-hidden="true" className="size-5 animate-spin @3xl:size-6" />
        ) : (
          <Play aria-hidden="true" className="size-5 fill-current @3xl:size-6" />
        )}
        <span className="@3xl:sr-only">{loading ? 'Working…' : label}</span>
      </button>
      <p
        id="run-reason"
        className="min-h-4 text-center text-xs font-semibold text-fg-muted @3xl:max-w-24"
        aria-live="polite"
      >
        {loading ? '' : (reason ?? '')}
      </p>
      <span className="hidden text-center text-xs font-bold text-fg-subtle @3xl:block" aria-hidden="true">
        {loading ? 'Working…' : label}
      </span>
    </div>
  )
}
