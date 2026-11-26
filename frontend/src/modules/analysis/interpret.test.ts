import { describe, expect, it } from 'vitest'
import { frequencyReply } from '../../test/helpers'
import type { FrequencyResponse } from '../../types/analysis'
import { describeSeparation, englishTop, fmtChi, fmtPercent, fmtSigned, interpretFrequency } from './interpret'

const reply = (text: string) => frequencyReply(text) as unknown as FrequencyResponse

describe('number formatting', () => {
  it('formats percentages with one decimal', () => {
    expect(fmtPercent(12.7019)).toBe('12.7%')
    expect(fmtPercent(0)).toBe('0.0%')
  })

  it('signs differences with a real minus sign', () => {
    expect(fmtSigned(2.34)).toBe('+2.3')
    expect(fmtSigned(-2.34)).toBe('−2.3')
    expect(fmtSigned(0)).toBe('+0.0')
  })

  it('keeps enough digits to compare chi-squared scores', () => {
    expect(fmtChi(3.14159)).toBe('3.14')
    expect(fmtChi(21.74)).toBe('21.7')
    expect(fmtChi(1203.4)).toBe('1,203')
  })
})

describe('englishTop', () => {
  it('reads the leading English letters from the reply, not from a constant', () => {
    expect(englishTop(reply('abc').rows)).toEqual(['E', 'T', 'A'])
  })
})

describe('interpretFrequency', () => {
  it('says there is nothing to analyse for a text without letters', () => {
    expect(interpretFrequency(reply('123 !?'))).toEqual([
      'The text contains no ASCII letters, so there is no letter distribution to analyse.',
    ])
  })

  it('recognises English-like leaders and mentions transposition', () => {
    const lines = interpretFrequency(reply('eeee tttt aaa'))
    expect(lines.join(' ')).toContain('most frequent letters are E, T, A')
    expect(lines.join(' ')).toContain('looks like unenciphered English')
    expect(lines.join(' ')).toContain('transposition')
  })

  it('points a shifted text at a substitution cipher', () => {
    const lines = interpretFrequency(reply('hhhh wwww ddd'))
    expect(lines.join(' ')).toContain('replaces every letter by exactly one other letter')
    expect(lines.join(' ')).toContain('(H)')
    expect(lines.join(' ')).not.toContain('unenciphered')
  })

  it('explains chi-squared against the degrees of freedom', () => {
    const lines = interpretFrequency(reply('hello world'))
    expect(lines.join(' ')).toContain('with 25 degrees of freedom')
    expect(lines.join(' ')).toContain('averages about 25')
  })

  it('warns about small samples and counts ignored characters', () => {
    const text = interpretFrequency(reply('Hello, World 123!')).join(' ')
    expect(text).toContain('Only 10 letters were analysed')
    expect(text).toMatch(/\d+ other characters were ignored/)
  })

  it('does not warn about small samples for a long text', () => {
    expect(interpretFrequency(reply('abcdefghij'.repeat(10))).join(' ')).not.toContain('Only')
  })

  it('uses the singular for a single ignored character', () => {
    expect(interpretFrequency(reply('abc!')).join(' ')).toContain('1 other character was ignored')
  })
})

describe('describeSeparation', () => {
  it('is silent when undefined', () => {
    expect(describeSeparation(null)).toBeNull()
  })

  it('calls a small gap hard to tell apart, and never claims certainty', () => {
    expect(describeSeparation(1.05)).toContain('hard to tell apart')
    expect(describeSeparation(1.3)).toContain('modest gap')
    const strong = describeSeparation(5)!
    expect(strong).toContain('5.00×')
    expect(strong).toContain('not proof')
  })
})
