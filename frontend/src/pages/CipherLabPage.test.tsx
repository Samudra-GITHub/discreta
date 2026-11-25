import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BackendHealthContext } from '../hooks/backendHealthContext'
import type { BackendHealthState } from '../hooks/useBackendHealth'
import { CipherLabPage } from './CipherLabPage'

const online: BackendHealthState = {
  status: 'online',
  health: null,
  error: null,
  checkedAt: null,
  isChecking: false,
  recheck: () => {},
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const caesarReply = (over: Record<string, unknown> = {}) => ({
  cipher: 'caesar',
  operation: 'encrypt',
  input: 'Hello',
  output: 'Khoor',
  key: 3,
  effective_key: 3,
  ...over,
})

const affineReply = (over: Record<string, unknown> = {}) => ({
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

function setup(state: BackendHealthState = online) {
  const user = userEvent.setup()
  render(
    <BackendHealthContext.Provider value={state}>
      <CipherLabPage />
    </BackendHealthContext.Provider>,
  )
  return user
}

const stubFetch = (impl: (url: string, init?: RequestInit) => Promise<Response>) => {
  const mock = vi.fn(impl)
  vi.stubGlobal('fetch', mock)
  return mock
}

const run = (name: 'Encrypt' | 'Decrypt') => screen.getByRole('button', { name })
const message = () => screen.getByLabelText(/^(Message to encrypt|Ciphertext to decrypt)$/)

async function type(user: ReturnType<typeof userEvent.setup>, field: HTMLElement, value: string) {
  await user.clear(field)
  if (value !== '') await user.type(field, value)
}

describe('initial state', () => {
  it('starts with Caesar encryption, key 3, and nothing to run', () => {
    setup()

    expect(screen.getByRole('radio', { name: /Caesar/ })).toHaveProperty('ariaChecked', 'true')
    expect(screen.getByRole('radio', { name: /Encrypt/ })).toHaveProperty('ariaChecked', 'true')
    expect((screen.getByLabelText('Shift k') as HTMLInputElement).value).toBe('3')
    expect((run('Encrypt') as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText('Enter a message to continue.')).toBeTruthy()
    expect(screen.getByTestId('result-empty')).toBeTruthy()
    expect(screen.getByTestId('formula-symbolic').textContent).toContain('mod 26')
  })

  it('shows the Caesar formula for the chosen operation, with the shift filled in', async () => {
    const user = setup()

    expect(screen.getByTestId('formula-substituted').textContent).toMatch(/x\s*\+\s*3/)
    await user.click(screen.getByRole('radio', { name: /Decrypt/ }))
    expect(screen.getByTestId('formula-symbolic').textContent).toMatch(/y\s*−\s*k/)
    expect(screen.getByTestId('formula-substituted').textContent).toMatch(/y\s*−\s*3/)
  })
})

describe('explicit execution only', () => {
  it('does not call the backend while the user types or changes keys', async () => {
    const fetchMock = stubFetch(async () => json(caesarReply()))
    const user = setup()

    await type(user, message(), 'Hello, world')
    await type(user, screen.getByLabelText('Shift k'), '7')
    await user.click(screen.getByRole('button', { name: 'Increase Shift k' }))
    await user.click(screen.getByRole('radio', { name: /Affine/ }))
    await user.click(screen.getByRole('radio', { name: /Caesar/ }))

    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('Caesar cipher against the API', () => {
  it('encrypts: posts the text and key, then shows the output and the substituted formula', async () => {
    const fetchMock = stubFetch(async () => json(caesarReply()))
    const user = setup()

    await type(user, message(), 'Hello')
    await user.click(run('Encrypt'))

    await waitFor(() => expect(screen.getByTestId('cipher-output').textContent).toBe('Khoor'))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toMatch(/\/api\/v1\/algebra\/caesar\/encrypt$/)
    expect(JSON.parse(String(init?.body))).toEqual({ text: 'Hello', key: 3 })
    expect(screen.getByTestId('result-summary').textContent).toContain('Caesar cipher, shift k = 3')
    expect(screen.getByTestId('formula-substituted').textContent).toMatch(/x\s*\+\s*3/)
  })

  it('decrypts through the decrypt endpoint', async () => {
    const fetchMock = stubFetch(async () => json(caesarReply({ operation: 'decrypt', input: 'Khoor', output: 'Hello' })))
    const user = setup()

    await user.click(screen.getByRole('radio', { name: /Decrypt/ }))
    await type(user, message(), 'Khoor')
    await user.click(run('Decrypt'))

    await waitFor(() => expect(screen.getByTestId('cipher-output').textContent).toBe('Hello'))
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/caesar\/decrypt$/)
  })

  it('shows the reduced key the backend reports for a negative key', async () => {
    const fetchMock = stubFetch(async () => json(caesarReply({ key: -29, effective_key: 23, input: 'Hi', output: 'Ef' })))
    const user = setup()

    await type(user, screen.getByLabelText('Shift k'), '-29')
    expect(screen.getByText(/acts as 23 \(mod 26\)/)).toBeTruthy()
    await type(user, message(), 'Hi')
    await user.click(run('Encrypt'))

    await waitFor(() => expect(screen.getByTestId('cipher-output').textContent).toBe('Ef'))
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)).key).toBe(-29)
    expect(screen.getByTestId('result-summary').textContent).toContain('Your key -29 acts as 23')
    expect(screen.getByTestId('formula-substituted').textContent).toMatch(/x\s*\+\s*23/)
  })

  it('builds a worked example from the response and shows each step', async () => {
    stubFetch(async () => json(caesarReply()))
    const user = setup()

    await type(user, message(), 'Hello')
    await user.click(run('Encrypt'))

    const steps = await screen.findAllByTestId('worked-step')
    expect(steps).toHaveLength(5)
    expect(within(steps[0]!).getByText('7 + 3', { exact: false })).toBeTruthy()
    expect(steps[0]?.textContent).toContain('H')
    expect(steps[0]?.textContent).toContain('K')
  })
})

describe('Affine cipher against the API', () => {
  async function chooseAffine(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('radio', { name: /Affine/ }))
  }

  it('encrypts with a and b and shows the substituted formula', async () => {
    const fetchMock = stubFetch(async () => json(affineReply()))
    const user = setup()

    await chooseAffine(user)
    await user.click(screen.getByRole('button', { name: '5' }))
    await type(user, screen.getByLabelText('Offset b'), '8')
    await type(user, message(), 'AFFINE')
    await user.click(run('Encrypt'))

    await waitFor(() => expect(screen.getByTestId('cipher-output').textContent).toBe('IHHWVC'))
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/affine\/encrypt$/)
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ text: 'AFFINE', a: 5, b: 8 })
    expect(screen.getByTestId('formula-substituted').textContent).toMatch(/5·x\s*\+\s*8/)
  })

  it('shows the modular inverse that the backend returned when decrypting', async () => {
    const fetchMock = stubFetch(async () =>
      json(affineReply({ operation: 'decrypt', input: 'IHHWVC', output: 'AFFINE', a_inverse: 21 })),
    )
    const user = setup()

    await chooseAffine(user)
    await user.click(screen.getByRole('radio', { name: /Decrypt/ }))
    expect(screen.getByTestId('inverse-note').textContent).toContain('when you run the operation')
    await type(user, message(), 'IHHWVC')
    await user.click(run('Decrypt'))

    await waitFor(() => expect(screen.getByTestId('cipher-output').textContent).toBe('AFFINE'))
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/affine\/decrypt$/)
    const note = screen.getByTestId('inverse-note').textContent ?? ''
    expect(note).toContain('= 21')
    expect(note).toContain('5 · 21 = 105 = 4 · 26 + 1')
    expect(screen.getByTestId('formula-substituted').textContent).toMatch(/21\(y\s*−\s*8\)/)
    expect(screen.getByTestId('gauge-inverse').textContent).toContain('a⁻¹ = 21')
    expect(screen.getByTestId('inverse-explainer').textContent).toContain('= 21')
  })

  it('refuses an invalid multiplier, explains why, and never calls the backend', async () => {
    const fetchMock = stubFetch(async () => json(affineReply()))
    const user = setup()

    await chooseAffine(user)
    await type(user, screen.getByLabelText('Multiplier a'), '4')
    await type(user, message(), 'Hello')

    expect((run('Encrypt') as HTMLButtonElement).disabled).toBe(true)
    const why = screen.getByTestId('invalid-multiplier').textContent ?? ''
    expect(why).toContain('A')
    expect(why).toContain('N')
    expect(why).toContain('4·13 = 52 ≡ 0 (mod 26)')
    expect(screen.getAllByText(/gcd\(4, 26\) = 2/).length).toBeGreaterThan(0)
    await user.click(run('Encrypt'))
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('explains multiples of 13 with their own colliding letters', async () => {
    const user = setup()

    await chooseAffine(user)
    await type(user, screen.getByLabelText('Multiplier a'), '13')

    const why = screen.getByTestId('invalid-multiplier').textContent ?? ''
    expect(why).toContain('13·2 = 26 ≡ 0 (mod 26)')
    expect(screen.getAllByText(/gcd\(13, 26\) = 13/).length).toBeGreaterThan(0)
  })

  it('treats every one of the 14 non-coprime residues as invalid and the 12 others as valid', async () => {
    const user = setup()
    await chooseAffine(user)
    const field = screen.getByLabelText('Multiplier a')
    const valid = new Set([1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25])

    for (let a = 0; a < 26; a += 1) {
      fireEvent.change(field, { target: { value: String(a) } })
      expect(screen.queryByTestId('invalid-multiplier') === null, `a=${a}`).toBe(valid.has(a))
    }
  })

  it('offers exactly the 12 valid multipliers as one-tap choices', async () => {
    const user = setup()
    await chooseAffine(user)

    const group = screen.getByRole('group', { name: 'Valid multipliers' })
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual(
      ['1', '3', '5', '7', '9', '11', '15', '17', '19', '21', '23', '25'],
    )
  })
})

describe('key and text validation', () => {
  it('rejects keys beyond 2^53 - 1 and non-integers before sending anything', async () => {
    const fetchMock = stubFetch(async () => json(caesarReply()))
    const user = setup()
    await type(user, message(), 'Hello')

    for (const bad of ['9007199254740992', '-9007199254740992', '3.5', '1e2', 'abc', '']) {
      await type(user, screen.getByLabelText('Shift k'), bad)
      expect((run('Encrypt') as HTMLButtonElement).disabled, bad).toBe(true)
    }
    await type(user, screen.getByLabelText('Shift k'), '9007199254740991')
    expect((run('Encrypt') as HTMLButtonElement).disabled).toBe(false)
    await type(user, screen.getByLabelText('Shift k'), '-9007199254740991')
    expect((run('Encrypt') as HTMLButtonElement).disabled).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sends an extreme key exactly', async () => {
    const fetchMock = stubFetch(async () => json(caesarReply({ key: 9007199254740991, effective_key: 5 })))
    const user = setup()

    await type(user, screen.getByLabelText('Shift k'), '9007199254740991')
    await type(user, message(), 'Hello')
    await user.click(run('Encrypt'))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(String(fetchMock.mock.calls[0]?.[1]?.body)).toContain('"key":9007199254740991')
  })

  it('counts characters and blocks messages over 10,000', async () => {
    const user = setup()
    const field = message() as HTMLTextAreaElement

    field.focus()
    await user.paste('a'.repeat(10_001))

    expect(screen.getByText(/10,001 \/ 10,000/)).toBeTruthy()
    expect((run('Encrypt') as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getAllByText(/the limit is 10,000/).length).toBeGreaterThan(0)
  })
})

describe('result states', () => {
  it('shows a loading state while the request is in flight, then the result', async () => {
    let finish: (response: Response) => void = () => {}
    stubFetch(() => new Promise<Response>((resolve) => (finish = resolve)))
    const user = setup()

    await type(user, message(), 'Hello')
    await user.click(run('Encrypt'))

    expect(await screen.findByTestId('result-loading')).toBeTruthy()
    expect(screen.getAllByText('Working…').length).toBeGreaterThan(0)
    finish(json(caesarReply()))
    await waitFor(() => expect(screen.getByTestId('cipher-output').textContent).toBe('Khoor'))
    expect(screen.queryByTestId('result-loading')).toBeNull()
  })

  it('reports an unreachable backend and lets the user try again', async () => {
    const fetchMock = stubFetch(async () => {
      throw new TypeError('Failed to fetch')
    })
    const user = setup()

    await type(user, message(), 'Hello')
    await user.click(run('Encrypt'))

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('The backend is not reachable')
    expect(alert.textContent).toContain('uvicorn app.main:app')

    fetchMock.mockImplementation(async () => json(caesarReply()))
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(screen.getByTestId('cipher-output').textContent).toBe('Khoor'))
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('shows the backend validation message and attaches it to the field', async () => {
    stubFetch(async () =>
      json({ detail: [{ loc: ['body', 'text'], msg: 'Input should be a valid string, unable to parse raw data as a unicode string', type: 'string_unicode' }] }, 422),
    )
    const user = setup()

    await type(user, message(), 'Hello')
    await user.click(run('Encrypt'))

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('The server rejected the input')
    expect(screen.getAllByText(/unable to parse raw data/).length).toBeGreaterThanOrEqual(2)
  })

  it('reports an oversized request', async () => {
    stubFetch(async () =>
      json({ detail: [{ loc: [], msg: 'Request body too large: the limit is 262144 bytes.', type: 'payload_too_large' }] }, 413),
    )
    const user = setup()

    await type(user, message(), 'Hello')
    await user.click(run('Encrypt'))

    expect((await screen.findByRole('alert')).textContent).toContain('The message is too large')
  })

  it('clears a previous error when the user edits the input', async () => {
    stubFetch(async () => {
      throw new TypeError('Failed to fetch')
    })
    const user = setup()

    await type(user, message(), 'Hello')
    await user.click(run('Encrypt'))
    await screen.findByRole('alert')
    await user.type(message(), '!')

    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByTestId('result-empty')).toBeTruthy()
  })

  it('handles punctuation and digits: unchanged output, no letters to explain', async () => {
    stubFetch(async () => json(caesarReply({ input: '123, !?', output: '123, !?' })))
    const user = setup()

    await type(user, message(), '123, !?')
    await user.click(run('Encrypt'))

    await waitFor(() => expect(screen.getByTestId('cipher-output').textContent).toBe('123, !?'))
    expect(screen.getByTestId('worked-none')).toBeTruthy()
    expect(screen.getByText(/nothing changed/)).toBeTruthy()
  })

  it('withholds the worked example if the backend output contradicts the arithmetic', async () => {
    stubFetch(async () => json(caesarReply({ output: 'Kxxxx' })))
    const user = setup()

    await type(user, message(), 'Hello')
    await user.click(run('Encrypt'))

    await waitFor(() => expect(screen.getByTestId('cipher-output').textContent).toBe('Kxxxx'))
    expect(screen.getByTestId('worked-unverified')).toBeTruthy()
    expect(screen.queryAllByTestId('worked-step')).toHaveLength(0)
  })

  it('marks a result as out of date once the inputs change', async () => {
    stubFetch(async () => json(caesarReply()))
    const user = setup()

    await type(user, message(), 'Hello')
    await user.click(run('Encrypt'))
    await screen.findByTestId('result-success')
    expect(screen.queryByTestId('result-stale')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Increase Shift k' }))

    expect(screen.getByTestId('result-stale')).toBeTruthy()
  })

  it('rejects a reply of the wrong shape instead of showing it', async () => {
    stubFetch(async () => json({ cipher: 'caesar', output: 5 }))
    const user = setup()

    await type(user, message(), 'Hello')
    await user.click(run('Encrypt'))

    expect((await screen.findByRole('alert')).textContent).toContain('Unexpected reply from the backend')
    expect(screen.queryByTestId('cipher-output')).toBeNull()
  })
})

describe('result actions', () => {
  it('copies the output to the clipboard', async () => {
    stubFetch(async () => json(caesarReply()))
    const user = setup()
    const writeText = vi.fn(async () => {})
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    await type(user, message(), 'Hello')
    await user.click(run('Encrypt'))
    await user.click(await screen.findByRole('button', { name: 'Copy' }))

    expect(writeText).toHaveBeenCalledWith('Khoor')
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeTruthy()
  })

  it('says so when the clipboard is unavailable', async () => {
    stubFetch(async () => json(caesarReply()))
    const user = setup()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: async () => Promise.reject(new Error('denied')) },
      configurable: true,
    })

    await type(user, message(), 'Hello')
    await user.click(run('Encrypt'))
    await user.click(await screen.findByRole('button', { name: 'Copy' }))

    expect(await screen.findByText(/Could not copy automatically/)).toBeTruthy()
  })

  it('clears the message and the result', async () => {
    stubFetch(async () => json(caesarReply()))
    const user = setup()

    await type(user, message(), 'Hello')
    await user.click(run('Encrypt'))
    await screen.findByTestId('result-success')
    await user.click(screen.getByRole('button', { name: 'Clear' }))

    expect((message() as HTMLTextAreaElement).value).toBe('')
    expect(screen.getByTestId('result-empty')).toBeTruthy()
  })

  it('uses the result as the next input and flips the operation', async () => {
    stubFetch(async () => json(caesarReply()))
    const user = setup()

    await type(user, message(), 'Hello')
    await user.click(run('Encrypt'))
    await screen.findByTestId('result-success')
    await user.click(screen.getByRole('button', { name: /Use as input/ }))

    expect((screen.getByLabelText('Ciphertext to decrypt') as HTMLTextAreaElement).value).toBe('Khoor')
    expect(screen.getByRole('radio', { name: /Decrypt/ })).toHaveProperty('ariaChecked', 'true')
  })
})

