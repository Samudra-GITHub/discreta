import type { LucideIcon } from 'lucide-react'

/** Shape returned by `GET /api/v1/health`. */
export interface HealthResponse {
  status: string
  service: string
  version: string
  message: string
  timestamp: string
}

/** `checking` only occurs before the first result arrives. */
export type BackendStatus = 'checking' | 'online' | 'offline'

/** A destination of the floating taskbar. */
export interface NavItem {
  label: string
  /** Shown instead of `label` on narrow screens. */
  shortLabel: string
  to: string
  icon: LucideIcon
  end?: boolean
}

export * from './analysis'
export * from './cipher'
