import { FlaskConical, House, KeyRound, Settings } from 'lucide-react'
import type { NavItem } from '../types'

export const OVERVIEW_PATH = '/'
export const WORKSPACE_PATH = '/workspace'
export const ANALYSIS_PATH = '/analysis'
export const SETTINGS_PATH = '/settings'

/**
 * The four destinations of the floating taskbar, and the only navigation in the app.
 * `shortLabel` is shown on narrow screens, where the full label does not fit.
 */
export const navItems: NavItem[] = [
  { label: 'Overview', shortLabel: 'Overview', to: OVERVIEW_PATH, icon: House, end: true },
  { label: 'Cipher Workspace', shortLabel: 'Workspace', to: WORKSPACE_PATH, icon: KeyRound },
  { label: 'Analysis Lab', shortLabel: 'Analysis', to: ANALYSIS_PATH, icon: FlaskConical },
  { label: 'Settings', shortLabel: 'Settings', to: SETTINGS_PATH, icon: Settings },
]

/** Routes from earlier versions, kept so old links land somewhere useful. */
export const legacyRedirects: Record<string, string> = {
  '/cipher-lab': WORKSPACE_PATH,
  '/frequency-analyzer': ANALYSIS_PATH,
}

/** Document title for a path, e.g. "Cipher Workspace · DISCRETA". */
export function titleForPath(pathname: string): string {
  const item = navItems.find((i) => i.to === pathname)
  return item ? (item.to === OVERVIEW_PATH ? 'DISCRETA' : `${item.label} · DISCRETA`) : 'Not found · DISCRETA'
}
