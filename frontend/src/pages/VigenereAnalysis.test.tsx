import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { describeSeparation } from '../modules/analysis/interpret'
import { runVigenereCandidates, runVigenereLengths } from '../services/analysis'
import {
  candidatesReply,
  frequencyReply,
  json,
  lengthsReply,
  mockBackend,
  offlineBackend,
  renderApp,
  vigenereReply,
} from '../test/helpers'

const CIPHERTEXT = 'Lxfopv ef Rnhr lxfopv ef rnhr'
const editor = () => screen.getByRole('textbox', { name: 'Ciphertext' }) as HTMLTextAreaElement

type User = ReturnType<typeof renderApp>['user']

async function open(handlers: Parameters<typeof mockBackend>[0] = {}) {
  const backend = mockBackend({
    '/vigenere/lengths': () => lengthsReply(),
    '/vigenere/candidates': (body) => candidatesReply(body.key_length === 5 ? 'LEMON' : 'LEMONLEMON'),
    ...handlers,
  })
  const app = renderApp('/analysis')
  await app.user.click(screen.getByRole('tab', { name: 'Vigenère Analysis' }))
  return { ...app, ...backend }
}

async function enter(user: User, text = CIPHERTEXT) {
  await user.clear(editor())
  editor().focus()
  await user.paste(text)
}

const investigate = () => screen.getByRole('button', { name: 'Investigate key length' }) as HTMLButtonElement

async function runIt(user: User) {
  await enter(user)
  await user.click(investigate())
  await screen.findByTestId('suggested-length')
}

