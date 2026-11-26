import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { ANALYSIS_PATH, legacyRedirects, SETTINGS_PATH, WORKSPACE_PATH } from './layouts/navigation'
import { AnalysisPage } from './pages/AnalysisPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { OverviewPage } from './pages/OverviewPage'
import { SettingsPage } from './pages/SettingsPage'
import { WorkspacePage } from './pages/WorkspacePage'
import { ThemeProvider } from './theme/ThemeProvider'

export default function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path={WORKSPACE_PATH.slice(1)} element={<WorkspacePage />} />
          <Route path={ANALYSIS_PATH.slice(1)} element={<AnalysisPage />} />
          <Route path={SETTINGS_PATH.slice(1)} element={<SettingsPage />} />
          {Object.entries(legacyRedirects).map(([from, to]) => (
            <Route key={from} path={from.slice(1)} element={<Navigate to={to} replace />} />
          ))}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </ThemeProvider>
  )
}
