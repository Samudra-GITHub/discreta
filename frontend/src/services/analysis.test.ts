import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './api'
import { runAffineSearch, runCaesarCrack, runFrequency } from './analysis'
import { affineSearchReply, caesarCrackReply, frequencyReply, json } from '../test/helpers'

const stub = (response: () => Response | Promise<Response>) => {
  const mock = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => response())
  vi.stubGlobal('fetch', mock)
  return mock
}

afterEach(() => vi.unstubAllGlobals())

describe('runFrequency', () => {
  it('posts the text to the frequency endpoint and returns the reply', async () => {
    const mock = stub(() => json(frequencyReply('hello')))

    const result = await runFrequency('hello')

    expect(String(mock.mock.calls[0]?.[0])).toMatch(/\/api\/v1\/analysis\/frequency$/)
    expect(JSON.parse(String(mock.mock.calls[0]?.[1]?.body))).toEqual({ text: 'hello' })
    expect(result.letters).toBe(5)
    expect(result.rows).toHaveLength(26)
  })

  it('rejects a reply without 26 rows', async () => {
    stub(() => json({ ...frequencyReply('hello'), rows: [] }))
    await expect(runFrequency('hello')).rejects.toBeInstanceOf(ApiError)
  })

  it('rejects a reply with a non-numeric field', async () => {
    const bad = frequencyReply('hello')
    stub(() => json({ ...bad, rows: bad.rows.map((r) => ({ ...r, count: 'x' })) }))
    await expect(runFrequency('hello')).rejects.toThrow(/unexpected frequency response/)
  })

  it('accepts a null chi-squared for an empty text', async () => {
    stub(() => json(frequencyReply('')))
    expect((await runFrequency('')).chi_squared).toBeNull()
  })

  it('turns a refused connection into an offline ApiError', async () => {
    stub(() => {
      throw new TypeError('Failed to fetch')
    })
    await expect(runFrequency('x')).rejects.toMatchObject({ kind: 'offline' })
  })
})

describe('runCaesarCrack', () => {
  it('posts to the crack endpoint and returns all 26 candidates', async () => {
    const mock = stub(() => json(caesarCrackReply({}, 3)))

    const result = await runCaesarCrack('abc')

    expect(String(mock.mock.calls[0]?.[0])).toMatch(/\/api\/v1\/analysis\/caesar\/crack$/)
    expect(result.candidates).toHaveLength(26)
  })

  it('rejects a reply with the wrong number of candidates or a bad reliability', async () => {
    const good = caesarCrackReply({}, 3)
    stub(() => json({ ...good, candidates: good.candidates.slice(1) }))
    await expect(runCaesarCrack('abc')).rejects.toBeInstanceOf(ApiError)
    stub(() => json({ ...good, reliability: 'great' }))
    await expect(runCaesarCrack('abc')).rejects.toBeInstanceOf(ApiError)
  })

  it('surfaces a no_letters 422 with its details', async () => {
    stub(() => json({ detail: [{ loc: ['body', 'text'], msg: 'no letters', type: 'no_letters' }] }, 422))
    await expect(runCaesarCrack('123')).rejects.toMatchObject({
      status: 422,
      details: [{ loc: ['body', 'text'], msg: 'no letters', type: 'no_letters' }],
    })
  })
})

describe('runAffineSearch', () => {
  it('sends the plaintext limit (20 by default) and returns 312 candidates', async () => {
    const mock = stub(() => json(affineSearchReply([5, 8])))

    const result = await runAffineSearch('abc')

    expect(JSON.parse(String(mock.mock.calls[0]?.[1]?.body))).toEqual({ text: 'abc', plaintext_limit: 20 })
    expect(String(mock.mock.calls[0]?.[0])).toMatch(/\/api\/v1\/analysis\/affine\/search$/)
    expect(result.candidates).toHaveLength(312)
    expect(result.candidates[25]?.plaintext).toBeNull()
  })

  it('honours an explicit limit', async () => {
    const mock = stub(() => json(affineSearchReply([5, 8], 5)))
    await runAffineSearch('abc', 5)
    expect(JSON.parse(String(mock.mock.calls[0]?.[1]?.body)).plaintext_limit).toBe(5)
  })

  it('rejects a reply whose candidate count disagrees with key_space', async () => {
    const good = affineSearchReply([5, 8])
    stub(() => json({ ...good, candidates: good.candidates.slice(0, 100) }))
    await expect(runAffineSearch('abc')).rejects.toBeInstanceOf(ApiError)
  })
})
