/** Types for the Caesar and affine cipher endpoints (`/api/v1/algebra/...`). */

export type CipherId = 'caesar' | 'affine'
export type CipherOperation = 'encrypt' | 'decrypt'

export interface CaesarRequest {
  text: string
  /** Any integer with absolute value at most 2^53 - 1. */
  key: number
}

export interface CaesarResponse {
  cipher: 'caesar'
  operation: CipherOperation
  input: string
  output: string
  /** The key as submitted. */
  key: number
  /** k mod 26, in 0..25. */
  effective_key: number
}

export interface AffineRequest {
  text: string
  /** Multiplier; must satisfy gcd(a, 26) = 1. */
  a: number
  b: number
}

export interface AffineResponse {
  cipher: 'affine'
  operation: CipherOperation
  input: string
  output: string
  a: number
  b: number
  effective_a: number
  effective_b: number
  /** Multiplicative inverse of a modulo 26, as computed by the backend. */
  a_inverse: number
}

export type CipherResponse = CaesarResponse | AffineResponse
