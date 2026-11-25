import { ArrowRight } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { labPath } from '../modules'
import type { LabModule } from '../types'
import { StatusBadge } from './StatusBadge'

export function ModuleCard({ module, index = 0 }: { module: LabModule; index?: number }) {
  const Icon = module.icon
  return (
    <Link
      to={labPath(module.id)}
      style={{ '--rise-i': index } as CSSProperties}
      className="group aurora-tile aurora-rise flex flex-col p-5 transition-[transform,box-shadow] duration-300 ease-out-quart hover:-translate-y-1 hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.9),0_26px_44px_-22px_rgb(66_56_150/0.55)]"
    >
      <div className="flex items-start justify-between">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-linear-to-br from-iris-blue via-iris-violet to-iris-pink text-white shadow-[0_10px_18px_-10px_rgb(91_67_214/0.75)]">
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <StatusBadge status={module.status} />
      </div>
      <p className="mt-5 font-serif text-xl text-accent italic">{module.symbol}</p>
      <h3 className="mt-0.5 text-xl font-bold tracking-wide text-fg [font-family:var(--font-display)]">
        {module.studioName ?? module.title}
      </h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed font-medium text-fg-muted">{module.tagline}</p>
      <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-fg-subtle transition-colors duration-200 group-hover:text-accent-strong">
        Open the overview
        <ArrowRight aria-hidden="true" className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}
