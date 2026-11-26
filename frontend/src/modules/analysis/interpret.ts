/**
 * Plain-language readings of the backend's analysis results. These only *describe* numbers
 * the backend computed (they never recompute counts or scores), and they are worded as
 * estimates: a statistic ranks candidates, it does not prove which one is right.
 */

import type { FrequencyResponse, Reliability } from '../../types/analysis'

export const fmtPercent = (value: number) => `${value.toFixed(1)}%`

export const fmtSigned = (value: number) => `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(1)}`

/** chi-squared with enough digits to compare candidates: 2 decimals below 10, 1 below 1000. */
export function fmtChi(value: number): string {
  if (value < 10) return value.toFixed(2)
  if (value < 1000) return value.toFixed(1)
  return Math.round(value).toLocaleString('en-US')
}

export const RELIABILITY_LABEL: Record<Reliability, string> = {
  very_low: 'Very low reliability',
  low: 'Low reliability',
  adequate: 'Usable sample size',
}

/** The three letters English uses most, read from the reference column the backend returned. */
export function englishTop(rows: FrequencyResponse['rows'], n = 3): string[] {
  return [...rows]
    .sort((x, y) => y.english_percent - x.english_percent)
    .slice(0, n)
    .map((row) => row.letter)
}

const list = (letters: string[]) => letters.join(', ')

/** A few sentences about a frequency analysis, as separate paragraphs. */
export function interpretFrequency(result: FrequencyResponse): string[] {
  const { letters, most_frequent: top, rows, chi_squared: chi, breakdown } = result
  if (letters === 0) {
    return ['The text contains no ASCII letters, so there is no letter distribution to analyse.']
  }

  const lines: string[] = []
  const english = englishTop(rows)
  const shares = top.map((letter) => rows.find((row) => row.letter === letter)?.percent ?? 0)

  lines.push(
    `The most frequent letters are ${list(top)} (${shares.map(fmtPercent).join(', ')}). In English the most frequent are ${list(english)}.`,
  )

  if (top.length === english.length && top.every((letter) => english.includes(letter))) {
    lines.push(
      'These are the letters English uses most, so the text looks like unenciphered English. A transposition cipher would also look like this, because it only rearranges letters.',
    )
  } else {
    lines.push(
      `A Caesar or affine cipher replaces every letter by exactly one other letter, so the most frequent ciphertext letter (${top[0]}) probably stands for one of the common English letters, often ${english[0]} or ${english[1]}.`,
    )
  }

  if (chi !== null) {
    lines.push(
      `χ² against English is ${fmtChi(chi)} with 25 degrees of freedom. A sample drawn from English averages about 25, so values far above that mean the letters are not distributed like English.`,
    )
  }
  if (letters < 50) {
    lines.push(`Only ${letters} letters were analysed. Percentages from so little text are noisy, so read these as hints rather than findings.`)
  }

  const ignored = breakdown.whitespace + breakdown.digits + breakdown.other_ascii + breakdown.non_ascii
  if (ignored > 0) {
    lines.push(`${ignored} other character${ignored === 1 ? ' was' : 's were'} ignored: spaces, digits, punctuation and non-ASCII characters are not counted.`)
  }
  return lines
}

/** How much better the best candidate scores than the runner-up, in words. */
export function describeSeparation(separation: number | null): string | null {
  if (separation === null) return null
  const ratio = `${separation.toFixed(2)}×`
  if (separation < 1.15) return `The runner-up scores only ${ratio} the best χ², so the top candidates are hard to tell apart.`
  if (separation < 1.6) return `The runner-up scores ${ratio} the best χ²: a modest gap.`
  return `The runner-up scores ${ratio} the best χ²: the best candidate clearly stands out, though that is still not proof.`
}
