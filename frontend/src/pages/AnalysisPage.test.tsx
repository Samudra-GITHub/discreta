import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  affineReply,
  affineSearchReply,
  caesarCrackReply,
  caesarReply,
  frequencyReply,
  json,
  mockBackend,
  offlineBackend,
  renderApp,
} from '../test/helpers'

const CIPHERTEXT = 'Phhw ph dw wkh rog eulgjh dw plgqljkw'
const editor = () => screen.getByRole('textbox', { name: 'Ciphertext' }) as HTMLTextAreaElement
const open = () => renderApp('/analysis')

async function enter(user: ReturnType<typeof renderApp>['user'], text = CIPHERTEXT) {
  await user.clear(editor())
  editor().focus()
  await user.paste(text)
}

const tab = (name: string) => screen.getByRole('tab', { name })

describe('the Analysis Lab shell', () => {
  it('has the three internal tabs and is not extra navigation', () => {
    mockBackend()
    open()

    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
      'Frequency Analysis',
      'Caesar Analysis',
      'Affine Analysis',
    ])
    expect(screen.getAllByRole('navigation')).toHaveLength(1)
    expect(tab('Frequency Analysis').getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe('tab-frequency')
  })

  it('moves between tabs with the arrow keys', async () => {
    mockBackend()
    const { user } = open()

    tab('Frequency Analysis').focus()
    await user.keyboard('{ArrowRight}')
    expect(tab('Caesar Analysis').getAttribute('aria-selected')).toBe('true')
    expect(document.activeElement).toBe(tab('Caesar Analysis'))
    await user.keyboard('{End}')
    expect(tab('Affine Analysis').getAttribute('aria-selected')).toBe('true')
    await user.keyboard('{ArrowRight}')
    expect(tab('Frequency Analysis').getAttribute('aria-selected')).toBe('true')
    await user.keyboard('{ArrowLeft}')
    expect(tab('Affine Analysis').getAttribute('aria-selected')).toBe('true')
  })

  it('keeps one ciphertext for all tabs', async () => {
    mockBackend()
    const { user } = open()
    await enter(user)

    await user.click(tab('Caesar Analysis'))
    expect(editor().value).toBe(CIPHERTEXT)
    await user.click(tab('Affine Analysis'))
    expect(editor().value).toBe(CIPHERTEXT)
  })

  it('does not run anything until asked, and disables the buttons without text', async () => {
    const { posted } = mockBackend({ '/frequency': (b) => frequencyReply(String(b.text)) })
    const { user } = open()

    expect((screen.getByRole('button', { name: 'Analyse letter frequencies' }) as HTMLButtonElement).disabled).toBe(true)
    await enter(user)
    expect(posted).toHaveLength(0)
    expect((screen.getByRole('button', { name: 'Analyse letter frequencies' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('blocks text over 10,000 characters', async () => {
    mockBackend()
    const { user } = open()

    await enter(user, 'a'.repeat(10_001))

    expect(screen.getByText(/10,001 \/ 10,000 characters/)).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Analyse letter frequencies' }) as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('frequency analysis', () => {
  const handlers = { '/frequency': (b: Record<string, unknown>) => frequencyReply(String(b.text)) }

  it('posts the text and shows real counts from the reply, not sample data', async () => {
    const { posted } = mockBackend(handlers)
    const { user } = open()

    await enter(user, 'EEE ttt a')
    await user.click(screen.getByRole('button', { name: 'Analyse letter frequencies' }))

    await screen.findByTestId('chart-readout')
    expect(posted).toEqual([{ path: '/api/v1/analysis/frequency', body: { text: 'EEE ttt a' } }])
    const table = screen.getByRole('table', { name: /Letters ranked/ })
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(26)
    const first = within(rows[0]!).getAllByRole('cell')
    expect(within(rows[0]!).getByRole('rowheader').textContent).toBe('E')
    expect(first.map((c) => c.textContent)).toContain('3')
    expect(screen.getByText('Letters analysed').nextElementSibling?.textContent).toBe('7')
  })

  it('changes the numbers when the text changes', async () => {
    mockBackend(handlers)
    const { user } = open()

    await enter(user, 'aaaa')
    await user.click(screen.getByRole('button', { name: 'Analyse letter frequencies' }))
    expect((await screen.findByTestId('chart-readout')).textContent).toContain('A: 100.0%')

    await enter(user, 'zzzz')
    await user.click(screen.getByRole('button', { name: 'Analyse letter frequencies' }))
    await waitFor(() => expect(screen.getByTestId('chart-readout').textContent).toContain('Z: 100.0%'))
  })

  it('switches the chart between percent and count', async () => {
    mockBackend(handlers)
    const { user } = open()
    await enter(user, 'eeee tt')
    await user.click(screen.getByRole('button', { name: 'Analyse letter frequencies' }))
    await screen.findByTestId('chart-readout')

    expect(screen.getByTestId('chart-readout').textContent).toMatch(/E: 66\.7%/)
    await user.click(screen.getByRole('radio', { name: 'Count' }))
    expect(screen.getByTestId('chart-readout').textContent).toMatch(/E: 4 letters/)
  })

  it('describes the charts for assistive technology and gives a data table', async () => {
    mockBackend(handlers)
    const { user } = open()
    await enter(user, 'hello world')
    await user.click(screen.getByRole('button', { name: 'Analyse letter frequencies' }))
    await screen.findByTestId('chart-readout')

    expect(screen.getByRole('img', { name: /Bar chart of letter percentages for A to Z/ })).toBeTruthy()
    expect(screen.getByRole('img', { name: /difference between ciphertext and English/ })).toBeTruthy()
    expect(screen.getByRole('table', { name: /Letters ranked from most to least frequent/ })).toBeTruthy()
  })

  it('reads the result in words and documents how characters are counted', async () => {
    mockBackend(handlers)
    const { user } = open()
    await enter(user, 'Hello, World 123!')
    await user.click(screen.getByRole('button', { name: 'Analyse letter frequencies' }))
    await screen.findByTestId('chart-readout')

    expect(screen.getByText(/The most frequent letters are/)).toBeTruthy()
    expect(screen.getByText(/Only 10 letters were analysed/)).toBeTruthy()
    expect(screen.getByText(/How characters are counted/)).toBeTruthy()
    expect(screen.getByText(/never modified/)).toBeTruthy()
  })

  it('handles a text with no letters without a chart', async () => {
    mockBackend(handlers)
    const { user } = open()
    await enter(user, '123 !?')
    await user.click(screen.getByRole('button', { name: 'Analyse letter frequencies' }))

    expect(await screen.findByText(/contains no ASCII letters/)).toBeTruthy()
    expect(screen.queryByTestId('chart-readout')).toBeNull()
  })

  it('marks the analysis out of date once the text changes', async () => {
    mockBackend(handlers)
    const { user } = open()
    await enter(user, 'hello')
    await user.click(screen.getByRole('button', { name: 'Analyse letter frequencies' }))
    await screen.findByTestId('chart-readout')
    expect(screen.queryByText('Out of date')).toBeNull()

    await user.type(editor(), ' more')

    expect(screen.getByText('Out of date')).toBeTruthy()
  })

  it('reports an unreachable backend', async () => {
    offlineBackend()
    const { user } = open()
    await enter(user)

    await user.click(screen.getByRole('button', { name: 'Analyse letter frequencies' }))

    expect((await screen.findByRole('alert')).textContent).toContain('The backend is not reachable')
  })

  it('rejects a reply of the wrong shape', async () => {
    mockBackend({ '/frequency': () => ({ letters: 3 }) })
    const { user } = open()
    await enter(user)

    await user.click(screen.getByRole('button', { name: 'Analyse letter frequencies' }))

    expect((await screen.findByRole('alert')).textContent).toContain('Unexpected reply from the backend')
  })

  it('shows the loading state', async () => {
    let finish: (value: unknown) => void = () => {}
    mockBackend({ '/frequency': () => new Promise((resolve) => (finish = resolve)) })
    const { user } = open()
    await enter(user, 'abc')

    await user.click(screen.getByRole('button', { name: 'Analyse letter frequencies' }))

    expect(await screen.findByRole('button', { name: /Analysing/ })).toHaveProperty('disabled', true)
    finish(frequencyReply('abc'))
    await screen.findByTestId('chart-readout')
  })
})

describe('Caesar analysis', () => {
  const plain = 'Meet me at the old bridge at midnight'
  const handlers = { '/caesar/crack': () => caesarCrackReply({ 3: plain, 7: 'a different guess' }, 3) }

  async function rank(user: ReturnType<typeof renderApp>['user']) {
    await enter(user)
    await user.click(tab('Caesar Analysis'))
    await user.click(screen.getByRole('button', { name: 'Rank all 26 shifts' }))
    await screen.findByTestId('caesar-best')
  }

  it('posts the text and shows all 26 ranked candidates with the best highlighted', async () => {
    const { posted } = mockBackend(handlers)
    const { user } = open()

    await rank(user)

    expect(posted).toEqual([{ path: '/api/v1/analysis/caesar/crack', body: { text: CIPHERTEXT } }])
    expect(screen.getByTestId('caesar-best').textContent).toContain('k = 3')
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(26)
    expect(within(rows[0]!).getByText('best')).toBeTruthy()
    expect(within(rows[0]!).getByRole('rowheader').textContent).toBe('k = 3')
  })

  it('explains the statistic and that a ranking is not proof', async () => {
    mockBackend(handlers)
    const { user } = open()

    await rank(user)

    expect(screen.getByText('χ² = Σ (Oᵢ − Eᵢ)² / Eᵢ')).toBeTruthy()
    expect(screen.getAllByText(/not proof/).length).toBeGreaterThan(0)
  })

  it('inspects any candidate in full', async () => {
    mockBackend(handlers)
    const { user } = open()
    await rank(user)

    expect(screen.getByTestId('candidate-plaintext').textContent).toBe(plain)
    await user.click(screen.getByRole('button', { name: 'Inspect k = 7' }))

    expect(screen.getByTestId('candidate-plaintext').textContent).toBe('a different guess')
    expect(screen.getByRole('heading', { name: /Inspecting k = 7/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Inspect k = 7' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('warns when the text is short', async () => {
    mockBackend({
      '/caesar/crack': () =>
        caesarCrackReply({}, 3, { letters: 5, reliability: 'very_low', reliability_note: 'Only 5 letters: far too short.' }),
    })
    const { user } = open()

    await rank(user)

    expect(screen.getByText('Very low reliability')).toBeTruthy()
    expect(screen.getByText(/Only 5 letters: far too short/)).toBeTruthy()
  })

  it('reports a text with no letters from the backend', async () => {
    mockBackend({
      '/caesar/crack': () =>
        json({ detail: [{ loc: ['body', 'text'], msg: 'The text contains no ASCII letters.', type: 'no_letters' }] }, 422),
    })
    const { user } = open()

    await rank(user)
      .then(() => {})
      .catch(() => {})
    expect((await screen.findAllByRole('alert')).map((a) => a.textContent).join(' ')).toContain('The server rejected the input')
  })

  it('copies the inspected text', async () => {
    mockBackend(handlers)
    const { user } = open()
    const writeText = vi.fn(async () => {})
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    await rank(user)

    await user.click(screen.getByRole('button', { name: 'Copy text' }))

    expect(writeText).toHaveBeenCalledWith(plain)
  })
})

describe('Affine analysis', () => {
  const handlers = (extra: Record<string, () => unknown> = {}) => ({
    '/affine/search': () => affineSearchReply([5, 8], 20),
    ...extra,
  })

  async function rank(user: ReturnType<typeof renderApp>['user']) {
    await enter(user)
    await user.click(tab('Affine Analysis'))
    await user.click(screen.getByRole('button', { name: 'Rank all 312 keys' }))
    await screen.findByTestId('affine-best')
  }

  it('lists the 12 valid multipliers before any run', async () => {
    mockBackend()
    const { user } = open()
    await user.click(tab('Affine Analysis'))

    const list = screen.getByRole('list', { name: 'Valid multipliers' })
    expect(within(list).getAllByRole('listitem').map((li) => li.textContent)).toEqual(
      [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25].map((a) => `a = ${a}`),
    )
    expect(screen.getByText('12 × 26 = 312 keys')).toBeTruthy()
  })

  it('ranks all 312 keys, shows the best key and the inverses', async () => {
    const { posted } = mockBackend(handlers())
    const { user } = open()

    await rank(user)

    expect(posted).toEqual([{ path: '/api/v1/analysis/affine/search', body: { text: CIPHERTEXT, plaintext_limit: 20 } }])
    expect(screen.getByTestId('affine-best').textContent).toContain('a = 5, b = 8')
    expect(screen.getByTestId('affine-best').textContent).toContain('a⁻¹ = 21')
    expect(screen.getByRole('list', { name: 'Valid multipliers' }).textContent).toContain('a = 3 · a⁻¹ = 9')
    expect(within(screen.getByRole('table')).getAllByRole('row').slice(1)).toHaveLength(15)
    await user.click(screen.getByRole('button', { name: 'Show all 312 keys' }))
    expect(within(screen.getByRole('table')).getAllByRole('row').slice(1)).toHaveLength(312)
    await user.click(screen.getByRole('button', { name: 'Show only the best 15' }))
    expect(within(screen.getByRole('table')).getAllByRole('row').slice(1)).toHaveLength(15)
  })

  it('decrypts a candidate beyond the returned plaintexts through the normal endpoint', async () => {
    const { posted } = mockBackend(
      handlers({
        '/affine/decrypt': () => affineReply({ operation: 'decrypt', input: CIPHERTEXT, output: 'decrypted on demand' }),
      }),
    )
    const { user } = open()
    await rank(user)

    await user.click(screen.getByRole('button', { name: 'Show all 312 keys' }))
    const last = screen.getAllByRole('button', { name: /^Inspect a = / }).at(-1)!
    await user.click(last)

    await waitFor(() => expect(screen.getByTestId('candidate-plaintext').textContent).toBe('decrypted on demand'))
    const call = posted.find((p) => p.path.endsWith('/affine/decrypt'))
    expect(call?.body.text).toBe(CIPHERTEXT)
    expect(call?.body.a).toBeTypeOf('number')
  })

  it('shows an error if that on-demand decryption fails, and does not offer to send it', async () => {
    mockBackend(
      handlers({
        '/affine/decrypt': () => json({ detail: [{ loc: [], msg: 'boom', type: 'server_error' }] }, 500),
      }),
    )
    const { user } = open()
    await rank(user)

    await user.click(screen.getByRole('button', { name: 'Show all 312 keys' }))
    await user.click(screen.getAllByRole('button', { name: /^Inspect a = / }).at(-1)!)

    expect(await screen.findByText('The backend reported an error')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Send to Cipher Workspace' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('warns when the text is short', async () => {
    mockBackend({
      '/affine/search': () =>
        affineSearchReply([5, 8], 20, { letters: 30, reliability: 'low', reliability_note: '30 letters is short for a affine ranking.' }),
    })
    const { user } = open()

    await rank(user)

    expect(screen.getByText('Low reliability')).toBeTruthy()
  })
})

describe('moving between workspace and lab', () => {
  it('sends a workspace result to the Analysis Lab and analyses it straight away', async () => {
    const { posted } = mockBackend({
      '/caesar/encrypt': () => caesarReply(),
      '/frequency': (b) => frequencyReply(String(b.text)),
    })
    const { user } = renderApp('/workspace')

    await user.type(screen.getByRole('textbox', { name: 'Plaintext' }), 'Hello')
    await user.click(screen.getByRole('button', { name: 'Encrypt message' }))
    await screen.findByTestId('result-output')
    await user.click(screen.getByRole('button', { name: 'Send to Analysis Lab' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Analysis Lab' })).toBeTruthy()
    expect(editor().value).toBe('Khoor')
    await screen.findByTestId('chart-readout')
    expect(posted.at(-1)).toEqual({ path: '/api/v1/analysis/frequency', body: { text: 'Khoor' } })
  })

  it('keeps the ciphertext and results when you leave the lab and come back', async () => {
    mockBackend({ '/frequency': (b) => frequencyReply(String(b.text)) })
    const { user } = open()
    await enter(user, 'abcabc')
    await user.click(screen.getByRole('button', { name: 'Analyse letter frequencies' }))
    await screen.findByTestId('chart-readout')

    await user.click(screen.getByRole('link', { name: 'Settings' }))
    await user.click(screen.getByRole('link', { name: 'Analysis Lab' }))

    expect(editor().value).toBe('abcabc')
    expect(screen.getByTestId('chart-readout')).toBeTruthy()
  })

  it('sends a Caesar candidate back to the workspace, set up to reproduce the ciphertext', async () => {
    mockBackend({ '/caesar/crack': () => caesarCrackReply({ 3: 'Meet me' }, 3) })
    const { user } = open()
    await enter(user)
    await user.click(tab('Caesar Analysis'))
    await user.click(screen.getByRole('button', { name: 'Rank all 26 shifts' }))
    await screen.findByTestId('caesar-best')

    await user.click(screen.getByRole('button', { name: 'Send to Cipher Workspace' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Cipher Workspace' })).toBeTruthy()
    expect((screen.getByRole('textbox', { name: 'Plaintext' }) as HTMLTextAreaElement).value).toBe('Meet me')
    expect((screen.getByLabelText('Shift k') as HTMLInputElement).value).toBe('3')
    expect((screen.getByRole('radio', { name: 'Encrypt' }) as HTMLInputElement).checked).toBe(true)
    expect(screen.getByTestId('formula-numeric').textContent).toBe('E(x) = (x + 3) mod 26')
  })

  it('sends an Affine candidate back with both keys', async () => {
    mockBackend({ '/affine/search': () => affineSearchReply([5, 8], 20) })
    const { user } = open()
    await enter(user)
    await user.click(tab('Affine Analysis'))
    await user.click(screen.getByRole('button', { name: 'Rank all 312 keys' }))
    await screen.findByTestId('affine-best')

    await user.click(screen.getByRole('button', { name: 'Send to Cipher Workspace' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Cipher Workspace' })).toBeTruthy()
    expect(screen.getByRole('radio', { name: 'Affine' })).toHaveProperty('checked', true)
    expect((screen.getByLabelText('Multiplier a') as HTMLInputElement).value).toBe('5')
    expect((screen.getByLabelText('Offset b') as HTMLInputElement).value).toBe('8')
    expect((screen.getByRole('textbox', { name: 'Plaintext' }) as HTMLTextAreaElement).value).toBe('affine candidate 5,8')
  })

  it('clears the investigation: text and every result', async () => {
    mockBackend({ '/frequency': (b) => frequencyReply(String(b.text)) })
    const { user } = open()
    await enter(user, 'hello')
    await user.click(screen.getByRole('button', { name: 'Analyse letter frequencies' }))
    await screen.findByTestId('chart-readout')

    await user.click(screen.getByRole('button', { name: 'Clear' }))

    expect(editor().value).toBe('')
    expect(screen.queryByTestId('chart-readout')).toBeNull()
    expect(screen.getByText('No analysis yet')).toBeTruthy()
  })

  it('offers Analyse on the workspace input', async () => {
    mockBackend({ '/frequency': (b) => frequencyReply(String(b.text)) })
    const { user } = renderApp('/workspace')

    await user.type(screen.getByRole('textbox', { name: 'Plaintext' }), 'secret')
    await user.click(screen.getByRole('button', { name: 'Analyse' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Analysis Lab' })).toBeTruthy()
    expect(editor().value).toBe('secret')
  })
})

describe('keyboard and form basics', () => {
  it('every chart letter has a text equivalent in the table', async () => {
    mockBackend({ '/frequency': (b) => frequencyReply(String(b.text)) })
    const { user } = open()
    await enter(user, 'hello')
    await user.click(screen.getByRole('button', { name: 'Analyse letter frequencies' }))
    await screen.findByTestId('chart-readout')

    fireEvent.mouseEnter(screen.getAllByText('H')[0]!.parentElement!)
    const letters = within(screen.getByRole('table', { name: /Letters ranked/ }))
      .getAllByRole('rowheader')
      .map((h) => h.textContent)
    expect(letters).toHaveLength(26)
    expect(new Set(letters).size).toBe(26)
  })
})
