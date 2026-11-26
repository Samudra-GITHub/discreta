import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { caesarReply, mockBackend, offlineBackend, renderApp } from '../test/helpers'

const theme = () => document.documentElement.getAttribute('data-theme')

describe('theme', () => {
  it('offers system, light and dark, defaulting to system (light here)', () => {
    mockBackend()
    renderApp('/settings')

    expect(screen.getAllByRole('radio').map((r) => (r as HTMLInputElement).value)).toEqual(['system', 'light', 'dark'])
    expect((screen.getByRole('radio', { name: 'System' }) as HTMLInputElement).checked).toBe(true)
    expect(theme()).toBe('light')
    expect(screen.getByText(/Following your system preference, currently light/)).toBeTruthy()
  })

  it('switches to dark, applies it to the page and remembers it', async () => {
    mockBackend()
    const { user } = renderApp('/settings')

    await user.click(screen.getByRole('radio', { name: 'Dark' }))

    expect(theme()).toBe('dark')
    expect(window.localStorage.getItem('discreta-theme')).toBe('dark')
    await user.click(screen.getByRole('radio', { name: 'Light' }))
    expect(theme()).toBe('light')
    expect(window.localStorage.getItem('discreta-theme')).toBe('light')
  })

  it('restores a saved choice on load', () => {
    window.localStorage.setItem('discreta-theme', 'dark')
    mockBackend()
    renderApp('/settings')

    expect(theme()).toBe('dark')
    expect((screen.getByRole('radio', { name: 'Dark' }) as HTMLInputElement).checked).toBe(true)
  })

  it('ignores a corrupt saved value', () => {
    window.localStorage.setItem('discreta-theme', 'purple')
    mockBackend()
    renderApp('/settings')

    expect((screen.getByRole('radio', { name: 'System' }) as HTMLInputElement).checked).toBe(true)
  })

  it('follows the operating system in system mode and reacts to a change', async () => {
    let listener: () => void = () => {}
    let dark = true
    vi.stubGlobal('matchMedia', (query: string) => ({
      get matches() {
        return dark
      },
      media: query,
      addEventListener: (_: string, fn: () => void) => (listener = fn),
      removeEventListener: () => {},
    }))
    mockBackend()
    renderApp('/settings')
    expect(theme()).toBe('dark')

    dark = false
    listener()

    await waitFor(() => expect(theme()).toBe('light'))
  })

  it('still works when storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    mockBackend()
    const { user } = renderApp('/settings')

    await user.click(screen.getByRole('radio', { name: 'Dark' }))

    expect(theme()).toBe('dark')
  })

  it('keeps the taskbar present in both themes', async () => {
    mockBackend()
    const { user } = renderApp('/settings')

    for (const name of ['Dark', 'Light']) {
      await user.click(screen.getByRole('radio', { name }))
      expect(screen.getByRole('navigation', { name: 'Primary' })).toBeTruthy()
    }
  })
})

describe('session', () => {
  it('clears the workspace and the analysis text in one action', async () => {
    mockBackend({ '/caesar/encrypt': () => caesarReply() })
    const { user } = renderApp('/workspace')
    await user.type(screen.getByRole('textbox', { name: 'Plaintext' }), 'Hello')
    await user.click(screen.getByRole('button', { name: 'Encrypt message' }))
    await screen.findByTestId('result-output')
    await user.click(screen.getByRole('button', { name: 'Send to Analysis Lab' }))
    await screen.findByRole('heading', { level: 1, name: 'Analysis Lab' })

    await user.click(screen.getByRole('link', { name: 'Settings' }))
    await user.click(screen.getByRole('button', { name: 'Clear session' }))
    expect(screen.getByText(/Session cleared/)).toBeTruthy()

    await user.click(screen.getByRole('link', { name: 'Analysis Lab' }))
    expect((screen.getByRole('textbox', { name: 'Ciphertext' }) as HTMLTextAreaElement).value).toBe('')
    await user.click(screen.getByRole('link', { name: 'Cipher Workspace' }))
    expect((screen.getByRole('textbox', { name: 'Plaintext' }) as HTMLTextAreaElement).value).toBe('')
    expect(screen.queryByTestId('result-output')).toBeNull()
  })
})

describe('backend panel', () => {
  it('shows the connection and version when the backend answers', async () => {
    mockBackend()
    renderApp('/settings')

    expect(await screen.findByText('Connected')).toBeTruthy()
    expect(screen.getByText(/discreta-backend v1.0.0/)).toBeTruthy()
  })

  it('says so when the backend is offline and lets you check again', async () => {
    const mock = offlineBackend()
    const { user } = renderApp('/settings')

    expect(await screen.findByText('Not reachable')).toBeTruthy()
    expect(screen.getByText(/uvicorn app.main:app --port 8000/)).toBeTruthy()
    const before = mock.mock.calls.length
    await user.click(screen.getByRole('button', { name: 'Check again' }))
    await waitFor(() => expect(mock.mock.calls.length).toBeGreaterThan(before))
  })

  it('describes the app honestly', () => {
    mockBackend()
    renderApp('/settings')

    expect(screen.getByText(/not secure encryption/)).toBeTruthy()
    expect(screen.getByText('Version 1.0.0')).toBeTruthy()
  })
})
