import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { isUserAdmin } from '../lib/adminAuth'

type Status = 'loading' | 'authorized' | 'not-admin' | 'not-logged'

export function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    let resolved = false

    // Timeout de segurança: se em 8s nada resolver, redireciona pro login
    const timeout = setTimeout(() => {
      if (!resolved) setStatus('not-logged')
    }, 8000)

    async function checkSession(session: { user: { id: string } } | null) {
      if (!session) {
        resolved = true
        clearTimeout(timeout)
        setStatus('not-logged')
        return
      }
      try {
        const ok = await isUserAdmin(session.user.id)
        resolved = true
        clearTimeout(timeout)
        setStatus(ok ? 'authorized' : 'not-admin')
      } catch {
        resolved = true
        clearTimeout(timeout)
        setStatus('not-logged')
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!resolved) checkSession(session)
    }).catch(() => {
      resolved = true
      clearTimeout(timeout)
      setStatus('not-logged')
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!resolved) checkSession(session)
    })

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
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
