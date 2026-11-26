import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { THEME_STORAGE_KEY, ThemeContext, type ResolvedTheme, type ThemeChoice } from './themeContext'

const isChoice = (value: unknown): value is ThemeChoice =>
  value === 'system' || value === 'light' || value === 'dark'

function readStoredChoice(): ThemeChoice {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isChoice(stored) ? stored : 'system'
  } catch {
    return 'system' // storage can be blocked (private mode, sandboxed frames)
  }
}

const darkQuery = () => (typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : null)

function resolve(choice: ThemeChoice): ResolvedTheme {
  if (choice !== 'system') return choice
  return darkQuery()?.matches ? 'dark' : 'light'
}

/** Holds the theme choice, mirrors it onto <html data-theme>, and follows the OS in `system`. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>(readStoredChoice)
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolve(readStoredChoice()))

  useEffect(() => {
    setResolved(resolve(choice))
    const query = darkQuery()
    if (choice !== 'system' || !query) return
    const onChange = () => setResolved(resolve('system'))
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [choice])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolved)
  }, [resolved])

  const setChoice = useCallback((next: ThemeChoice) => {
    setChoiceState(next)
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      /* the choice still applies for this visit */
    }
  }, [])

  const value = useMemo(() => ({ choice, resolved, setChoice }), [choice, resolved, setChoice])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
