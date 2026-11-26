import { LoaderCircle } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { MAX_TEXT_LENGTH, textLength } from '../../modules/algebra/cipherMath'
import { fmtChi, RELIABILITY_LABEL } from '../../modules/analysis/interpret'
import { useSession } from '../../session/sessionContext'
import type { LengthRow, VigenereLengthsResponse } from '../../types/analysis'
import { ErrorNotice, Notice } from '../ui'
import { CandidateInspector, CandidateTable, type CandidateItem } from './CandidateExplorer'
import { IcGauge, LengthChart } from './VigenereCharts'

const KIND = {
  measured: 'Counted directly from your text.',
  calculated: 'Derived from those counts by a formula.',
  suggestion: 'A statistical estimate, not proof.',
} as const

/** Says how much to trust a section: measured, calculated, or only a suggestion. */
function Evidence({ kind }: { kind: keyof typeof KIND }) {
  return (
    <span title={KIND[kind]} className="num rounded-sm border border-line-strong px-1.5 py-px text-[0.6875rem] text-fg-muted">
      {kind === 'measured' ? 'Measured' : kind === 'calculated' ? 'Calculated' : 'Suggestion'}
    </span>
  )
}

function Block({ title, kinds, children, id }: { title: string; kinds: (keyof typeof KIND)[]; children: ReactNode; id: string }) {
  return (
    <section aria-labelledby={id} className="border-t border-line pt-4">
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h3 id={id} className="text-base">
          {title}
        </h3>
        {kinds.map((k) => (
          <Evidence key={k} kind={k} />
        ))}
      </div>
      {children}
    </section>
  )
}

const ic4 = (value: number | null) => (value === null ? '—' : value.toFixed(4))

function Th({ children, right }: { children: ReactNode; right?: boolean }) {
  return (
    <th scope="col" className={right ? 'text-right' : undefined}>
      {children}
    </th>
  )
}

const headRow = 'border-b border-line-strong text-left text-xs text-fg-muted [&>th]:py-2 [&>th]:pr-3 [&>th]:font-medium'
const bodyRow = 'border-b border-line align-middle [&>*]:py-1.5 [&>*]:pr-3'