describe('switching ciphers', () => {
  it('keeps the message, swaps the key controls, and drops the old result', async () => {
    stubFetch(async () => json(caesarReply()))
    const user = setup()

    await type(user, message(), 'Hello')
    await user.click(run('Encrypt'))
    await screen.findByTestId('result-success')
    await user.click(screen.getByRole('radio', { name: /Affine/ }))

    expect((message() as HTMLTextAreaElement).value).toBe('Hello')
    expect(screen.getByLabelText('Multiplier a')).toBeTruthy()
    expect(screen.queryByLabelText('Shift k')).toBeNull()
    expect(screen.getByTestId('result-empty')).toBeTruthy()
    expect(screen.getByTestId('formula-symbolic').textContent).toMatch(/a.*x.*b/)
  })

  it('explains the difference between the two ciphers in the card labels', () => {
    setup()

    expect(screen.getByText(/Shift every letter by k places. 26 keys./)).toBeTruthy()
    expect(screen.getByText(/Multiply by a, then shift by b. 312 keys./)).toBeTruthy()
  })
})

describe('connection notice', () => {
  it('warns when the health check says the backend is offline, without blocking the page', () => {
    setup({ ...online, status: 'offline', error: 'Could not reach the backend' })

    expect(screen.getByTestId('connection-notice').textContent).toContain('not reachable')
    expect(screen.getByLabelText('Shift k')).toBeTruthy()
  })

  it('shows no notice when the backend is online', () => {
    setup()

    expect(screen.queryByTestId('connection-notice')).toBeNull()
  })
})

