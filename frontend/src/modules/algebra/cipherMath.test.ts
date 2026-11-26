import { describe, expect, it } from 'vitest'
import type { AffineResponse, CaesarResponse } from '../../types/cipher'
import {
  buildWorkedExample,
  checkMultiplier,
  collisionFor,
  describeKeyProblem,
  gcd,
  mod26,
  parseKey,
  textLength,
  VALID_MULTIPLIERS,
} from './cipherMath'

const caesar = (over: Partial<CaesarResponse>): CaesarResponse => ({
  cipher: 'caesar',
  operation: 'encrypt',
  input: 'HELLO',
  output: 'KHOOR',
  key: 3,
  effective_key: 3,
  ...over,
})

const affine = (over: Partial<AffineResponse>): AffineResponse => ({
  cipher: 'affine',
  operation: 'encrypt',
  input: 'AFFINE CIPHER',
  output: 'IHHWVC SWFRCP',
  a: 5,
  b: 8,
  effective_a: 5,
  effective_b: 8,
  a_inverse: 21,
  ...over,
})

describe('parseKey', () => {
  it('accepts plain, signed and padded integers', () => {
    expect(parseKey('3')).toMatchObject({ ok: true, value: 3 })
    expect(parseKey('-7')).toMatchObject({ ok: true, value: -7 })
    expect(parseKey('+12')).toMatchObject({ ok: true, value: 12 })
    expect(parseKey('  26  ')).toMatchObject({ ok: true, value: 26 })
    expect(parseKey('007')).toMatchObject({ ok: true, value: 7 })
  })

  it('treats minus zero as zero', () => {
    const parsed = parseKey('-0')
    expect(parsed.ok && Object.is(parsed.value, 0)).toBe(true)
  })

  it('accepts exactly the JavaScript-safe boundaries 2^53 - 1 and -(2^53 - 1)', () => {
    expect(parseKey('9007199254740991')).toMatchObject({ ok: true, value: 9007199254740991 })
    expect(parseKey('-9007199254740991')).toMatchObject({ ok: true, value: -9007199254740991 })
  })

  it('rejects one beyond each boundary', () => {
    expect(parseKey('9007199254740992')).toEqual({ ok: false, problem: 'out-of-range' })
    expect(parseKey('-9007199254740992')).toEqual({ ok: false, problem: 'out-of-range' })
    expect(parseKey('1' + '0'.repeat(400))).toEqual({ ok: false, problem: 'out-of-range' })
  })

  it('rejects empty and non-integer text', () => {
    expect(parseKey('')).toEqual({ ok: false, problem: 'empty' })
    expect(parseKey('   ')).toEqual({ ok: false, problem: 'empty' })
    for (const bad of ['3.0', '1e2', '2,5', 'abc', '--3', '3-', '0x10', '1 2', '−3', '٣']) {
      expect(parseKey(bad), bad).toEqual({ ok: false, problem: 'not-integer' })
    }
  })

  it('describes each problem in words', () => {
    expect(describeKeyProblem('empty', 'the shift k')).toContain('Enter a value')
    expect(describeKeyProblem('not-integer', 'a')).toContain('whole number')
    expect(describeKeyProblem('out-of-range', 'b')).toContain('9007199254740991')
  })
})

describe('textLength', () => {
  it('counts characters the way the API does, not UTF-16 units', () => {
    expect(textLength('')).toBe(0)
    expect(textLength('abc')).toBe(3)
    expect(textLength('😀😀')).toBe(2)
    expect('😀😀'.length).toBe(4)
  })
})

