import type { LucideIcon } from 'lucide-react'
import { useRef, type KeyboardEvent } from 'react'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  icon?: LucideIcon
  /** A short line under the label (used by the larger `cards` layout). */
  description?: string
}

interface SegmentedProps<T extends string> {
  label: string
  value: T
  options: readonly SegmentedOption<T>[]
  onChange: (value: T) => void
  layout?: 'pill' | 'cards'
}

/**
 * A single-choice control built as a radio group: one tab stop, arrow keys move the choice,
 * the chosen option is a raised white chip.
 */
export function Segmented<T extends string>({ label, value, options, onChange, layout = 'pill' }: SegmentedProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0
    if (step === 0) return
    event.preventDefault()
    const next = (index + step + options.length) % options.length
    const option = options[next]
    if (!option) return
    onChange(option.value)
    refs.current[next]?.focus()
  }

  const cards = layout === 'cards'
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`aurora-inset grid gap-1 rounded-2xl p-1 ${cards ? 'grid-cols-1' : 'grid-cols-2'}`}
    >
      {options.map((option, index) => {
        const selected = option.value === value
        const Icon = option.icon
        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[index] = node
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => move(event, index)}
            className={`group flex min-h-11 items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-[background-color,box-shadow,color] duration-200 ${
              selected ? 'aurora-chip text-accent-strong' : 'text-fg-muted hover:bg-raised/60 hover:text-fg'
            } ${cards ? 'flex-col items-start gap-0.5' : 'justify-center'}`}
          >
            <span className="flex items-center gap-2">
              {Icon && <Icon aria-hidden="true" className={`size-4 shrink-0 ${selected ? 'text-accent' : ''}`} />}
              <span className="text-sm font-bold">{option.label}</span>
            </span>
            {cards && option.description && (
              <span className="text-xs leading-snug font-medium text-fg-muted">{option.description}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
