import { act, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { caesarReply, mockBackend, renderApp } from '../../test/helpers'
import { hexLines } from './hex'
import { variantFor } from './Atmosphere'

const layer = () => screen.getByTestId('atmosphere')

describe('hexLines', () => {
  it('is deterministic and shaped like hexadecimal bytes', () => {
    const lines = hexLines(50, 26)
    expect(lines).toEqual(hexLines(50, 26))
    expect(lines).not.toEqual(hexLines(50, 27))
    expect(lines).toHaveLength(50)
    expect(lines.every((line) => /^[0-9A-F]{2} [0-9A-F]{2}$/.test(line))).toBe(true)
  })
})

describe('variantFor', () => {
  it('chooses an atmosphere per page', () => {
    expect(variantFor('/')).toBe('overview')
    expect(variantFor('/workspace')).toBe('workspace')
    expect(variantFor('/analysis')).toBe('analysis')
    expect(variantFor('/settings')).toBe('settings')
    expect(variantFor('/unknown')).toBe('overview')
  })
})

describe('the background layer', () => {
  it('is decorative: hidden from assistive technology, with nothing focusable inside', () => {
    mockBackend()
    renderApp('/')

    expect(layer().getAttribute('aria-hidden')).toBe('true')
    expect(layer().querySelectorAll('a, button, input, textarea, select, [tabindex]')).toHaveLength(0)
  })

  it('does not change what assistive technology or the keyboard can reach', () => {
    mockBackend()
    renderApp('/workspace')

    expect(screen.getAllByRole('navigation')).toHaveLength(1)
    expect(screen.getByRole('main')).toBeTruthy()
    expect(layer().parentElement?.contains(screen.getByRole('main'))).toBe(true)
  })

  it('follows the page: a different variant on each route', async () => {
    mockBackend()
    const { user } = renderApp('/')
    expect(layer().getAttribute('data-variant')).toBe('overview')

    await user.click(screen.getByRole('link', { name: 'Cipher Workspace' }))
    expect(layer().getAttribute('data-variant')).toBe('workspace')
    await user.click(screen.getByRole('link', { name: 'Analysis Lab' }))
    expect(layer().getAttribute('data-variant')).toBe('analysis')
    expect(layer().querySelector('.atmo-bars')).not.toBeNull()
    await user.click(screen.getByRole('link', { name: 'Settings' }))
    expect(layer().getAttribute('data-variant')).toBe('settings')
  })

  it('is especially quiet on Settings: only the grid, no streams or annotations', () => {
    mockBackend()
    renderApp('/settings')

    expect(layer().querySelector('.atmo-grid')).not.toBeNull()
    expect(layer().querySelector('.atmo-stream')).toBeNull()
    expect(layer().querySelector('.atmo-label')).toBeNull()
  })

  it('shows hexadecimal streams in both margins elsewhere', () => {
    mockBackend()
    renderApp('/workspace')

    expect(layer().querySelectorAll('.atmo-stream')).toHaveLength(2)
    expect(layer().querySelector('.atmo-gutter-left .atmo-stream')).not.toBeNull()
    expect(layer().querySelector('.atmo-gutter-right .atmo-stream')).not.toBeNull()
  })

  it('only labels it with true statements about the mathematics', async () => {
    mockBackend()
    renderApp('/analysis')

    const text = layer().textContent ?? ''
    expect(text).toContain('FREQUENCY')
    expect(text).not.toMatch(/ALERT|BREACH|INTRUSION|ACCESS DENIED|WARNING|HACK/i)
  })

  it('changes its annotation slowly and stops when the tab is hidden', async () => {
    vi.useFakeTimers()
    try {
      mockBackend()
      renderApp('/')
      expect(layer().querySelector('.atmo-label')?.textContent).toBe('ENCRYPTION')

      await act(async () => {
        vi.advanceTimersByTime(7000)
      })
      expect(layer().querySelector('.atmo-label')?.textContent).toBe('ANALYSIS')

      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'))
      })
      expect(layer().getAttribute('data-paused')).toBe('true')
      await act(async () => {
        vi.advanceTimersByTime(30000)
      })
      expect(layer().querySelector('.atmo-label')?.textContent).toBe('ANALYSIS')

      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'))
      })
      expect(layer().getAttribute('data-paused')).toBe('false')
    } finally {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
      vi.useRealTimers()
    }
  })

  it('is static under reduced motion: nothing rotates and the layer is marked paused', async () => {
    vi.useFakeTimers()
    try {
      vi.stubGlobal('matchMedia', (query: string) => ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }))
      mockBackend()
      renderApp('/')

      expect(layer().getAttribute('data-paused')).toBe('true')
      await act(async () => {
        vi.advanceTimersByTime(60000)
      })
      expect(layer().querySelector('.atmo-label')?.textContent).toBe('ENCRYPTION')
    } finally {
      vi.useRealTimers()
    }
  })

  it('reports real backend work in its status tag, not invented activity', async () => {
    let finish: (value: unknown) => void = () => {}
    mockBackend({ '/caesar/encrypt': () => new Promise((resolve) => (finish = resolve)) })
    const { user } = renderApp('/workspace')
    const status = () => layer().querySelector('.atmo-status')?.textContent

    expect(status()).toBe('STANDBY')
    await user.type(screen.getByRole('textbox', { name: 'Plaintext' }), 'Hello')
    await user.click(screen.getByRole('button', { name: 'Encrypt message' }))
    expect(status()).toBe('PROCESSING')

    await act(async () => finish(caesarReply()))
    await screen.findByTestId('result-output')
    expect(status()).toBe('STANDBY')
  })
})

describe('the Overview network motif', () => {
  it('is present, decorative, and not behind any control', () => {
    mockBackend()
    renderApp('/')

    const svg = screen.getByTestId('network-motif')
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(svg.getAttribute('focusable')).toBe('false')
    expect((svg.getAttribute('class') ?? '')).toContain('pointer-events-none')
    expect((svg.getAttribute('class') ?? '')).toContain('hidden')
    expect(svg.querySelectorAll('circle').length).toBeGreaterThan(5)
  })

  it('does not appear on the other pages', () => {
    mockBackend()
    renderApp('/workspace')
    expect(screen.queryByTestId('network-motif')).toBeNull()
  })
})
