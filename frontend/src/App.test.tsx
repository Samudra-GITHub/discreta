import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { mockBackend, renderApp } from './test/helpers'

describe('floating taskbar', () => {
  it('is the only navigation, with exactly the four destinations', () => {
    mockBackend()
    renderApp('/')

    const nav = screen.getByRole('navigation', { name: 'Primary' })
    expect(screen.getAllByRole('navigation')).toHaveLength(1)
    const links = within(nav).getAllByRole('link')
    expect(links.map((l) => l.getAttribute('aria-label'))).toEqual([
      'Overview',
      'Cipher Workspace',
      'Analysis Lab',
      'Settings',
    ])
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/', '/workspace', '/analysis', '/settings'])
  })

  it('has no sidebar, header bar or second navigation', () => {
    mockBackend()
    const { container } = renderApp('/')

    expect(container.querySelector('aside')).toBeNull()
    expect(container.querySelector('header nav')).toBeNull()
    expect(screen.queryByText(/Logic Studio|Set Explorer|Graph Lab|Theory & Proofs|Secure Message Journey/)).toBeNull()
  })

  it('is fixed to the bottom of the viewport and respects the safe area', () => {
    mockBackend()
    renderApp('/')

    const wrapper = screen.getByRole('navigation', { name: 'Primary' }).parentElement as HTMLElement
    expect(wrapper.className).toContain('fixed')
    expect(wrapper.className).toContain('bottom-0')
    expect(wrapper.className).toContain('env(safe-area-inset-bottom)')
  })

  it('marks the current destination with aria-current and moves it on navigation', async () => {
    mockBackend()
    const { user } = renderApp('/')
    const nav = screen.getByRole('navigation', { name: 'Primary' })

    expect(within(nav).getByRole('link', { name: 'Overview' }).getAttribute('aria-current')).toBe('page')
    await user.click(within(nav).getByRole('link', { name: 'Analysis Lab' }))

    expect(within(nav).getByRole('link', { name: 'Analysis Lab' }).getAttribute('aria-current')).toBe('page')
    expect(within(nav).getByRole('link', { name: 'Overview' }).getAttribute('aria-current')).toBeNull()
    expect(screen.getByRole('heading', { level: 1, name: 'Analysis Lab' })).toBeTruthy()
  })

  it('is reachable by keyboard in order', async () => {
    mockBackend()
    const { user } = renderApp('/settings')
    const nav = screen.getByRole('navigation', { name: 'Primary' })
    const first = within(nav).getByRole('link', { name: 'Overview' })

    first.focus()
    expect(document.activeElement).toBe(first)
    await user.tab()
    expect(document.activeElement).toBe(within(nav).getByRole('link', { name: 'Cipher Workspace' }))
  })
})

describe('routes', () => {
  it.each([
    ['/', 'Every cipher leaves a fingerprint.'],
    ['/workspace', 'Cipher Workspace'],
    ['/analysis', 'Analysis Lab'],
    ['/settings', 'Settings'],
  ])('%s renders its page', (path, heading) => {
    mockBackend()
    renderApp(path)
    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeTruthy()
  })

  it.each([
    ['/cipher-lab', 'Cipher Workspace'],
    ['/frequency-analyzer', 'Analysis Lab'],
  ])('the old address %s redirects to %s', (path, heading) => {
    mockBackend()
    renderApp(path)
    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeTruthy()
  })

  it.each(['/labs/logic', '/theory', '/secure-message-journey', '/nope'])(
    'the retired or unknown address %s shows a not-found page with a way back',
    (path) => {
      mockBackend()
      renderApp(path)
      expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeTruthy()
      expect(screen.getByRole('link', { name: 'Open Cipher Workspace' }).getAttribute('href')).toBe('/workspace')
    },
  )

  it('sets the document title for each page', async () => {
    mockBackend()
    const { user } = renderApp('/')
    expect(document.title).toBe('DISCRETA')
    await user.click(screen.getByRole('link', { name: 'Cipher Workspace' }))
    expect(document.title).toBe('Cipher Workspace · DISCRETA')
  })
})

describe('overview', () => {
  it('states the purpose and offers both entry points', () => {
    mockBackend()
    renderApp('/')

    expect(screen.getByRole('link', { name: /Open Cipher Workspace/ }).getAttribute('href')).toBe('/workspace')
    expect(screen.getByRole('link', { name: 'Open Analysis Lab' }).getAttribute('href')).toBe('/analysis')
    expect(screen.getAllByText(/classical cipher/i).length).toBeGreaterThan(0)
  })

  it('lists the supported methods and says the ciphers are not secure', () => {
    mockBackend()
    renderApp('/')

    for (const name of ['Caesar cipher', 'Affine cipher', 'Frequency analysis', 'Chi-squared key search']) {
      expect(screen.getByRole('heading', { name })).toBeTruthy()
    }
    expect(screen.getByText(/do not protect real data/)).toBeTruthy()
  })

  it('shows the Caesar alphabet for k = 3 computed from the formula', () => {
    mockBackend()
    renderApp('/')

    const figure = screen.getByRole('img', { name: /shifted by 3/ })
    expect(figure.getAttribute('aria-label')).toContain('E becomes H')
  })

  it('has no fake statistics or activity', () => {
    mockBackend()
    renderApp('/')

    expect(screen.queryByText(/recent|users|messages encrypted|operations today/i)).toBeNull()
  })
})
