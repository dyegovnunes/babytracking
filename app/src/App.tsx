import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AppProvider, useAppState, useAppDispatch } from './contexts/AppContext'
import { PurchaseProvider } from './contexts/PurchaseContext'
import { Capacitor } from '@capacitor/core'
import { supabase } from './lib/supabase'

const AdminApp = lazy(() => import('./admin/AdminApp'))
import AppShell from './components/layout/AppShell'
import TrackerPage from './pages/TrackerPage'
import HistoryPage from './pages/HistoryPage'
import ProfilePage from './pages/ProfilePage'
import LoginPage from './pages/LoginPage'
import LandingPage from './pages/LandingPage'
import OnboardingPage from './pages/OnboardingPage'
import WelcomePage from './pages/WelcomePage'
import SettingsPage from './pages/SettingsPage'
import InsightsPage from './pages/InsightsPage'
import MilestonesPage from './pages/MilestonesPage'
import PrivacyPage from './pages/PrivacyPage'
import SharedReportPage from './pages/SharedReportPage'

const isNative = Capacitor.isNativePlatform()

function AuthenticatedRoutes() {
  const { user, loading: authLoading } = useAuth()
  const { needsOnboarding, needsWelcome, loading: dataLoading, baby } = useAppState()
  const dispatch = useAppDispatch()

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

  // Welcome screen for parents who haven't seen it yet
  if (needsWelcome && baby) {
    return (
      <WelcomePage
        baby={baby}
        onComplete={async () => {
          await supabase
            .from('profiles')
            .update({ welcome_shown_at: new Date().toISOString() })
            .eq('id', user!.id)
          dispatch({ type: 'SET_WELCOME_SHOWN' })
        }}
      />
    )
  }

  // Main app
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<TrackerPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="insights" element={<InsightsPage />} />
        <Route path="marcos" element={<MilestonesPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
        {/* Catch-all: any unknown route falls back to the tracker instead of rendering blank */}
        <Route path="*" element={<TrackerPage />} />
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

function PushNavigationHandler() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const { loading: dataLoading } = useAppState()

  useEffect(() => {
    function onPushNavigate(e: Event) {
      const { route } = (e as CustomEvent).detail
      // If app still loading or no user, defer navigation. Store pending route.
      if (authLoading || dataLoading || !user) {
        ;(window as any).__pendingPushRoute = route
        return
      }
      navigate(route, { replace: true })
    }
    window.addEventListener('push-navigate', onPushNavigate)
    return () => window.removeEventListener('push-navigate', onPushNavigate)
  }, [navigate, authLoading, dataLoading, user])

  // When app finishes loading, replay any pending push navigation
  useEffect(() => {
    if (!authLoading && !dataLoading && user) {
      const pending = (window as any).__pendingPushRoute
      if (pending) {
        ;(window as any).__pendingPushRoute = null
        navigate(pending, { replace: true })
      }
    }
  }, [authLoading, dataLoading, user, navigate])

  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <PurchaseProvider>
            <PushNavigationHandler />
            <AppRoutes />
          </PurchaseProvider>
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
