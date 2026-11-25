import { Info } from 'lucide-react'
import type { ReactNode } from 'react'
import type { PlannedCapability } from '../types'
import { PageHeader } from './PageHeader'

interface PlannedFeaturePageProps {
  eyebrow: string
  title: string
  description: ReactNode
  /** What this page is planned to offer. Shown as a plan, never as a working feature. */
  planned: PlannedCapability[]
  /** Short factual notes on the underlying mathematics. */
  foundations?: string[]
  /** Extra content, e.g. a static diagram. */
  children?: ReactNode
}

/** Shared layout for pages whose functionality has not been built yet. */
export function PlannedFeaturePage({
  eyebrow,
  title,
  description,
  planned,
  foundations,
  children,
}: PlannedFeaturePageProps) {
  return (
    <div className="space-y-10">
      <PageHeader eyebrow={eyebrow} title={title} description={description} status="planned" />

      <div
        role="note"
        className="flex max-w-3xl gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-sm text-fg-muted"
      >
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
        <p>
          This tool is not implemented yet. The page below describes what is planned; nothing here
          computes anything.
        </p>
      </div>

      {children}

      <section aria-labelledby="planned-title">
        <h2 id="planned-title" className="text-sm font-medium text-fg">
          Planned capabilities
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {planned.map((item) => (
            <li key={item.title} className="rounded-xl border border-line bg-surface p-4">
              <h3 className="text-sm font-medium text-fg">{item.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-fg-muted">{item.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      {foundations && foundations.length > 0 && (
        <section aria-labelledby="foundations-title" className="max-w-3xl">
          <h2 id="foundations-title" className="text-sm font-medium text-fg">
            Mathematical background
          </h2>
          <ul className="mt-3 space-y-2 border-l border-line pl-4 text-sm leading-relaxed text-fg-muted">
            {foundations.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
