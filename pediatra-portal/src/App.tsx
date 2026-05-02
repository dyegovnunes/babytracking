import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Sidebar from './components/Sidebar'
import CadastroPage from './pages/CadastroPage'
import LoginPage from './pages/LoginPage'
import AguardandoPage from './pages/AguardandoPage'
import DashboardPage from './pages/DashboardPage'
import ContaPage from './pages/ContaPage'
import PacientePage from './pages/PacientePage'

// needs-profile: autenticado via OAuth mas sem registro de CRM ainda
type AuthState = 'loading' | 'unauthenticated' | 'needs-profile' | 'pending' | 'approved'

function useAuth() {
  const [state, setState] = useState<AuthState>('loading')

  useEffect(() => {
    // Timeout de segurança: nunca ficar preso em 'loading' mais de 6s
    const timeout = setTimeout(() => setState(s => s === 'loading' ? 'unauthenticated' : s), 6000)
    checkSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) checkSession()
      else setState('unauthenticated')
    })
    return () => { clearTimeout(timeout); subscription.unsubscribe() }
  }, [])

  async function checkSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setState('unauthenticated'); return }

      const { data: ped } = await supabase
        .from('pediatricians')
        .select('approved_at')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (!ped) { setState('needs-profile'); return }
      setState(ped.approved_at ? 'approved' : 'pending')
    } catch {
      setState('unauthenticated')
    }
  }

  return state
}

function PortalLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/conta"            element={<ContaPage />} />
          <Route path="/paciente/:babyId" element={<PacientePage />} />
          <Route path="*"                 element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  )
}

function AppRoutes() {
  const auth = useAuth()
  const location = useLocation()

  if (auth === 'loading') {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(183,159,255,0.14) 0%, transparent 70%)',
        backgroundColor: '#f8f7ff',
      }}>
        <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 28, fontWeight: 800, color: '#7056e0', letterSpacing: '-0.03em' }}>
          ya<span style={{ color: '#b79fff' }}>ya</span>
        </span>
      </div>
    )
  }

  const publicPaths = ['/login', '/cadastro']
  const isPublic = publicPaths.includes(location.pathname)

  if (auth === 'unauthenticated') {
    if (isPublic) {
      return (
        <Routes>
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/cadastro" element={<CadastroPage />} />
          <Route path="*"         element={<Navigate to="/login" replace />} />
        </Routes>
      )
    }
    return <Navigate to="/login" replace />
  }

  // Autenticado via OAuth mas sem CRM ainda → completa o cadastro
  if (auth === 'needs-profile') {
    return (
      <Routes>
        <Route path="/cadastro" element={<CadastroPage />} />
        <Route path="*"         element={<Navigate to="/cadastro" replace />} />
      </Routes>
    )
  }

  if (auth === 'pending') {
    return (
      <Routes>
        <Route path="/aguardando" element={<AguardandoPage />} />
        <Route path="*"           element={<Navigate to="/aguardando" replace />} />
      </Routes>
    )
  }

  return <PortalLayout />
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
