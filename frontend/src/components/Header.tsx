import { Menu, X } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { titleForPath } from '../layouts/navigation'
import { BackendStatusBadge } from './BackendStatusBadge'

interface HeaderProps {
  sidebarOpen: boolean
  onToggleSidebar: () => void
}

export function Header({ sidebarOpen, onToggleSidebar }: HeaderProps) {
  const { pathname } = useLocation()
  const Toggle = sidebarOpen ? X : Menu

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-line bg-canvas/85 px-4 backdrop-blur sm:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={sidebarOpen}
          aria-controls="primary-sidebar"
          className="-ml-2 inline-flex size-9 items-center justify-center rounded-lg text-fg-muted transition-colors duration-150 hover:bg-raised hover:text-fg lg:hidden"
        >
          <Toggle aria-hidden="true" className="size-5" />
        </button>
        <p className="truncate text-sm font-medium text-fg">{titleForPath(pathname)}</p>
      </div>
      <BackendStatusBadge />
    </header>
  )
}