describe('modular arithmetic', () => {
  it('reduces negative and huge numbers into 0..25', () => {
    expect(mod26(0n)).toBe(0)
    expect(mod26(-3n)).toBe(23)
    expect(mod26(-26n)).toBe(0)
    expect(mod26(29n)).toBe(3)
    expect(mod26(9007199254740991n)).toBe(5)
    expect(mod26(-9007199254740991n)).toBe(21)
  })

  it('implements the Euclidean gcd, including zero and negatives', () => {
    expect(gcd(48n, 18n)).toBe(6n)
    expect(gcd(0n, 0n)).toBe(0n)
    expect(gcd(0n, 5n)).toBe(5n)
    expect(gcd(-12n, 18n)).toBe(6n)
    expect(gcd(26n, 5n)).toBe(1n)
  })

  it('finds exactly the 12 valid multipliers', () => {
    expect([...VALID_MULTIPLIERS]).toEqual([1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25])
  })

  it('checks every residue: valid exactly when gcd(a, 26) = 1', () => {
    for (let a = 0; a < 26; a += 1) {
      const check = checkMultiplier(BigInt(a))
      const expectedGcd = a === 0 ? 26 : [1, 2, 13, 26].filter((d) => a % d === 0 && 26 % d === 0).at(-1)
      expect(check.gcd, `a=${a}`).toBe(expectedGcd)
      expect(check.valid).toBe(VALID_MULTIPLIERS.includes(a))
    }
  })

  it('treats congruent and negative multipliers like their residues', () => {
    expect(checkMultiplier(31n)).toEqual({ valid: true, gcd: 1, residue: 5 })
    expect(checkMultiplier(-1n)).toEqual({ valid: true, gcd: 1, residue: 25 })
    expect(checkMultiplier(-2n)).toEqual({ valid: false, gcd: 2, residue: 24 })
    expect(checkMultiplier(9007199254740991n).valid).toBe(true)
  })
})

describe('collisionFor (why an invalid multiplier cannot be decrypted)', () => {
  it('returns null for a valid multiplier', () => {
    expect(collisionFor(5n, 8n)).toBeNull()
  })

  it('finds the colliding pair x = 0 and x = 26/g', () => {
    expect(collisionFor(4n, 3n)).toEqual({ first: 0, second: 13, image: 3 })
    expect(collisionFor(13n, 0n)).toEqual({ first: 0, second: 2, image: 0 })
    expect(collisionFor(0n, 5n)).toEqual({ first: 0, second: 1, image: 5 })
  })

  it('really does map both letters to the same image', () => {
    for (const a of [2n, 4n, 6n, 8n, 10n, 12n, 13n, 14n, 26n, -2n]) {
      const pair = collisionFor(a, 7n)
      expect(pair, `a=${a}`).not.toBeNull()
      const ar = mod26(a)
      expect((ar * (pair?.first ?? 0) + 7) % 26).toBe(pair?.image)
      expect((ar * (pair?.second ?? 0) + 7) % 26).toBe(pair?.image)
      expect(pair?.second).not.toBe(pair?.first)
    }
  })
})

