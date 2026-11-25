import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import {
  CIPHER_LAB_PATH,
  FREQUENCY_ANALYZER_PATH,
  SECURE_JOURNEY_PATH,
  THEORY_PATH,
} from './layouts/navigation'
import { CipherLabPage } from './pages/CipherLabPage'
import { DashboardPage } from './pages/DashboardPage'
import { FrequencyAnalyzerPage } from './pages/FrequencyAnalyzerPage'
import { ModulePage } from './pages/ModulePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { TheoryPage } from './pages/TheoryPage'

// React Flow is only needed on this page, so it is split into its own chunk.
const SecureJourneyPage = lazy(() => import('./pages/SecureJourneyPage'))

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="labs/:moduleId" element={<ModulePage />} />
        <Route path={CIPHER_LAB_PATH.slice(1)} element={<CipherLabPage />} />
        <Route path={FREQUENCY_ANALYZER_PATH.slice(1)} element={<FrequencyAnalyzerPage />} />
        <Route
          path={SECURE_JOURNEY_PATH.slice(1)}
          element={
            <Suspense fallback={<p className="aurora-tile p-6 text-sm font-bold text-fg-muted">Loading…</p>}>
              <SecureJourneyPage />
            </Suspense>
          }
        />
        <Route path={THEORY_PATH.slice(1)} element={<TheoryPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
