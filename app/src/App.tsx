import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AppProvider, useAppState } from './contexts/AppContext'
import { PurchaseProvider } from './contexts/PurchaseContext'
import AppShell from './components/layout/AppShell'
import TrackerPage from './pages/TrackerPage'
import HistoryPage from './pages/HistoryPage'
import ProfilePage from './pages/ProfilePage'
import LoginPage from './pages/LoginPage'
import OnboardingPage from './pages/OnboardingPage'
import SettingsPage from './pages/SettingsPage'
import InsightsPage from './pages/InsightsPage'
import PrivacyPage from './pages/PrivacyPage'

function AuthenticatedRoutes() {
  const { user, loading: authLoading } = useAuth()
  const { needsOnboarding, loading: dataLoading } = useAppState()

  // Auth loading or data loading — show logo splash
  if (authLoading || (!user ? false : dataLoading)) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-4">
        <img
          src="./logo-symbol.png"
          alt="Yaya"
          className="w-20 h-20 animate-pulse-soft"
        />
      </div>
    )
  }

  // Not logged in
  if (!user) {
    return <LoginPage />
  }

  // Needs onboarding (no baby created yet)
  if (needsOnboarding) {
    return <OnboardingPage onComplete={() => window.location.reload()} />
  }

  // Main app
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<TrackerPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="insights" element={<InsightsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}

function AppRoutes() {
  const location = useLocation()

  // Public routes (no auth required)
  if (location.pathname === '/privacy') {
    return <PrivacyPage />
  }

  return <AuthenticatedRoutes />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PurchaseProvider>
          <AppProvider>
            <AppRoutes />
          </AppProvider>
        </PurchaseProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
