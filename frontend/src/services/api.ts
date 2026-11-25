import { API_BASE_URL } from './config'

/** Raised for any failed backend request (network, timeout, HTTP error, bad payload). */
export class ApiError extends Error {
  readonly status: number | null

  constructor(message: string, status: number | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export interface RequestOptions {
  /** Aborts the request, e.g. when a component unmounts. */
  signal?: AbortSignal
  /** Give up after this many milliseconds. Default 5000. */
  timeoutMs?: number
}

/** GET `path` (relative to the backend base URL) and parse the JSON body as `T`. */
export async function apiGet<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { signal, timeoutMs = 5000 } = options

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const forwardAbort = () => controller.abort()
  signal?.addEventListener('abort', forwardAbort, { once: true })
  if (signal?.aborted) controller.abort()

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new ApiError(`Backend responded with HTTP ${response.status}`, response.status)
    }
    return (await response.json()) as T
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (signal?.aborted) throw error // caller cancelled; let it handle that
    if (controller.signal.aborted) {
      throw new ApiError(`No response from ${API_BASE_URL} within ${timeoutMs} ms`)
    }
    throw new ApiError(`Could not reach the backend at ${API_BASE_URL}`)
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', forwardAbort)
  }
}
