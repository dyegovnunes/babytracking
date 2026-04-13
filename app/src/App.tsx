import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AppProvider, useAppState } from './contexts/AppContext'
import { PurchaseProvider } from './contexts/PurchaseContext'
import { Capacitor } from '@capacitor/core'

const AdminApp = lazy(() => import('./admin/AdminApp'))
import AppShell from './components/layout/AppShell'
import TrackerPage from './pages/TrackerPage'
import HistoryPage from './pages/HistoryPage'
import ProfilePage from './pages/ProfilePage'
import LoginPage from './pages/LoginPage'
import LandingPage from './pages/LandingPage'
import OnboardingPage from './pages/OnboardingPage'
import SettingsPage from './pages/SettingsPage'
import InsightsPage from './pages/InsightsPage'
import PrivacyPage from './pages/PrivacyPage'
import SharedReportPage from './pages/SharedReportPage'

const isNative = Capacitor.isNativePlatform()

function AuthenticatedRoutes() {
  const { user, loading: authLoading } = useAuth()
  const { needsOnboarding, loading: dataLoading } = useAppState()

  // Auth loading or data loading — show logo splash
  if (authLoading || (!user ? false : dataLoading)) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-4">
        <img
          src="./landing/symbol-light.png"
          alt="Yaya"
          className="w-40 h-40 animate-pulse-soft"
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

  if (location.pathname.startsWith('/r/')) {
    return <SharedReportPage />
  }

  // Admin panel — completely independent auth
  if (location.pathname.startsWith('/paineladmin')) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-gray-950" />}>
        <Routes>
          <Route path="/paineladmin/*" element={<AdminApp />} />
        </Routes>
      </Suspense>
    )
  }

  // On web: show landing page at root, login at /login
  // On native app: go straight to auth flow
  if (!isNative && location.pathname === '/' ) {
    return <PublicOrAuth />
  }

  if (location.pathname === '/login') {
    return <AuthenticatedRoutes />
  }

  return <AuthenticatedRoutes />
}

function PublicOrAuth() {
  const { user, loading } = useAuth()

  // If already logged in, show the app
  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-4">
        <img src="./landing/symbol-light.png" alt="Yaya" className="w-40 h-40 animate-pulse-soft" />
      </div>
    )
  }

  if (user) {
    return <AuthenticatedRoutes />
  }

  // Not logged in on web → show landing page
  return <LandingPage />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <PurchaseProvider>
            <AppRoutes />
          </PurchaseProvider>
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