function KasiskiBlock({ result }: { result: VigenereLengthsResponse['kasiski'] }) {
  const top = result.votes.slice(0, 8)
  return (
    <Block id="vig-kasiski" title="Kasiski examination" kinds={['measured']}>
      <p className="m-0 max-w-[44rem] text-sm text-fg-muted">
        With a repeating key, the same plaintext fragment gives the same ciphertext fragment whenever its two positions differ
        by a multiple of the key length. So the distances between repeated sequences often share a factor: the key length.
        Positions count letters only, from 0.
      </p>
      <dl className="m-0 mt-4 grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3">
        <div>
          <dt className="caption">Repeated sequences</dt>
          <dd className="num m-0 text-lg">{result.total_repeats}</dd>
        </div>
        <div>
          <dt className="caption">gcd of all distances</dt>
          <dd className="num m-0 text-lg">{result.distance_gcd ?? '—'}</dd>
        </div>
        <div className="col-span-2 md:col-span-1">
          <dt className="caption">Best supported key length</dt>
          <dd className="num m-0 text-lg" data-testid="kasiski-top">
            {top[0] ? `${top[0].length} (${top[0].repeats} of ${result.total_repeats})` : '—'}
          </dd>
        </div>
      </dl>
      <p className="caption mt-3 max-w-[44rem]">{result.note}</p>

      {top.length > 0 && (
        <div className="relative mt-4 overflow-x-auto">
          <table className="w-full min-w-[26rem] border-collapse text-sm">
            <caption className="sr-only">Key lengths ranked by how many repeat distances they divide</caption>
            <thead>
              <tr className={headRow}>
                <Th>Key length</Th>
                <Th right>Repeats</Th>
                <Th right>Share</Th>
                <Th>Example</Th>
              </tr>
            </thead>
            <tbody>
              {top.map((vote) => (
                <tr key={vote.length} className={bodyRow}>
                  <th scope="row" className="num text-left font-medium">
                    {vote.length}
                  </th>
                  <td className="num text-right">{vote.repeats}</td>
                  <td className="num text-right">{Math.round(vote.fraction * 100)}%</td>
                  <td className="num text-fg-muted">
                    {vote.examples[0] ? `${vote.examples[0].sequence} · distance ${vote.examples[0].distance}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="caption mt-2 max-w-[44rem]">
            Every multiple of the true key length divides the same distances, and chance repeats some short sequences, so
            these counts are evidence about the length, not a verdict.
          </p>
        </div>
      )}

      {result.repeats.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium select-none">
            Repeated sequences ({Math.min(result.repeats.length, 30)} of {result.total_repeats} shown, longest first)
          </summary>
          <div className="relative mt-2 overflow-x-auto">
            <table className="num w-full min-w-[26rem] border-collapse text-sm">
              <caption className="sr-only">Repeated sequences with their positions and distances</caption>
              <thead>
                <tr className={headRow}>
                  <Th>Sequence</Th>
                  <Th right>Length</Th>
                  <Th>Positions</Th>
                  <Th right>Distance</Th>
                </tr>
              </thead>
              <tbody>
                {result.repeats.slice(0, 30).map((r) => (
                  <tr key={`${r.first}-${r.second}`} className={bodyRow}>
                    <th scope="row" className="text-left font-medium">
                      {r.sequence}
                    </th>
                    <td className="text-right">{r.length}</td>
                    <td className="text-fg-muted">
                      {r.first} and {r.second}
                    </td>
                    <td className="text-right">{r.distance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </Block>
  )
}

function LengthsTable({
  rows,
  chosen,
  loadingLength,
  onChoose,
}: {
  rows: LengthRow[]
  chosen: number | null
  loadingLength: number | null
  onChoose: (length: number) => void
}) {
  return (
    <div className="relative mt-4 overflow-x-auto">
      <table className="w-full min-w-[34rem] border-collapse text-sm">
        <caption className="sr-only">
          Candidate key lengths: plausible lengths first, shortest first, then the rest by mean index of coincidence
        </caption>
        <thead>
          <tr className={headRow}>
            <Th>Rank</Th>
            <Th>Length</Th>
            <Th right>Mean IC</Th>
            <Th right>Smallest column</Th>
            <Th right>Kasiski</Th>
            <Th>Reading</Th>
            <th scope="col">
              <span className="sr-only">Investigate</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const selected = chosen === row.length
            return (
              <tr key={row.length} className={`${bodyRow} ${selected ? 'bg-surface-2' : ''}`}>
                <td className="num text-fg-muted">{row.rank}</td>
                <th scope="row" className="num text-left font-medium">
                  {row.length}
                </th>
                <td className="num text-right">{ic4(row.mean_ic)}</td>
                <td className="num text-right">{row.smallest_column}</td>
                <td className="num text-right">{row.kasiski_repeats}</td>
                <td className={row.plausible ? 'text-accent-ink' : 'text-fg-muted'}>{row.plausible ? 'plausible' : 'unlikely'}</td>
                <td className="text-right">
                  <button
                    type="button"
                    className="btn btn-sm"
                    aria-pressed={selected}
                    aria-label={`Analyse key length ${row.length}`}
                    disabled={loadingLength !== null}
                    onClick={() => onChoose(row.length)}
                  >
                    {loadingLength === row.length ? 'Analysing…' : 'Analyse'}
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function VigenereTab() {
  const { analysis, sendCandidateToWorkspace } = useSession()
  const { vigenereLengths, vigenereCandidates, vigenereLength, text, run, investigateLength, isStale } = analysis
  const [picked, setPicked] = useState<{ ranFor: string; length: number; key: string } | null>(null)

  const canRun = text.trim() !== '' && textLength(text) <= MAX_TEXT_LENGTH && vigenereLengths.status !== 'loading'
  const lengths = vigenereLengths.status === 'success' ? vigenereLengths.result : null
  const candidates = vigenereCandidates.status === 'success' ? vigenereCandidates.result : null
  const stale = isStale('vigenere')

  const pickedKey =
    candidates && picked && vigenereCandidates.status === 'success' && picked.ranFor === vigenereCandidates.ranFor && picked.length === candidates.key_length
      ? picked.key
      : null
  const selected = candidates ? (candidates.candidates.find((c) => c.key === pickedKey) ?? candidates.candidates[0]) : undefined

  const items: CandidateItem[] =
    candidates?.candidates.map((c) => ({
      id: c.key,
      rank: c.rank,
      keyLabel: c.key,
      chi: c.column_chi_sum,
      plaintext: c.plaintext,
    })) ?? []

  const loadingLength = vigenereCandidates.status === 'loading' ? vigenereLength : null

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div className="max-w-[44rem]">
        <p className="m-0 text-sm text-fg-muted">
          A Vigenère key of length m turns every m-th letter into its own Caesar cipher. The investigation measures the
          index of coincidence, looks for repeated sequences (Kasiski), ranks the likely key lengths, then estimates each key
          letter from the letters in its column.
        </p>
        <p className="num mt-2 mb-0 text-[1.0625rem]">IC = Σ fᵢ(fᵢ − 1) / (N(N − 1))</p>
        <p className="caption m-0 mt-1">
          Sections are tagged <Evidence kind="measured" /> <Evidence kind="calculated" /> or <Evidence kind="suggestion" /> so
          you can see what is counted, what is computed, and what is only an estimate.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-primary" disabled={!canRun} onClick={() => void run('vigenere')}>
          {vigenereLengths.status === 'loading' ? (
            <>
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              Investigating…
            </>
          ) : (
            'Investigate key length'
          )}
        </button>
      </div>

      {vigenereLengths.status === 'error' && <ErrorNotice error={vigenereLengths.error} />}
      {vigenereLengths.status === 'idle' && (
        <Notice title="No analysis yet">Paste a suspected Vigenère ciphertext above and investigate its key length.</Notice>
      )}

      {lengths && (
        <div className="result-enter grid grid-cols-[minmax(0,1fr)] gap-8">
          {stale && (
            <Notice tone="warn" title="Out of date">
              The text changed after this analysis. Investigate again to update it.
            </Notice>
          )}
          <Notice tone={lengths.reliability === 'adequate' ? 'info' : 'warn'} title={RELIABILITY_LABEL[lengths.reliability]}>
            <p className="m-0">{lengths.note}</p>
            <p className="m-0 mt-1">Every result below is a statistical estimate. None of it is proof of the key or the plaintext.</p>
          </Notice>

          <div className={`grid grid-cols-[minmax(0,1fr)] gap-8 ${stale ? 'opacity-60' : ''}`}>
            <Block id="vig-ic" title="Index of coincidence" kinds={['measured', 'calculated']}>
              <dl className="m-0 mb-4 grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
                <div>
                  <dt className="caption">Letters analysed</dt>
                  <dd className="num m-0 text-lg">{lengths.index_of_coincidence.letters}</dd>
                </div>
                <div>
                  <dt className="caption">IC of this text</dt>
                  <dd className="num m-0 text-lg" data-testid="ic-value">
                    {ic4(lengths.index_of_coincidence.ic)}
                  </dd>
                </div>
                <div>
                  <dt className="caption">Reading</dt>
                  <dd className="num m-0 text-lg" data-testid="ic-reading">
                    {lengths.index_of_coincidence.reading.replace('_', '-')}
                  </dd>
                </div>
                <div>
                  <dt className="caption">Friedman key length</dt>
                  <dd className="num m-0 text-lg">
                    {lengths.index_of_coincidence.friedman_key_length === null
                      ? '—'
                      : lengths.index_of_coincidence.friedman_key_length.toFixed(1)}
                  </dd>
                  <dd className="caption m-0">rough estimate</dd>
                </div>
              </dl>
              <IcGauge ic={lengths.index_of_coincidence} />
              <p className="mt-3 mb-0 max-w-[44rem] text-sm text-fg-muted">{lengths.index_of_coincidence.note}</p>
            </Block>

            <KasiskiBlock result={lengths.kasiski} />

            <Block id="vig-lengths" title="Candidate key lengths" kinds={['calculated', 'suggestion']}>
              <p className="m-0 max-w-[44rem] text-sm text-fg-muted">
                For each length m the letters are split into m columns, and the index of coincidence of each column is
                averaged. At the true length every column is a single Caesar cipher and looks like English (about 0.0655);
                at other lengths the columns mix several shifts and fall towards 0.0385. Multiples of the true length look
                good too, so plausible lengths are listed shortest first.
              </p>
              <p className="num mt-3 mb-3 text-sm" data-testid="suggested-length">
                {lengths.suggested_length === null
                  ? 'No length is suggested.'
                  : `Suggested key length: ${lengths.suggested_length}`}
              </p>
              <LengthChart rows={lengths.lengths} suggested={lengths.suggested_length} />
              <LengthsTable
                rows={lengths.lengths}
                chosen={vigenereLength}
                loadingLength={loadingLength}
                onChoose={(length) => void investigateLength(length)}
              />
            </Block>
          </div>

          {vigenereCandidates.status === 'error' && <ErrorNotice error={vigenereCandidates.error} />}
          {vigenereLength === null && vigenereCandidates.status === 'idle' && (
            <Notice title="Choose a key length">
              No length was suggested automatically. Pick one in the table above to estimate the key letters for it.
            </Notice>
          )}

          {candidates && selected && (
            <Block id="vig-key" title={`Key letters for length ${candidates.key_length}`} kinds={['calculated', 'suggestion']}>
              <Notice
                tone={candidates.reliability === 'adequate' ? 'info' : 'warn'}
                title={RELIABILITY_LABEL[candidates.reliability]}
              >
                <p className="m-0">{candidates.note}</p>
              </Notice>

              <p className="mt-4 mb-2 max-w-[44rem] text-sm text-fg-muted">
                Each column is a Caesar cipher. Its key letter is the shift whose decryption has the smallest χ² against
                English. Candidate keys combine the best shifts of every column and are ranked by the sum of the column χ²
                values.
              </p>

              <div className="relative overflow-x-auto">
                <table className="w-full min-w-[34rem] border-collapse text-sm">
                  <caption className="sr-only">Estimated key letter for each position of the key</caption>
                  <thead>
                    <tr className={headRow}>
                      <Th>Position</Th>
                      <Th>Letter</Th>
                      <Th right>Letters in column</Th>
                      <Th right>χ²</Th>
                      <Th>Alternatives</Th>
                      <Th right>Runner-up ÷ best</Th>
                      <Th>Reliability</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.columns.map((c) => (
                      <tr key={c.position} className={bodyRow}>
                        <td className="num text-fg-muted">{c.position + 1}</td>
                        <th scope="row" className="num text-left text-base font-medium">
                          {c.best.letter}
                        </th>
                        <td className="num text-right">{c.size}</td>
                        <td className="num text-right">{fmtChi(c.best.chi_squared)}</td>
                        <td className="num text-fg-muted">
                          {c.options
                            .slice(1)
                            .map((o) => `${o.letter} ${fmtChi(o.chi_squared)}`)
                            .join(' · ')}
                        </td>
                        <td className="num text-right">{c.separation === null ? '—' : `${c.separation.toFixed(2)}×`}</td>
                        <td className="text-fg-muted">{RELIABILITY_LABEL[c.reliability]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
                <CandidateTable
                  items={items}
                  selectedId={selected.key}
                  onSelect={(id) =>
                    vigenereCandidates.status === 'success' &&
                    setPicked({ ranFor: vigenereCandidates.ranFor, length: candidates.key_length, key: id })
                  }
                  keyHeader="Candidate key"
                  initialRows={10}
                  noun="keys"
                  scoreHeader="Σ column χ²"
                />
                <CandidateInspector
                  title={selected.key}
                  rank={selected.rank}
                  total={candidates.candidates.length}
                  chi={selected.column_chi_sum}
                  bestChi={candidates.candidates[0]?.column_chi_sum ?? 0}
                  scoreLabel="Σ column χ²"
                  plaintext={selected.plaintext}
                  loading={false}
                  error={null}
                  facts={[
                    `whole-text χ² ${fmtChi(selected.text_chi_squared)}`,
                    selected.shortest_equivalent_key !== selected.key
                      ? `same as the shorter key ${selected.shortest_equivalent_key}`
                      : `key length ${selected.key.length}`,
                  ]}
                  onSend={() => sendCandidateToWorkspace({ cipher: 'vigenere', candidate: selected }, selected.plaintext)}
                />
              </div>
            </Block>
          )}
        </div>
      )}
    </div>
  )
}
