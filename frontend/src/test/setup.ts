import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

// Vitest runs without globals, so Testing Library cannot register its own cleanup.
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

// jsdom has no canvas or WebGL. Report "no context" quietly so the sculptures use their SVG
// fallbacks, and provide the observers that React Flow and the sculptures expect.
beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null)
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
    },
  )
  window.scrollTo = () => {}
})
