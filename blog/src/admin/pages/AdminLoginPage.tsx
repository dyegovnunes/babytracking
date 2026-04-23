import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { isUserAdmin } from '../lib/adminAuth'

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleGoogleLogin() {
    setError('')
    setLoading(true)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'https://blog.yayababy.app/admin' },
    })
    if (oauthError) {
      setError('Erro ao entrar com Google.')
      setLoading(false)
    }
    // Em caso de sucesso o browser é redirecionado — não precisa fazer nada aqui
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError || !data.user) {
      setError('E-mail ou senha incorretos.')
      setLoading(false)
      return
    }

    const ok = await isUserAdmin(data.user.id)
    if (!ok) {
      await supabase.auth.signOut()
      setError('Acesso restrito a administradores.')
      setLoading(false)
      return
    }

    navigate('/posts', { replace: true })
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#0d0a27' }}
    >
      <div
        className="w-full max-w-sm rounded-xl border p-8"
        style={{
          background: 'rgba(183,159,255,0.04)',
          borderColor: 'rgba(183,159,255,0.15)',
        }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <h1
            className="text-2xl font-bold tracking-tight mb-1"
            style={{ fontFamily: 'Manrope, sans-serif', color: '#e7e2ff' }}
          >
            Ya<span style={{ color: '#b79fff' }}>ya</span>
          </h1>
          <p className="text-sm" style={{ color: 'rgba(231,226,255,0.4)' }}>Blog Admin</p>
        </div>

        {/* Botão Google */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-2.5 rounded-md text-sm font-medium transition-all disabled:opacity-60 cursor-pointer border mb-4"
          style={{
            background: 'rgba(255,255,255,0.05)',
            borderColor: 'rgba(183,159,255,0.2)',
            color: '#e7e2ff',
          }}
        >
          {/* Ícone Google */}
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
          </svg>
          Continuar com Google
        </button>

        {/* Divisor */}
        <div className="flex items-center gap-3 mb-1">
          <div className="flex-1 h-px" style={{ background: 'rgba(183,159,255,0.12)' }} />
          <span className="text-xs" style={{ color: 'rgba(231,226,255,0.25)' }}>ou</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(183,159,255,0.12)' }} />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-medium mb-1.5"
              style={{ color: 'rgba(231,226,255,0.6)' }}
            >
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-3 py-2.5 rounded-md text-sm outline-none transition-all"
              style={{
                background: 'rgba(183,159,255,0.07)',
                border: '1px solid rgba(183,159,255,0.2)',
                color: '#e7e2ff',
              }}
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium mb-1.5"
              style={{ color: 'rgba(231,226,255,0.6)' }}
            >
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-3 py-2.5 rounded-md text-sm outline-none"
              style={{
                background: 'rgba(183,159,255,0.07)',
                border: '1px solid rgba(183,159,255,0.2)',
                color: '#e7e2ff',
              }}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-center" style={{ color: '#ff96b9' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-md text-sm font-semibold transition-opacity disabled:opacity-60 cursor-pointer border-none"
            style={{ background: '#b79fff', color: '#0d0a27' }}
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
