import type {
  AffineSearchResponse,
  CaesarCrackResponse,
  FrequencyResponse,
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
    (value.chi_squared === null || isNum(value.chi_squared))
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
