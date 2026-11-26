import { LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { MAX_TEXT_LENGTH, textLength } from '../../modules/algebra/cipherMath'
import { describeSeparation, fmtChi } from '../../modules/analysis/interpret'
import { useSession } from '../../session/sessionContext'
import { ErrorNotice, Notice } from '../ui'
import { CandidateInspector, CandidateTable, ReliabilityNotice, type CandidateItem } from './CandidateExplorer'

export function CaesarTab() {
  const { analysis, sendCandidateToWorkspace } = useSession()
  const { caesar, text, run, isStale } = analysis
  const [picked, setPicked] = useState<{ ranFor: string; key: number } | null>(null)

  const canRun = text.trim() !== '' && textLength(text) <= MAX_TEXT_LENGTH && caesar.status !== 'loading'
  const result = caesar.status === 'success' ? caesar.result : null
  const stale = isStale('caesar')

  // A pick belongs to one run; a new run starts again at the best candidate.
  const pickedKey = result && picked && caesar.status === 'success' && picked.ranFor === caesar.ranFor ? picked.key : null
  const selected = result ? (result.candidates.find((c) => c.key === pickedKey) ?? result.candidates[0]) : undefined

  const items: CandidateItem[] =
    result?.candidates.map((c) => ({
      id: String(c.key),
      rank: c.rank,
      keyLabel: `k = ${c.key}`,
      chi: c.chi_squared,
      plaintext: c.plaintext,
    })) ?? []

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div className="max-w-[44rem]">
        <p className="m-0 text-sm text-fg-muted">
          A Caesar cipher has only 26 keys. Every shift is tried, each decryption is scored with
        </p>
        <p className="num my-2 text-[1.0625rem]">χ² = Σ (Oᵢ − Eᵢ)² / Eᵢ</p>
        <p className="caption m-0">
          where Oᵢ is how often letter i occurs in the candidate plaintext and Eᵢ is how often it would occur in English
          text of the same length (both as counts). The smaller the score, the more the letters look like English.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-primary" disabled={!canRun} onClick={() => void run('caesar')}>
          {caesar.status === 'loading' ? (
            <>
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              Ranking…
            </>
          ) : (
            'Rank all 26 shifts'
          )}
        </button>
      </div>

      {caesar.status === 'error' && <ErrorNotice error={caesar.error} />}
      {caesar.status === 'idle' && (
        <Notice title="No analysis yet">Paste ciphertext above and rank the 26 possible shifts.</Notice>
      )}

      {result && selected && (
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
            <p className="caption m-0">Most likely shift</p>
            <p className="num m-0 mt-0.5 text-2xl" data-testid="caesar-best">
              k = {result.candidates[0]?.key}
              <span className="ml-3 text-sm text-fg-muted">χ² {fmtChi(result.candidates[0]?.chi_squared ?? 0)}</span>
            </p>
            <p className="num m-0 mt-1 truncate text-sm text-fg-muted">{result.candidates[0]?.plaintext}</p>
          </div>

          <div className={`grid grid-cols-[minmax(0,1fr)] gap-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] ${stale ? 'opacity-60' : ''}`}>
            <CandidateTable
              items={items}
              selectedId={String(selected.key)}
              onSelect={(id) => caesar.status === 'success' && setPicked({ ranFor: caesar.ranFor, key: Number(id) })}
              keyHeader="Shift"
              initialRows={26}
              noun="shifts"
            />
            <CandidateInspector
              title={`k = ${selected.key}`}
              rank={selected.rank}
              total={result.candidates.length}
              chi={selected.chi_squared}
              bestChi={result.candidates[0]?.chi_squared ?? 0}
              plaintext={selected.plaintext}
              loading={false}
              error={null}
              facts={[`decrypts with D(y) = (y − ${selected.key}) mod 26`]}
              onSend={() => sendCandidateToWorkspace({ cipher: 'caesar', candidate: selected }, selected.plaintext)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
