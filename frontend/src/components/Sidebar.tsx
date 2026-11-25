import { X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { navGroups } from '../layouts/navigation'

interface SidebarProps {
  open: boolean
  onNavigate: () => void
}

/** Text that appears when the rail widens (on hover or keyboard focus) and on the mobile drawer. */
const REVEAL =
  'overflow-hidden whitespace-nowrap transition-opacity duration-200 max-lg:opacity-100 lg:opacity-0 lg:group-focus-within/rail:opacity-100 lg:group-hover/rail:opacity-100'

/**
 * The navigation rail. On desktop it is a slim floating column of icons, as in the reference;
 * hovering it or tabbing into it widens it so every label is readable, which keeps all five
 * modules and the crypto tools easy to discover. On small screens it becomes a drawer with
 * labels always visible.
 */
export function Sidebar({ open, onNavigate }: SidebarProps) {
  return (
    <aside
      id="primary-sidebar"
      className={`group/rail aurora-tile fixed top-3 bottom-3 left-3 z-40 flex flex-col overflow-hidden transition-[width,transform,visibility,box-shadow] duration-300 ease-out-quart max-lg:w-72 lg:visible lg:w-[4.75rem] lg:translate-x-0 lg:focus-within:w-60 lg:focus-within:shadow-[0_24px_48px_-20px_rgb(66_56_150/0.55)] lg:hover:w-60 lg:hover:shadow-[0_24px_48px_-20px_rgb(66_56_150/0.55)] ${
        open ? 'visible translate-x-0' : 'max-lg:invisible max-lg:-translate-x-[110%]'
      }`}
    >
      <div className="flex h-16 shrink-0 items-center gap-3 px-3.5">
        <span
          aria-hidden="true"
          className="relative flex size-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-iris-blue via-iris-violet to-iris-pink shadow-[0_8px_16px_-8px_rgb(91_67_214/0.7)]"
        >
          <span className="flex size-6 items-center justify-center rounded-full bg-raised font-serif text-sm text-accent-strong italic">
            d
          </span>
        </span>
        <div className={`min-w-0 leading-tight ${REVEAL}`}>
          <p className="text-base font-bold tracking-[0.14em] text-fg [font-family:var(--font-display)]">DISCRETA</p>
          <p className="text-[11px] font-semibold text-fg-subtle">Mathematics &amp; Cryptography Lab</p>
        </div>
        <button
          type="button"
          onClick={onNavigate}
          aria-label="Close navigation"
          className="ml-auto inline-flex size-9 shrink-0 items-center justify-center rounded-full text-fg-muted transition-colors duration-150 hover:bg-raised hover:text-fg lg:hidden"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      </div>

      <nav aria-label="Primary" className="flex-1 overflow-x-hidden overflow-y-auto px-2.5 pb-3">
        {navGroups.map((group, index) => (
          <div key={group.label} className={index === 0 ? 'mt-1' : 'mt-3'}>
            {index > 0 && <hr className="mx-2 mb-2 border-line" aria-hidden="true" />}
            <p className={`px-2 pb-1 text-[10px] font-bold tracking-[0.16em] text-fg-subtle uppercase ${REVEAL}`}>
              {group.label}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={onNavigate}
                      title={item.label}
                      className={({ isActive }) =>
                        `flex h-11 items-center gap-3 rounded-2xl px-[0.7rem] text-sm font-bold transition-[background-color,color,box-shadow] duration-200 ${
                          isActive ? 'aurora-chip text-accent-strong' : 'text-fg-muted hover:bg-raised/70 hover:text-fg'
                        }`
                      }
                    >
                      <Icon aria-hidden="true" className="size-5 shrink-0" />
                      <span className={REVEAL}>{item.label}</span>
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <p className={`px-5 pb-4 text-[11px] font-semibold text-fg-subtle ${REVEAL}`}>BugSquad · v0.3.0</p>
    </aside>
  )
}
