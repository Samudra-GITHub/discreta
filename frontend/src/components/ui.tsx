import { Check, Copy, Info, TriangleAlert, WifiOff, type LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { LabError } from '../modules/algebra/labErrors'

/** Small contextual header at the top of a page. It is a title, not navigation. */
export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string
  title: string
  children?: ReactNode
}) {
  return (
    <header className="mb-8 max-w-[44rem]">
      {eyebrow && <p className="num mb-2 text-xs text-fg-muted">{eyebrow}</p>}
      <h1 className="text-[1.75rem] sm:text-[2rem]">{title}</h1>
      {children && <p className="mt-2 text-[0.9375rem] text-fg-muted">{children}</p>}
    </header>
  )
}

/** A labelled group of controls with a thin rule above it, used instead of a card. */
export function Section({
  title,
  aside,
  children,
  className = '',
}: {
  title: string
  aside?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`border-t border-line pt-4 ${className}`}>
      <div className="mb-3 flex min-h-8 flex-wrap items-center justify-between gap-2">
        <h2 className="text-base">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

interface SegmentedProps<T extends string> {
  legend: string
  name: string
  value: T
  options: readonly { value: T; label: string; icon?: LucideIcon }[]
  onChange: (value: T) => void
}

/** A set of mutually exclusive choices, built on native radio inputs for free keyboard support. */
export function Segmented<T extends string>({ legend, name, value, options, onChange }: SegmentedProps<T>) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="mb-1.5 text-sm font-medium">{legend}</legend>
      <div className="inline-flex max-w-full rounded-md border border-line-strong bg-surface p-0.5">
        {options.map((option) => (
          <label
            key={option.value}
            className="relative inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[5px] px-3.5 text-sm font-medium text-fg-muted transition-colors duration-150 hover:text-fg has-[:checked]:bg-fg has-[:checked]:text-canvas has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-accent"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.icon && <option.icon aria-hidden="true" className="size-4" />}
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

/** A short message with an icon and a text label, so the severity never relies on colour. */
export function Notice({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'warn' | 'error'
  title: string
  children?: ReactNode
}) {
  const Icon = tone === 'info' ? Info : TriangleAlert
  const colour = tone === 'error' ? 'text-err' : tone === 'warn' ? 'text-warn' : 'text-fg-muted'
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className="flex gap-3 border-l-2 border-line-strong py-1 pl-3">
      <Icon aria-hidden="true" className={`mt-0.5 size-4 shrink-0 ${colour}`} />
      <div className="min-w-0 text-sm">
        <p className={`font-medium ${tone === 'info' ? 'text-fg' : colour}`}>{title}</p>
        {children && <div className="mt-0.5 text-fg-muted">{children}</div>}
      </div>
    </div>
  )
}

/** Error from a backend call, with a distinct look when the backend cannot be reached. */
export function ErrorNotice({ error }: { error: LabError }) {
  return (
    <div role="alert" className="flex gap-3 rounded-md border border-err/40 p-3">
      {error.kind === 'offline' ? (
        <WifiOff aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-err" />
      ) : (
        <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-err" />
      )}
      <div className="min-w-0 text-sm">
        <p className="font-medium text-err">{error.title}</p>
        <p className="mt-0.5 break-words text-fg-muted">{error.message}</p>
      </div>
    </div>
  )
}

/** Copy `text` to the clipboard; `copied` is true for a moment afterwards. */
export function useCopy() {
  const [copied, setCopied] = useState(false)
  const [failed, setFailed] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setFailed(false)
    } catch {
      setCopied(false)
      setFailed(true)
    }
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setCopied(false)
      setFailed(false)
    }, 1800)
  }, [])

  return { copy, copied, failed }
}

/** A copy button that confirms in words, not only with an icon. */
export function CopyButton({ text, label = 'Copy', disabled }: { text: string; label?: string; disabled?: boolean }) {
  const { copy, copied, failed } = useCopy()
  return (
    <button type="button" className="btn btn-sm" disabled={disabled} onClick={() => void copy(text)}>
      {copied ? <Check aria-hidden="true" className="size-3.5" /> : <Copy aria-hidden="true" className="size-3.5" />}
      <span aria-live="polite">{copied ? 'Copied' : failed ? 'Copy failed' : label}</span>
    </button>
  )
}
