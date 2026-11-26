import { NavLink } from 'react-router-dom'
import { navItems } from '../layouts/navigation'

/**
 * The floating glass taskbar: the only navigation in the app.
 *
 * Fixed at the bottom centre, clear of the bottom safe area on phones. The active
 * destination is marked by an accent bar and a stronger label, never by colour alone
 * (`aria-current="page"` carries it for assistive technology). On narrow screens the icon
 * sits above a short label so all four destinations fit in 375 px.
 */
export function Taskbar() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <nav aria-label="Primary" className="glass pointer-events-auto max-w-full rounded-xl p-1">
        <ul className="m-0 flex list-none gap-0.5 p-0">
          {navItems.map(({ to, label, shortLabel, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                aria-label={label}
                className={({ isActive }) =>
                  [
                    'group relative flex min-w-[4.25rem] flex-col items-center justify-center gap-1 rounded-lg px-2.5 py-2 text-[0.6875rem] leading-none font-medium no-underline',
                    'transition-colors duration-150 sm:min-w-0 sm:flex-row sm:gap-2 sm:px-4 sm:py-0 sm:h-11 sm:text-sm',
                    isActive
                      ? 'bg-[var(--glass-active)] text-fg'
                      : 'text-fg-muted hover:bg-[var(--glass-hover)] hover:text-fg',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      aria-hidden="true"
                      strokeWidth={isActive ? 2.1 : 1.7}
                      className={`size-[1.125rem] shrink-0 transition-[color,transform] duration-150 motion-safe:group-hover:-translate-y-px sm:size-[1.0625rem] ${
                        isActive ? 'text-accent' : ''
                      }`}
                    />
                    <span className="sm:hidden">{shortLabel}</span>
                    <span className="hidden sm:inline">{label}</span>
                    <span
                      aria-hidden="true"
                      className={`absolute bottom-[3px] left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-accent transition-opacity duration-150 ${
                        isActive ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
