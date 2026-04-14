import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { lazy, Suspense, useEffect, useRef } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AppProvider, useAppState, useAppDispatch } from './contexts/AppContext'
import { PurchaseProvider } from './contexts/PurchaseContext'
import { Capacitor } from '@capacitor/core'
import { supabase } from './lib/supabase'

// Critical routes — loaded eagerly so first paint is immediate
import AppShell from './components/layout/AppShell'
import TrackerPage from './pages/TrackerPage'
import LoginPage from './pages/LoginPage'

// Heavy/secondary routes — lazy-loaded to shrink the initial bundle
const AdminApp = lazy(() => import('./admin/AdminApp'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const LandingPage = lazy(() => import('./pages/LandingPage'))
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'))
const WelcomePage = lazy(() => import('./pages/WelcomePage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const InsightsPage = lazy(() => import('./pages/InsightsPage'))
const MilestonesPage = lazy(() => import('./features/milestones/MilestonesPage'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))
const SharedReportPage = lazy(() => import('./pages/SharedReportPage'))

function RouteFallback() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <span className="material-symbols-outlined text-primary text-4xl animate-spin">
        progress_activity
      </span>
    </div>
  )
}

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
    return (
      <Suspense fallback={<RouteFallback />}>
        <OnboardingPage onComplete={() => window.location.reload()} />
      </Suspense>
    )
  }

  // Welcome screen for parents who haven't seen it yet
  if (needsWelcome && baby) {
    return (
      <Suspense fallback={<RouteFallback />}>
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
      </Suspense>
    )
  }

  // Main app
  return (
    <Suspense fallback={<RouteFallback />}>
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
    </Suspense>
  )
}

function AppRoutes() {
  const location = useLocation()

  // Public routes (no auth required)
  if (location.pathname === '/privacy') {
    return (
      <Suspense fallback={<RouteFallback />}>
        <PrivacyPage />
      </Suspense>
    )
  }

  if (location.pathname.startsWith('/r/')) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <SharedReportPage />
      </Suspense>
    )
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
  return (
    <Suspense fallback={<RouteFallback />}>
      <LandingPage />
    </Suspense>
  )
}

function PushNavigationHandler() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading: authLoading } = useAuth()
  const { loading: dataLoading } = useAppState()
  const didColdStartNav = useRef(false)

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

  // Cold-start navigation: once the app has finished loading the user and
  // data, force the initial route to home ("/") unless there is either:
  // - a pending push notification route, or
  // - a public route we should preserve (/privacy, /r/*, /paineladmin/*)
  // This prevents Capacitor's WebView from reopening the app on the last
  // visited page (e.g. /settings).
  useEffect(() => {
    if (didColdStartNav.current) return
    if (authLoading || dataLoading || !user) return
    didColdStartNav.current = true

    const pending = (window as any).__pendingPushRoute
    if (pending) {
      ;(window as any).__pendingPushRoute = null
      navigate(pending, { replace: true })
      return
    }

    const path = location.pathname
    const isPublic =
      path === '/privacy' ||
      path.startsWith('/r/') ||
      path.startsWith('/paineladmin')
    if (!isPublic && path !== '/') {
      navigate('/', { replace: true })
    }
  }, [authLoading, dataLoading, user, navigate, location.pathname])

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
