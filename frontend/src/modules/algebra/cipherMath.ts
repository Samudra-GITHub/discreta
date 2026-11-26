/**
 * Small, pure helpers for presenting the Caesar and affine ciphers.
 *
 * The backend is the only place that encrypts or decrypts. Everything here is either
 * input validation that mirrors the API's rules (key format and range), or a *presentation*
 * aid computed with exact integer arithmetic: the explanation of invalid multipliers and the
 * worked example. The worked example is built from the actual
 * API response and is cross-checked letter by letter against the backend's output; if any
 * letter disagrees it is withheld rather than shown.
 */

import type { CipherResponse } from '../../types/cipher'

export const MODULUS = 26

/** Largest key magnitude the API accepts: 2^53 - 1, the largest exact JavaScript integer. */
export const MAX_KEY = Number.MAX_SAFE_INTEGER
/** Longest Vigenère keyword the API accepts. */
export const MAX_KEYWORD_LENGTH = 64
/** Longest message the API accepts, counted in characters (Unicode code points). */
export const MAX_TEXT_LENGTH = 10_000

const MAX_KEY_BIG = BigInt(MAX_KEY)

// ---------------------------------------------------------------------------------------
// Key parsing
// ---------------------------------------------------------------------------------------

export type KeyProblem = 'empty' | 'not-integer' | 'out-of-range'

export type KeyParse =
  | { ok: true; value: number; big: bigint }
  | { ok: false; problem: KeyProblem }

/** Parse what the user typed into a key: an integer with |value| <= 2^53 - 1. */
export function parseKey(raw: string): KeyParse {
  const text = raw.trim()
  if (text === '') return { ok: false, problem: 'empty' }
  if (!/^[+-]?\d+$/.test(text)) return { ok: false, problem: 'not-integer' }
  const big = BigInt(text)
  if (big > MAX_KEY_BIG || big < -MAX_KEY_BIG) return { ok: false, problem: 'out-of-range' }
  return { ok: true, value: Number(big), big }
}

export function describeKeyProblem(problem: KeyProblem, label: string): string {
  switch (problem) {
    case 'empty':
      return `Enter a value for ${label}.`
    case 'not-integer':
      return `${label} must be a whole number, such as 3 or −7.`
    case 'out-of-range':
      return `${label} must be between −${MAX_KEY} and ${MAX_KEY} (2⁵³ − 1).`
  }
}

export type KeywordProblem = 'empty' | 'invalid-characters' | 'too-long'

export type KeywordParse =
  | { ok: true; value: string; shifts: number[] }
  | { ok: false; problem: KeywordProblem }

/** Parse what the user typed into a Vigenère keyword: 1 to 64 ASCII letters, nothing else. */
export function parseKeyword(raw: string): KeywordParse {
  if (raw === '') return { ok: false, problem: 'empty' }
  if (!/^[A-Za-z]+$/.test(raw)) return { ok: false, problem: 'invalid-characters' }
  if (raw.length > MAX_KEYWORD_LENGTH) return { ok: false, problem: 'too-long' }
  return { ok: true, value: raw, shifts: Array.from(raw.toUpperCase(), (c) => c.charCodeAt(0) - 65) }
}

export function describeKeywordProblem(problem: KeywordProblem): string {
  switch (problem) {
    case 'empty':
      return 'Enter a keyword of at least one letter.'
    case 'invalid-characters':
      return 'The keyword may contain only the letters A to Z: no spaces, digits, punctuation or accents.'
    case 'too-long':
      return `The keyword may have at most ${MAX_KEYWORD_LENGTH} letters.`
  }
}

/** Number of characters as the API counts them (code points, not UTF-16 units). */
export function textLength(text: string): number {
  let count = 0
  for (const _ of text) count += 1
  return count
}

// ---------------------------------------------------------------------------------------
// Modular arithmetic on exact integers
// ---------------------------------------------------------------------------------------

/** `n mod 26` in 0..25, also for negative and very large n. */
export function mod26(n: bigint): number {
  const m = BigInt(MODULUS)
  return Number(((n % m) + m) % m)
}

/** Euclidean algorithm; the result is never negative. */
export function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a
  let y = b < 0n ? -b : b
  while (y !== 0n) {
    ;[x, y] = [y, x % y]
  }
  return x
}

/** The multipliers a in 0..25 with gcd(a, 26) = 1: there are 12 of them. */
export const VALID_MULTIPLIERS: readonly number[] = Array.from({ length: MODULUS }, (_, a) => a).filter(
  (a) => gcd(BigInt(a), BigInt(MODULUS)) === 1n,
)

export interface MultiplierCheck {
  valid: boolean
  /** gcd(a, 26) */
  gcd: number
  /** a mod 26 */
  residue: number
}

export function checkMultiplier(a: bigint): MultiplierCheck {
  const g = Number(gcd(a, BigInt(MODULUS)))
  return { valid: g === 1, gcd: g, residue: mod26(a) }
}

export const letterOf = (index: number): string => String.fromCharCode(65 + index)

