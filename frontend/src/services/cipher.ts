import type {
  AffineRequest,
  AffineResponse,
  CaesarRequest,
  CaesarResponse,
  CipherOperation,
  VigenereRequest,
  VigenereResponse,
} from '../types/cipher'
import { ApiError, apiPost, type RequestOptions } from './api'

export const ALGEBRA_BASE_PATH = '/api/v1/algebra'

const isOperation = (value: unknown): value is CipherOperation =>
  value === 'encrypt' || value === 'decrypt'

const isInt = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value)

function isCaesarResponse(value: unknown): value is CaesarResponse {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    v.cipher === 'caesar' &&
    isOperation(v.operation) &&
    typeof v.input === 'string' &&
    typeof v.output === 'string' &&
    isInt(v.key) &&
    isInt(v.effective_key)
  )
}

function isAffineResponse(value: unknown): value is AffineResponse {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    v.cipher === 'affine' &&
    isOperation(v.operation) &&
    typeof v.input === 'string' &&
    typeof v.output === 'string' &&
    isInt(v.a) &&
    isInt(v.b) &&
    isInt(v.effective_a) &&
    isInt(v.effective_b) &&
    isInt(v.a_inverse)
  )
}

function isVigenereResponse(value: unknown): value is VigenereResponse {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    v.cipher === 'vigenere' &&
    isOperation(v.operation) &&
    typeof v.input === 'string' &&
    typeof v.output === 'string' &&
    typeof v.key === 'string' &&
    Array.isArray(v.key_shifts) &&
    v.key_shifts.every(isInt) &&
    isInt(v.key_length) &&
    v.key_length === v.key_shifts.length
  )
}

/** Run the Caesar cipher on the backend. */
export async function runCaesar(
  operation: CipherOperation,
  request: CaesarRequest,
  options?: RequestOptions,
): Promise<CaesarResponse> {
  const body = await apiPost<unknown>(`${ALGEBRA_BASE_PATH}/caesar/${operation}`, request, options)
  if (!isCaesarResponse(body) || body.operation !== operation) {
    throw new ApiError('Backend returned an unexpected Caesar response', null)
  }
  return body
}

/** Run the affine cipher on the backend. */
export async function runAffine(
  operation: CipherOperation,
  request: AffineRequest,
  options?: RequestOptions,
): Promise<AffineResponse> {
  const body = await apiPost<unknown>(`${ALGEBRA_BASE_PATH}/affine/${operation}`, request, options)
  if (!isAffineResponse(body) || body.operation !== operation) {
    throw new ApiError('Backend returned an unexpected affine response', null)
  }
  return body
}

/** Run the Vigenère cipher on the backend. */
export async function runVigenere(
  operation: CipherOperation,
  request: VigenereRequest,
  options?: RequestOptions,
): Promise<VigenereResponse> {
  const body = await apiPost<unknown>(`${ALGEBRA_BASE_PATH}/vigenere/${operation}`, request, options)
  if (!isVigenereResponse(body) || body.operation !== operation) {
    throw new ApiError('Backend returned an unexpected Vigenère response', null)
  }
  return body
}
