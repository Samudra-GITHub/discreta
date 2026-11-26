import { mod26 } from '../../modules/algebra/cipherMath'
import type { CipherLab } from '../../modules/algebra/useCipherLab'

/**
 * The one formula that applies to the current cipher and operation, with the key filled in
 * when it is valid. The modular inverse a⁻¹ is shown only when the backend has reported it.
 */
export function Formula({ lab }: { lab: CipherLab }) {
  const { inputs, validation, run, stale } = lab
  const { cipher, operation } = inputs

  const symbolic =
    cipher === 'caesar'
      ? operation === 'encrypt'
        ? 'E(x) = (x + k) mod 26'
        : 'D(y) = (y − k) mod 26'
      : operation === 'encrypt'
        ? 'E(x) = (a·x + b) mod 26'
        : 'D(y) = a⁻¹ · (y − b) mod 26'

  const fresh = run.status === 'success' && !stale ? run.result : null
  const inverse = fresh && fresh.cipher === 'affine' ? fresh.a_inverse : null

  let numeric: string | null = null
  if (cipher === 'caesar' && validation.key.ok) {
    const k = mod26(validation.key.big)
    numeric = operation === 'encrypt' ? `E(x) = (x + ${k}) mod 26` : `D(y) = (y − ${k}) mod 26`
  } else if (cipher === 'affine' && validation.a.ok && validation.b.ok && validation.multiplier?.valid) {
    const a = validation.multiplier.residue
    const b = mod26(validation.b.big)
    if (operation === 'encrypt') numeric = `E(x) = (${a}·x + ${b}) mod 26`
    else if (inverse !== null) numeric = `D(y) = ${inverse} · (y − ${b}) mod 26`
  }

  return (
    <div className="border-t border-line pt-4">
      <h2 className="mb-2 text-base">Formula</h2>
      <p className="num text-[1.0625rem]">{symbolic}</p>
      {numeric && (
        <p className="num mt-1 text-[1.0625rem] text-accent-ink" data-testid="formula-numeric">
          {numeric}
        </p>
      )}
      <p className="caption mt-2 max-w-[40rem]">
        x and y are letter positions, A = 0 to Z = 25.
        {cipher === 'affine' && (
          <>
            {' '}
            a⁻¹ is the modular inverse of a, with a · a⁻¹ ≡ 1 (mod 26); it exists only when gcd(a, 26) = 1.
            {inverse !== null
              ? ` For this key the backend reports a⁻¹ = ${inverse}.`
              : operation === 'decrypt'
                ? ' The backend reports a⁻¹ when you run the cipher.'
                : ''}
          </>
        )}
      </p>
    </div>
  )
}
