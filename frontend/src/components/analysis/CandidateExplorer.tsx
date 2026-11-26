import { useState, type ReactNode } from 'react'
import { fmtChi } from '../../modules/analysis/interpret'
import { CopyButton, ErrorNotice, Notice } from '../ui'
import type { LabError } from '../../modules/algebra/labErrors'

export interface CandidateItem {
  id: string
  rank: number
  keyLabel: string
  chi: number
  /** Null when the text is not loaded yet. */
  plaintext: string | null
}

const PREVIEW = 56

const preview = (text: string | null) => {
  if (text === null) return '—'
  const flat = text.replace(/\s+/g, ' ')
  return flat.length > PREVIEW ? `${flat.slice(0, PREVIEW)}…` : flat
}

interface ExplorerProps {
  items: CandidateItem[]
  selectedId: string
  onSelect: (id: string) => void
  keyHeader: string
  /** How many rows to show before "Show all". */
  initialRows: number
  /** What the table lists, for the caption and the toggle, e.g. "keys". */
  noun: string
  children?: ReactNode
}

/** A ranked table of candidate keys with a compact preview of each decryption. */
export function CandidateTable({ items, selectedId, onSelect, keyHeader, initialRows, noun }: ExplorerProps) {
  const [all, setAll] = useState(false)
  const maxChi = Math.max(...items.map((item) => item.chi))
  const visible = all ? items : items.slice(0, initialRows)

  return (
    <div>
      <div className="relative overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">
            Candidate {noun} ranked by chi-squared, lowest first. Select Inspect to read a candidate in full.
          </caption>
          <thead>
            <tr className="border-b border-line-strong text-left text-xs text-fg-muted [&>th]:py-2 [&>th]:pr-3 [&>th]:font-medium">
              <th scope="col">Rank</th>
              <th scope="col">{keyHeader}</th>
              <th scope="col" className="sm:min-w-28">χ²</th>
              <th scope="col" className="hidden md:table-cell">Decrypted start</th>
              <th scope="col" className="text-right">
                <span className="sr-only">Inspect</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((item) => {
              const selected = item.id === selectedId
              return (
                <tr
                  key={item.id}
                  aria-selected={selected}
                  className={`border-b border-line align-middle [&>*]:py-1.5 [&>*]:pr-2 sm:[&>*]:pr-3 ${selected ? 'bg-surface-2' : ''}`}
                >
                  <td className="num text-fg-muted">
                    {item.rank}
                    {item.rank === 1 && <span className="ml-1.5 text-xs font-medium text-accent-ink">best</span>}
                  </td>
                  <th scope="row" className="num text-left font-medium whitespace-nowrap">{item.keyLabel}</th>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="num w-14 shrink-0 text-right">{fmtChi(item.chi)}</span>
                      <span aria-hidden="true" className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-line sm:block">
                        <span
                          className={`block h-full rounded-full ${item.rank === 1 ? 'bg-accent' : 'bg-slate'}`}
                          style={{ width: `${Math.max(2, (item.chi / maxChi) * 100)}%` }}
                        />
                      </span>
                    </div>
                  </td>
                  <td className="num hidden max-w-[22rem] truncate text-fg-muted md:table-cell">{preview(item.plaintext)}</td>
                  <td className="text-right">
                    <button
                      type="button"
                      aria-pressed={selected}
                      aria-label={`Inspect ${item.keyLabel}`}
                      className="btn btn-sm"
                      onClick={() => onSelect(item.id)}
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {items.length > initialRows && (
        <button type="button" className="btn btn-sm mt-3" onClick={() => setAll((v) => !v)} aria-expanded={all}>
          {all ? `Show only the best ${initialRows}` : `Show all ${items.length} ${noun}`}
        </button>
      )}
    </div>
  )
}

interface InspectorProps {
  title: string
  rank: number
  total: number
  chi: number
  bestChi: number
  plaintext: string | null
  loading: boolean
  error: LabError | null
  /** Extra facts such as the modular inverse. */
  facts?: string[]
  onSend: () => void
}

/** The selected candidate in full: its text, its score against the best, and what to do next. */
export function CandidateInspector({
  title,
  rank,
  total,
  chi,
  bestChi,
  plaintext,
  loading,
  error,
  facts = [],
  onSend,
}: InspectorProps) {
  const ratio = bestChi > 0 ? chi / bestChi : null
  return (
    <section aria-labelledby="inspector-title" className="grid content-start gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="inspector-title" className="text-base">
          Inspecting <span className="num">{title}</span>
        </h3>
        <p className="num text-xs text-fg-muted">
          rank {rank} of {total} · χ² {fmtChi(chi)}
          {ratio !== null && rank !== 1 && ` · ${ratio.toFixed(2)}× the best`}
        </p>
      </div>

      <div className="panel min-h-[8rem] p-3" aria-live="polite">
        {loading && <p className="m-0 text-sm text-fg-muted">Decrypting with the backend…</p>}
        {error && <ErrorNotice error={error} />}
        {plaintext !== null && !loading && (
          <pre
            data-testid="candidate-plaintext"
            className="num m-0 max-h-[18rem] overflow-auto text-[0.9375rem] leading-relaxed break-words whitespace-pre-wrap"
          >
            {plaintext === '' ? '(empty)' : plaintext}
          </pre>
        )}
      </div>

      {facts.length > 0 && <p className="caption num m-0">{facts.join(' · ')}</p>}

      <div className="flex flex-wrap gap-2">
        <CopyButton text={plaintext ?? ''} label="Copy text" disabled={plaintext === null} />
        <button type="button" className="btn btn-sm btn-primary" disabled={plaintext === null} onClick={onSend}>
          Send to Cipher Workspace
        </button>
      </div>
      <p className="caption m-0">
        The workspace is set to encrypt this text with the same key, which should reproduce your ciphertext.
      </p>
    </section>
  )
}

/** Reliability and estimate caveats shown above a ranking. */
export function ReliabilityNotice({
  level,
  note,
  separation,
  separationText,
}: {
  level: 'very_low' | 'low' | 'adequate'
  note: string
  separation: number | null
  separationText: string | null
}) {
  const label =
    level === 'very_low' ? 'Very low reliability' : level === 'low' ? 'Low reliability' : 'Usable sample size'
  return (
    <Notice tone={level === 'adequate' ? 'info' : 'warn'} title={label}>
      <p className="m-0">{note}</p>
      {separation !== null && separationText && <p className="m-0 mt-1">{separationText}</p>}
      <p className="m-0 mt-1">A statistical ranking is an estimate. It is not proof that a candidate is the plaintext.</p>
    </Notice>
  )
}
