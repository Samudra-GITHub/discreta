import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { affineReply, caesarReply, json, mockBackend, offlineBackend, renderApp } from '../test/helpers'

const run = (verb: 'Encrypt' | 'Decrypt') => screen.getByRole('button', { name: `${verb} message` }) as HTMLButtonElement
const message = () => screen.getByRole('textbox', { name: /^(Plaintext|Ciphertext)$/ }) as HTMLTextAreaElement
const output = () => screen.getByTestId('result-output')
const radio = (name: string) => screen.getByRole('radio', { name }) as HTMLInputElement

type User = ReturnType<typeof renderApp>['user']

async function type(user: User, field: HTMLElement, value: string) {
  await user.clear(field)
  if (value !== '') await user.type(field, value)
}

const open = () => renderApp('/workspace')

describe('initial state', () => {
  it('starts with Caesar encryption, key 3 and nothing to run', () => {
    mockBackend()
    open()

    expect(radio('Caesar').checked).toBe(true)
    expect(radio('Encrypt').checked).toBe(true)
    expect((screen.getByLabelText('Shift k') as HTMLInputElement).value).toBe('3')
    expect(run('Encrypt').disabled).toBe(true)
    expect(screen.getByText('Enter a message to begin.')).toBeTruthy()
    expect(screen.getByText(/The result appears here once you run the cipher/)).toBeTruthy()
  })

  it('shows only the Caesar encryption formula, with the shift filled in', async () => {
    mockBackend()
    const { user } = open()

    expect(screen.getByText('E(x) = (x + k) mod 26')).toBeTruthy()
    expect(screen.getByTestId('formula-numeric').textContent).toBe('E(x) = (x + 3) mod 26')
    expect(screen.queryByText(/a·x/)).toBeNull()

    await user.click(radio('Decrypt'))
    expect(screen.getByText('D(y) = (y − k) mod 26')).toBeTruthy()
    expect(screen.getByTestId('formula-numeric').textContent).toBe('D(y) = (y − 3) mod 26')
    expect(screen.queryByText('E(x) = (x + k) mod 26')).toBeNull()
  })

  it('shows the affine formulas for each operation', async () => {
    mockBackend()
    const { user } = open()
    await user.click(radio('Affine'))

    expect(screen.getByText('E(x) = (a·x + b) mod 26')).toBeTruthy()
    await user.click(radio('Decrypt'))
    expect(screen.getByText('D(y) = a⁻¹ · (y − b) mod 26')).toBeTruthy()
  })
})

describe('explicit execution only', () => {
  it('does not call the backend while the user types or changes keys and ciphers', async () => {
    const { mock } = mockBackend({ '/caesar/encrypt': () => caesarReply() })
    const { user } = open()
    await waitFor(() => expect(mock).toHaveBeenCalled()) // the health check
    const before = mock.mock.calls.length

    await type(user, message(), 'Hello, world')
    await type(user, screen.getByLabelText('Shift k'), '7')
    await user.click(screen.getByRole('button', { name: 'Increase Shift k' }))
    await user.click(radio('Affine'))
    await user.click(radio('Caesar'))

    expect(mock.mock.calls.length).toBe(before)
  })
})

