import { useState } from 'react'
import { signInWithEmail } from '../contexts/AuthContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setError(null)

    const result = await signInWithEmail(email.trim())
    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-full bg-primary-container/20 flex items-center justify-center mx-auto mb-5 shadow-[0_0_40px_rgba(167,139,250,0.15)]">
            <span className="material-symbols-outlined text-primary text-4xl">
              child_care
            </span>
          </div>
          <h1 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight">
            Baby<span className="text-primary">Tracking</span>
          </h1>
          <p className="font-label text-sm text-on-surface-variant mt-2">
            Acompanhe as atividades do seu bebê
          </p>
        </div>

        {sent ? (
          /* Email sent confirmation */
          <div className="text-center page-enter">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-primary text-3xl">
                mark_email_read
              </span>
            </div>
            <h2 className="font-headline text-lg font-bold text-on-surface mb-2">
              Verifique seu email
            </h2>
            <p className="font-label text-sm text-on-surface-variant mb-6">
              Enviamos um link de acesso para <strong className="text-on-surface">{email}</strong>
            </p>
            <button
              onClick={() => setSent(false)}
              className="font-label text-sm text-primary font-medium"
            >
              Usar outro email
            </button>
          </div>
        ) : (
          /* Login form */
          <form onSubmit={handleSubmit} className="page-enter">
            <label className="font-label text-[11px] text-primary font-semibold uppercase tracking-wider block mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              autoComplete="email"
              className="w-full bg-surface-container-low rounded-lg px-4 py-3.5 text-on-surface font-body text-base outline-none focus:ring-2 focus:ring-primary/40 mb-4"
            />

            {error && (
              <p className="font-label text-sm text-error mb-4">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full py-3.5 rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary font-label font-bold text-base disabled:opacity-50 transition-opacity"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin text-xl align-middle">
                  progress_activity
                </span>
              ) : (
                'Entrar com Magic Link'
              )}
            </button>

            <p className="text-center font-label text-xs text-on-surface-variant mt-4">
              Enviaremos um link de acesso para seu email. Sem senha necessária.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
