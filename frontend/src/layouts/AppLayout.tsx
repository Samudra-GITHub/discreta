import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Atmosphere } from '../components/atmosphere/Atmosphere'
import { BackendHealthProvider } from '../components/BackendHealthProvider'
import { Taskbar } from '../components/Taskbar'
import { SessionProvider } from '../session/SessionProvider'
import { titleForPath } from './navigation'

/**
 * The application shell: page content and the floating taskbar. There is no sidebar and no
 * top bar. The session provider sits here, above the routes, so the workspace and the
 * analysis lab keep their state while the user moves between them.
 */
export function AppLayout() {
  const { pathname } = useLocation()

  // Each page sets the document title and starts at the top.
  useEffect(() => {
    document.title = titleForPath(pathname)
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <BackendHealthProvider>
      <SessionProvider>
        <a
          href="#main"
          className="btn btn-primary sr-only z-50 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>

        <Atmosphere />

        {/* Bottom padding keeps the last line of every page clear of the fixed taskbar. */}
        <main
          id="main"
          tabIndex={-1}
          className="relative z-10 mx-auto w-full max-w-[72rem] px-4 pt-6 pb-[calc(7.5rem+env(safe-area-inset-bottom))] outline-none sm:px-8 sm:pt-10"
        >
          {/* Keyed by route so each page eases in when you navigate. */}
          <div key={pathname} className="page-enter">
            <Outlet />
          </div>
        </main>

        <Taskbar />
      </SessionProvider>
    </BackendHealthProvider>
  )
}
