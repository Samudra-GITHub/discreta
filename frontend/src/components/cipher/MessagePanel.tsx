import { Eraser, PenLine } from 'lucide-react'
import { MAX_TEXT_LENGTH } from '../../modules/algebra/cipherMath'
import type { CipherLab } from '../../modules/algebra/useCipherLab'
import { Tile } from '../Tile'

export function MessagePanel({ lab }: { lab: CipherLab }) {
  const { inputs, validation, setText, clear } = lab
  const { textLength, textTooLong, messages } = validation
  const encrypting = inputs.operation === 'encrypt'

  return (
    <Tile
      title={encrypting ? 'Message' : 'Ciphertext'}
      icon={PenLine}
      rise={4}
      action={
        <button
          type="button"
          onClick={clear}
          disabled={inputs.text === ''}
          className="aurora-chip flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-bold text-fg-muted transition-colors duration-150 hover:text-accent-strong disabled:opacity-45"
        >
          <Eraser aria-hidden="true" className="size-3.5" />
          Clear
        </button>
      }
    >
      <label htmlFor="cipher-input" className="sr-only">
        {encrypting ? 'Message to encrypt' : 'Ciphertext to decrypt'}
      </label>
      <textarea
        id="cipher-input"
        value={inputs.text}
        onChange={(event) => setText(event.target.value)}
        rows={6}
        spellCheck={false}
        placeholder={
          encrypting
            ? 'Type or paste a message. Only the letters A to Z change; spaces, digits and punctuation stay as they are.'
            : 'Paste the ciphertext to decode.'
        }
        aria-invalid={textTooLong ? true : undefined}
        aria-describedby="cipher-input-count"
        className="aurora-inset block min-h-36 w-full resize-y rounded-2xl p-3.5 text-base leading-relaxed font-medium text-fg placeholder:text-fg-subtle"
      />
      <div id="cipher-input-count" className="mt-2 flex items-center justify-between gap-3 text-xs font-semibold">
        <span className={textTooLong ? 'text-err' : 'text-fg-muted'}>
          {messages.text ?? 'Nothing is sent until you press the button.'}
        </span>
        <span className={`shrink-0 tabular-nums ${textTooLong ? 'text-err' : 'text-fg-subtle'}`}>
          {textLength.toLocaleString('en-US')} / {MAX_TEXT_LENGTH.toLocaleString('en-US')}
        </span>
      </div>
    </Tile>
  )
}
