import { ArrowLeftRight, FlaskConical, LoaderCircle } from 'lucide-react'
import { CopyButton, ErrorNotice, PageHeader, Section, Segmented } from '../components/ui'
import { TextEditor } from '../components/TextEditor'
import { Formula } from '../components/workspace/Formula'
import { KeyControls } from '../components/workspace/KeyControls'
import { WorkedSteps } from '../components/workspace/WorkedSteps'
import { useSession } from '../session/sessionContext'
import type { CipherId, CipherOperation, CipherResponse } from '../types/cipher'

const CIPHERS = [
  { value: 'caesar', label: 'Caesar' },
  { value: 'affine', label: 'Affine' },
  { value: 'vigenere', label: 'Vigenère' },
] as const satisfies readonly { value: CipherId; label: string }[]

const OPERATIONS = [
  { value: 'encrypt', label: 'Encrypt' },
  { value: 'decrypt', label: 'Decrypt' },
] as const satisfies readonly { value: CipherOperation; label: string }[]

/** Describe the key a result was produced with, e.g. "Caesar · encrypt · k = 3". */
function summary(r: CipherResponse) {
  if (r.cipher === 'caesar') {
    return `Caesar · ${r.operation} · k = ${r.key}${r.key !== r.effective_key ? ` (acts as ${r.effective_key})` : ''}`
  }
  if (r.cipher === 'vigenere') {
    return `Vigenère · ${r.operation} · key ${r.key.toUpperCase()} (${r.key_length} letter${r.key_length === 1 ? '' : 's'})`
  }
  return `Affine · ${r.operation} · a = ${r.effective_a}, b = ${r.effective_b}, a⁻¹ = ${r.a_inverse}`
}

export function WorkspacePage() {
  const { lab, sendToAnalysis } = useSession()
  const { inputs, run, validation, canRun, stale } = lab

  const success = run.status === 'success' ? run : null
  const verb = inputs.operation === 'encrypt' ? 'Encrypt' : 'Decrypt'

  return (
    <>
      <PageHeader eyebrow="01 · Workspace" title="Cipher Workspace">
        Encrypt or decrypt a message with a Caesar, affine or Vigenère cipher. The backend does the arithmetic; this page shows
        the key, the formula and the result.
      </PageHeader>

      {/* The instrument settings: one band across the page, with the formula they produce. */}
      <section aria-label="Cipher settings" className="mb-8 border-t border-line pt-5">
        <div className="grid gap-x-14 gap-y-6 lg:grid-cols-[auto_minmax(0,1fr)]">
          <div className="flex flex-wrap gap-x-6 gap-y-4 lg:flex-col lg:gap-y-5">
            <Segmented legend="Method" name="cipher" value={inputs.cipher} options={CIPHERS} onChange={lab.setCipher} />
            <Segmented
              legend="Operation"
              name="operation"
              value={inputs.operation}
              options={OPERATIONS}
              onChange={lab.setOperation}
            />
          </div>
          <div className="min-w-0 max-w-[40rem]">
            <h2 className="mb-3 text-base">Key</h2>
            <KeyControls lab={lab} />
          </div>
        </div>
        <div className="mt-6">
          <Formula lab={lab} />
        </div>
      </section>

      <div className="grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Section title="Message" className="min-w-0">
          <TextEditor
            id="workspace-input"
            label={inputs.operation === 'encrypt' ? 'Plaintext' : 'Ciphertext'}
            value={inputs.text}
            onChange={lab.setText}
            onClear={lab.clear}
            onSubmit={() => void lab.execute()}
            rows={8}
            placeholder={
              inputs.operation === 'encrypt' ? 'Type or paste the message to encrypt.' : 'Paste the ciphertext to decrypt.'
            }
            error={validation.messages.text}
            actions={
              inputs.text !== '' && (
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => sendToAnalysis(inputs.text)}>
                  <FlaskConical aria-hidden="true" className="size-3.5" />
                  Analyse
                </button>
              )
            }
          />
          <div className="mt-4 flex items-center gap-3">
            <button type="button" className="btn btn-primary min-w-36" disabled={!canRun} onClick={() => void lab.execute()}>
              {run.status === 'loading' ? (
                <>
                  <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                  Running…
                </>
              ) : (
                `${verb} message`
              )}
            </button>
            {!canRun && run.status !== 'loading' && (
              <p className="caption">
                {inputs.text === '' ? 'Enter a message to begin.' : 'Fix the highlighted fields to continue.'}
              </p>
            )}
          </div>
        </Section>

        <Section
          title="Result"
          className="min-w-0"
          aside={
            success && (
              <span className="num text-xs text-fg-muted" data-testid="result-summary">
                {summary(success.result)}
              </span>
            )
          }
        >
          <div aria-live="polite" className="min-h-[15rem]">
            {run.status === 'idle' && (
              <div className="panel flex min-h-[15rem] items-center justify-center p-6 text-center">
                <p className="max-w-[18rem] text-sm text-fg-muted">
                  The result appears here once you run the cipher. Nothing is sent to the backend while you type.
                </p>
              </div>
            )}
            {run.status === 'loading' && (
              <div className="panel flex min-h-[15rem] items-center justify-center gap-2 p-6 text-sm text-fg-muted" role="status">
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                Waiting for the backend…
              </div>
            )}
            {run.status === 'error' && <ErrorNotice error={run.error} />}
            {success && (
              <div className="result-enter">
                {stale && (
                  <p className="mb-2 text-xs font-medium text-warn" role="status">
                    Out of date: the message or key changed after this result. Run it again to update.
                  </p>
                )}
                <div className={`panel min-h-[11rem] p-3 ${stale ? 'opacity-60' : ''}`}>
                  <pre
                    data-testid="result-output"
                    className="num m-0 max-h-[22rem] overflow-auto text-[0.9375rem] leading-relaxed break-words whitespace-pre-wrap"
                  >
                    {success.result.output === '' ? '(empty)' : success.result.output}
                  </pre>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <CopyButton text={success.result.output} label="Copy output" />
                  <button type="button" className="btn btn-sm" onClick={lab.reuseResult}>
                    <ArrowLeftRight aria-hidden="true" className="size-3.5" />
                    Swap into input
                  </button>
                  <button type="button" className="btn btn-sm" onClick={() => sendToAnalysis(success.result.output)}>
                    <FlaskConical aria-hidden="true" className="size-3.5" />
                    Send to Analysis Lab
                  </button>
                </div>
                {!stale && (
                  <div className="mt-4 border-t border-line pt-3">
                    <WorkedSteps response={success.result} />
                  </div>
                )}
                <p className="caption mt-3">
                  Swap moves the output into the input and switches to the opposite operation, so you can check the round
                  trip.
                </p>
              </div>
            )}
          </div>
        </Section>
      </div>
    </>
  )
}
