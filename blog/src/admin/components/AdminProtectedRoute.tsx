import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { isUserAdmin } from '../lib/adminAuth'

type Status = 'loading' | 'authorized' | 'not-admin' | 'not-logged'

export function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setStatus('not-logged'); return }
      const ok = await isUserAdmin(session.user.id)
      setStatus(ok ? 'authorized' : 'not-admin')
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_, session) => {
        if (!session) { setStatus('not-logged'); return }
        const ok = await isUserAdmin(session.user.id)
        setStatus(ok ? 'authorized' : 'not-admin')
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0d0a27' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#b79fff]/30 border-t-[#b79fff] rounded-full animate-spin" />
          <span className="text-[#e7e2ff]/50 text-sm font-sans">Verificando acesso…</span>
        </div>
      </div>
    )
  }

  if (status === 'not-logged') return <Navigate to="/login" replace />

  if (status === 'not-admin') {
    // Redireciona para o blog público (cross-origin)
    if (typeof window !== 'undefined') window.location.href = 'https://blog.yayababy.app'
    return null
  }

  return <>{children}</>
}
