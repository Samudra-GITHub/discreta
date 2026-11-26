import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { runVigenere } from '../services/cipher'
import { describeKeywordProblem, MAX_KEYWORD_LENGTH, parseKeyword } from '../modules/algebra/cipherMath'
import { json, mockBackend, offlineBackend, renderApp, vigenereReply } from '../test/helpers'

const run = (verb: 'Encrypt' | 'Decrypt') => screen.getByRole('button', { name: `${verb} message` }) as HTMLButtonElement
const message = () => screen.getByRole('textbox', { name: /^(Plaintext|Ciphertext)$/ }) as HTMLTextAreaElement
const keyword = () => screen.getByLabelText('Keyword') as HTMLInputElement
const output = () => screen.getByTestId('result-output')
const radio = (name: string) => screen.getByRole('radio', { name }) as HTMLInputElement

type User = ReturnType<typeof renderApp>['user']

async function type(user: User, field: HTMLElement, value: string) {
  await user.clear(field)
  if (value !== '') await user.type(field, value)
}

async function openVigenere() {
  const app = renderApp('/workspace')
  await app.user.click(radio('Vigenère'))
  return app
}

describe('parseKeyword', () => {
  it('accepts letters of either case and reports the shifts', () => {
    expect(parseKeyword('Lemon')).toEqual({ ok: true, value: 'Lemon', shifts: [11, 4, 12, 14, 13] })
    expect(parseKeyword('az')).toEqual({ ok: true, value: 'az', shifts: [0, 25] })
  })

  it.each([
    ['', 'empty'],
    ['KEY1', 'invalid-characters'],
    ['two words', 'invalid-characters'],
    ['kéy', 'invalid-characters'],
    ['key!', 'invalid-characters'],
    [' ', 'invalid-characters'],
    ['A'.repeat(MAX_KEYWORD_LENGTH + 1), 'too-long'],
  ])('rejects %j as %s', (raw, problem) => {
    expect(parseKeyword(raw)).toEqual({ ok: false, problem })
    expect(describeKeywordProblem(problem as 'empty')).toMatch(/\w/)
  })

  it('accepts exactly the longest keyword', () => {
    expect(parseKeyword('A'.repeat(MAX_KEYWORD_LENGTH)).ok).toBe(true)
  })
})

describe('selecting Vigenère in the Cipher Workspace', () => {
  it('offers Vigenère beside Caesar and Affine, and shows the keyword controls', async () => {
    mockBackend()
    const { user } = renderApp('/workspace')

    expect(screen.getAllByRole('radio', { name: /^(Caesar|Affine|Vigenère)$/ }).map((r) => (r as HTMLInputElement).value)).toEqual([
      'caesar',
      'affine',
      'vigenere',
    ])
    await user.click(radio('Vigenère'))

    expect(keyword().value).toBe('LEMON')
    expect(screen.queryByLabelText('Shift k')).toBeNull()
    expect(screen.queryByLabelText('Multiplier a')).toBeNull()
    expect(screen.queryByText('E(x) = (x + k) mod 26')).toBeNull()
  })

  it('shows only the Vigenère formula for the chosen operation, with the keyword shifts', async () => {
    mockBackend()
    const { user } = await openVigenere()

    expect(screen.getByText('Cᵢ = (Pᵢ + Kᵢ) mod 26')).toBeTruthy()
    expect(screen.getByTestId('formula-numeric').textContent).toContain('k = (11, 4, 12, 14, 13)')
    expect(screen.queryByText('E(x) = (x + k) mod 26')).toBeNull()
    await user.click(radio('Decrypt'))
    expect(screen.getByText('Pᵢ = (Cᵢ − Kᵢ + 26) mod 26')).toBeTruthy()
  })

  it('explains how the repeating key is applied, using the typed message', async () => {
    mockBackend()
    const { user } = await openVigenere()

    expect(screen.getByTestId('key-alignment').textContent).toContain('Example')
    await user.type(message(), 'Attack at Dawn')
    const alignment = screen.getByTestId('key-alignment').textContent ?? ''
    expect(alignment).toContain('AttackatDawn')
    expect(alignment).toContain('LEMONLEMONLE')
    expect(alignment).toContain('Only letters use up a key letter')
  })

  it('describes the keyword as letters and shifts', async () => {
    mockBackend()
    await openVigenere()
    expect(screen.getByText(/5 letters: L E M O N → shifts 11 4 12 14 13/)).toBeTruthy()
  })
})

