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

/** Implementation status shown honestly in the UI. */
export type FeatureStatus = 'planned' | 'in-progress' | 'available'

export type ModuleId = 'logic' | 'sets' | 'combinatorics' | 'graphs' | 'algebra'

/** One of the five mathematical laboratories. */
export interface LabModule {
  id: ModuleId
  title: string
  /** Longer name shown above the page title, for example "Logic Studio". */
  studioName?: string
  /** Typographic mark used as the module's emblem, e.g. `p ∧ q`. */
  symbol: string
  tagline: string
  description: string
  /** Topics the module is planned to cover. */
  topics: string[]
  /** Short factual notes on the mathematics involved. */
  foundations: string[]
  icon: LucideIcon
  status: FeatureStatus
}

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  end?: boolean
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

/** A capability a placeholder page promises, described without pretending it exists. */
export interface PlannedCapability {
  title: string
  detail: string
}

export * from './cipher'
