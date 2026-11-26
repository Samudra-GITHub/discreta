import { useRef, type KeyboardEvent } from 'react'
import { AffineTab } from '../components/analysis/AffineTab'
import { CaesarTab } from '../components/analysis/CaesarTab'
import { FrequencyTab } from '../components/analysis/FrequencyTab'
import { VigenereTab } from '../components/analysis/VigenereTab'
import { TextEditor } from '../components/TextEditor'
import { PageHeader } from '../components/ui'
import { MAX_TEXT_LENGTH, textLength } from '../modules/algebra/cipherMath'
import { useSession } from '../session/sessionContext'
import type { AnalysisKind } from '../types/analysis'

const TABS: readonly { id: AnalysisKind; label: string }[] = [
  { id: 'frequency', label: 'Frequency Analysis' },
  { id: 'caesar', label: 'Caesar Analysis' },
  { id: 'affine', label: 'Affine Analysis' },
  { id: 'vigenere', label: 'Vigenère Analysis' },
]

export function AnalysisPage() {
  const { analysis } = useSession()
  const { text, setText, tab, setTab, clear } = analysis
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = TABS.findIndex((t) => t.id === tab)
    const next =
      event.key === 'ArrowRight' ? (index + 1) % TABS.length
      : event.key === 'ArrowLeft' ? (index - 1 + TABS.length) % TABS.length
      : event.key === 'Home' ? 0
      : event.key === 'End' ? TABS.length - 1
      : null
    if (next === null) return
    event.preventDefault()
    const target = TABS[next]
    if (!target) return
    setTab(target.id)
    refs.current[target.id]?.focus()
  }

  return (
    <>
      <PageHeader eyebrow="02 · Analysis" title="Analysis Lab">
        Investigate ciphertext: count its letters, compare them with English, and rank every possible Caesar or affine key, and
        investigate the key length of a Vigenère cipher. The same text is used in all four tabs.
      </PageHeader>

      <section className="mb-8 max-w-[52rem] border-t border-line pt-4" aria-label="Text under investigation">
        <TextEditor
          id="analysis-input"
          label="Ciphertext"
          value={text}
          onChange={setText}
          onClear={clear}
          rows={6}
          placeholder="Paste the ciphertext to investigate, or send a result here from the Cipher Workspace."
          error={textLength(text) > MAX_TEXT_LENGTH ? `The text is longer than ${MAX_TEXT_LENGTH.toLocaleString('en-US')} characters.` : undefined}
        />
        <p className="caption mt-2">Clear empties the text and every result below.</p>
      </section>

      <div
        role="tablist"
        aria-label="Analysis methods"
        onKeyDown={onKeyDown}
        className="mb-6 flex gap-1 overflow-x-auto border-b border-line"
      >
        {TABS.map((t) => {
          const selected = tab === t.id
          return (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[t.id] = el
              }}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={selected}
              aria-controls={`panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setTab(t.id)}
              className={`relative shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors duration-150 ${
                selected
                  ? 'border-accent text-fg'
                  : 'border-transparent text-fg-muted hover:text-fg'
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={0} className="outline-offset-4">
        {tab === 'frequency' && <FrequencyTab />}
        {tab === 'caesar' && <CaesarTab />}
        {tab === 'affine' && <AffineTab />}
        {tab === 'vigenere' && <VigenereTab />}
      </div>
    </>
  )
}