describe('the Vigenère tab', () => {
  it('is the fourth internal tab, not a new destination', async () => {
    await open()
    expect(screen.getAllByRole('navigation')).toHaveLength(1)
    expect(screen.getByRole('tab', { name: 'Vigenère Analysis' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe('tab-vigenere')
  })

  it('explains the method and the evidence labels before any run', async () => {
    await open()
    expect(screen.getByText(/turns every m-th letter into its own Caesar cipher/)).toBeTruthy()
    expect(screen.getByText('IC = Σ fᵢ(fᵢ − 1) / (N(N − 1))')).toBeTruthy()
    expect(screen.getByText('No analysis yet')).toBeTruthy()
    expect(investigate().disabled).toBe(true)
  })

  it('does not run anything until asked', async () => {
    const { user, posted } = await open()
    await enter(user)
    expect(posted).toHaveLength(0)
    expect(investigate().disabled).toBe(false)
  })

  it('keeps the same ciphertext as the other tabs', async () => {
    const { user } = await open()
    await enter(user)
    await user.click(screen.getByRole('tab', { name: 'Caesar Analysis' }))
    expect(editor().value).toBe(CIPHERTEXT)
  })
})

describe('investigating the key length', () => {
  it('posts the text, then shows the index of coincidence with its reading and reference values', async () => {
    const { user, posted } = await open()
    await runIt(user)

    expect(posted[0]).toEqual({ path: '/api/v1/analysis/vigenere/lengths', body: { text: CIPHERTEXT } })
    expect(screen.getByTestId('ic-value').textContent).toBe('0.0427')
    expect(screen.getByTestId('ic-reading').textContent).toBe('flat')
    expect(screen.getByText(/The IC is close to random letters/)).toBeTruthy()
    expect(screen.getByRole('img', { name: /random letters 0\.0385, English 0\.0655, this text 0\.0427/ })).toBeTruthy()
    expect(screen.getByText('rough estimate')).toBeTruthy()
  })

  it('labels each section as measured, calculated or a suggestion', async () => {
    const { user } = await open()
    await runIt(user)

    const ic = screen.getByRole('region', { name: 'Index of coincidence' })
    expect(within(ic).getByText('Measured')).toBeTruthy()
    expect(within(ic).getByText('Calculated')).toBeTruthy()
    const kasiski = screen.getByRole('region', { name: 'Kasiski examination' })
    expect(within(kasiski).getByText('Measured')).toBeTruthy()
    const lengths = screen.getByRole('region', { name: 'Candidate key lengths' })
    expect(within(lengths).getByText('Suggestion')).toBeTruthy()
  })

  it('shows the Kasiski evidence: repeats, distances and the supported key lengths', async () => {
    const { user } = await open()
    await runIt(user)

    expect(screen.getByTestId('kasiski-top').textContent).toBe('5 (9 of 10)')
    const kasiski = screen.getByRole('region', { name: 'Kasiski examination' })
    const table = within(kasiski).getByRole('table', { name: /ranked by how many repeat distances/ })
    const rows = within(table).getAllByRole('row').slice(1)
    expect(within(rows[0]!).getByRole('rowheader').textContent).toBe('5')
    expect(rows[0]?.textContent).toContain('90%')
    expect(rows[0]?.textContent).toContain('THEQ · distance 35')
    expect(within(kasiski).getByText(/not a verdict/)).toBeTruthy()
    expect(within(kasiski).getByText(/Repeated sequences \(2 of 10 shown/)).toBeTruthy()
  })

  it('ranks the candidate lengths and shows the suggestion as a suggestion', async () => {
    const { user } = await open()
    await runIt(user)

    expect(screen.getByTestId('suggested-length').textContent).toBe('Suggested key length: 5')
    expect(screen.getByRole('img', { name: /Bar chart of the mean index of coincidence for key lengths 1 to 20.*suggested length is 5/ })).toBeTruthy()
    const table = screen.getByRole('table', { name: /Candidate key lengths: plausible lengths first/ })
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(20)
    expect(within(rows[0]!).getByRole('rowheader').textContent).toBe('5')
    expect(rows[0]?.textContent).toContain('plausible')
    expect(rows[1]?.textContent).toContain('unlikely')
    expect(screen.getAllByText(/not proof/).length).toBeGreaterThan(0)
  })

  it('analyses the suggested length straight away and shows the key letters', async () => {
    const { user, posted } = await open()
    await runIt(user)

    await screen.findByRole('region', { name: 'Key letters for length 5' })
    expect(posted[1]).toEqual({ path: '/api/v1/analysis/vigenere/candidates', body: { text: CIPHERTEXT, key_length: 5 } })
    const table = screen.getByRole('table', { name: /Estimated key letter for each position/ })
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows.map((r) => within(r).getByRole('rowheader').textContent)).toEqual(['L', 'E', 'M', 'O', 'N'])
    expect(rows[0]?.textContent).toContain('4.50×')
  })

  it('ranks candidate keys and lets you inspect each one in full', async () => {
    const { user } = await open()
    await runIt(user)
    await screen.findByRole('region', { name: 'Key letters for length 5' })

    expect(screen.getByTestId('candidate-plaintext').textContent).toBe('plaintext for LEMON')
    await user.click(screen.getByRole('button', { name: 'Inspect LEMOA' }))
    expect(screen.getByTestId('candidate-plaintext').textContent).toBe('plaintext for LEMOA')
    expect(screen.getByRole('heading', { name: /Inspecting LEMOA/ })).toBeTruthy()
    expect(screen.getByText(/whole-text χ² 80\.0/)).toBeTruthy()
    expect(screen.getAllByText(/Σ column χ²/).length).toBeGreaterThan(0)
  })

  it('lets you choose another length from the table', async () => {
    const { user, posted } = await open()
    await runIt(user)
    await screen.findByRole('region', { name: 'Key letters for length 5' })

    await user.click(screen.getByRole('button', { name: 'Analyse key length 10' }))

    await screen.findByRole('region', { name: 'Key letters for length 10' })
    expect(posted.at(-1)?.body).toEqual({ text: CIPHERTEXT, key_length: 10 })
    expect(screen.getByRole('button', { name: 'Analyse key length 10' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('asks you to choose a length when none is suggested', async () => {
    const { user, posted } = await open({ '/vigenere/lengths': () => lengthsReply({ suggested_length: null, note: 'No length reaches the plausibility threshold, so no key length is suggested.' }) })
    await runIt(user)

    expect(screen.getByTestId('suggested-length').textContent).toBe('No length is suggested.')
    expect(screen.getByText('Choose a key length')).toBeTruthy()
    expect(screen.queryByRole('region', { name: /Key letters for length/ })).toBeNull()
    expect(posted).toHaveLength(1)
  })

  it('warns about short text and never claims certainty', async () => {
    const { user } = await open({
      '/vigenere/lengths': () => lengthsReply({ reliability: 'very_low', note: 'Only 12 letters: the ranking is a guess.' }),
      '/vigenere/candidates': () => candidatesReply('LEMON', { reliability: 'very_low', note: 'Columns this small cannot identify a shift reliably: treat every letter as a guess.' }),
    })
    await runIt(user)
    await screen.findByRole('region', { name: 'Key letters for length 5' })

    expect(screen.getAllByText('Very low reliability').length).toBeGreaterThan(1)
    expect(screen.getByText(/treat every letter as a guess/)).toBeTruthy()
    expect(screen.getByText(/None of it is proof/)).toBeTruthy()
  })

  it('shows the loading state', async () => {
    let finish: (value: unknown) => void = () => {}
    const { user } = await open({ '/vigenere/lengths': () => new Promise((resolve) => (finish = resolve)) })
    await enter(user)

    await user.click(investigate())

    expect(await screen.findByRole('button', { name: /Investigating/ })).toHaveProperty('disabled', true)
    finish(lengthsReply())
    await screen.findByTestId('suggested-length')
  })

  it('shows the offline state', async () => {
    offlineBackend()
    const { user } = renderApp('/analysis')
    await user.click(screen.getByRole('tab', { name: 'Vigenère Analysis' }))
    await enter(user)

    await user.click(investigate())

    expect((await screen.findByRole('alert')).textContent).toContain('The backend is not reachable')
  })

  it('shows a backend 422 for too little text', async () => {
    const { user } = await open({
      '/vigenere/lengths': () => json({ detail: [{ loc: ['body', 'text'], msg: 'At least two letters are needed.', type: 'insufficient_text' }] }, 422),
    })
    await enter(user, 'A')

    await user.click(investigate())

    expect((await screen.findAllByRole('alert')).map((a) => a.textContent).join(' ')).toContain('The server rejected the input')
  })

  it('shows an error if the key-letter step fails, keeping the key-length results', async () => {
    const { user } = await open({
      '/vigenere/candidates': () => json({ detail: [{ loc: ['body', 'key_length'], msg: 'The key length cannot be larger than the number of letters.', type: 'invalid_key_length' }] }, 422),
    })
    await runIt(user)

    expect((await screen.findAllByRole('alert')).length).toBeGreaterThan(0)
    expect(screen.getByTestId('suggested-length')).toBeTruthy()
    expect(screen.queryByRole('region', { name: /Key letters for length/ })).toBeNull()
  })

  it('rejects replies of the wrong shape', async () => {
    const { user } = await open({ '/vigenere/lengths': () => ({ letters: 5 }) })
    await enter(user)

    await user.click(investigate())

    expect((await screen.findByRole('alert')).textContent).toContain('Unexpected reply from the backend')
  })

  it('marks the analysis out of date when the text changes', async () => {
    const { user } = await open()
    await runIt(user)

    await user.type(editor(), ' more')

    expect(screen.getByText('Out of date')).toBeTruthy()
  })

  it('clears the investigation', async () => {
    const { user } = await open()
    await runIt(user)

    await user.click(screen.getByRole('button', { name: 'Clear' }))

    expect(editor().value).toBe('')
    expect(screen.queryByTestId('suggested-length')).toBeNull()
    expect(screen.getByText('No analysis yet')).toBeTruthy()
  })

  it('keeps the whole investigation when you switch tabs or pages and come back', async () => {
    const { user } = await open()
    await runIt(user)
    await screen.findByRole('region', { name: 'Key letters for length 5' })

    await user.click(screen.getByRole('tab', { name: 'Caesar Analysis' }))
    await user.click(screen.getByRole('link', { name: 'Settings' }))
    await user.click(screen.getByRole('link', { name: 'Analysis Lab' }))
    await user.click(screen.getByRole('tab', { name: 'Vigenère Analysis' }))

    expect(editor().value).toBe(CIPHERTEXT)
    expect(screen.getByTestId('suggested-length')).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Key letters for length 5' })).toBeTruthy()
  })

  it('shows the index of coincidence on the Frequency tab too', async () => {
    mockBackend({ '/frequency': (b) => frequencyReply(String(b.text)) })
    const { user } = renderApp('/analysis')
    await enter(user, 'aab')
    await user.click(screen.getByRole('button', { name: 'Analyse letter frequencies' }))

    await screen.findByTestId('chart-readout')
    expect(screen.getByText('Index of coincidence').nextElementSibling?.textContent).toBe('0.3333')
  })
})

describe('moving between workspace and the Vigenère tab', () => {
  it('sends the workspace result to the Analysis Lab, where the Vigenère tab uses the same text', async () => {
    mockBackend({
      '/vigenere/encrypt': () => vigenereReply(),
      '/frequency': (b) => frequencyReply(String(b.text)),
      '/vigenere/lengths': () => lengthsReply(),
      '/vigenere/candidates': () => candidatesReply('LEMON'),
    })
    const { user } = renderApp('/workspace')
    await user.click(screen.getByRole('radio', { name: 'Vigenère' }))
    await user.type(screen.getByRole('textbox', { name: 'Plaintext' }), 'ATTACKATDAWN')
    await user.click(screen.getByRole('button', { name: 'Encrypt message' }))
    await screen.findByTestId('result-output')
    await user.click(screen.getByRole('button', { name: 'Send to Analysis Lab' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Analysis Lab' })).toBeTruthy()
    expect(editor().value).toBe('LXFOPVEFRNHR')
    await user.click(screen.getByRole('tab', { name: 'Vigenère Analysis' }))
    expect(editor().value).toBe('LXFOPVEFRNHR')
    await user.click(investigate())
    await screen.findByTestId('suggested-length')
  })

  it('sends a candidate key back to the workspace, set up to reproduce the ciphertext', async () => {
    const { user } = await open()
    await runIt(user)
    await screen.findByRole('region', { name: 'Key letters for length 5' })

    await user.click(screen.getByRole('button', { name: 'Send to Cipher Workspace' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Cipher Workspace' })).toBeTruthy()
    expect((screen.getByRole('radio', { name: 'Vigenère' }) as HTMLInputElement).checked).toBe(true)
    expect((screen.getByRole('radio', { name: 'Encrypt' }) as HTMLInputElement).checked).toBe(true)
    expect((screen.getByLabelText('Keyword') as HTMLInputElement).value).toBe('LEMON')
    expect((screen.getByRole('textbox', { name: 'Plaintext' }) as HTMLTextAreaElement).value).toBe('plaintext for LEMON')
  })

  it('sends the shortest equivalent key when the candidate repeats a shorter one', async () => {
    const { user } = await open({
      '/vigenere/candidates': () => {
        const reply = candidatesReply('LEMONLEMON')
        reply.candidates[0] = { ...reply.candidates[0]!, shortest_equivalent_key: 'LEMON' }
        return reply
      },
    })
    await runIt(user)
    await screen.findByRole('region', { name: /Key letters for length/ })

    expect(screen.getByText(/same as the shorter key LEMON/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Send to Cipher Workspace' }))

    expect((await screen.findByLabelText('Keyword') as HTMLInputElement).value).toBe('LEMON')
  })

  it('copies the inspected plaintext', async () => {
    const { user } = await open()
    const writeText = vi.fn(async () => {})
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    await runIt(user)
    await screen.findByRole('region', { name: 'Key letters for length 5' })

    await user.click(screen.getByRole('button', { name: 'Copy text' }))

    expect(writeText).toHaveBeenCalledWith('plaintext for LEMON')
  })
})

describe('Vigenère analysis services', () => {
  it('post the documented bodies and validate the replies', async () => {
    const { posted } = mockBackend({ '/vigenere/lengths': () => lengthsReply(), '/vigenere/candidates': () => candidatesReply('KEY') })

    const lengths = await runVigenereLengths('abc')
    const candidates = await runVigenereCandidates('abc', 3)

    expect(posted).toEqual([
      { path: '/api/v1/analysis/vigenere/lengths', body: { text: 'abc' } },
      { path: '/api/v1/analysis/vigenere/candidates', body: { text: 'abc', key_length: 3 } },
    ])
    expect(lengths.lengths).toHaveLength(20)
    expect(candidates.key_length).toBe(3)
  })

  it('reject malformed replies', async () => {
    mockBackend({
      '/vigenere/lengths': () => ({ ...lengthsReply(), lengths: [] }),
      '/vigenere/candidates': () => ({ ...candidatesReply('KEY'), columns: [] }),
    })
    await expect(runVigenereLengths('abc')).rejects.toThrow(/unexpected Vigenère key-length response/)
    await expect(runVigenereCandidates('abc', 3)).rejects.toThrow(/unexpected Vigenère candidate response/)
  })

  it('reject a candidate key that is not an A-Z keyword', async () => {
    const bad = candidatesReply('KEY')
    bad.candidates[0] = { ...bad.candidates[0]!, key: 'K3Y' }
    mockBackend({ '/vigenere/candidates': () => bad })
    await expect(runVigenereCandidates('abc', 3)).rejects.toThrow(/unexpected/)
  })
})

describe('describeSeparation (used for the Caesar and affine tabs)', () => {
  it('stays cautious', () => {
    expect(describeSeparation(4)).toContain('not proof')
  })
})

describe('waiting for the lengths to finish before the candidates', () => {
  it('asks for the candidates only after a length is known', async () => {
    const order: string[] = []
    const { user } = await open({
      '/vigenere/lengths': () => {
        order.push('lengths')
        return lengthsReply()
      },
      '/vigenere/candidates': () => {
        order.push('candidates')
        return candidatesReply('LEMON')
      },
    })
    await runIt(user)
    await waitFor(() => expect(order).toEqual(['lengths', 'candidates']))
  })
})
