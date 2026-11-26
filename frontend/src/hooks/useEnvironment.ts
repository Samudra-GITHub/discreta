import { useEffect, useState } from 'react'

const reducedQuery = () =>
  typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null

/** True when the user asks the system for less motion. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => reducedQuery()?.matches ?? false)

  useEffect(() => {
    const query = reducedQuery()
    if (!query) return
    const onChange = () => setReduced(query.matches)
    query.addEventListener('change', onChange)
    onChange()
    return () => query.removeEventListener('change', onChange)
  }, [])

  return reduced
}

/** True while the tab is visible. Decorative animation pauses when it is not. */
export function usePageVisible(): boolean {
  const [visible, setVisible] = useState(() => document.visibilityState !== 'hidden')

  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [])

  return visible
}
