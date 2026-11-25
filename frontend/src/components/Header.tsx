import { Menu } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { titleForPath } from '../layouts/navigation'
import { BackendStatusBadge } from './BackendStatusBadge'

interface HeaderProps {
  sidebarOpen: boolean
  onToggleSidebar: () => void
}

export function Header({ sidebarOpen, onToggleSidebar }: HeaderProps) {
  const { pathname } = useLocation()

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 px-4 backdrop-blur-sm sm:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Open navigation"
          aria-expanded={sidebarOpen}
          aria-controls="primary-sidebar"
          className="aurora-chip -ml-1 inline-flex size-10 items-center justify-center rounded-full text-fg-muted transition-colors duration-150 hover:text-accent-strong lg:hidden"
        >
          <Menu aria-hidden="true" className="size-5" />
        </button>
        <p className="truncate text-base font-bold tracking-wide text-fg sm:text-lg [font-family:var(--font-display)]">
          {titleForPath(pathname)}
        </p>
      </div>
      <BackendStatusBadge />
    </header>
  )
}