describe('buildWorkedExample', () => {
  it('shows Caesar encryption with the reduced key from the response', () => {
    const example = buildWorkedExample(caesar({}))
    expect(example.status).toBe('ok')
    if (example.status !== 'ok') return
    expect(example.steps.map((s) => [s.input, s.number, s.expression, s.raw, s.result, s.output])).toEqual([
      ['H', 7, '7 + 3', 10, 10, 'K'],
      ['E', 4, '4 + 3', 7, 7, 'H'],
      ['L', 11, '11 + 3', 14, 14, 'O'],
      ['L', 11, '11 + 3', 14, 14, 'O'],
      ['O', 14, '14 + 3', 17, 17, 'R'],
    ])
    expect(example.lettersTotal).toBe(5)
  })

  it('shows a wrap-around (a raw value of 26 or more) honestly', () => {
    const example = buildWorkedExample(caesar({ input: 'XYZ', output: 'ABC' }))
    expect(example.status === 'ok' && example.steps.map((s) => [s.raw, s.result])).toEqual([
      [26, 0],
      [27, 1],
      [28, 2],
    ])
  })

  it('uses the effective key for negative and oversized keys', () => {
    const example = buildWorkedExample(caesar({ key: -29, effective_key: 23, input: 'Hi', output: 'Ef' }))
    expect(example.status === 'ok' && example.steps[0]?.expression).toBe('7 + 23')
  })

  it('shows Caesar decryption, including negative intermediate values', () => {
    const example = buildWorkedExample(caesar({ operation: 'decrypt', input: 'ABC', output: 'XYZ' }))
    expect(example.status === 'ok' && example.steps.map((s) => [s.expression, s.raw, s.result])).toEqual([
      ['0 − 3', -3, 23],
      ['1 − 3', -2, 24],
      ['2 − 3', -1, 25],
    ])
  })

  it('shows affine encryption', () => {
    const example = buildWorkedExample(affine({}))
    expect(example.status === 'ok' && example.steps.map((s) => [s.input, s.expression, s.raw, s.result, s.output])).toEqual([
      ['A', '5·0 + 8', 8, 8, 'I'],
      ['F', '5·5 + 8', 33, 7, 'H'],
      ['F', '5·5 + 8', 33, 7, 'H'],
      ['I', '5·8 + 8', 48, 22, 'W'],
      ['N', '5·13 + 8', 73, 21, 'V'],
    ])
  })

  it('shows affine decryption with the inverse the backend returned', () => {
    const example = buildWorkedExample(affine({ operation: 'decrypt', input: 'IHHWVC SWFRCP', output: 'AFFINE CIPHER' }))
    expect(example.status === 'ok' && example.steps.map((s) => [s.input, s.expression, s.raw, s.result, s.output])).toEqual([
      ['I', '21·(8 − 8)', 0, 0, 'A'],
      ['H', '21·(7 − 8)', -21, 5, 'F'],
      ['H', '21·(7 − 8)', -21, 5, 'F'],
      ['W', '21·(22 − 8)', 294, 8, 'I'],
      ['V', '21·(21 − 8)', 273, 13, 'N'],
    ])
  })

  it('preserves case and skips non-letters', () => {
    const example = buildWorkedExample(caesar({ input: 'a, B! 1', output: 'd, E! 1' }))
    expect(example.status === 'ok' && example.steps.map((s) => s.input + s.output)).toEqual(['ad', 'BE'])
    expect(example.status === 'ok' && example.lettersTotal).toBe(2)
  })

  it('limits the number of steps but reports the total number of letters', () => {
    const example = buildWorkedExample(caesar({ input: 'abcdefgh', output: 'defghijk' }), 3)
    expect(example.status === 'ok' && example.steps).toHaveLength(3)
    expect(example.status === 'ok' && example.lettersTotal).toBe(8)
  })

  it('reports when there are no letters at all', () => {
    expect(buildWorkedExample(caesar({ input: '123 !?', output: '123 !?' }))).toEqual({ status: 'no-letters' })
    expect(buildWorkedExample(caesar({ input: '', output: '' }))).toEqual({ status: 'no-letters' })
  })

  it('handles characters outside the alphabet, including emoji', () => {
    const example = buildWorkedExample(caesar({ input: 'é😀a', output: 'é😀d' }))
    expect(example.status === 'ok' && example.steps).toHaveLength(1)
  })

  it('withholds the example when the backend output disagrees with the arithmetic', () => {
    expect(buildWorkedExample(caesar({ output: 'KHOOS' }))).toEqual({ status: 'unverified' })
    expect(buildWorkedExample(affine({ output: 'XHHWVC SWFRCP' }))).toEqual({ status: 'unverified' })
    expect(buildWorkedExample(caesar({ output: 'KHOO' }))).toEqual({ status: 'unverified' })
    expect(buildWorkedExample(caesar({ input: 'a b', output: 'dXe' }))).toEqual({ status: 'unverified' })
  })

  it('withholds the example when the reported keys are inconsistent', () => {
    expect(buildWorkedExample(caesar({ effective_key: 26 }))).toEqual({ status: 'unverified' })
    expect(buildWorkedExample(affine({ a_inverse: 20 }))).toEqual({ status: 'unverified' })
    expect(buildWorkedExample(affine({ effective_a: 4, a_inverse: 7 }))).toEqual({ status: 'unverified' })
  })
})
