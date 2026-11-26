import { useMemo } from 'react'
import { buildWorkedExample } from '../../modules/algebra/cipherMath'
import type { CipherResponse } from '../../types/cipher'

const STEPS_SHOWN = 3

/**
 * The arithmetic behind the first few letters, e.g. `H = 7 → 7 + 3 = 10 → K`. It is built
 * from the backend's own reduced key and inverse, and checked letter by letter against the
 * backend's output; if anything disagrees nothing is shown rather than a wrong explanation.
 */
export function WorkedSteps({ response }: { response: CipherResponse }) {
  const example = useMemo(() => buildWorkedExample(response, STEPS_SHOWN), [response])

  if (example.status === 'no-letters') {
    return <p className="caption m-0">No letters in the message, so nothing changed: digits, spaces and punctuation pass through.</p>
  }
  if (example.status === 'unverified') {
    return (
      <p className="caption m-0" data-testid="worked-unverified">
        The worked example is hidden because it did not match the backend's output.
      </p>
    )
  }

  return (
    <div data-testid="worked-steps">
      <p className="caption m-0 mb-1.5">
        First {example.steps.length} of {example.lettersTotal} letters, checked against the backend's output:
      </p>
      <ul className="num m-0 grid list-none gap-0.5 p-0 text-[0.8125rem]">
        {example.steps.map((s, i) => (
          <li key={i} data-testid="worked-step">
            {s.input} = {s.number} → {s.expression}
            {s.keyLetter ? ` (key ${s.keyLetter})` : ''}
            {s.raw !== s.result ? ` = ${s.raw} ≡ ${s.result}` : ` = ${s.result}`} → <span className="text-accent-ink">{s.output}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
