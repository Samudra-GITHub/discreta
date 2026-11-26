import { LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { MAX_TEXT_LENGTH, textLength, VALID_MULTIPLIERS } from '../../modules/algebra/cipherMath'
import { describeLabError, type LabError } from '../../modules/algebra/labErrors'
import { describeSeparation, fmtChi } from '../../modules/analysis/interpret'
import { runAffine } from '../../services/cipher'
import { useSession } from '../../session/sessionContext'
import { ErrorNotice, Notice } from '../ui'
import { CandidateInspector, CandidateTable, ReliabilityNotice, type CandidateItem } from './CandidateExplorer'

const idOf = (a: number, b: number) => `${a},${b}`

/** Text for a candidate beyond the ones the search returned in full, decrypted on demand. */
function useDecryptedOnDemand(ciphertext: string | null, a: number | null, b: number | null, needed: boolean) {
  const [done, setDone] = useState<{ id: string; text: string | null; error: LabError | null } | null>(null)
  const id = a === null || b === null ? null : idOf(a, b)

  useEffect(() => {
    if (!needed || ciphertext === null || a === null || b === null || id === null) return
    const controller = new AbortController()
    runAffine('decrypt', { text: ciphertext, a, b }, { signal: controller.signal })
      .then((r) => !controller.signal.aborted && setDone({ id, text: r.output, error: null }))
      .catch((e) => !controller.signal.aborted && setDone({ id, text: null, error: describeLabError(e) }))
    return () => controller.abort()
  }, [needed, ciphertext, a, b, id])

  const current = needed && done && done.id === id ? done : null
  return { text: current?.text ?? null, error: current?.error ?? null, loading: needed && current === null }
}

export function AffineTab() {
  const { analysis, sendCandidateToWorkspace } = useSession()
  const { affine, text, run, isStale } = analysis
  const [picked, setPicked] = useState<{ ranFor: string; id: string } | null>(null)

  const canRun = text.trim() !== '' && textLength(text) <= MAX_TEXT_LENGTH && affine.status !== 'loading'
  const result = affine.status === 'success' ? affine.result : null
  const stale = isStale('affine')

  const pickedId = result && picked && affine.status === 'success' && picked.ranFor === affine.ranFor ? picked.id : null
  const selected = result ? (result.candidates.find((c) => idOf(c.a, c.b) === pickedId) ?? result.candidates[0]) : undefined

  const ranFor = affine.status === 'success' ? affine.ranFor : null
  const onDemand = useDecryptedOnDemand(ranFor, selected?.a ?? null, selected?.b ?? null, selected?.plaintext === null)
  const plaintext = selected ? (selected.plaintext ?? onDemand.text) : null

  const items: CandidateItem[] =
    result?.candidates.map((c) => ({
      id: idOf(c.a, c.b),
      rank: c.rank,
      keyLabel: `a = ${c.a}, b = ${c.b}`,
      chi: c.chi_squared,
      plaintext: c.plaintext,
    })) ?? []

  const inverses = new Map(result?.candidates.map((c) => [c.a, c.a_inverse]))
  const best = result?.candidates[0]

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div className="max-w-[44rem]">
        <p className="m-0 text-sm text-fg-muted">
          An affine key (a, b) is valid only when gcd(a, 26) = 1. That leaves 12 multipliers and 26 offsets: 312 keys, all
          of them tried. Each decryption D(y) = a⁻¹ · (y − b) mod 26 is scored with the same χ² statistic as the Caesar
          search.
        </p>
        <p className="num mt-3 mb-1 text-sm">12 × 26 = 312 keys</p>
        <ul className="m-0 flex list-none flex-wrap gap-1 p-0" aria-label="Valid multipliers">
          {VALID_MULTIPLIERS.map((m) => (
            <li key={m} className="num rounded-md border border-line-strong px-2 py-0.5 text-xs">
              a = {m}
              {inverses.has(m) && <span className="text-fg-muted"> · a⁻¹ = {inverses.get(m)}</span>}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-primary" disabled={!canRun} onClick={() => void run('affine')}>
          {affine.status === 'loading' ? (
            <>
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              Ranking…
            </>
          ) : (
            'Rank all 312 keys'
          )}
        </button>
      </div>

      {affine.status === 'error' && <ErrorNotice error={affine.error} />}
      {affine.status === 'idle' && (
        <Notice title="No analysis yet">Paste ciphertext above and rank every valid affine key.</Notice>
      )}

      {result && selected && best && (
        <div className="result-enter grid grid-cols-[minmax(0,1fr)] gap-6">
          {stale && (
            <Notice tone="warn" title="Out of date">
              The text changed after this analysis. Rank again to update it.
            </Notice>
          )}
          <ReliabilityNotice
            level={result.reliability}
            note={result.reliability_note}
            separation={result.separation}
            separationText={describeSeparation(result.separation)}
          />

          <div className={`border-y border-line py-4 ${stale ? 'opacity-60' : ''}`}>
            <p className="caption m-0">Most likely key</p>
            <p className="num m-0 mt-0.5 text-2xl" data-testid="affine-best">
              a = {best.a}, b = {best.b}
              <span className="ml-3 text-sm text-fg-muted">
                a⁻¹ = {best.a_inverse} · χ² {fmtChi(best.chi_squared)}
              </span>
            </p>
            <p className="num m-0 mt-1 truncate text-sm text-fg-muted">{best.plaintext}</p>
          </div>

          <div className={`grid grid-cols-[minmax(0,1fr)] gap-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] ${stale ? 'opacity-60' : ''}`}>
            <CandidateTable
              items={items}
              selectedId={idOf(selected.a, selected.b)}
              onSelect={(id) => affine.status === 'success' && setPicked({ ranFor: affine.ranFor, id })}
              keyHeader="Key"
              initialRows={15}
              noun="keys"
            />
            <CandidateInspector
              title={`a = ${selected.a}, b = ${selected.b}`}
              rank={selected.rank}
              total={result.candidates.length}
              chi={selected.chi_squared}
              bestChi={best.chi_squared}
              plaintext={plaintext}
              loading={onDemand.loading}
              error={onDemand.error}
              facts={[`gcd(${selected.a}, 26) = 1`, `a⁻¹ = ${selected.a_inverse}`]}
              onSend={() =>
                plaintext !== null && sendCandidateToWorkspace({ cipher: 'affine', candidate: selected }, plaintext)
              }
            />
          </div>
        </div>
      )}
    </div>
  )
}