describe('keyword validation', () => {
  it.each(['', 'KEY1', 'two words', 'café', 'key!'])('blocks %j and never calls the backend', async (bad) => {
    const { posted } = mockBackend({ '/vigenere/encrypt': () => vigenereReply() })
    const { user } = await openVigenere()
    await type(user, message(), 'Hello')

    await type(user, keyword(), bad)

    expect(run('Encrypt').disabled).toBe(true)
    expect(keyword().getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByRole('alert').textContent).toMatch(/keyword/i)
    await user.click(run('Encrypt'))
    expect(posted).toHaveLength(0)
  })

  it('blocks a keyword over the limit and accepts the longest one', async () => {
    mockBackend()
    const { user } = await openVigenere()
    await type(user, message(), 'Hello')

    keyword().focus()
    await user.clear(keyword())
    await user.paste('A'.repeat(MAX_KEYWORD_LENGTH + 1))
    expect(run('Encrypt').disabled).toBe(true)
    expect(screen.getByRole('alert').textContent).toContain('at most 64 letters')
    await user.clear(keyword())
    await user.paste('A'.repeat(MAX_KEYWORD_LENGTH))
    expect(run('Encrypt').disabled).toBe(false)
  })

  it('accepts lower-case and mixed-case keywords', async () => {
    mockBackend()
    const { user } = await openVigenere()
    await type(user, message(), 'Hello')

    await type(user, keyword(), 'LeMoN')

    expect(run('Encrypt').disabled).toBe(false)
  })
})