describe('Caesar cipher against the API', () => {
  it('encrypts: posts the text and key, then shows the output, summary and worked steps', async () => {
    const { posted } = mockBackend({ '/caesar/encrypt': () => caesarReply() })
    const { user } = open()

    await type(user, message(), 'Hello')
    await user.click(run('Encrypt'))

    await waitFor(() => expect(output().textContent).toBe('Khoor'))
    expect(posted).toEqual([{ path: '/api/v1/algebra/caesar/encrypt', body: { text: 'Hello', key: 3 } }])
    expect(screen.getByTestId('result-summary').textContent).toBe('Caesar · encrypt · k = 3')
    const steps = await screen.findAllByTestId('worked-step')
    expect(steps).toHaveLength(3)
    expect(steps[0]?.textContent).toContain('H = 7 → 7 + 3 = 10 → K')
  })

  it('decrypts through the decrypt endpoint', async () => {
    const { posted } = mockBackend({
      '/caesar/decrypt': () => caesarReply({ operation: 'decrypt', input: 'Khoor', output: 'Hello' }),
    })
    const { user } = open()

    await user.click(radio('Decrypt'))
    await type(user, message(), 'Khoor')
    await user.click(run('Decrypt'))

    await waitFor(() => expect(output().textContent).toBe('Hello'))
    expect(posted[0]?.path).toBe('/api/v1/algebra/caesar/decrypt')
  })

  it('shows how a negative key is reduced', async () => {
    const { posted } = mockBackend({
      '/caesar/encrypt': () => caesarReply({ key: -29, effective_key: 23, input: 'Hi', output: 'Ef' }),
    })
    const { user } = open()

    await type(user, screen.getByLabelText('Shift k'), '-29')
    expect(screen.getByText('k = -29 acts as 23 (mod 26)')).toBeTruthy()
    expect(screen.getByTestId('formula-numeric').textContent).toBe('E(x) = (x + 23) mod 26')
    await type(user, message(), 'Hi')
    await user.click(run('Encrypt'))

    await waitFor(() => expect(output().textContent).toBe('Ef'))
    expect(posted[0]?.body.key).toBe(-29)
    expect(screen.getByTestId('result-summary').textContent).toBe('Caesar · encrypt · k = -29 (acts as 23)')
  })

  it('handles punctuation and digits: unchanged output and no letters to explain', async () => {
    mockBackend({ '/caesar/encrypt': () => caesarReply({ input: '123, !?', output: '123, !?' }) })
    const { user } = open()

    await type(user, message(), '123, !?')
    await user.click(run('Encrypt'))

    await waitFor(() => expect(output().textContent).toBe('123, !?'))
    expect(screen.getByText(/No letters in the message/)).toBeTruthy()
  })

  it('hides the worked steps when the backend output contradicts the arithmetic', async () => {
    mockBackend({ '/caesar/encrypt': () => caesarReply({ output: 'Kxxxx' }) })
    const { user } = open()

    await type(user, message(), 'Hello')
    await user.click(run('Encrypt'))

    await waitFor(() => expect(output().textContent).toBe('Kxxxx'))
    expect(screen.getByTestId('worked-unverified')).toBeTruthy()
    expect(screen.queryAllByTestId('worked-step')).toHaveLength(0)
  })
})

describe('Affine cipher against the API', () => {
  async function chooseAffine(user: User) {
    await user.click(radio('Affine'))
  }

  it('encrypts with a and b and shows the numeric formula', async () => {
    const { posted } = mockBackend({ '/affine/encrypt': () => affineReply() })
    const { user } = open()

    await chooseAffine(user)
    await user.click(screen.getByRole('button', { name: '5' }))
    await type(user, screen.getByLabelText('Offset b'), '8')
    expect(screen.getByTestId('formula-numeric').textContent).toBe('E(x) = (5·x + 8) mod 26')
    await type(user, message(), 'AFFINE')
    await user.click(run('Encrypt'))

    await waitFor(() => expect(output().textContent).toBe('IHHWVC'))
    expect(posted).toEqual([{ path: '/api/v1/algebra/affine/encrypt', body: { text: 'AFFINE', a: 5, b: 8 } }])
    expect(screen.getByTestId('result-summary').textContent).toBe('Affine · encrypt · a = 5, b = 8, a⁻¹ = 21')
  })

  it('shows the modular inverse that the backend returned when decrypting', async () => {
    mockBackend({
      '/affine/decrypt': () => affineReply({ operation: 'decrypt', input: 'IHHWVC', output: 'AFFINE', a_inverse: 21 }),
    })
    const { user } = open()

    await chooseAffine(user)
    await user.click(radio('Decrypt'))
    await user.click(screen.getByRole('button', { name: '5' }))
    expect(screen.getByText(/The backend reports a⁻¹ when you run the cipher/)).toBeTruthy()
    await type(user, message(), 'IHHWVC')
    await user.click(run('Decrypt'))

    await waitFor(() => expect(output().textContent).toBe('AFFINE'))
    expect(screen.getByTestId('formula-numeric').textContent).toBe('D(y) = 21 · (y − 8) mod 26')
    expect(screen.getByText(/the backend reports a⁻¹ = 21/)).toBeTruthy()
  })

  it('refuses an invalid multiplier, explains why, and never calls the backend', async () => {
    const { posted } = mockBackend({ '/affine/encrypt': () => affineReply() })
    const { user } = open()

    await chooseAffine(user)
    await type(user, screen.getByLabelText('Multiplier a'), '4')
    await type(user, message(), 'Hello')

    expect(run('Encrypt').disabled).toBe(true)
    const alerts = screen.getAllByRole('alert').map((a) => a.textContent ?? '')
    expect(alerts.join(' ')).toContain('gcd(4, 26) = 2')
    expect(alerts.join(' ')).toContain('the letters A and N would both encrypt to')
    await user.click(run('Encrypt'))
    expect(posted).toHaveLength(0)
  })

  it('explains multiples of 13 with their own colliding letters', async () => {
    mockBackend()
    const { user } = open()

    await chooseAffine(user)
    await type(user, screen.getByLabelText('Multiplier a'), '13')

    expect(screen.getAllByRole('alert').map((a) => a.textContent).join(' ')).toContain('gcd(13, 26) = 13')
  })

  it('treats exactly the 14 non-coprime residues as invalid and the 12 others as valid', async () => {
    mockBackend()
    const { user } = open()
    await chooseAffine(user)
    const field = screen.getByLabelText('Multiplier a')
    const valid = new Set([1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25])

    for (let a = 0; a < 26; a += 1) {
      fireEvent.change(field, { target: { value: String(a) } })
      expect(field.getAttribute('aria-invalid') !== 'true', `a=${a}`).toBe(valid.has(a))
    }
  })

  it('offers exactly the 12 valid multipliers as one-tap choices and marks the chosen one', async () => {
    mockBackend()
    const { user } = open()
    await chooseAffine(user)

    const group = screen.getByRole('group', { name: /Valid multipliers/ })
    const buttons = within(group).getAllByRole('button')
    expect(buttons.map((b) => b.textContent)).toEqual(['1', '3', '5', '7', '9', '11', '15', '17', '19', '21', '23', '25'])
    await user.click(within(group).getByRole('button', { name: '7' }))
    expect((screen.getByLabelText('Multiplier a') as HTMLInputElement).value).toBe('7')
    expect(within(group).getByRole('button', { name: '7' }).getAttribute('aria-pressed')).toBe('true')
    expect(within(group).getByRole('button', { name: '9' }).getAttribute('aria-pressed')).toBe('false')
  })
})

