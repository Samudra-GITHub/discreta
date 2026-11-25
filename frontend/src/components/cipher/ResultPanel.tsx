import { Check, Copy, Repeat2, Sparkles, TriangleAlert, WifiOff } from 'lucide-react'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import type { CipherLab } from '../../modules/algebra/useCipherLab'
import type { CipherResponse } from '../../types/cipher'
import { Tile } from '../Tile'

/** Longest output that gets the letter-by-letter reveal; longer text appears at once. */
const ANIMATED_LIMIT = 300

const isAsciiLetter = (char: string) => /^[A-Za-z]$/.test(char)

/** Split the output into plain runs and single letters, so only letters are animated. */
function tokens(output: string): { text: string; letter: boolean }[] {
  const out: { text: string; letter: boolean }[] = []
  for (const char of output) {
    const letter = isAsciiLetter(char)
    const last = out[out.length - 1]
    if (!letter && last && !last.letter) last.text += char
    else out.push({ text: char, letter })
  }
  return out
}

function AnimatedOutput({ output }: { output: string }) {
  const parts = useMemo(() => tokens(output), [output])
  let letterIndex = 0
  return (
    <>
      {parts.map((part, i) => {
        if (!part.letter) return <span key={i}>{part.text}</span>
        const style = { '--i': Math.min(letterIndex++, 40) } as CSSProperties
        return (
          <span key={i} className="aurora-letter" style={style}>
            {part.text}
          </span>
        )
      })}
    </>
  )
}

function summary(result: CipherResponse): string {
  const verb = result.operation === 'encrypt' ? 'Encrypted' : 'Decrypted'
  if (result.cipher === 'caesar') {
    return `${verb} with the Caesar cipher, shift k = ${result.effective_key}`
  }
  return `${verb} with the affine cipher, a = ${result.effective_a}, b = ${result.effective_b}`
}

export function ResultPanel({ lab }: { lab: CipherLab }) {
  const { run, stale, reuseResult, execute } = lab
  const [copy, setCopy] = useState<'idle' | 'copied' | 'failed'>('idle')

  useEffect(() => {
    if (copy === 'idle') return
    const timer = setTimeout(() => setCopy('idle'), 2000)
    return () => clearTimeout(timer)
  }, [copy])

  const output = run.status === 'success' ? run.result.output : ''
  const copyOutput = async () => {
    try {
      await navigator.clipboard.writeText(output)
      setCopy('copied')
    } catch {
      setCopy('failed')
    }
  }

  const decryptHint = run.status === 'success' && run.result.operation === 'encrypt' ? 'Decrypt it' : 'Encrypt it'
  const hasLetters = output.split('').some(isAsciiLetter)
  const keyNote =
    run.status === 'success' && run.result.cipher === 'caesar' && run.result.key !== run.result.effective_key
      ? `Your key ${run.result.key} acts as ${run.result.effective_key} (mod 26).`
      : null

  return (
    <Tile
      title="Result"
      icon={Sparkles}
      rise={5}
      className="relative overflow-hidden"
      action={
        run.status === 'success' ? (
          <button
            type="button"
            onClick={() => void copyOutput()}
            className="aurora-chip flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-bold text-fg-muted transition-colors duration-150 hover:text-accent-strong"
          >
            {copy === 'copied' ? <Check aria-hidden="true" className="size-3.5 text-ok" /> : <Copy aria-hidden="true" className="size-3.5" />}
            {copy === 'copied' ? 'Copied' : 'Copy'}
          </button>
        ) : undefined
      }
    >
      <div className="min-h-36 rounded-2xl bg-linear-to-br from-iris-blue/12 via-iris-violet/10 to-iris-pink/14 p-3.5 ring-1 ring-white/70 ring-inset" aria-live="polite" aria-busy={run.status === 'loading'}>
        {run.status === 'idle' && (
          <div className="flex min-h-28 flex-col items-center justify-center gap-1.5 text-center" data-testid="result-empty">
            <Sparkles aria-hidden="true" className="size-6 text-iris-violet/70" />
            <p className="text-sm font-bold text-fg">Your result will appear here</p>
            <p className="max-w-64 text-xs font-medium text-fg-muted">
              Enter a message and a key, then press the round button. The server does the arithmetic.
            </p>
          </div>
        )}

        {run.status === 'loading' && (
          <div className="space-y-2.5 py-2" data-testid="result-loading">
            <p className="text-sm font-bold text-fg-muted">Asking the backend…</p>
            {[92, 78, 64].map((width) => (
              <div key={width} className="h-3.5 animate-pulse rounded-full bg-white/70" style={{ width: `${width}%` }} />
            ))}
          </div>
        )}

        {run.status === 'success' && (
          <div data-testid="result-success">
            <p
              data-testid="cipher-output"
              className="font-mono text-lg leading-relaxed font-semibold break-words whitespace-pre-wrap text-fg"
            >
              {output.length <= ANIMATED_LIMIT ? <AnimatedOutput key={output + run.result.operation} output={output} /> : output}
            </p>
            {!hasLetters && (
              <p className="mt-2 text-xs font-medium text-fg-muted">
                There are no letters here, so nothing changed: only A to Z and a to z are transformed.
              </p>
            )}
          </div>
        )}

        {run.status === 'error' && (
          <div role="alert" className="flex gap-3 py-1" data-testid="result-error">
            {run.error.kind === 'offline' ? (
              <WifiOff aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-err" />
            ) : (
              <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-err" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold text-fg">{run.error.title}</p>
              <p className="mt-0.5 text-sm font-medium break-words text-fg-muted">{run.error.message}</p>
              {(run.error.kind === 'offline' || run.error.kind === 'timeout' || run.error.kind === 'server') && (
                <button
                  type="button"
                  onClick={() => void execute()}
                  className="aurora-chip mt-2 h-8 rounded-full px-3 text-xs font-bold text-accent-strong"
                >
                  Try again
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {run.status === 'success' && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold text-fg-muted" data-testid="result-summary">
            {summary(run.result)}.{keyNote ? ` ${keyNote}` : ''}
          </p>
          {stale && (
            <p className="text-xs font-bold text-warn" role="status" data-testid="result-stale">
              The inputs changed since this result. Press the button again to update it.
            </p>
          )}
          {copy === 'failed' && (
            <p className="text-xs font-bold text-err" role="status">
              Could not copy automatically. Select the text and copy it by hand.
            </p>
          )}
          <button
            type="button"
            onClick={reuseResult}
            className="flex items-center gap-1.5 text-xs font-bold text-accent-strong underline-offset-2 hover:underline"
          >
            <Repeat2 aria-hidden="true" className="size-3.5" />
            Use as input · {decryptHint}
          </button>
        </div>
      )}
    </Tile>
  )
}
