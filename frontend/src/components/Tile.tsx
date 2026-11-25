import type { LucideIcon } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'

interface TileProps {
  title?: string
  icon?: LucideIcon
  /** Right-aligned content in the header, such as a small action. */
  action?: ReactNode
  /** Position in the staged entrance animation (0 = first). */
  rise?: number
  className?: string
  /** Accessible name when there is no visible title. */
  label?: string
  /** Draw no surface: the section sits directly on a parent tile or on the page. */
  flat?: boolean
  children: ReactNode
}

/** A soft, near-white panel: the basic surface of the Aurora theme. */
export function Tile({ title, icon: Icon, action, rise = 0, className = '', label, flat = false, children }: TileProps) {
  return (
    <section
      aria-label={title ? undefined : label}
      className={`aurora-rise ${flat ? '' : 'aurora-tile p-4 sm:p-5'} ${className}`}
      style={{ '--rise-i': rise } as CSSProperties}
    >
      {(title || action) && (
        <header className="mb-3 flex items-center justify-between gap-3">
          {title && (
            <h2 className="flex items-center gap-2 text-[13px] font-bold tracking-wide text-fg-muted uppercase">
              {Icon && <Icon aria-hidden="true" className="size-4 text-accent" />}
              {title}
            </h2>
          )}
          {action}
        </header>
      )}
      {children}
    </section>
  )
}
