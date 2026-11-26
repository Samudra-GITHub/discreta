import type {
  AffineSearchResponse,
  CaesarCrackResponse,
  FrequencyResponse,
  VigenereCandidatesResponse,
  VigenereLengthsResponse,
} from '../types/analysis'
import { ApiError, apiPost, type RequestOptions } from './api'

export const ANALYSIS_BASE_PATH = '/api/v1/analysis'

/** How many of the best affine candidates come back with their decrypted text. */
export const AFFINE_PLAINTEXT_LIMIT = 20

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isNum = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const isStr = (value: unknown): value is string => typeof value === 'string'
const isStrArray = (value: unknown): value is string[] => Array.isArray(value) && value.every(isStr)
const isReliability = (value: unknown) => value === 'very_low' || value === 'low' || value === 'adequate'

function isFrequency(value: unknown): value is FrequencyResponse {
  if (!isRecord(value)) return false
  return (
    isNum(value.letters) &&
    isNum(value.total_characters) &&
    isRecord(value.breakdown) &&
    Array.isArray(value.rows) &&
    value.rows.length === 26 &&
    value.rows.every(
      (row) =>
        isRecord(row) &&
        isStr(row.letter) &&
        isNum(row.count) &&
        isNum(row.percent) &&
        isNum(row.english_percent) &&
        isNum(row.difference) &&
        isNum(row.expected_count) &&
        isNum(row.rank),
    ) &&
    isStrArray(value.ranking) &&
    isStrArray(value.most_frequent) &&
    isStrArray(value.least_frequent) &&
    isStrArray(value.absent) &&
    (value.chi_squared === null || isNum(value.chi_squared)) &&
    (value.index_of_coincidence === null || isNum(value.index_of_coincidence))
  )
}

function isCaesarCrack(value: unknown): value is CaesarCrackResponse {
  return (
    isRecord(value) &&
    isNum(value.letters) &&
    isReliability(value.reliability) &&
    isStr(value.reliability_note) &&
    Array.isArray(value.candidates) &&
    value.candidates.length === 26 &&
    value.candidates.every(
      (c) => isRecord(c) && isNum(c.rank) && isNum(c.key) && isNum(c.chi_squared) && isStr(c.plaintext),
    )
  )
}

function isAffineSearch(value: unknown): value is AffineSearchResponse {
  return (
    isRecord(value) &&
    isNum(value.letters) &&
    isReliability(value.reliability) &&
    isStr(value.reliability_note) &&
    isNum(value.key_space) &&
    Array.isArray(value.candidates) &&
    value.candidates.length === value.key_space &&
    value.candidates.every(
      (c) =>
        isRecord(c) &&
        isNum(c.rank) &&
        isNum(c.a) &&
        isNum(c.b) &&
        isNum(c.a_inverse) &&
        isNum(c.chi_squared) &&
        (c.plaintext === null || isStr(c.plaintext)),
    )
  )
}

const isNumOrNull = (value: unknown): value is number | null => value === null || isNum(value)

function isRepeat(value: unknown): boolean {
  return (
    isRecord(value) &&
    isStr(value.sequence) &&
    isNum(value.length) &&
    isNum(value.first) &&
    isNum(value.second) &&
    isNum(value.distance)
  )
}

function isIcResult(value: unknown): boolean {
  return (
    isRecord(value) &&
    isNum(value.letters) &&
    isNumOrNull(value.ic) &&
    isNum(value.english_ic) &&
    isNum(value.random_ic) &&
    ['insufficient', 'english_like', 'intermediate', 'flat'].includes(String(value.reading)) &&
    isReliability(value.reliability) &&
    isStr(value.note) &&
    isNumOrNull(value.friedman_key_length)
  )
}

function isKasiski(value: unknown): boolean {
  return (
    isRecord(value) &&
    isNum(value.letters) &&
    isNum(value.total_repeats) &&
    Array.isArray(value.repeats) &&
    value.repeats.every(isRepeat) &&
    Array.isArray(value.votes) &&
    value.votes.every(
      (v) =>
        isRecord(v) &&
        isNum(v.length) &&
        isNum(v.repeats) &&
        isNum(v.fraction) &&
        Array.isArray(v.examples) &&
        v.examples.every(isRepeat),
    ) &&
    isNumOrNull(value.distance_gcd) &&
    isStr(value.note)
  )
}

