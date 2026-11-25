import { afterEach, describe, expect, it, vi } from 'vitest'
import { API_BASE_URL } from './config'
import { ApiError, apiGet, apiPost } from './api'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const stubFetch = (impl: (...args: Parameters<typeof fetch>) => Promise<Response>) => {
  const mock = vi.fn(impl)
  vi.stubGlobal('fetch', mock)
  return mock
}

async function caught(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise
  } catch (error) {
    if (error instanceof ApiError) return error
    throw error
  }
  throw new Error('expected the request to fail')
}

afterEach(() => {
  vi.useRealTimers()
})

describe('apiGet', () => {
  it('requests the path under the configured base URL and parses JSON', async () => {
    const fetchMock = stubFetch(async () => json({ ok: true }))

    await expect(apiGet<{ ok: boolean }>('/api/v1/health')).resolves.toEqual({ ok: true })

    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe(`${API_BASE_URL}/api/v1/health`)
    expect(init?.method).toBe('GET')
    expect(init?.body).toBeUndefined()
  })
})

describe('apiPost', () => {
  it('sends the body as JSON with the right headers', async () => {
    const fetchMock = stubFetch(async () => json({ done: 1 }))

    await expect(apiPost('/x', { text: 'héllo', key: -3 })).resolves.toEqual({ done: 1 })

    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe(`${API_BASE_URL}/x`)
    expect(init?.method).toBe('POST')
    expect((init?.headers as Record<string, string>)['Content-Type']).toBe('application/json')
    expect(JSON.parse(String(init?.body))).toEqual({ text: 'héllo', key: -3 })
  })

  it('sends integers at the JavaScript-safe boundary exactly', async () => {
    const fetchMock = stubFetch(async () => json({}))

    await apiPost('/x', { key: 9007199254740991, other: -9007199254740991 })

    expect(String(fetchMock.mock.calls[0]?.[1]?.body)).toBe('{"key":9007199254740991,"other":-9007199254740991}')
  })

  it('turns the uniform backend error body into an ApiError with details', async () => {
    const detail = [{ loc: ['body', 'a'], msg: 'Invalid affine key: a = 4 is not coprime to 26', type: 'invalid_key' }]
    stubFetch(async () => json({ detail }, 422))

    const error = await caught(apiPost('/x', {}))

    expect(error.kind).toBe('http')
    expect(error.status).toBe(422)
    expect(error.message).toBe(detail[0]?.msg)
    expect(error.details).toEqual(detail)
  })

  it('keeps every problem when there are several', async () => {
    const detail = [
      { loc: ['body', 'text'], msg: 'Input should be a valid string', type: 'string_type' },
      { loc: ['body', 'key'], msg: 'Field required', type: 'missing' },
    ]
    stubFetch(async () => json({ detail }, 422))

    expect((await caught(apiPost('/x', {}))).details).toHaveLength(2)
  })

  it('reports an oversized request (413) with its message', async () => {
    const detail = [{ loc: [], msg: 'Request body too large: the limit is 262144 bytes.', type: 'payload_too_large' }]
    stubFetch(async () => json({ detail }, 413))

    const error = await caught(apiPost('/x', {}))

    expect(error.status).toBe(413)
    expect(error.details[0]?.type).toBe('payload_too_large')
  })

  it('falls back to a generic message when the error body is not the uniform shape', async () => {
    stubFetch(async () => new Response('<html>Bad gateway</html>', { status: 502 }))
    const html = await caught(apiPost('/x', {}))
    expect(html.status).toBe(502)
    expect(html.message).toBe('Backend responded with HTTP 502')
    expect(html.details).toEqual([])

    stubFetch(async () => json({ detail: 'a plain string' }, 400))
    const plain = await caught(apiPost('/x', {}))
    expect(plain.details).toEqual([])
    expect(plain.message).toBe('Backend responded with HTTP 400')

    stubFetch(async () => json({ detail: [{ loc: 'body', msg: 5 }] }, 422))
    expect((await caught(apiPost('/x', {}))).details).toEqual([])
  })

  it('reports an unreachable backend as offline', async () => {
    stubFetch(async () => {
      throw new TypeError('Failed to fetch')
    })

    const error = await caught(apiPost('/x', {}))

    expect(error.kind).toBe('offline')
    expect(error.status).toBeNull()
    expect(error.message).toContain(API_BASE_URL)
  })

  it('reports a request that takes too long as a timeout', async () => {
    vi.useFakeTimers()
    stubFetch(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
        }),
    )

    const pending = caught(apiPost('/x', {}, { timeoutMs: 1000 }))
    await vi.advanceTimersByTimeAsync(1001)
    const error = await pending

    expect(error.kind).toBe('timeout')
    expect(error.message).toContain('1000 ms')
  })

  it('lets the caller cancel without producing an ApiError', async () => {
    stubFetch(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
        }),
    )
    const controller = new AbortController()

    const pending = apiPost('/x', {}, { signal: controller.signal })
    controller.abort()

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('hands an already-cancelled signal to fetch and fails with AbortError', async () => {
    const fetchMock = stubFetch(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          if (init?.signal?.aborted) reject(new DOMException('aborted', 'AbortError'))
        }),
    )
    const controller = new AbortController()
    controller.abort()

    await expect(apiPost('/x', {}, { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('ApiError defaults', () => {
  it('keeps the old two-argument form working', () => {
    expect(new ApiError('boom').kind).toBe('invalid-response')
    expect(new ApiError('boom', 500).kind).toBe('http')
    expect(new ApiError('boom', 500).details).toEqual([])
  })
})
