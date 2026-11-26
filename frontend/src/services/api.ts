import { API_BASE_URL } from './config'

/** One problem reported by the backend: where it is, what is wrong, and a stable code. */
export interface ApiErrorDetail {
  loc: (string | number)[]
  msg: string
  type: string
}

/**
 * What went wrong with a request:
 * - `offline`: the backend could not be reached at all.
 * - `timeout`: no answer within the time limit.
 * - `http`: the backend answered with an error status (see `status` and `details`).
 * - `invalid-response`: the backend answered successfully but with an unexpected body.
 */
export type ApiErrorKind = 'offline' | 'timeout' | 'http' | 'invalid-response'

export interface ApiErrorExtra {
  kind?: ApiErrorKind
  details?: ApiErrorDetail[]
}

/** Raised for any failed backend request (network, timeout, HTTP error, bad payload). */
export class ApiError extends Error {
  readonly status: number | null
  readonly kind: ApiErrorKind
  /** Problems from the backend's uniform error body; empty for network failures. */
  readonly details: ApiErrorDetail[]

  constructor(message: string, status: number | null = null, extra: ApiErrorExtra = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.kind = extra.kind ?? (status === null ? 'invalid-response' : 'http')
    this.details = extra.details ?? []
  }
}

export interface RequestOptions {
  /** Aborts the request, e.g. when a component unmounts. */
  signal?: AbortSignal
  /** Give up after this many milliseconds. Default 5000. */
  timeoutMs?: number
}

function isErrorDetail(value: unknown): value is ApiErrorDetail {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    Array.isArray(v.loc) &&
    v.loc.every((part) => typeof part === 'string' || typeof part === 'number') &&
    typeof v.msg === 'string' &&
    typeof v.type === 'string'
  )
}

/** Read the backend's uniform `{detail: [{loc, msg, type}]}` error body, if it has one. */
async function readErrorDetails(response: Response): Promise<ApiErrorDetail[]> {
  try {
    const body: unknown = await response.json()
    if (typeof body !== 'object' || body === null) return []
    const detail = (body as { detail?: unknown }).detail
    return Array.isArray(detail) && detail.every(isErrorDetail) ? detail : []
  } catch {
    return [] // not JSON (for example a proxy error page)
  }
}

interface RequestInput extends RequestOptions {
  method: 'GET' | 'POST'
  path: string
  body?: unknown
}

/** The single place that talks to the backend: timeout, abort, error parsing. */
async function request<T>({ method, path, body, signal, timeoutMs = 5000 }: RequestInput): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const forwardAbort = () => controller.abort()
  signal?.addEventListener('abort', forwardAbort, { once: true })
  if (signal?.aborted) controller.abort()

  try {
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (body !== undefined) headers['Content-Type'] = 'application/json'

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    })
    if (!response.ok) {
      const details = await readErrorDetails(response)
      const message = details[0]?.msg ?? `Backend responded with HTTP ${response.status}`
      throw new ApiError(message, response.status, { kind: 'http', details })
    }
    return (await response.json()) as T
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (signal?.aborted) throw error // caller cancelled; let it handle that
    if (controller.signal.aborted) {
      throw new ApiError(`No response from ${API_BASE_URL} within ${timeoutMs} ms`, null, {
        kind: 'timeout',
      })
    }
    throw new ApiError(`Could not reach the backend at ${API_BASE_URL}`, null, { kind: 'offline' })
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', forwardAbort)
  }
}

/** GET `path` (relative to the backend base URL) and parse the JSON body as `T`. */
export function apiGet<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return request<T>({ method: 'GET', path, ...options })
}

/** POST `body` as JSON to `path` and parse the JSON response as `T`. */
export function apiPost<T>(path: string, body: unknown, options: RequestOptions = {}): Promise<T> {
  return request<T>({ method: 'POST', path, body, ...options })
}
