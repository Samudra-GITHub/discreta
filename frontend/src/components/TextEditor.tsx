import { ClipboardPaste, Eraser } from 'lucide-react'
import { useState, type KeyboardEvent, type ReactNode } from 'react'
import { MAX_TEXT_LENGTH, textLength } from '../modules/algebra/cipherMath'

interface TextEditorProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  /** Called by the Clear button; defaults to emptying the text. */
  onClear?: () => void
  /** Called on Ctrl/Cmd+Enter. */
  onSubmit?: () => void
  /** Message about the text itself, such as "too long" or a backend complaint. */
  error?: string
  /** Extra controls placed beside Paste and Clear. */
  actions?: ReactNode
}

/** The shared text input: label, counter, paste and clear. Used for plaintext and ciphertext. */
export function TextEditor({
  id,
  label,
  value,
  onChange,
  placeholder,
  rows = 9,
  onClear,
  onSubmit,
  error,
  actions,
}: TextEditorProps) {
  const [pasteProblem, setPasteProblem] = useState(false)
  const count = textLength(value)

  const paste = async () => {
    try {
      onChange(await navigator.clipboard.readText())
      setPasteProblem(false)
    } catch {
      setPasteProblem(true) // clipboard reads are blocked in some browsers
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (onSubmit && event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      onSubmit()
    }
  }

  return (
    <div>
      <div className="mb-1.5 flex min-h-8 flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <div className="flex items-center gap-1">
          {actions}
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => void paste()}>
            <ClipboardPaste aria-hidden="true" className="size-3.5" />
            Paste
          </button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => (onClear ? onClear() : onChange(''))} disabled={value === ''}>
            <Eraser aria-hidden="true" className="size-3.5" />
            Clear
          </button>
        </div>
      </div>
      <textarea
        id={id}
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-meta`}
        className="field num block min-h-[11rem] resize-y text-[0.9375rem] leading-relaxed"
      />
      <div id={`${id}-meta`} className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className={`text-xs ${error ? 'font-medium text-err' : 'text-fg-muted'}`} role={error ? 'alert' : undefined}>
          {error ??
            (pasteProblem
              ? 'The browser blocked clipboard access. Paste with Ctrl+V instead.'
              : onSubmit
                ? 'Ctrl+Enter runs it.'
                : '')}
        </p>
        <p className={`num text-xs ${count > MAX_TEXT_LENGTH ? 'font-medium text-err' : 'text-fg-muted'}`}>
          {count.toLocaleString('en-US')} / {MAX_TEXT_LENGTH.toLocaleString('en-US')} characters
        </p>
      </div>
    </div>
  )
}
