import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { labPath } from '../modules'
import type { LabModule } from '../types'
import { StatusBadge } from './StatusBadge'

export function ModuleCard({ module }: { module: LabModule }) {
  const Icon = module.icon
  return (
    <Link
      to={labPath(module.id)}
      className="group flex flex-col rounded-xl border border-line bg-surface p-5 transition-colors duration-200 hover:border-line-strong hover:bg-raised"
    >
      <div className="flex items-start justify-between">
        <span className="flex size-9 items-center justify-center rounded-lg border border-line bg-canvas text-fg-muted transition-colors duration-200 group-hover:text-accent">
          <Icon aria-hidden="true" className="size-4.5" />
        </span>
        <StatusBadge status={module.status} />
      </div>
      <p className="mt-5 font-serif text-lg text-accent italic">{module.symbol}</p>
      <h3 className="mt-1 text-base font-medium text-fg">{module.title}</h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-fg-muted">{module.tagline}</p>
      <span className="mt-5 inline-flex items-center gap-1.5 text-xs text-fg-subtle transition-colors duration-200 group-hover:text-fg">
        View module overview
        <ArrowRight
          aria-hidden="true"
          className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </span>
    </Link>
  )
}
