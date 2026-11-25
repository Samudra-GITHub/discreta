import { X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { navGroups } from '../layouts/navigation'

interface SidebarProps {
  open: boolean
  onNavigate: () => void
}

export function Sidebar({ open, onNavigate }: SidebarProps) {
  return (
    <aside
      id="primary-sidebar"
      className={`fixed inset-y-0 left-0 z-40 flex w-66 flex-col border-r border-line bg-surface transition-[transform,visibility] duration-250 ease-out-quart lg:visible lg:translate-x-0 ${
        open ? 'visible translate-x-0' : 'invisible -translate-x-full'
      }`}
    >
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-line px-5">
        <span
          aria-hidden="true"
          className="flex size-8 items-center justify-center rounded-lg border border-line-strong bg-canvas font-serif text-lg text-accent italic"
        >
          d
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-[0.12em] text-fg">DISCRETA</p>
          <p className="text-[11px] text-fg-subtle">Mathematics &amp; Cryptography Lab</p>
        </div>
        <button
          type="button"
          onClick={onNavigate}
          aria-label="Close navigation"
          className="ml-auto -mr-2 inline-flex size-9 items-center justify-center rounded-lg text-fg-muted transition-colors duration-150 hover:bg-raised hover:text-fg lg:hidden"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      </div>

      <nav aria-label="Primary" className="flex-1 overflow-y-auto px-3 py-5">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-6 last:mb-0">
            <p className="px-2 pb-2 text-[11px] font-medium tracking-[0.14em] text-fg-subtle uppercase">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors duration-150 ${
                          isActive
                            ? 'bg-accent-wash text-accent-strong'
                            : 'text-fg-muted hover:bg-raised hover:text-fg'
                        }`
                      }
                    >
                      <Icon aria-hidden="true" className="size-4 shrink-0" />
                      {item.label}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <p className="border-t border-line px-5 py-3 text-[11px] text-fg-subtle">
        BugSquad · v0.1.0 foundation
      </p>
    </aside>
  )
}
