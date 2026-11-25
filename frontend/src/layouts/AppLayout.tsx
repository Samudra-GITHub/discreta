import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { BackendHealthProvider } from '../components/BackendHealthProvider'
import { Header } from '../components/Header'
import { Sidebar } from '../components/Sidebar'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { pathname } = useLocation()

  // Close the mobile drawer on navigation, and scroll back to the top.
  useEffect(() => {
    setSidebarOpen(false)
    window.scrollTo(0, 0)
  }, [pathname])

  // Escape closes the mobile drawer.
  useEffect(() => {
    if (!sidebarOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [sidebarOpen])

  return (
    <BackendHealthProvider>
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-accent px-3 py-2 text-sm font-medium text-canvas focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />

      {sidebarOpen && (
        <div
          aria-hidden="true"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
        />
      )}

      <div className="lg:pl-66">
        <Header sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen((o) => !o)} />
        <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-14">
          <Outlet />
        </main>
      </div>
    </BackendHealthProvider>
  )
}
