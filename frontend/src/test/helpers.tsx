import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import App from '../App'

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const HEALTH = {
  status: 'ok',
  service: 'discreta-backend',
  version: '1.0.0',
  message: 'DISCRETA backend is running.',
  timestamp: '2026-01-01T00:00:00Z',
}

export type Handler = (body: Record<string, unknown>, url: string) => Response | Promise<Response> | unknown

/**
 * Replace `fetch` with a router keyed by the end of the URL path, e.g. `'/caesar/encrypt'`.
 * The health endpoint answers "ok" unless overridden. Returns the mock and the JSON bodies
 * that were posted, so a test can check exactly what was sent.
 */
export function mockBackend(handlers: Record<string, Handler> = {}) {
  const posted: { path: string; body: Record<string, unknown> }[] = []
  const mock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const path = new URL(url).pathname
    if (path.endsWith('/health') && !handlers['/health']) return json(HEALTH)
    const key = Object.keys(handlers).find((k) => path.endsWith(k))
    if (!key) return json({ detail: [{ loc: [], msg: 'Not Found', type: 'not_found' }] }, 404)
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {}
    posted.push({ path, body })
    const result = await handlers[key]!(body, url)
    return result instanceof Response ? result : json(result)
  })
  vi.stubGlobal('fetch', mock)
  return { mock, posted }
}

/** An offline backend: every request fails like a refused connection. */
export function offlineBackend() {
  const mock = vi.fn(async () => {
    throw new TypeError('Failed to fetch')
  })
  vi.stubGlobal('fetch', mock)
  return mock
}

export function renderApp(route = '/') {
  const user = userEvent.setup()
  const view = render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  )
  return { user, ...view }
}

// ---- Fixtures shaped like the backend's replies (the tests, not the app, define them) ----

export const caesarReply = (over: Record<string, unknown> = {}) => ({
  cipher: 'caesar',
  operation: 'encrypt',
  input: 'Hello',
  output: 'Khoor',
  key: 3,
  effective_key: 3,
  ...over,
})

export const affineReply = (over: Record<string, unknown> = {}) => ({
  cipher: 'affine',
  operation: 'encrypt',
  input: 'AFFINE',
  output: 'IHHWVC',
  a: 5,
  b: 8,
  effective_a: 5,
  effective_b: 8,
  a_inverse: 21,
  ...over,
})

const ENGLISH = [
  8.167, 1.492, 2.782, 4.253, 12.702, 2.228, 2.015, 6.094, 6.966, 0.153, 0.772, 4.025, 2.406, 6.749, 7.507, 1.929,
  0.095, 5.987, 6.327, 9.056, 2.758, 0.978, 2.36, 0.15, 1.974, 0.074,
]

/** A frequency reply for `text`, built the way the backend defines it (counts of A-Z). */
export function frequencyReply(text: string) {
  const counts = Array<number>(26).fill(0)
  for (const ch of text.toUpperCase()) if (ch >= 'A' && ch <= 'Z') counts[ch.charCodeAt(0) - 65]! += 1
  const n = counts.reduce((a, b) => a + b, 0)
  const order = [...counts.keys()].sort((x, y) => counts[y]! - counts[x]! || x - y)
  const rankOf = new Map(order.map((letter, i) => [letter, i + 1]))
  const rows = counts.map((count, i) => {
    const percent = n ? (100 * count) / n : 0
    return {
      letter: String.fromCharCode(65 + i),
      count,
      relative: n ? count / n : 0,
      percent,
      english_percent: ENGLISH[i]!,
      difference: percent - ENGLISH[i]!,
      expected_count: (n * ENGLISH[i]!) / 100,
      chi_contribution: 1,
      rank: rankOf.get(i)!,
    }
  })
  const occurring = order.filter((i) => counts[i]! > 0)
  return {
    total_characters: text.length,
    letters: n,
    breakdown: { letters: n, whitespace: 0, digits: 0, other_ascii: text.length - n, non_ascii: 0 },
    rows,
    ranking: order.map((i) => String.fromCharCode(65 + i)),
    most_frequent: occurring.slice(0, 3).map((i) => String.fromCharCode(65 + i)),
    least_frequent: [...occurring].reverse().slice(0, 3).map((i) => String.fromCharCode(65 + i)),
    absent: counts.flatMap((c, i) => (c === 0 ? [String.fromCharCode(65 + i)] : [])),
    chi_squared: n ? 123.4 : null,
    index_of_coincidence: n >= 2 ? counts.reduce((acc, f) => acc + f * (f - 1), 0) / (n * (n - 1)) : null,
    reference: 'English letter frequencies from R. Lewand, Cryptological Mathematics (2000), normalised to sum to 100%.',
  }
}

export function caesarCrackReply(plaintexts: Record<number, string>, best: number, over: Record<string, unknown> = {}) {
  const order = [best, ...Array.from({ length: 26 }, (_, k) => k).filter((k) => k !== best)]
  return {
    letters: 120,
    reliability: 'adequate',
    reliability_note: '120 letters is enough for a usable Caesar ranking, but the result is still a statistical estimate, not proof.',
    candidates: order.map((key, i) => ({
      rank: i + 1,
      key,
      chi_squared: 20 + i * 15,
      plaintext: plaintexts[key] ?? `candidate text for key ${key}`,
    })),
    separation: 1.9,
    ...over,
  }
}

