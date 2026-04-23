import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { lazy, Suspense, useEffect, useRef } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AppProvider, useAppState, useAppDispatch } from './contexts/AppContext'
import { PurchaseProvider } from './contexts/PurchaseContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { Capacitor } from '@capacitor/core'
import { supabase } from './lib/supabase'

// Critical routes — loaded eagerly so first paint is immediate
import AppShell from './components/layout/AppShell'
import TrackerPage from './features/tracker/TrackerPage'
import LoginPage from './pages/LoginPage'
import { RouteFallbackSkeleton } from './components/ui/Skeleton'

// Heavy/secondary routes — lazy-loaded to shrink the initial bundle
const AdminApp = lazy(() => import('./admin/AdminApp'))
const HistoryPage = lazy(() => import('./features/history/HistoryPage'))
const ProfilePage = lazy(() => import('./features/profile/ProfilePage'))
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'))
const WelcomePage = lazy(() => import('./pages/WelcomePage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const InsightsPage = lazy(() => import('./features/insights/InsightsPage'))
const MilestonesPage = lazy(() => import('./features/milestones/MilestonesPage'))
const LeapsPage = lazy(() => import('./features/milestones/LeapsPage'))
const VaccinesPage = lazy(() => import('./features/vaccines/VaccinesPage'))
const MedicationsPage = lazy(() => import('./features/medications/MedicationsPage'))
const YayaPlusPage = lazy(() => import('./features/referral/YayaPlusPage'))
const InviteLandingPage = lazy(() => import('./pages/InviteLandingPage'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))
const SharedReportPage = lazy(() => import('./pages/SharedReportPage'))
const DeletedAccountPage = lazy(() => import('./pages/DeletedAccountPage'))
const WaitlistPage = lazy(() => import('./pages/WaitlistPage'))

function RouteFallback() {
  // Skeleton genérico — aparece enquanto o chunk JS da rota baixa.
  // Evita o flash de spinner girando antes do skeleton específico da página
  // montar. Ver components/ui/Skeleton.tsx.
  return <RouteFallbackSkeleton />
}

const isNative = Capacitor.isNativePlatform()

function AuthenticatedRoutes() {
  const { user, loading: authLoading } = useAuth()
  const { needsOnboarding, needsWelcome, loading: dataLoading, baby } = useAppState()
  const dispatch = useAppDispatch()

  // Auth loading or data loading — show logo splash
  if (authLoading || (!user ? false : dataLoading)) {
    // Skeleton full-screen em vez do logo pulsando (que aparece como
    // "bolinha roxa carregando"). Segue o padrão da Fase 1: forma de
    // conteúdo, não indicador abstrato.
    return <RouteFallbackSkeleton />
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

  // Welcome screen: aparece na 1ª vez que um parent abre CADA bebê. Flag é por
  // par (user, baby) em baby_members.welcome_shown_at.
  if (needsWelcome && baby) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <WelcomePage
          baby={baby}
          onComplete={async () => {
            // UPDATE direto batia no RLS (policy de UPDATE só permite mexer
            // em OUTROS users). Função SECURITY DEFINER mark_welcome_shown
            // mexe cirurgicamente só no welcome_shown_at da própria linha.
            // Ver migration 20260418f_mark_welcome_shown.sql.
            const { error } = await supabase.rpc('mark_welcome_shown', {
              p_baby_id: baby.id,
            })
            if (error) {
              console.error('Failed to mark welcome shown', error)
              return
            }
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
          <Route path="saltos" element={<LeapsPage />} />
          <Route path="vacinas" element={<VaccinesPage />} />
          <Route path="medicamentos" element={<MedicationsPage />} />
          <Route path="yaya-plus" element={<YayaPlusPage />} />
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

  // Conta excluída — DEVE ser o primeiro check, antes de qualquer lógica de auth.
  // Quando useDeleteAccount limpa o localStorage, o Supabase dispara
  // onAuthStateChange → user=null → AppContext SET_NO_BABY → needsOnboarding=true.
  // Sem este check, AuthenticatedRoutes renderizaria OnboardingPage e o modal
  // de adeus nunca apareceria. A flag em sessionStorage sobrevive ao reload
  // e ao onAuthStateChange, garantindo que DeletedAccountPage seja renderizado
  // independentemente do estado de autenticação.
  if (sessionStorage.getItem('yaya_account_deleted')) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <DeletedAccountPage />
      </Suspense>
    )
  }

  // Deep link de indicação: /i/:code → salva código + mostra landing do
  // convite (direciona pro app nativo). Experiência canônica é no app;
  // continuar pelo navegador fica como fallback discreto.
  if (location.pathname.startsWith('/i/')) {
    const code = location.pathname.split('/i/')[1]?.trim().toUpperCase()
    if (code && /^[A-Z0-9]{5,12}$/.test(code)) {
      try { localStorage.setItem('yaya_pending_ref', code) } catch { /* ignore */ }
    }
    return (
      <Suspense fallback={<RouteFallback />}>
        <InviteLandingPage />
      </Suspense>
    )
  }

  // Também captura ?ref=CODE (fluxo de compartilhamento web alternativo)
  const refParam = new URLSearchParams(location.search).get('ref')
  if (refParam && /^[A-Z0-9]{5,12}$/.test(refParam.toUpperCase())) {
    try { localStorage.setItem('yaya_pending_ref', refParam.toUpperCase()) } catch { /* ignore */ }
  }

  // Public routes (no auth required)
  if (location.pathname === '/privacy') {
    return (
      <Suspense fallback={<RouteFallback />}>
        <PrivacyPage />
      </Suspense>
    )
  }

  if (location.pathname === '/waitlist') {
    return (
      <Suspense fallback={<RouteFallback />}>
        <WaitlistPage />
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

  // Tela pública pós-exclusão de conta — capturada ANTES de AuthenticatedRoutes
  // para evitar o race condition needsOnboarding=true → OnboardingPage aparecer.
  if (location.pathname === '/conta-excluida') {
    return (
      <Suspense fallback={<RouteFallback />}>
        <DeletedAccountPage />
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

  // Not logged in on web → show waitlist/landing page
  return (
    <Suspense fallback={<RouteFallback />}>
      <WaitlistPage />
    </Suspense>
  )
}

function PushNavigationHandler() {
  const navigate = useNavigate()
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
  // - a public route we should preserve (/privacy, /r/*, /paineladmin/*, /i/*)
  //
  // Prevents Capacitor's WebView from reopening the app on the last visited
  // page (e.g. /settings, /profile, /marcos). Lê `window.location.pathname`
  // ao invés da `location.pathname` do React Router pra não depender do
  // estado do router — evita race condition quando o Capacitor restaura a
  // URL mais rápido do que o React Router atualiza.
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

    const path = window.location.pathname
    const isPublic =
      path === '/privacy' ||
      path.startsWith('/r/') ||
      path.startsWith('/paineladmin') ||
      path.startsWith('/i/')
    if (!isPublic) {
      // Sempre força '/' — é idempotente se já estiver lá, e garante que
      // rotas privadas (/settings, /profile, /marcos, /vacinas, /insights,
      // etc.) caiam pra Home no cold start.
      navigate('/', { replace: true })
    }
  }, [authLoading, dataLoading, user, navigate])

  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <ThemeProvider>
            <PurchaseProvider>
              <PushNavigationHandler />
              <AppRoutes />
            </PurchaseProvider>
          </ThemeProvider>
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
