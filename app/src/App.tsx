import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AppProvider, useAppState } from './contexts/AppContext'
import AppShell from './components/layout/AppShell'
import TrackerPage from './pages/TrackerPage'
import HistoryPage from './pages/HistoryPage'
import ProfilePage from './pages/ProfilePage'
import LoginPage from './pages/LoginPage'
import OnboardingPage from './pages/OnboardingPage'
import SettingsPage from './pages/SettingsPage'
import InsightsPage from './pages/InsightsPage'

function AppRoutes() {
  const { user, loading: authLoading } = useAuth()
  const { needsOnboarding, loading: dataLoading } = useAppState()

  // Auth loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-primary-container/20 flex items-center justify-center animate-pulse-soft">
          <span className="material-symbols-outlined text-primary text-3xl">
            child_care
          </span>
        </div>
      </div>
    )
  }

  // Not logged in
  if (!user) {
    return <LoginPage />
  }

  // Data loading
  if (dataLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <span className="material-symbols-outlined text-primary text-4xl animate-spin">
          progress_activity
        </span>
      </div>
    )
  }

  // Needs onboarding (no baby created yet)
  if (needsOnboarding) {
    return <OnboardingPage onComplete={() => window.location.reload()} />
  }

  // Main app
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<TrackerPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="insights" element={<InsightsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </AuthProvider>
  )
}
