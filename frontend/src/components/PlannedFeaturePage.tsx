import { Info } from 'lucide-react'
import type { ReactNode } from 'react'
import type { PlannedCapability } from '../types'
import { PageHero } from './PageHero'
import { Tile } from './Tile'

interface PlannedFeaturePageProps {
  eyebrow: string
  title: string
  description: ReactNode
  /** The focal illustration or sculpture of the page. */
  illustration?: ReactNode
  /** What this page is planned to offer. Shown as a plan, never as a working feature. */
  planned: PlannedCapability[]
  /** Short factual notes on the underlying mathematics. */
  foundations?: string[]
  /** Extra content, such as a static diagram. */
  children?: ReactNode
}

/** Shared layout for pages whose functionality has not been built yet. */
export function PlannedFeaturePage({
  eyebrow,
  title,
  description,
  illustration,
  planned,
  foundations,
  children,
}: PlannedFeaturePageProps) {
  return (
    <div className="space-y-6">
      <PageHero eyebrow={eyebrow} title={title} description={description} status="planned" illustration={illustration} />

      <p role="note" className="flex max-w-3xl items-start gap-2.5 px-1 text-sm font-semibold text-fg-muted">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent" />
        This tool is not implemented yet. The page describes what is planned; nothing here computes anything.
      </p>

      {children}

      <Tile title="Planned capabilities" rise={2}>
        <ul className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {planned.map((item) => (
            <li key={item.title} className="border-l-2 border-iris-violet/40 pl-4">
              <h3 className="text-base font-bold text-fg">{item.title}</h3>
              <p className="mt-0.5 text-sm leading-relaxed font-medium text-fg-muted">{item.detail}</p>
            </li>
          ))}
        </ul>
      </Tile>

      {foundations && foundations.length > 0 && (
        <section aria-labelledby="foundations-title" className="max-w-3xl px-1">
          <h2 id="foundations-title" className="text-[13px] font-bold tracking-wide text-fg-muted uppercase">
            Mathematical background
          </h2>
          <ul className="mt-3 space-y-2 border-l border-line-strong pl-4 text-sm leading-relaxed font-medium text-fg-muted">
            {foundations.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
