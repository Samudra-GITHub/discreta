import type { ReactNode } from 'react'
import type { FeatureStatus } from '../types'
import { StatusBadge } from './StatusBadge'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description: ReactNode
  status?: FeatureStatus
}

export function PageHeader({ eyebrow, title, description, status }: PageHeaderProps) {
  return (
    <header className="max-w-3xl">
      {eyebrow && (
        <p className="text-xs font-medium tracking-[0.14em] text-accent uppercase">{eyebrow}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">{title}</h1>
        {status && <StatusBadge status={status} />}
      </div>
      <p className="mt-4 text-base leading-relaxed text-fg-muted">{description}</p>
    </header>
  )
}
