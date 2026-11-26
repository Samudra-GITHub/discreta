import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { NetworkMotif } from '../components/atmosphere/NetworkMotif'
import { ANALYSIS_PATH, WORKSPACE_PATH } from '../layouts/navigation'

const ALPHABET = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))
const SHIFT = 3

/** The Caesar alphabet for k = 3, computed from E(x) = (x + k) mod 26. */
function ShiftStrip() {
  const cipher = ALPHABET.map((_, x) => String.fromCharCode(65 + ((x + SHIFT) % 26)))
  const highlight = ALPHABET.indexOf('E')
  const columns = { gridTemplateColumns: 'repeat(26, minmax(0, 1fr))' }
  const cell = (letter: string, i: number, muted: boolean) => (
    <span
      key={`${muted}-${i}`}
      className={`num py-1 text-center text-[0.625rem] sm:text-[0.9375rem] ${
        i === highlight ? 'font-medium text-accent-ink' : muted ? 'text-fg-muted' : 'text-fg'
      }`}
    >
      {letter}
    </span>
  )
  return (
    <figure className="m-0">
      <div
        role="img"
        aria-label={`The Caesar alphabet shifted by ${SHIFT}: A becomes D, B becomes E, and so on. E becomes ${cipher[highlight]}.`}
        className="border-y border-line-strong py-3"
      >
        <div className="grid" style={columns} aria-hidden="true">
          {ALPHABET.map((l, i) => cell(l, i, true))}
        </div>
        <div aria-hidden="true" className="my-1 flex items-center gap-2 text-fg-muted">
          <span className="h-px flex-1 bg-line-strong" />
          <span className="num text-[0.6875rem]">x → (x + {SHIFT}) mod 26</span>
          <span className="h-px flex-1 bg-line-strong" />
        </div>
        <div className="grid" style={columns} aria-hidden="true">
          {cipher.map((l, i) => cell(l, i, false))}
        </div>
      </div>
      <figcaption className="caption mt-2">
        Fig. 1. The Caesar alphabet for k = {SHIFT}. Plain letters on top, cipher letters below. Every letter moves the same
        distance, so the pattern of how often letters occur survives, and that is what an analyst reads.
      </figcaption>
    </figure>
  )
}

const METHODS = [
  {
    name: 'Caesar cipher',
    formula: 'E(x) = (x + k) mod 26',
    text: 'Shifts every letter by k places. Only 26 keys exist, so all of them can be tried.',
  },
  {
    name: 'Affine cipher',
    formula: 'E(x) = (a·x + b) mod 26',
    text: 'Multiplies, then shifts. The multiplier needs gcd(a, 26) = 1, which leaves 12 multipliers and 312 keys.',
  },
  {
    name: 'Frequency analysis',
    formula: 'count(letter) / total',
    text: 'Counts each letter and compares the distribution with ordinary English, where E and T lead.',
  },
  {
    name: 'Chi-squared key search',
    formula: 'χ² = Σ (O − E)² / E',
    text: 'Decrypts with every possible key and ranks the results by how English they look. An estimate, never proof.',
  },
] as const

const STEPS = [
  ['Encrypt', 'Write a message and encrypt it in the Cipher Workspace.'],
  ['Analyse', 'Send the ciphertext to the Analysis Lab without retyping it.'],
  ['Compare', 'Rank the candidate keys and read their decryptions.'],
  ['Send back', 'Return a candidate to the workspace to test it.'],
] as const

export function OverviewPage() {
  return (
    <div className="grid gap-16 sm:gap-20">
      <section className="relative">
        <NetworkMotif />
        <p className="mb-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-lg font-semibold tracking-[0.12em] [font-family:var(--font-display)]">DISCRETA</span>
          <span className="num text-xs text-fg-muted">The Cryptographic Intelligence Laboratory</span>
        </p>
        <h1 className="max-w-[18ch] text-[2.5rem] leading-[1.04] sm:text-[3.75rem]">
          Every cipher leaves a fingerprint.
        </h1>
        <p className="mt-5 max-w-[36rem] text-[1.0625rem] text-fg-muted">
          Encrypt a message with a classical cipher, then recover the key from the letters alone. DISCRETA is a laboratory
          for encryption, decryption, frequency analysis and statistical cryptanalysis.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to={WORKSPACE_PATH} className="btn btn-primary h-11 px-5 no-underline">
            Open Cipher Workspace
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
          <Link to={ANALYSIS_PATH} className="btn h-11 px-5 no-underline">
            Open Analysis Lab
          </Link>
        </div>
        <div className="mt-14">
          <ShiftStrip />
        </div>
      </section>

      <section aria-labelledby="methods-title">
        <h2 id="methods-title" className="mb-4 text-xl">
          What it does
        </h2>
        <ul className="m-0 list-none p-0">
          {METHODS.map((m) => (
            <li
              key={m.name}
              className="grid gap-x-8 gap-y-1 border-t border-line py-4 md:grid-cols-[13rem_16rem_minmax(0,1fr)]"
            >
              <h3 className="text-base">{m.name}</h3>
              <p className="num m-0 text-sm">{m.formula}</p>
              <p className="m-0 text-sm text-fg-muted">{m.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="flow-title">
        <h2 id="flow-title" className="mb-4 text-xl">
          One investigation
        </h2>
        <ol className="m-0 grid list-none gap-0 border-t border-line p-0 md:grid-cols-4">
          {STEPS.map(([name, text], i) => (
            <li key={name} className="border-b border-line py-4 md:border-b-0 md:pr-6">
              <p className="num m-0 text-xs text-fg-muted">{String(i + 1).padStart(2, '0')}</p>
              <p className="m-0 mt-1 font-semibold [font-family:var(--font-display)]">{name}</p>
              <p className="m-0 mt-1 text-sm text-fg-muted">{text}</p>
            </li>
          ))}
        </ol>
        <p className="caption mt-6 max-w-[40rem]">
          Classical ciphers are studied because they are easy to break, not because they are safe. They do not protect
          real data; modern encryption works very differently.
        </p>
      </section>
    </div>
  )
}
