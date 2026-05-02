import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { supabase } from './lib/supabase'
import type { Pediatrician } from './types'
import Sidebar from './components/Sidebar'
import CadastroPage from './pages/CadastroPage'
import LoginPage from './pages/LoginPage'
import AguardandoPage from './pages/AguardandoPage'
import DashboardPage from './pages/DashboardPage'

type AuthState = 'loading' | 'unauthenticated' | 'pending' | 'approved'

function useAuth() {
  const [state, setState] = useState<AuthState>('loading')

  useEffect(() => {
    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkSession()
    })
    return () => subscription.unsubscribe()
  }, [])

  async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setState('unauthenticated'); return }

    const { data: ped } = await supabase
      .from('pediatricians')
      .select('approved_at')
      .single<Pick<Pediatrician, 'approved_at'>>()

    if (!ped) { setState('unauthenticated'); return }
    setState(ped.approved_at ? 'approved' : 'pending')
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
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
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
      <div className="min-h-screen bg-[#fafafe] flex items-center justify-center">
        <span className="text-[28px] font-[800] text-[#7056e0] tracking-[-0.03em] lowercase animate-pulse">yaya</span>
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

  if (auth === 'pending') {
    return (
      <Routes>
        <Route path="/aguardando" element={<AguardandoPage />} />
        <Route path="*"           element={<Navigate to="/aguardando" replace />} />
      </Routes>
    )
  }

  // approved
  return <PortalLayout />
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