/** Two different letters that an invalid multiplier sends to the same place. */
export interface Collision {
  first: number
  second: number
  /** The common image, in 0..25. */
  image: number
}

/**
 * For a multiplier with gcd(a, 26) = g > 1: x and x + 26/g always collide, because
 * a * (26/g) = (a/g) * 26 is a multiple of 26. Returns the pair for x = 0.
 */
export function collisionFor(a: bigint, b: bigint): Collision | null {
  const { valid, gcd: g, residue } = checkMultiplier(a)
  if (valid) return null
  const second = MODULUS / g
  const bResidue = mod26(b)
  const image = bResidue // a * 0 + b
  // Sanity: a * second + b must land on the same image; it does because 26 | a * (26 / g).
  if ((residue * second + bResidue) % MODULUS !== image) return null
  return { first: 0, second, image }
}

// ---------------------------------------------------------------------------------------
// Worked example, built from a real response and checked against it
// ---------------------------------------------------------------------------------------

export interface WorkedStep {
  /** The letter as typed (case preserved). */
  input: string
  /** Its number 0..25. */
  number: number
  /** The arithmetic before reducing, for example `5·7 + 8`. */
  expression: string
  /** Value of the expression (may be negative or at least 26). */
  raw: number
  /** The reduced result 0..25. */
  result: number
  /** The letter the backend returned at this position. */
  output: string
  /** For Vigenère: the key letter that was applied to this letter. */
  keyLetter?: string
}

export type WorkedExample =
  | { status: 'ok'; steps: WorkedStep[]; lettersTotal: number }
  | { status: 'no-letters' }
  /** The local arithmetic disagreed with the backend, so nothing is shown. */
  | { status: 'unverified' }

const isUpper = (code: number) => code >= 65 && code <= 90
const isLower = (code: number) => code >= 97 && code <= 122
const inResidueRange = (n: number) => Number.isInteger(n) && n >= 0 && n < MODULUS

const reduce = (n: number) => ((n % MODULUS) + MODULUS) % MODULUS

/**
 * Show how the first few letters were transformed, using the reduced keys (and, for affine
 * decryption, the inverse) that the backend reported. Every step is verified against the
 * backend's own output before it is returned.
 */
export function buildWorkedExample(response: CipherResponse, maxSteps = 5): WorkedExample {
  const inputs = Array.from(response.input)
  const outputs = Array.from(response.output)
  if (inputs.length !== outputs.length) return { status: 'unverified' }

  let step: (n: number, letterIndex: number) => { expression: string; raw: number }
  if (response.cipher === 'vigenere') {
    const shifts = response.key_shifts
    if (shifts.length === 0 || !shifts.every(inResidueRange)) return { status: 'unverified' }
    step =
      response.operation === 'encrypt'
        ? (n, i) => {
            const k = shifts[i % shifts.length] ?? 0
            return { expression: `${n} + ${k}`, raw: n + k }
          }
        : (n, i) => {
            const k = shifts[i % shifts.length] ?? 0
            return { expression: `${n} − ${k}`, raw: n - k }
          }
  } else if (response.cipher === 'caesar') {
    const k = response.effective_key
    if (!inResidueRange(k)) return { status: 'unverified' }
    step =
      response.operation === 'encrypt'
        ? (n) => ({ expression: `${n} + ${k}`, raw: n + k })
        : (n) => ({ expression: `${n} − ${k}`, raw: n - k })
  } else {
    const { effective_a: a, effective_b: b, a_inverse: inverse } = response
    if (![a, b, inverse].every(inResidueRange) || reduce(a * inverse) !== 1) {
      return { status: 'unverified' }
    }
    step =
      response.operation === 'encrypt'
        ? (n) => ({ expression: `${a}·${n} + ${b}`, raw: a * n + b })
        : (n) => ({ expression: `${inverse}·(${n} − ${b})`, raw: inverse * (n - b) })
  }

  const steps: WorkedStep[] = []
  let lettersTotal = 0
  for (let i = 0; i < inputs.length; i += 1) {
    const char = inputs[i] ?? ''
    const out = outputs[i] ?? ''
    const code = char.length === 1 ? char.charCodeAt(0) : -1
    const upper = isUpper(code)
    if (!upper && !isLower(code)) {
      if (out !== char) return { status: 'unverified' } // non-letters must pass through
      continue
    }
    lettersTotal += 1
    const number = code - (upper ? 65 : 97)
    const { expression, raw } = step(number, lettersTotal - 1)
    const result = reduce(raw)
    const expected = String.fromCharCode(result + (upper ? 65 : 97))
    if (expected !== out) return { status: 'unverified' }
    if (steps.length < maxSteps) {
      const keyLetter =
        response.cipher === 'vigenere'
          ? String.fromCharCode(65 + (response.key_shifts[(lettersTotal - 1) % response.key_shifts.length] ?? 0))
          : undefined
      steps.push({ input: char, number, expression, raw, result, output: out, keyLetter })
    }
  }

  return lettersTotal === 0 ? { status: 'no-letters' } : { status: 'ok', steps, lettersTotal }
}
