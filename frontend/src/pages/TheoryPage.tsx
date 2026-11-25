import type { ReactNode } from 'react'
import { MapDiagram } from '../components/MapDiagram'
import { PageHero } from '../components/PageHero'
import { Sculpture } from '../components/sculpture/Sculpture'
import { Tile } from '../components/Tile'
import { bezout, euclidRows, mod26 } from '../modules/algebra/cipherMath'

const V = ({ children }: { children: ReactNode }) => <i className="px-[0.07em] font-serif">{children}</i>

function Theorem({ number, title, statement, children }: { number: number; title: string; statement: ReactNode; children: ReactNode }) {
  return (
    <article className="border-l-2 border-iris-violet/40 pl-4">
      <h3 className="text-lg font-bold tracking-wide text-fg [font-family:var(--font-display)]">
        Theorem {number}. <span className="text-fg-muted">{title}</span>
      </h3>
      <p className="mt-1 text-sm leading-relaxed font-semibold text-fg">{statement}</p>
      <div className="mt-2 space-y-1.5 text-sm leading-relaxed font-medium text-fg-muted">
        <p>
          <b className="text-fg">Proof.</b> {children} <span aria-hidden="true">∎</span>
        </p>
      </div>
    </article>
  )
}

/**
 * The mathematics behind the ciphers, with the proofs and two diagrams. Everything shown here
 * is used by the Cipher Laboratory; more topics will be added as the other modules are built.
 */
export function TheoryPage() {
  const rows = euclidRows(26, 7)
  const { g, x, y } = bezout(26, 7)

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Reference"
        title="Theory & Proofs"
        status="in-progress"
        description="The theorems that make the Caesar and affine ciphers work, each with its proof. More topics will appear here as the other modules are built."
        illustration={<Sculpture shape="theory" />}
      />

      <Tile title="Three theorems behind the ciphers" rise={1}>
        <div className="space-y-6">
          <Theorem
            number={1}
            title="Caesar decryption undoes encryption"
            statement={
              <>
                For every <V>x</V> and <V>k</V> in ℤ₂₆: <V>D</V>(<V>E</V>(<V>x</V>)) = <V>x</V>, where{' '}
                <V>E</V>(<V>x</V>) = (<V>x</V> + <V>k</V>) mod 26 and <V>D</V>(<V>y</V>) = (<V>y</V> − <V>k</V>) mod 26.
              </>
            }
          >
            Since <V>u</V> mod 26 ≡ <V>u</V>, we have <V>D</V>(<V>E</V>(<V>x</V>)) ≡ (<V>x</V> + <V>k</V>) − <V>k</V> = <V>x</V>{' '}
            (mod 26). Both sides lie in 0 to 25, so they are equal.
          </Theorem>

          <Theorem
            number={2}
            title="When a number has an inverse"
            statement={
              <>
                For <V>n</V> ≥ 2, the congruence <V>a</V>·<V>x</V> ≡ 1 (mod <V>n</V>) has a solution if and only if gcd(
                <V>a</V>, <V>n</V>) = 1.
              </>
            }
          >
            (⇐) Bézout&apos;s identity gives integers <V>x</V>, <V>y</V> with <V>a</V>·<V>x</V> + <V>n</V>·<V>y</V> = 1, so{' '}
            <V>a</V>·<V>x</V> ≡ 1. (⇒) If <V>a</V>·<V>x</V> ≡ 1 then <V>a</V>·<V>x</V> − <V>n</V>·<V>k</V> = 1 for some{' '}
            <V>k</V>, and any common divisor of <V>a</V> and <V>n</V> divides the left side, hence divides 1.
          </Theorem>

          <Theorem
            number={3}
            title="Which affine maps can be decrypted"
            statement={
              <>
                The map <V>x</V> ↦ <V>a</V>·<V>x</V> + <V>b</V> on ℤ₂₆ is a bijection if and only if gcd(<V>a</V>, 26) = 1. Hence
                there are φ(26) = 12 valid multipliers and 12 × 26 = 312 affine keys.
              </>
            }
          >
            (⇐) By Theorem 2, <V>a</V> has an inverse <V>a</V>
            <sup>−1</sup>, and <V>y</V> ↦ <V>a</V>
            <sup>−1</sup>(<V>y</V> − <V>b</V>) undoes the map. (⇒) Let <V>g</V> = gcd(<V>a</V>, 26) &gt; 1. Then 26/<V>g</V> is
            between 0 and 26, and <V>a</V>·(26/<V>g</V>) = (<V>a</V>/<V>g</V>)·26 ≡ 0, so <V>x</V> = 0 and <V>x</V> = 26/<V>g</V>{' '}
            have the same image and the map is not injective. Since 26 = 2 · 13, the valid <V>a</V> are the odd numbers that
            are not multiples of 13, and φ(26) = φ(2)·φ(13) = 1 · 12.
          </Theorem>
        </div>
      </Tile>

      <Tile title="Two diagrams" rise={2}>
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <h3 className="mb-3 text-center text-base font-bold text-fg">
              <V>a</V> = 4 · gcd(4, 26) = 2 · not allowed
            </h3>
            <MapDiagram a={4} />
          </div>
          <div>
            <h3 className="mb-3 text-center text-base font-bold text-fg">
              <V>a</V> = 5 · gcd(5, 26) = 1 · allowed
            </h3>
            <MapDiagram a={5} />
          </div>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed font-medium text-fg-muted">
          Each line shows where a letter number goes when multiplied by <V>a</V> modulo 26 (the offset <V>b</V> only slides the
          right column). On the left a multiplier that shares a factor with 26 sends two letters to one place, so half of the
          results are never reached and decryption is impossible. On the right every result is reached exactly once.
        </p>
      </Tile>

      <Tile title="Finding an inverse with Euclid" rise={3}>
        <p className="text-sm font-medium text-fg-muted">
          To invert 7 modulo 26, first run the Euclidean algorithm on 26 and 7:
        </p>
        <ol className="mt-3 space-y-1 font-serif text-lg text-fg" data-testid="euclid-rows">
          {rows.map((row) => (
            <li key={row.dividend}>
              {row.dividend} = {row.quotient} · {row.divisor} + {row.remainder}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm leading-relaxed font-medium text-fg-muted" data-testid="euclid-result">
          The last non-zero remainder is gcd(26, 7) = {g}. Working backwards gives <b className="text-fg">{g} = {x} · 26 + ({y}) · 7</b>
          . Reducing modulo 26 removes the 26 term, so 7 · ({y}) ≡ 1 and the inverse of 7 is {y} ≡ <b className="text-fg">{mod26(BigInt(y))}</b>{' '}
          (mod 26). Check: 7 · {mod26(BigInt(y))} = {7 * mod26(BigInt(y))} = 4 · 26 + 1. This is the computation the backend performs
          when you decrypt with the affine cipher.
        </p>
      </Tile>
    </div>
  )
}