describe('key and text validation', () => {
  it('rejects keys beyond 2^53 - 1 and non-integers before sending anything', async () => {
    const { posted } = mockBackend({ '/caesar/encrypt': () => caesarReply() })
    const { user } = open()
    await type(user, message(), 'Hello')

    for (const bad of ['9007199254740992', '-9007199254740992', '3.5', '1e2', 'abc', '']) {
      await type(user, screen.getByLabelText('Shift k'), bad)
      expect(run('Encrypt').disabled, bad).toBe(true)
    }
    await type(user, screen.getByLabelText('Shift k'), '9007199254740991')
    expect(run('Encrypt').disabled).toBe(false)
    await type(user, screen.getByLabelText('Shift k'), '-9007199254740991')
    expect(run('Encrypt').disabled).toBe(false)
    expect(posted).toHaveLength(0)
  })

  it('sends an extreme key exactly', async () => {
    const { posted } = mockBackend({
      '/caesar/encrypt': () => caesarReply({ key: 9007199254740991, effective_key: 5 }),
    })
    const { user } = open()

    await type(user, screen.getByLabelText('Shift k'), '9007199254740991')
    await type(user, message(), 'Hello')
    await user.click(run('Encrypt'))

    await waitFor(() => expect(posted).toHaveLength(1))
    expect(posted[0]?.body.key).toBe(9007199254740991)
  })

  it('counts characters and blocks messages over 10,000', async () => {
    mockBackend()
    const { user } = open()

    message().focus()
    await user.paste('a'.repeat(10_001))

    expect(screen.getByText(/10,001 \/ 10,000 characters/)).toBeTruthy()
    expect(run('Encrypt').disabled).toBe(true)
    expect(screen.getByText(/the limit is 10,000/)).toBeTruthy()
  })

  it('moves the key with the plus and minus buttons', async () => {
    mockBackend()
    const { user } = open()

    await user.click(screen.getByRole('button', { name: 'Increase Shift k' }))
    expect((screen.getByLabelText('Shift k') as HTMLInputElement).value).toBe('4')
    await user.click(screen.getByRole('button', { name: 'Decrease Shift k' }))
    await user.click(screen.getByRole('button', { name: 'Decrease Shift k' }))
    expect((screen.getByLabelText('Shift k') as HTMLInputElement).value).toBe('2')
  })
})

