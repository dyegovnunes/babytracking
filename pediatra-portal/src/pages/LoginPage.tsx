import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) {
        setError('E-mail ou senha incorretos.')
        return
      }

      const { data: ped } = await supabase
        .from('pediatricians')
        .select('approved_at')
        .single()

      if (!ped) {
        setError('Conta não encontrada. Verifique seus dados.')
        await supabase.auth.signOut()
        return
      }

      navigate(ped.approved_at ? '/dashboard' : '/aguardando')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: '#0d0a27' }}>
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <span
            className="text-[30px] font-[800] tracking-[-0.03em] lowercase"
            style={{ fontFamily: 'Manrope, sans-serif', color: '#e7e2ff' }}
          >
            ya<span style={{ color: '#b79fff' }}>ya</span>
          </span>
          <p className="text-[11px] font-[600] tracking-[0.14em] uppercase mt-1" style={{ color: 'rgba(231,226,255,0.4)' }}>
            portal pediatra
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-xl border p-8"
          style={{
            background: 'rgba(183,159,255,0.04)',
            borderColor: 'rgba(183,159,255,0.15)',
          }}
        >
          <h1 className="text-[20px] font-[800] tracking-[-0.02em] mb-1" style={{ color: '#e7e2ff' }}>
            Bem-vinda de volta
          </h1>
          <p className="text-[13px] mb-7" style={{ color: 'rgba(231,226,255,0.45)' }}>
            Entre com seu e-mail e senha.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-[600]" style={{ color: 'rgba(231,226,255,0.6)' }}>
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="seu@email.com"
                className="w-full rounded-md px-3 py-2.5 text-sm outline-none transition-all"
                style={{
                  background: 'rgba(183,159,255,0.07)',
                  border: '1px solid rgba(183,159,255,0.2)',
                  color: '#e7e2ff',
                }}
              />
            </div>

            {/* Senha */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-[600]" style={{ color: 'rgba(231,226,255,0.6)' }}>
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full rounded-md px-3 py-2.5 pr-10 text-sm outline-none transition-all"
                  style={{
                    background: 'rgba(183,159,255,0.07)',
                    border: '1px solid rgba(183,159,255,0.2)',
                    color: '#e7e2ff',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                  style={{ color: 'rgba(231,226,255,0.35)' }}
                  tabIndex={-1}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {error && (
              <p className="text-[13px] text-center" style={{ color: '#ff96b9' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-md text-sm font-[700] transition-opacity disabled:opacity-60 cursor-pointer mt-1 flex items-center justify-center gap-2"
              style={{ background: '#b79fff', color: '#0d0a27' }}
            >
              {loading
                ? <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                : 'Entrar'
              }
            </button>
          </form>
        </div>

        <p className="text-center text-[13px] mt-5" style={{ color: 'rgba(231,226,255,0.4)' }}>
          Ainda não tem conta?{' '}
          <Link to="/cadastro" className="font-[600]" style={{ color: '#b79fff' }}>
            Cadastre-se
          </Link>
        </p>

      </div>
    </div>
  )
}