function isVigenereLengths(value: unknown): value is VigenereLengthsResponse {
  return (
    isRecord(value) &&
    isNum(value.letters) &&
    isIcResult(value.index_of_coincidence) &&
    isKasiski(value.kasiski) &&
    Array.isArray(value.lengths) &&
    value.lengths.length > 0 &&
    value.lengths.every(
      (r) =>
        isRecord(r) &&
        isNum(r.rank) &&
        isNum(r.length) &&
        isNum(r.smallest_column) &&
        isNumOrNull(r.mean_ic) &&
        typeof r.plausible === 'boolean' &&
        isNum(r.kasiski_repeats) &&
        isNum(r.kasiski_fraction),
    ) &&
    isNumOrNull(value.suggested_length) &&
    isReliability(value.reliability) &&
    isStr(value.note)
  )
}

const isOption = (o: unknown) => isRecord(o) && isNum(o.shift) && isStr(o.letter) && isNum(o.chi_squared)

function isVigenereCandidates(value: unknown): value is VigenereCandidatesResponse {
  return (
    isRecord(value) &&
    isNum(value.letters) &&
    isNum(value.key_length) &&
    Array.isArray(value.columns) &&
    value.columns.length === value.key_length &&
    value.columns.every(
      (c) =>
        isRecord(c) &&
        isNum(c.position) &&
        isNum(c.size) &&
        isOption(c.best) &&
        Array.isArray(c.options) &&
        c.options.every(isOption) &&
        isNumOrNull(c.separation) &&
        isReliability(c.reliability),
    ) &&
    Array.isArray(value.candidates) &&
    value.candidates.length > 0 &&
    value.candidates.every(
      (c) =>
        isRecord(c) &&
        isNum(c.rank) &&
        isStr(c.key) &&
        /^[A-Z]+$/.test(c.key) &&
        isStr(c.shortest_equivalent_key) &&
        Array.isArray(c.shifts) &&
        c.shifts.every(isNum) &&
        isNum(c.column_chi_sum) &&
        isNum(c.text_chi_squared) &&
        isStr(c.plaintext),
    ) &&
    isReliability(value.reliability) &&
    isStr(value.note)
  )
}

async function post<T>(
  path: string,
  body: unknown,
  guard: (value: unknown) => value is T,
  what: string,
  options?: RequestOptions,
): Promise<T> {
  const result = await apiPost<unknown>(`${ANALYSIS_BASE_PATH}${path}`, body, options)
  if (!guard(result)) throw new ApiError(`Backend returned an unexpected ${what} response`, null)
  return result
}

/** Letter frequencies A-Z of a text, compared with English. */
export const runFrequency = (text: string, options?: RequestOptions) =>
  post('/frequency', { text }, isFrequency, 'frequency', options)

/** Rank all 26 Caesar keys by chi-squared. */
export const runCaesarCrack = (text: string, options?: RequestOptions) =>
  post('/caesar/crack', { text }, isCaesarCrack, 'Caesar analysis', options)

/** Rank all 312 valid affine keys by chi-squared. */
export const runAffineSearch = (
  text: string,
  plaintextLimit: number = AFFINE_PLAINTEXT_LIMIT,
  options?: RequestOptions,
) =>
  post(
    '/affine/search',
    { text, plaintext_limit: plaintextLimit },
    isAffineSearch,
    'affine analysis',
    { timeoutMs: 15_000, ...options },
  )

/** IC, Kasiski examination and ranked key lengths for a suspected Vigenère ciphertext. */
export const runVigenereLengths = (text: string, options?: RequestOptions) =>
  post('/vigenere/lengths', { text }, isVigenereLengths, 'Vigenère key-length', { timeoutMs: 15_000, ...options })

/** Estimate each key letter for `keyLength` and rank candidate keys. */
export const runVigenereCandidates = (text: string, keyLength: number, options?: RequestOptions) =>
  post(
    '/vigenere/candidates',
    { text, key_length: keyLength },
    isVigenereCandidates,
    'Vigenère candidate',
    { timeoutMs: 15_000, ...options },
  )