describe('result states', () => {
  it('shows a loading state while the request is in flight, then the result', async () => {
    let finish: (value: unknown) => void = () => {}
    mockBackend({ '/caesar/encrypt': () => new Promise((resolve) => (finish = resolve)) })
    const { user } = open()

    await type(user, message(), 'Hello')
    await user.click(run('Encrypt'))

    expect(await screen.findByText('Waiting for the backend…')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Running/ })).toHaveProperty('disabled', true)
    finish(caesarReply())
    await waitFor(() => expect(output().textContent).toBe('Khoor'))
    expect(screen.queryByText('Waiting for the backend…')).toBeNull()
  })

  it('reports an unreachable backend and works again once it is back', async () => {
    const mock = offlineBackend()
    const { user } = open()

    await type(user, message(), 'Hello')
    await user.click(run('Encrypt'))

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('The backend is not reachable')
    expect(alert.textContent).toContain('uvicorn app.main:app')

    mockBackend({ '/caesar/encrypt': () => caesarReply() })
    await user.click(run('Encrypt'))
    await waitFor(() => expect(output().textContent).toBe('Khoor'))
    expect(mock).toHaveBeenCalled()
  })

  it('shows the backend validation message', async () => {
    mockBackend({
      '/caesar/encrypt': () =>
        json({ detail: [{ loc: ['body', 'text'], msg: 'Input should be a valid string', type: 'string_type' }] }, 422),
    })
    const { user } = open()

    await type(user, message(), 'Hello')
    await user.click(run('Encrypt'))

    expect((await screen.findAllByRole('alert')).map((a) => a.textContent).join(' ')).toContain('The server rejected the input')
    expect(screen.getAllByText(/Input should be a valid string/).length).toBeGreaterThanOrEqual(2)
  })

  it('reports an oversized request', async () => {
    mockBackend({
      '/caesar/encrypt': () =>
        json({ detail: [{ loc: [], msg: 'Request body too large: the limit is 262144 bytes.', type: 'payload_too_large' }] }, 413),
    })
    const { user } = open()

    await type(user, message(), 'Hello')
    await user.click(run('Encrypt'))

    expect((await screen.findByRole('alert')).textContent).toContain('The message is too large')
  })

  it('clears a previous error when the user edits the input', async () => {
    offlineBackend()
    const { user } = open()

    await type(user, message(), 'Hello')
    await user.click(run('Encrypt'))
    await screen.findByRole('alert')
    await user.type(message(), '!')

    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByText(/The result appears here/)).toBeTruthy()
  })

  it('rejects a reply of the wrong shape instead of showing it', async () => {
    mockBackend({ '/caesar/encrypt': () => ({ cipher: 'caesar', output: 5 }) })
    const { user } = open()

    await type(user, message(), 'Hello')
    await user.click(run('Encrypt'))

    expect((await screen.findByRole('alert')).textContent).toContain('Unexpected reply from the backend')
    expect(screen.queryByTestId('result-output')).toBeNull()
  })

  it('keeps an old result visible but marks it out of date once the key changes', async () => {
    mockBackend({ '/caesar/encrypt': () => caesarReply() })
    const { user } = open()
    await type(user, message(), 'Hello')
    await user.click(run('Encrypt'))
    await waitFor(() => expect(output().textContent).toBe('Khoor'))
    expect(screen.queryByText(/Out of date/)).toBeNull()

    await type(user, screen.getByLabelText('Shift k'), '9')

    expect(output().textContent).toBe('Khoor')
    expect(screen.getByText(/Out of date/)).toBeTruthy()
    expect(screen.getByTestId('formula-numeric').textContent).toBe('E(x) = (x + 9) mod 26')
    expect(screen.queryAllByTestId('worked-step')).toHaveLength(0)
  })

  it('never fills in the inverse for a different multiplier than the one that ran', async () => {
    mockBackend({
      '/affine/decrypt': () => affineReply({ operation: 'decrypt', input: 'IHHWVC', output: 'AFFINE', a_inverse: 21 }),
    })
    const { user } = open()
    await user.click(radio('Affine'))
    await user.click(radio('Decrypt'))
    await user.click(screen.getByRole('button', { name: '5' }))
    await type(user, message(), 'IHHWVC')
    await user.click(run('Decrypt'))
    await waitFor(() => expect(screen.getByTestId('formula-numeric').textContent).toContain('21'))

    await user.click(screen.getByRole('button', { name: '7' }))

    expect(screen.queryByTestId('formula-numeric')).toBeNull()
    expect(screen.queryByText(/the backend reports a⁻¹ = 21/)).toBeNull()
  })
})