describe('a result never fills in numbers for different inputs', () => {
  it('drops the backend inverse and formula numbers once the multiplier changes', async () => {
    stubFetch(async () =>
      json(affineReply({ operation: 'decrypt', input: 'IHHWVC', output: 'AFFINE', a_inverse: 21 })),
    )
    const user = setup()
    await user.click(screen.getByRole('radio', { name: /Affine/ }))
    await user.click(screen.getByRole('radio', { name: /Decrypt/ }))
    await user.click(screen.getByRole('button', { name: '5' }))
    await type(user, message(), 'IHHWVC')
    await user.click(run('Decrypt'))
    await screen.findByTestId('gauge-inverse')

    await type(user, screen.getByLabelText('Multiplier a'), '4')

    expect(screen.queryByTestId('gauge-inverse')).toBeNull()
    expect(screen.getByTestId('inverse-note').textContent).toContain('when you run the operation')
    expect(screen.getByTestId('inverse-explainer').textContent).not.toContain('= 21')
    expect(screen.getByTestId('worked-stale')).toBeTruthy()
    expect(screen.getByTestId('result-stale')).toBeTruthy()
  })

  it('keeps showing the result itself, clearly marked as out of date', async () => {
    stubFetch(async () => json(caesarReply()))
    const user = setup()
    await type(user, message(), 'Hello')
    await user.click(run('Encrypt'))
    await screen.findByTestId('result-success')

    await type(user, screen.getByLabelText('Shift k'), '9')

    expect(screen.getByTestId('cipher-output').textContent).toBe('Khoor')
    expect(screen.getByTestId('result-stale')).toBeTruthy()
    expect(screen.getByTestId('formula-substituted').textContent).toMatch(/x\s*\+\s*9/) // preview of the new key
  })
})
