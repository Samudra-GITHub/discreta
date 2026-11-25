import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import App from './App'

const health = {
  status: 'ok',
  service: 'discreta-backend',
  version: '0.3.0',
  message: 'DISCRETA backend is running.',
  timestamp: '2026-11-25T00:00:00Z',
}

function renderAt(path: string, backendUp = true) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      if (!backendUp) throw new TypeError('Failed to fetch')
      return new Response(JSON.stringify(health), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }),
  )
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

const heading = () => screen.getByRole('heading', { level: 1 })

describe('every page renders inside the shared shell', () => {
  const pages: [string, RegExp][] = [
    ['/', /DISCRETA/],
    ['/labs/logic', /Logic/],
    ['/labs/sets', /Sets/],
    ['/labs/combinatorics', /Combinatorics/],
    ['/labs/graphs', /Graphs/],
    ['/labs/algebra', /Algebra/],
    ['/frequency-analyzer', /Frequency Analyzer/],
    ['/theory', /Theory & Proofs/],
    ['/no/such/page', /Page not found/],
  ]

  it.each(pages)('%s', async (path, title) => {
    renderAt(path)

    await waitFor(() => expect(heading().textContent).toMatch(title))
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeTruthy()
    expect(screen.getByRole('main')).toBeTruthy()
    expect(screen.getAllByText(/Backend|Checking/).length).toBeGreaterThan(0)
  })

  it('the Cipher Laboratory', async () => {
    renderAt('/cipher-lab')

    await waitFor(() => expect(heading().textContent).toMatch(/one letter at a time/i))
    expect(screen.getByRole('radiogroup', { name: 'Cipher' })).toBeTruthy()
  })

  it('the Secure Message Journey (loaded lazily)', async () => {
    renderAt('/secure-message-journey')

    expect((await screen.findByRole('heading', { level: 1 })).textContent).toMatch(/Secure Message Journey/)
    expect(screen.getByRole('img', { name: /Pipeline: plaintext/ })).toBeTruthy()
  })

  it('shows each mathematical module under its studio name', async () => {
    const names: [string, string][] = [
      ['/labs/logic', 'Logic Studio'],
      ['/labs/sets', 'Set Explorer'],
      ['/labs/combinatorics', 'Combinatorics Studio'],
      ['/labs/graphs', 'Graph Lab'],
      ['/labs/algebra', 'Algebra Lab'],
    ]
    for (const [path, name] of names) {
      const { unmount } = renderAt(path)
      expect(screen.getByText(name)).toBeTruthy()
      unmount()
    }
  })
})

describe('navigation', () => {
  it('links to every page: the dashboard, five modules, three cryptography tools and the theory page', () => {
    renderAt('/')

    const nav = screen.getByRole('navigation', { name: 'Primary' })
    const hrefs = within(nav)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'))
    expect(hrefs).toEqual([
      '/',
      '/labs/logic',
      '/labs/sets',
      '/labs/combinatorics',
      '/labs/graphs',
      '/labs/algebra',
      '/cipher-lab',
      '/frequency-analyzer',
      '/secure-message-journey',
      '/theory',
    ])
  })

  it('marks the current page', () => {
    renderAt('/labs/graphs')

    const current = within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('link', { current: 'page' })
    expect(current.getAttribute('href')).toBe('/labs/graphs')
  })

  it('moves between pages without a reload', async () => {
    const user = userEvent.setup()
    renderAt('/')

    await user.click(within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('link', { name: 'Theory & Proofs' }))

    await waitFor(() => expect(heading().textContent).toMatch(/Theory & Proofs/))
  })

  it('opens and closes the mobile drawer', async () => {
    const user = userEvent.setup()
    renderAt('/')

    const open = screen.getByRole('button', { name: 'Open navigation' })
    expect(open.getAttribute('aria-expanded')).toBe('false')
    await user.click(open)
    expect(open.getAttribute('aria-expanded')).toBe('true')
    await user.click(screen.getByRole('button', { name: 'Close navigation' }))
    expect(open.getAttribute('aria-expanded')).toBe('false')
  })
})

describe('dashboard', () => {
  it('lists the five modules and the three cryptography tools with honest statuses', () => {
    renderAt('/')

    const modules = screen.getByRole('region', { name: 'Five mathematical modules' })
    expect(within(modules).getAllByRole('link')).toHaveLength(5)
    expect(within(modules).getAllByText('Planned')).toHaveLength(4)
    expect(within(modules).getAllByText('In progress')).toHaveLength(1)
    const crypto = screen.getByRole('region', { name: /Cipher & frequency analysis/ })
    expect(within(crypto).getByText('In progress')).toBeTruthy()
    expect(within(crypto).getAllByText('Planned')).toHaveLength(2)
  })

  it('shows the backend as online only after a real health response', async () => {
    renderAt('/')

    expect(screen.getAllByText('Checking backend…').length).toBeGreaterThan(0)
    await waitFor(() => expect(screen.getAllByText('Backend online').length).toBeGreaterThan(0))
    expect(screen.getByText(/discreta-backend v0\.3\.0/)).toBeTruthy()
  })

  it('shows the backend as offline, with the start command, when it cannot be reached', async () => {
    renderAt('/', false)

    await waitFor(() => expect(screen.getAllByText('Backend offline').length).toBeGreaterThan(0))
    expect(screen.getByText(/uvicorn app.main:app/)).toBeTruthy()
  })
})

describe('planned pages stay honest', () => {
  it('say that nothing is implemented yet', () => {
    renderAt('/frequency-analyzer')

    expect(screen.getByRole('note').textContent).toContain('not implemented yet')
  })
})

describe('theory page', () => {
  it('states and proves three theorems and shows the Euclid computation', () => {
    renderAt('/theory')

    expect(screen.getAllByText(/^Theorem \d\./)).toHaveLength(3)
    const rows = screen.getByTestId('euclid-rows').textContent ?? ''
    expect(rows).toContain('26 = 3 · 7 + 5')
    expect(rows).toContain('2 = 2 · 1 + 0')
    const result = screen.getByTestId('euclid-result').textContent ?? ''
    expect(result).toContain('gcd(26, 7) = 1')
    expect(result).toContain('15')
    expect(result).toContain('7 · 15 = 105 = 4 · 26 + 1')
  })

  it('draws both multiplication diagrams with accurate summaries', () => {
    renderAt('/theory')

    expect(screen.getByRole('img', { name: /Multiplying by 4: 13 results are each reached by two or more letters and 13 results are never reached/ })).toBeTruthy()
    expect(screen.getByRole('img', { name: /Multiplying by 5: each of the 26 results is reached by exactly one letter/ })).toBeTruthy()
  })
})

describe('focal 3D forms', () => {
  it('use the SVG fallback when WebGL is unavailable', () => {
    renderAt('/labs/logic')

    expect(screen.getByRole('img', { name: /Decorative illustration: an AND gate/ })).toBeTruthy()
  })
})