describe('encrypting and decrypting with the API', () => {
  it('encrypts: posts text and keyword, shows output, summary and worked steps with key letters', async () => {
    const { posted } = mockBackend({ '/vigenere/encrypt': () => vigenereReply() })
    const { user } = await openVigenere()

    await type(user, message(), 'ATTACKATDAWN')
    await user.click(run('Encrypt'))

    await waitFor(() => expect(output().textContent).toBe('LXFOPVEFRNHR'))
    expect(posted).toEqual([{ path: '/api/v1/algebra/vigenere/encrypt', body: { text: 'ATTACKATDAWN', key: 'LEMON' } }])
    expect(screen.getByTestId('result-summary').textContent).toBe('Vigenère · encrypt · key LEMON (5 letters)')
    const steps = await screen.findAllByTestId('worked-step')
    expect(steps).toHaveLength(3)
    expect(steps[0]?.textContent).toContain('A = 0 → 0 + 11 (key L) = 11 → L')
    expect(steps[1]?.textContent).toContain('T = 19 → 19 + 4 (key E) = 23 → X')
  })

  it('decrypts through the decrypt endpoint', async () => {
    const { posted } = mockBackend({
      '/vigenere/decrypt': () => vigenereReply({ operation: 'decrypt', input: 'LXFOPVEFRNHR', output: 'ATTACKATDAWN' }),
    })
    const { user } = await openVigenere()

    await user.click(radio('Decrypt'))
    await type(user, message(), 'LXFOPVEFRNHR')
    await user.click(run('Decrypt'))

    await waitFor(() => expect(output().textContent).toBe('ATTACKATDAWN'))
    expect(posted[0]?.path).toBe('/api/v1/algebra/vigenere/decrypt')
    const steps = await screen.findAllByTestId('worked-step')
    expect(steps[0]?.textContent).toContain('L = 11 → 11 − 11 (key L) = 0 → A')
  })

  it('keeps the key aligned across spaces and punctuation in the worked steps', async () => {
    mockBackend({
      '/vigenere/encrypt': () => vigenereReply({ input: 'AT, TA', output: 'LX, FO' }),
    })
    const { user } = await openVigenere()

    await type(user, message(), 'AT, TA')
    await user.click(run('Encrypt'))

    const steps = await screen.findAllByTestId('worked-step')
    expect(steps.map((s) => s.textContent?.match(/key (\w)/)?.[1])).toEqual(['L', 'E', 'M'])
  })

  it('hides the worked steps when the backend output contradicts the arithmetic', async () => {
    mockBackend({ '/vigenere/encrypt': () => vigenereReply({ output: 'XXXXXXXXXXXX' }) })
    const { user } = await openVigenere()

    await type(user, message(), 'ATTACKATDAWN')
    await user.click(run('Encrypt'))

    await waitFor(() => expect(output().textContent).toBe('XXXXXXXXXXXX'))
    expect(screen.getByTestId('worked-unverified')).toBeTruthy()
  })

  it('swaps the output into the input and flips to decrypt', async () => {
    mockBackend({ '/vigenere/encrypt': () => vigenereReply() })
    const { user } = await openVigenere()

    await type(user, message(), 'ATTACKATDAWN')
    await user.click(run('Encrypt'))
    await waitFor(() => expect(output().textContent).toBe('LXFOPVEFRNHR'))
    await user.click(screen.getByRole('button', { name: /Swap into input/ }))

    expect(message().value).toBe('LXFOPVEFRNHR')
    expect(radio('Decrypt').checked).toBe(true)
    expect(keyword().value).toBe('LEMON')
  })

  it('marks a result out of date when the keyword changes', async () => {
    mockBackend({ '/vigenere/encrypt': () => vigenereReply() })
    const { user } = await openVigenere()
    await type(user, message(), 'ATTACKATDAWN')
    await user.click(run('Encrypt'))
    await waitFor(() => expect(output().textContent).toBe('LXFOPVEFRNHR'))

    await type(user, keyword(), 'KEY')

    expect(screen.getByText(/Out of date/)).toBeTruthy()
    expect(screen.queryAllByTestId('worked-step')).toHaveLength(0)
  })

  it('shows the backend validation message next to the keyword', async () => {
    mockBackend({
      '/vigenere/encrypt': () => json({ detail: [{ loc: ['body', 'key'], msg: 'The Vigenere key may contain only letters.', type: 'invalid_key' }] }, 422),
    })
    const { user } = await openVigenere()
    await type(user, message(), 'Hello')

    await user.click(run('Encrypt'))

    expect((await screen.findAllByRole('alert')).map((a) => a.textContent).join(' ')).toContain('may contain only letters')
    expect(keyword().getAttribute('aria-invalid')).toBe('true')
  })

  it('reports an unreachable backend', async () => {
    offlineBackend()
    const { user } = await openVigenere()
    await type(user, message(), 'Hello')

    await user.click(run('Encrypt'))

    expect((await screen.findByRole('alert')).textContent).toContain('The backend is not reachable')
  })

  it('rejects a reply of the wrong shape', async () => {
    mockBackend({ '/vigenere/encrypt': () => vigenereReply({ key_shifts: [1, 2], key_length: 5 }) })
    const { user } = await openVigenere()
    await type(user, message(), 'Hello')

    await user.click(run('Encrypt'))

    expect((await screen.findByRole('alert')).textContent).toContain('Unexpected reply from the backend')
  })

  it('does not call the backend while typing', async () => {
    const { mock } = mockBackend({ '/vigenere/encrypt': () => vigenereReply() })
    const { user } = await openVigenere()
    await waitFor(() => expect(mock).toHaveBeenCalled())
    const before = mock.mock.calls.length

    await type(user, message(), 'Hello there')
    await type(user, keyword(), 'SECRET')

    expect(mock.mock.calls.length).toBe(before)
  })

  it('copies the output', async () => {
    mockBackend({ '/vigenere/encrypt': () => vigenereReply() })
    const { user } = await openVigenere()
    const writeText = vi.fn(async () => {})
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    await type(user, message(), 'ATTACKATDAWN')
    await user.click(run('Encrypt'))

    await user.click(await screen.findByRole('button', { name: 'Copy output' }))

    expect(writeText).toHaveBeenCalledWith('LXFOPVEFRNHR')
  })

  it('keeps the message when switching ciphers and drops the old result', async () => {
    mockBackend({ '/vigenere/encrypt': () => vigenereReply() })
    const { user } = await openVigenere()
    await type(user, message(), 'ATTACKATDAWN')
    await user.click(run('Encrypt'))
    await waitFor(() => expect(output().textContent).toBe('LXFOPVEFRNHR'))

    await user.click(radio('Caesar'))

    expect(message().value).toBe('ATTACKATDAWN')
    expect(screen.queryByTestId('result-output')).toBeNull()
    expect(screen.getByLabelText('Shift k')).toBeTruthy()
  })
})

describe('runVigenere service', () => {
  it('rejects a response for the wrong operation', async () => {
    mockBackend({ '/vigenere/decrypt': () => vigenereReply({ operation: 'encrypt' }) })
    await expect(runVigenere('decrypt', { text: 'a', key: 'K' })).rejects.toThrow(/unexpected Vigenère response/)
  })

  it('posts to the matching endpoint', async () => {
    const { posted } = mockBackend({ '/vigenere/encrypt': () => vigenereReply() })
    await runVigenere('encrypt', { text: 'a', key: 'K' })
    expect(posted[0]).toEqual({ path: '/api/v1/algebra/vigenere/encrypt', body: { text: 'a', key: 'K' } })
  })
})
