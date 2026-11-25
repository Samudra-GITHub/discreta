import { BookOpenText, ChartColumn, KeyRound, LayoutDashboard, Route } from 'lucide-react'
import { labModules, labPath } from '../modules'
import type { NavGroup, NavItem } from '../types'

export const CIPHER_LAB_PATH = '/cipher-lab'
export const FREQUENCY_ANALYZER_PATH = '/frequency-analyzer'
export const SECURE_JOURNEY_PATH = '/secure-message-journey'
export const THEORY_PATH = '/theory'

export const cryptoNavItems: NavItem[] = [
  { label: 'Cipher Laboratory', to: CIPHER_LAB_PATH, icon: KeyRound },
  { label: 'Frequency Analyzer', to: FREQUENCY_ANALYZER_PATH, icon: ChartColumn },
  { label: 'Secure Message Journey', to: SECURE_JOURNEY_PATH, icon: Route },
]

export const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', to: '/', icon: LayoutDashboard, end: true }],
  },
  {
    label: 'Mathematical laboratories',
    items: labModules.map((m) => ({ label: m.title, to: labPath(m.id), icon: m.icon })),
  },
  {
    label: 'Cryptography',
    items: cryptoNavItems,
  },
  {
    label: 'Reference',
    items: [{ label: 'Theory & Proofs', to: THEORY_PATH, icon: BookOpenText }],
  },
]

const allItems: NavItem[] = navGroups.flatMap((g) => g.items)

/** Page title for the header, derived from the current pathname. */
export function titleForPath(pathname: string): string {
  return allItems.find((i) => i.to === pathname)?.label ?? 'DISCRETA'
}
