import type { HealthResponse } from '../types'
import { ApiError, apiGet, type RequestOptions } from './api'

export const HEALTH_PATH = '/api/v1/health'

function isHealthResponse(value: unknown): value is HealthResponse {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.status === 'string' &&
    typeof v.service === 'string' &&
    typeof v.version === 'string' &&
    typeof v.message === 'string' &&
    typeof v.timestamp === 'string'
  )
}

/**
 * Ask the backend whether it is running. Resolves only for a well-formed
 * response with `status: "ok"`; anything else rejects with an `ApiError`.
 */
export async function fetchHealth(options?: RequestOptions): Promise<HealthResponse> {
  const body = await apiGet<unknown>(HEALTH_PATH, options)
  if (!isHealthResponse(body)) {
    throw new ApiError('Backend returned an unexpected health response')
  }
  if (body.status !== 'ok') {
    throw new ApiError(`Backend reports status "${body.status}"`)
  }
  return body
}
