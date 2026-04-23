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
