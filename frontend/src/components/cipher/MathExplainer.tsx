import { BookOpen } from 'lucide-react'
import type { ReactNode } from 'react'
import { collisionFor, letterOf } from '../../modules/algebra/cipherMath'
import type { CipherLab } from '../../modules/algebra/useCipherLab'
import { Tile } from '../Tile'

const V = ({ children }: { children: ReactNode }) => <i className="px-[0.07em] font-serif">{children}</i>

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-bold text-fg">{title}</h3>
      <div className="mt-1 space-y-1.5 text-sm leading-relaxed font-medium text-fg-muted">{children}</div>
    </div>
  )
}

function CaesarExplainer({ operation }: { operation: 'encrypt' | 'decrypt' }) {
  return (
    <div className="grid gap-5 @3xl:grid-cols-3">
      <Block title="Letters are numbers">
        <p>
          Number the alphabet A = 0, B = 1, … Z = 25. Working with these numbers modulo 26 means that after 25 comes 0
          again, just like a clock wraps from 12 to 1.
        </p>
      </Block>
      <Block title={operation === 'encrypt' ? 'Encrypting adds k' : 'Decrypting subtracts k'}>
        <p>
          {operation === 'encrypt' ? (
            <>
              Each letter moves forward <V>k</V> places: <V>E</V>(<V>x</V>) = (<V>x</V> + <V>k</V>) mod 26. Past Z it
              wraps round to A.
            </>
          ) : (
            <>
              Each letter moves back <V>k</V> places: <V>D</V>(<V>y</V>) = (<V>y</V> − <V>k</V>) mod 26. This undoes
              encryption because (<V>x</V> + <V>k</V>) − <V>k</V> = <V>x</V>.
            </>
          )}
        </p>
      </Block>
      <Block title="Only k mod 26 matters">
        <p>
          Shifting by 26 brings every letter back, so <V>k</V> and <V>k</V> + 26 are the same key. A negative key such as
          −3 acts as 23. That leaves exactly 26 different Caesar keys.
        </p>
      </Block>
    </div>
  )
}

function AffineExplainer({ lab }: { lab: CipherLab }) {
  const { inputs, validation, run, stale } = lab
  const result = run.status === 'success' && !stale && run.result.cipher === 'affine' ? run.result : null

  // Always have a concrete example of a refused multiplier: the user's own if it is invalid,
  // otherwise a = 4, the smallest one.
  const invalidMultiplier = validation.a.ok && validation.multiplier && !validation.multiplier.valid ? validation.a.big : 4n
  const offset = validation.b.ok ? validation.b.big : 0n
  const collision = collisionFor(invalidMultiplier, offset)
  const residue = validation.a.ok && validation.multiplier && !validation.multiplier.valid ? validation.multiplier.residue : 4

  return (
    <div className="grid gap-5 @3xl:grid-cols-3">
      <Block title="Multiply, then shift">
        <p>
          The affine cipher first multiplies the letter number by <V>a</V>, then adds <V>b</V>, all modulo 26:{' '}
          <V>E</V>(<V>x</V>) = (<V>a</V>·<V>x</V> + <V>b</V>) mod 26. With <V>a</V> = 1 it is the Caesar cipher.
        </p>
      </Block>

      <Block title="Why gcd(a, 26) must be 1">
        <p>
          To decrypt we must undo the multiplication, which needs a number <V>a</V>
          <sup>−1</sup> with <V>a</V>·<V>a</V>
          <sup>−1</sup> ≡ 1 (mod 26). That number exists exactly when <V>a</V> and 26 share no factor, that is when gcd(
          <V>a</V>, 26) = 1. Since 26 = 2 · 13, <V>a</V> must be odd and not a multiple of 13: only 1, 3, 5, 7, 9, 11, 15,
          17, 19, 21, 23, 25.
        </p>
        {collision && (
          <p data-testid="collision-example">
            {inputs.cipher === 'affine' && validation.multiplier && !validation.multiplier.valid ? 'Your' : 'For example, with'}{' '}
            <V>a</V> = {residue}: the letters {letterOf(collision.first)} ({collision.first}) and {letterOf(collision.second)}{' '}
            ({collision.second}) both encrypt to {letterOf(collision.image)}, since {residue}·{collision.second} ={' '}
            {residue * collision.second} ≡ 0 (mod 26). Two letters sharing one result cannot be told apart again.
          </p>
        )}
      </Block>

      <Block title={inputs.operation === 'decrypt' ? 'The inverse used to decrypt' : 'The inverse, for decrypting'}>
        {result ? (
          <p data-testid="inverse-explainer">
            For <V>a</V> = {result.effective_a} the backend found <V>a</V>
            <sup>−1</sup> = {result.a_inverse}. Decryption is{' '}
            <V>D</V>(<V>y</V>) = {result.a_inverse}·(<V>y</V> − {result.effective_b}) mod 26: subtract the offset first,
            then multiply by the inverse to cancel <V>a</V>.
          </p>
        ) : (
          <p data-testid="inverse-explainer">
            Decryption is <V>D</V>(<V>y</V>) = <V>a</V>
            <sup>−1</sup>(<V>y</V> − <V>b</V>) mod 26: subtract the offset, then multiply by the inverse. The backend
            computes the inverse (with the extended Euclidean algorithm) and returns it, so it appears here once you run
            an operation.
          </p>
        )}
      </Block>
    </div>
  )
}

export function MathExplainer({ lab, flat = false }: { lab: CipherLab; flat?: boolean }) {
  return (
    <Tile title="The mathematics" icon={BookOpen} rise={7} flat={flat} className={`@container ${flat ? 'border-t border-line pt-6' : ''}`}>
      {lab.inputs.cipher === 'caesar' ? <CaesarExplainer operation={lab.inputs.operation} /> : <AffineExplainer lab={lab} />}
    </Tile>
  )
}
