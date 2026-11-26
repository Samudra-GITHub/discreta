import { LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { interpretFrequency } from '../../modules/analysis/interpret'
import { fmtChi, fmtPercent, fmtSigned } from '../../modules/analysis/interpret'
import { MAX_TEXT_LENGTH, textLength } from '../../modules/algebra/cipherMath'
import { useSession } from '../../session/sessionContext'
import { ErrorNotice, Notice, Segmented } from '../ui'
import { DifferenceChart, FrequencyChart, type Metric } from './FrequencyCharts'

const METRICS = [
  { value: 'percent', label: 'Percent' },
  { value: 'count', label: 'Count' },
] as const satisfies readonly { value: Metric; label: string }[]

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="min-w-0">
      <dt className="caption">{label}</dt>
      <dd className="num m-0 mt-0.5 text-lg break-words text-fg">{value}</dd>
      {note && <dd className="caption m-0">{note}</dd>}
    </div>
  )
}

export function FrequencyTab() {
  const { analysis } = useSession()
  const { frequency, text, run, isStale } = analysis
  const [metric, setMetric] = useState<Metric>('percent')

  const length = textLength(text)
  const canRun = text.trim() !== '' && length <= MAX_TEXT_LENGTH && frequency.status !== 'loading'
  const stale = isStale('frequency')
  const result = frequency.status === 'success' ? frequency.result : null

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-primary" disabled={!canRun} onClick={() => void run('frequency')}>
          {frequency.status === 'loading' ? (
            <>
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              Analysing…
            </>
          ) : (
            'Analyse letter frequencies'
          )}
        </button>
        <p className="caption max-w-[34rem]">
          Counts the letters A to Z (case ignored) and compares them with typical English text.
        </p>
      </div>

      {frequency.status === 'error' && <ErrorNotice error={frequency.error} />}
      {frequency.status === 'idle' && (
        <Notice title="No analysis yet">Paste ciphertext above, or send a result here from the Cipher Workspace.</Notice>
      )}

      {result && (
        <div className="result-enter grid grid-cols-[minmax(0,1fr)] gap-8">
          {stale && (
            <Notice tone="warn" title="Out of date">
              The text changed after this analysis. Analyse again to update it.
            </Notice>
          )}

          <dl className={`m-0 grid grid-cols-2 gap-x-6 gap-y-4 border-y border-line py-4 md:grid-cols-4 ${stale ? 'opacity-60' : ''}`}>
            <Stat label="Letters analysed" value={result.letters.toLocaleString('en-US')} note={`of ${result.total_characters.toLocaleString('en-US')} characters`} />
            <Stat
              label="χ² vs English"
              value={result.chi_squared === null ? '—' : fmtChi(result.chi_squared)}
              note="25 degrees of freedom"
            />
            <Stat
              label="Most frequent"
              value={result.most_frequent.length ? result.most_frequent.join(' ') : '—'}
            />
            <Stat
              label="Least frequent present"
              value={result.least_frequent.length ? result.least_frequent.join(' ') : '—'}
              note={result.absent.length ? `${result.absent.length} letters absent` : 'all 26 letters present'}
            />
          </dl>

          {result.letters > 0 && (
            <div className={`grid grid-cols-[minmax(0,1fr)] gap-8 ${stale ? 'opacity-60' : ''}`}>
              <section aria-labelledby="freq-chart-title">
                <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                  <h3 id="freq-chart-title" className="text-base">
                    Letter frequencies
                  </h3>
                  <Segmented legend="Show" name="metric" value={metric} options={METRICS} onChange={setMetric} />
                </div>
                <FrequencyChart rows={result.rows} metric={metric} />
              </section>

              <section aria-labelledby="freq-diff-title">
                <h3 id="freq-diff-title" className="mb-3 text-base">
                  Difference from English
                </h3>
                <DifferenceChart rows={result.rows} />
              </section>
            </div>
          )}

          <section aria-labelledby="freq-reading-title" className="max-w-[44rem]">
            <h3 id="freq-reading-title" className="mb-2 text-base">
              Reading the result
            </h3>
            <div className="grid gap-2 text-sm">
              {interpretFrequency(result).map((line) => (
                <p key={line} className="m-0">
                  {line}
                </p>
              ))}
            </div>
          </section>

          {result.letters > 0 && (
            <details open className="group border-t border-line pt-4">
              <summary className="cursor-pointer text-base font-semibold select-none [font-family:var(--font-display)]">
                Ranked letters
              </summary>
              <div className="relative mt-3 overflow-x-auto">
                <table className="num w-full min-w-[30rem] border-collapse text-sm">
                  <caption className="sr-only">
                    Letters ranked from most to least frequent, with counts and the English comparison
                  </caption>
                  <thead>
                    <tr className="border-b border-line-strong text-left text-xs text-fg-muted [&>th]:py-2 [&>th]:pr-3 [&>th]:font-medium">
                      <th scope="col">Rank</th>
                      <th scope="col">Letter</th>
                      <th scope="col" className="text-right">Count</th>
                      <th scope="col" className="text-right">Share</th>
                      <th scope="col" className="text-right">English</th>
                      <th scope="col" className="text-right">Difference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...result.rows]
                      .sort((a, b) => a.rank - b.rank)
                      .map((row) => (
                        <tr key={row.letter} className="border-b border-line [&>td]:py-1.5 [&>td]:pr-3">
                          <td className="text-fg-muted">{row.rank}</td>
                          <th scope="row" className="py-1.5 pr-3 text-left font-medium">{row.letter}</th>
                          <td className="text-right">{row.count}</td>
                          <td className="text-right">{fmtPercent(row.percent)}</td>
                          <td className="text-right text-fg-muted">{fmtPercent(row.english_percent)}</td>
                          <td className="text-right">{fmtSigned(row.difference)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}

          <details className="border-t border-line pt-4">
            <summary className="cursor-pointer text-base font-semibold select-none [font-family:var(--font-display)]">
              How characters are counted
            </summary>
            <div className="mt-3 max-w-[44rem] text-sm text-fg-muted">
              <p className="m-0">
                Only the ASCII letters A to Z and a to z are counted, and upper and lower case count as the same letter.
                Spaces, digits, punctuation and non-ASCII characters (accented or non-Latin letters, emoji) are ignored,
                because the Caesar and affine ciphers leave them unchanged. The text itself is never modified. The
                English reference is {result.reference}
              </p>
              <p className="num mt-2 mb-0">
                letters {result.breakdown.letters} · whitespace {result.breakdown.whitespace} · digits{' '}
                {result.breakdown.digits} · other ASCII {result.breakdown.other_ascii} · non-ASCII{' '}
                {result.breakdown.non_ascii}
              </p>
            </div>
          </details>
        </div>
      )}
    </div>
  )
}
