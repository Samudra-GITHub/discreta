import type { ReactNode } from 'react'
import type { FeatureStatus } from '../types'
import { StatusBadge } from './StatusBadge'

interface PageHeroProps {
  eyebrow?: string
  title: string
  description: ReactNode
  status?: FeatureStatus
  /** The focal illustration, shown beside the text on wide screens and below it on narrow ones. */
  illustration?: ReactNode
  /** Extra content under the description, such as a call-to-action. */
  children?: ReactNode
}

/**
 * The opening panel of a page: a large soft tile with the title on one side and one focal
 * illustration on the other, over a faint coloured glow. Every page opens with one, which is
 * what ties the pages together.
 */
export function PageHero({ eyebrow, title, description, status, illustration, children }: PageHeroProps) {
  return (
    <section className="aurora-tile aurora-rise relative overflow-hidden px-6 py-7 sm:px-10 sm:py-9">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-28 -right-20 size-[28rem]"
        style={{ background: 'radial-gradient(closest-side, rgb(123 92 214 / 0.2), transparent)' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-36 left-1/4 size-[28rem]"
        style={{ background: 'radial-gradient(closest-side, rgb(232 121 166 / 0.16), transparent)' }}
      />

      <div className={`relative grid items-center gap-6 ${illustration ? 'lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-10' : ''}`}>
        <div className="min-w-0">
          {eyebrow && <p className="text-xs font-bold tracking-[0.16em] text-accent uppercase">{eyebrow}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
            <h1 className="text-4xl font-bold tracking-wide text-fg uppercase [font-family:var(--font-display)] sm:text-5xl">
              {title}
            </h1>
            {status && <StatusBadge status={status} />}
          </div>
          <div className="mt-3 max-w-xl text-base leading-relaxed font-medium text-fg-muted">{description}</div>
          {children && <div className="mt-5">{children}</div>}
        </div>
        {illustration && <div className="mx-auto w-full max-w-md lg:max-w-none">{illustration}</div>}
      </div>
    </section>
  )
}
