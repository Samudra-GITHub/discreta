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
  /** IC = Σ f(f−1) / (N(N−1)); null below two letters. */
  index_of_coincidence: number | null
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

export type AnalysisKind = 'frequency' | 'caesar' | 'affine' | 'vigenere'

// ---- Vigenère investigation -----------------------------------------------------------

export type IcReading = 'insufficient' | 'english_like' | 'intermediate' | 'flat'

export interface IcResult {
  letters: number
  ic: number | null
  english_ic: number
  random_ic: number
  reading: IcReading
  reliability: Reliability
  note: string
  friedman_key_length: number | null
}

export interface KasiskiRepeat {
  sequence: string
  length: number
  /** Position among the letters (from 0) of the earlier occurrence. */
  first: number
  second: number
  distance: number
}

export interface KasiskiVote {
  length: number
  repeats: number
  fraction: number
  examples: KasiskiRepeat[]
}

export interface KasiskiResult {
  letters: number
  total_repeats: number
  repeats: KasiskiRepeat[]
  votes: KasiskiVote[]
  distance_gcd: number | null
  note: string
}

export interface LengthRow {
  rank: number
  length: number
  smallest_column: number
  mean_ic: number | null
  plausible: boolean
  kasiski_repeats: number
  kasiski_fraction: number
}

export interface VigenereLengthsResponse {
  letters: number
  index_of_coincidence: IcResult
  kasiski: KasiskiResult
  lengths: LengthRow[]
  suggested_length: number | null
  reliability: Reliability
  note: string
}

export interface ColumnOption {
  shift: number
  letter: string
  chi_squared: number
}

export interface ColumnAnalysis {
  position: number
  size: number
  best: ColumnOption
  options: ColumnOption[]
  separation: number | null
  reliability: Reliability
}

export interface VigenereKeyCandidate {
  rank: number
  key: string
  shortest_equivalent_key: string
  shifts: number[]
  column_chi_sum: number
  text_chi_squared: number
  plaintext: string
}

export interface VigenereCandidatesResponse {
  letters: number
  key_length: number
  columns: ColumnAnalysis[]
  candidates: VigenereKeyCandidate[]
  reliability: Reliability
  note: string
}
