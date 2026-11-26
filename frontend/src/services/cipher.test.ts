import { describe, expect, it, vi } from 'vitest'
import { ApiError } from './api'
import { API_BASE_URL } from './config'
import { runAffine, runCaesar } from './cipher'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const caesarBody = (over = {}) => ({
  cipher: 'caesar',
  operation: 'encrypt',
  input: 'abc',
  output: 'def',
  key: 3,
  effective_key: 3,
  ...over,
})

const affineBody = (over = {}) => ({
  cipher: 'affine',
  operation: 'encrypt',
  input: 'abc',
  output: 'ihq',
  a: 5,
  b: 8,
  effective_a: 5,
  effective_b: 8,
  a_inverse: 21,
  ...over,
})

function stub(body: unknown, status = 200) {
  const mock = vi.fn(async () => json(body, status))
  vi.stubGlobal('fetch', mock)
  return mock
}

describe('runCaesar', () => {
  it.each(['encrypt', 'decrypt'] as const)('posts to the Caesar %s endpoint', async (operation) => {
    const fetchMock = stub(caesarBody({ operation }))

    const result = await runCaesar(operation, { text: 'abc', key: 3 })

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(`${API_BASE_URL}/api/v1/algebra/caesar/${operation}`)
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({ text: 'abc', key: 3 })
    expect(result.operation).toBe(operation)
    expect(result.output).toBe('def')
  })

  it('passes through the reduced key reported by the backend', async () => {
    stub(caesarBody({ key: -29, effective_key: 23 }))

    expect(await runCaesar('encrypt', { text: 'abc', key: -29 })).toMatchObject({ key: -29, effective_key: 23 })
  })

  it('rejects a response of the wrong shape or for the wrong operation', async () => {
    stub({ cipher: 'caesar', output: 5 })
    await expect(runCaesar('encrypt', { text: 'a', key: 1 })).rejects.toBeInstanceOf(ApiError)

    stub(caesarBody({ operation: 'decrypt' }))
    await expect(runCaesar('encrypt', { text: 'a', key: 1 })).rejects.toThrow('unexpected Caesar response')

    stub(affineBody())
    await expect(runCaesar('encrypt', { text: 'a', key: 1 })).rejects.toBeInstanceOf(ApiError)
  })

  it('surfaces backend validation errors', async () => {
    stub({ detail: [{ loc: ['body', 'key'], msg: 'Input should be less than or equal to 9007199254740991', type: 'less_than_equal' }] }, 422)

    await expect(runCaesar('encrypt', { text: 'a', key: 1 })).rejects.toMatchObject({
      status: 422,
      details: [{ loc: ['body', 'key'], type: 'less_than_equal' }],
    })
  })
})

describe('runAffine', () => {
  it.each(['encrypt', 'decrypt'] as const)('posts to the affine %s endpoint', async (operation) => {
    const fetchMock = stub(affineBody({ operation }))

    const result = await runAffine(operation, { text: 'abc', a: 5, b: 8 })

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(`${API_BASE_URL}/api/v1/algebra/affine/${operation}`)
    expect(JSON.parse(String(init.body))).toEqual({ text: 'abc', a: 5, b: 8 })
    expect(result.a_inverse).toBe(21)
  })

  it('rejects a response missing the modular inverse', async () => {
    const { a_inverse: _omitted, ...withoutInverse } = affineBody()
    stub(withoutInverse)

    await expect(runAffine('encrypt', { text: 'a', a: 5, b: 8 })).rejects.toThrow('unexpected affine response')
  })

  it('surfaces the backend invalid_key error', async () => {
    stub({ detail: [{ loc: ['body', 'a'], msg: 'Invalid affine key: a = 4 is not coprime to 26', type: 'invalid_key' }] }, 422)

    await expect(runAffine('encrypt', { text: 'a', a: 4, b: 0 })).rejects.toMatchObject({
      status: 422,
      details: [{ type: 'invalid_key', loc: ['body', 'a'] }],
    })
  })

  it('reports an offline backend', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))))

    await expect(runAffine('decrypt', { text: 'a', a: 5, b: 8 })).rejects.toMatchObject({ kind: 'offline' })
  })
})
