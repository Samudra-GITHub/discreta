import { Sigma } from 'lucide-react'
import type { ReactNode } from 'react'
import { mod26 } from '../../modules/algebra/cipherMath'
import type { CipherLab } from '../../modules/algebra/useCipherLab'
import type { CipherResponse } from '../../types/cipher'
import { Tile } from '../Tile'

/** Italic serif, the usual look of a variable in a mathematical expression. */
const V = ({ children }: { children: ReactNode }) => <i className="px-[0.07em] font-serif text-[1.05em]">{children}</i>

const Mod = () => <span className="whitespace-nowrap text-fg-muted"> mod 26</span>

const inverse = (
  <>
    <V>a</V>
    <sup>−1</sup>
  </>
)

/** The symbolic formula for the chosen cipher and operation. */
function Symbolic({ cipher, operation }: Pick<CipherLab['inputs'], 'cipher' | 'operation'>) {
  if (cipher === 'caesar') {
    return operation === 'encrypt' ? (
      <>
        <V>E</V>(<V>x</V>) = (<V>x</V> + <V>k</V>)
        <Mod />
      </>
    ) : (
      <>
        <V>D</V>(<V>y</V>) = (<V>y</V> − <V>k</V>)
        <Mod />
      </>
    )
  }
  return operation === 'encrypt' ? (
    <>
      <V>E</V>(<V>x</V>) = (<V>a</V>·<V>x</V> + <V>b</V>)
      <Mod />
    </>
  ) : (
    <>
      <V>D</V>(<V>y</V>) = {inverse}(<V>y</V> − <V>b</V>)
      <Mod />
    </>
  )
}

/** The same formula with the numbers filled in, from the backend's reply when there is one. */
function Substituted({ lab, result }: { lab: CipherLab; result: CipherResponse | null }) {
  const { inputs, validation } = lab
  if (inputs.cipher === 'caesar') {
    const k = result?.cipher === 'caesar' ? result.effective_key : validation.key.ok ? mod26(validation.key.big) : null
    if (k === null) return null
    return inputs.operation === 'encrypt' ? (
      <>
        <V>E</V>(<V>x</V>) = (<V>x</V> + {k})
        <Mod />
      </>
    ) : (
      <>
        <V>D</V>(<V>y</V>) = (<V>y</V> − {k})
        <Mod />
      </>
    )
  }

  const from = result?.cipher === 'affine' ? result : null
  const a = from ? from.effective_a : validation.a.ok && validation.multiplier?.valid ? mod26(validation.a.big) : null
  const b = from ? from.effective_b : validation.b.ok ? mod26(validation.b.big) : null
  if (a === null || b === null) return null
  return inputs.operation === 'encrypt' ? (
    <>
      <V>E</V>(<V>x</V>) = ({a}·<V>x</V> + {b})
      <Mod />
    </>
  ) : (
    <>
      <V>D</V>(<V>y</V>) = {from ? from.a_inverse : inverse}(<V>y</V> − {b})
      <Mod />
    </>
  )
}

/** Why a⁻¹ is what it is, using the numbers the backend returned; shown only if they check out. */
function InverseCheck({ result }: { result: Extract<CipherResponse, { cipher: 'affine' }> }) {
  const { effective_a: a, a_inverse: inv } = result
  const product = a * inv
  const quotient = Math.floor(product / 26)
  if (product % 26 !== 1) return null
  return (
    <p className="text-sm leading-relaxed font-medium text-fg">
      The backend returned <b>{inverse} = {inv}</b>. Check: {a} · {inv} = {product} = {quotient} · 26 + 1, so{' '}
      {a} · {inv} ≡ 1 (mod 26).
    </p>
  )
}

export function FormulaPanel({ lab, flat = false }: { lab: CipherLab; flat?: boolean }) {
  const { inputs, run, stale } = lab
  // A result from earlier inputs must not fill in numbers for the current ones.
  const result = run.status === 'success' && !stale ? run.result : null
  const decryptingAffine = inputs.cipher === 'affine' && inputs.operation === 'decrypt'
  const input = inputs.operation === 'encrypt' ? 'x' : 'y'

  return (
    <Tile title="Formula" icon={Sigma} rise={2} flat={flat}>
      <div className="aurora-inset rounded-2xl px-4 py-3.5 text-[1.2rem] leading-snug text-fg" data-testid="formula-symbolic">
        <Symbolic cipher={inputs.cipher} operation={inputs.operation} />
      </div>

      <div className="mt-3 text-[1.1rem] leading-snug font-semibold text-accent-strong" data-testid="formula-substituted">
        <Substituted lab={lab} result={result} />
      </div>
      <p className="mt-0.5 text-xs font-medium text-fg-muted">
        {result ? 'With the reduced keys the backend used.' : 'With your key (a preview until you run it).'}
      </p>

      <ul className="mt-3 space-y-1 text-xs leading-relaxed font-medium text-fg-muted">
        <li>
          <V>{input}</V> is the letter&apos;s number: A = 0, B = 1, … Z = 25.
        </li>
        {inputs.cipher === 'caesar' ? (
          <li>
            <V>k</V> may be negative or larger than 25; only <V>k</V> mod 26 matters.
          </li>
        ) : (
          <li>
            <V>a</V> must satisfy gcd(<V>a</V>, 26) = 1; <V>b</V> is any whole number.
          </li>
        )}
        {decryptingAffine && (
          <li>
            {inverse} is the number with <V>a</V>·{inverse} ≡ 1 (mod 26); it undoes the multiplication.
          </li>
        )}
      </ul>

      {decryptingAffine && (
        <div className="mt-3 border-t border-line pt-3" data-testid="inverse-note">
          {result?.cipher === 'affine' ? (
            <InverseCheck result={result} />
          ) : (
            <p className="text-sm font-medium text-fg-muted">
              The backend works out {inverse} when you run the operation, and it is shown here.
            </p>
          )}
        </div>
      )}
    </Tile>
  )
}