const VALID_A = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25]
const INVERSE: Record<number, number> = { 1: 1, 3: 9, 5: 21, 7: 15, 9: 3, 11: 19, 15: 7, 17: 23, 19: 11, 21: 5, 23: 17, 25: 25 }

/** An affine search reply: all 312 keys, `best` first, plaintexts only for the first `limit`. */
export function affineSearchReply(best: [number, number], limit = 20, over: Record<string, unknown> = {}) {
  const keys: [number, number][] = [best]
  for (const a of VALID_A) for (let b = 0; b < 26; b += 1) if (a !== best[0] || b !== best[1]) keys.push([a, b])
  return {
    letters: 200,
    reliability: 'adequate',
    reliability_note: '200 letters is enough for a usable affine ranking, but the result is still a statistical estimate, not proof.',
    key_space: 312,
    plaintexts_included: limit,
    candidates: keys.map(([a, b], i) => ({
      rank: i + 1,
      a,
      b,
      a_inverse: INVERSE[a]!,
      chi_squared: 20 + i,
      plaintext: i < limit ? `affine candidate ${a},${b}` : null,
    })),
    separation: 1.3,
    ...over,
  }
}

// ---- Vigenère fixtures ----------------------------------------------------------------

export const vigenereReply = (over: Record<string, unknown> = {}) => ({
  cipher: 'vigenere',
  operation: 'encrypt',
  input: 'ATTACKATDAWN',
  output: 'LXFOPVEFRNHR',
  key: 'LEMON',
  key_shifts: [11, 4, 12, 14, 13],
  key_length: 5,
  ...over,
})

const repeat = (sequence: string, first: number, second: number) => ({
  sequence,
  length: sequence.length,
  first,
  second,
  distance: second - first,
})

/** A key-length reply in which length 5 is suggested and the rest are not plausible. */
export function lengthsReply(over: Record<string, unknown> = {}) {
  const lengths = Array.from({ length: 20 }, (_, i) => i + 1)
  const rows = lengths.map((length) => ({
    length,
    smallest_column: Math.floor(300 / length),
    mean_ic: length % 5 === 0 ? 0.066 : 0.042,
    plausible: length === 5,
    kasiski_repeats: length === 5 ? 9 : length === 2 ? 4 : 0,
    kasiski_fraction: length === 5 ? 0.9 : length === 2 ? 0.4 : 0,
  }))
  const ranked = [...rows.filter((r) => r.plausible), ...rows.filter((r) => !r.plausible).sort((a, b) => b.mean_ic - a.mean_ic || a.length - b.length)]
  return {
    letters: 300,
    index_of_coincidence: {
      letters: 300,
      ic: 0.0427,
      english_ic: 0.0655,
      random_ic: 0.0385,
      reading: 'flat',
      reliability: 'adequate',
      note: 'The IC is close to random letters. The IC is evidence, not proof.',
      friedman_key_length: 5.2,
    },
    kasiski: {
      letters: 300,
      total_repeats: 10,
      repeats: [repeat('THEQ', 3, 38), repeat('ABC', 10, 25)],
      votes: [
        { length: 5, repeats: 9, fraction: 0.9, examples: [repeat('THEQ', 3, 38)] },
        { length: 2, repeats: 4, fraction: 0.4, examples: [repeat('ABC', 10, 24)] },
      ],
      distance_gcd: 1,
      note: '10 repeated sequences found. A distance is often a multiple of the key length, but chance also repeats short sequences, so these counts are evidence, not proof.',
    },
    lengths: ranked.map((r, i) => ({ rank: i + 1, ...r })),
    suggested_length: 5,
    reliability: 'adequate',
    note: 'Length 5 is the shortest whose columns look like English. This is a suggestion, not proof.',
    ...over,
  }
}

/** A candidate reply for `key`, with `alt` as a runner-up key. */
export function candidatesReply(key = 'LEMON', over: Record<string, unknown> = {}) {
  const shifts = Array.from(key, (c) => c.charCodeAt(0) - 65)
  const make = (k: string, rank: number) => ({
    rank,
    key: k,
    shortest_equivalent_key: k,
    shifts: Array.from(k, (c) => c.charCodeAt(0) - 65),
    column_chi_sum: 30 * rank,
    text_chi_squared: 40 + 20 * rank,
    plaintext: `plaintext for ${k}`,
  })
  const alt = key.slice(0, -1) + (key.endsWith('A') ? 'B' : 'A')
  return {
    letters: 300,
    key_length: key.length,
    columns: shifts.map((shift, position) => ({
      position,
      size: Math.floor(300 / key.length),
      best: { shift, letter: key[position], chi_squared: 20 + position },
      options: [
        { shift, letter: key[position], chi_squared: 20 + position },
        { shift: (shift + 1) % 26, letter: String.fromCharCode(65 + ((shift + 1) % 26)), chi_squared: 90 },
        { shift: (shift + 2) % 26, letter: String.fromCharCode(65 + ((shift + 2) % 26)), chi_squared: 120 },
      ],
      separation: 4.5,
      reliability: 'adequate',
    })),
    candidates: [make(key, 1), make(alt, 2)],
    reliability: 'adequate',
    note: 'Each key letter is estimated from a column of 60 to 60 letters. That is enough for usable estimates, but the key is still a statistical suggestion, not proof.',
    ...over,
  }
}
