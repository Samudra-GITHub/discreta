/** Types for the analysis endpoints (`/api/v1/analysis/...`). */

export type Reliability = 'very_low' | 'low' | 'adequate'

export interface CharacterBreakdown {
  letters: number
  whitespace: number
  digits: number
  other_ascii: number
  non_ascii: number
}

export interface LetterRow {
  letter: string
  count: number
  /** Share of all letters, 0..1. */
  relative: number
  percent: number
  english_percent: number
  /** percent minus english_percent, in percentage points. */
  difference: number
  expected_count: number
  chi_contribution: number
  /** 1 is the most frequent letter; ties are broken alphabetically. */
  rank: number
}

export interface FrequencyResponse {
  total_characters: number
  letters: number
  breakdown: CharacterBreakdown
  rows: LetterRow[]
  ranking: string[]
  most_frequent: string[]
  least_frequent: string[]
  absent: string[]
  chi_squared: number | null
  reference: string
}

export interface CaesarCandidate {
  rank: number
  /** Shift k (0..25) such that plaintext = D_k(ciphertext). */
  key: number
  chi_squared: number
  plaintext: string
}

export interface CaesarCrackResponse {
  letters: number
  reliability: Reliability
  reliability_note: string
  candidates: CaesarCandidate[]
  separation: number | null
}

export interface AffineCandidate {
  rank: number
  a: number
  b: number
  a_inverse: number
  chi_squared: number
  /** Null beyond the first `plaintext_limit` candidates. */
  plaintext: string | null
}

export interface AffineSearchResponse {
  letters: number
  reliability: Reliability
  reliability_note: string
  key_space: number
  plaintexts_included: number
  candidates: AffineCandidate[]
  separation: number | null
}

export type AnalysisKind = 'frequency' | 'caesar' | 'affine'