describe('result actions', () => {
  it('copies the output to the clipboard and says so', async () => {
    mockBackend({ '/caesar/encrypt': () => caesarReply() })
    const { user } = open()
    const writeText = vi.fn(async () => {})
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    await type(user, message(), 'Hello')
    await user.click(run('Encrypt'))
    await user.click(await screen.findByRole('button', { name: 'Copy output' }))

    expect(writeText).toHaveBeenCalledWith('Khoor')
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeTruthy()
  })

  it('says so when the clipboard is unavailable', async () => {
    mockBackend({ '/caesar/encrypt': () => caesarReply() })
    const { user } = open()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: async () => Promise.reject(new Error('denied')) },
      configurable: true,
    })

    await type(user, message(), 'Hello')
    await user.click(run('Encrypt'))
    await user.click(await screen.findByRole('button', { name: 'Copy output' }))

    expect(await screen.findByRole('button', { name: 'Copy failed' })).toBeTruthy()
  })

  it('pastes from the clipboard into the message', async () => {
    mockBackend()
    const { user } = open()
    Object.defineProperty(navigator, 'clipboard', { value: { readText: async () => 'pasted text' }, configurable: true })

    await user.click(screen.getByRole('button', { name: 'Paste' }))

    await waitFor(() => expect(message().value).toBe('pasted text'))
  })

  it('explains when the browser blocks clipboard reads', async () => {
    mockBackend()
    const { user } = open()
    Object.defineProperty(navigator, 'clipboard', {
      value: { readText: async () => Promise.reject(new Error('denied')) },
      configurable: true,
    })

    await user.click(screen.getByRole('button', { name: 'Paste' }))

    expect(await screen.findByText(/blocked clipboard access/)).toBeTruthy()
  })

  it('clears the message and the result', async () => {
    mockBackend({ '/caesar/encrypt': () => caesarReply() })
    const { user } = open()

    await type(user, message(), 'Hello')
    await user.click(run('Encrypt'))
    await waitFor(() => expect(output().textContent).toBe('Khoor'))
    await user.click(screen.getByRole('button', { name: 'Clear' }))

    expect(message().value).toBe('')
    expect(screen.queryByTestId('result-output')).toBeNull()
    expect(screen.getByText(/The result appears here/)).toBeTruthy()
  })

  it('swaps the output into the input and flips the operation', async () => {
    mockBackend({ '/caesar/encrypt': () => caesarReply() })
    const { user } = open()

    await type(user, message(), 'Hello')
    await user.click(run('Encrypt'))
    await waitFor(() => expect(output().textContent).toBe('Khoor'))
    await user.click(screen.getByRole('button', { name: /Swap into input/ }))

    expect(message().value).toBe('Khoor')
    expect(screen.getByRole('textbox', { name: 'Ciphertext' })).toBeTruthy()
    expect(radio('Decrypt').checked).toBe(true)
  })

  it('runs with Ctrl+Enter from the message box', async () => {
    const { posted } = mockBackend({ '/caesar/encrypt': () => caesarReply() })
    const { user } = open()

    await type(user, message(), 'Hello')
    await user.keyboard('{Control>}{Enter}{/Control}')

    await waitFor(() => expect(posted).toHaveLength(1))
  })
})

describe('switching ciphers', () => {
  it('keeps the message, swaps the key controls and drops the old result', async () => {
    mockBackend({ '/caesar/encrypt': () => caesarReply() })
    const { user } = open()

    await type(user, message(), 'Hello')
    await user.click(run('Encrypt'))
    await waitFor(() => expect(output().textContent).toBe('Khoor'))
    await user.click(radio('Affine'))

    expect(message().value).toBe('Hello')
    expect(screen.getByLabelText('Multiplier a')).toBeTruthy()
    expect(screen.queryByLabelText('Shift k')).toBeNull()
    expect(screen.queryByTestId('result-output')).toBeNull()
  })
})
