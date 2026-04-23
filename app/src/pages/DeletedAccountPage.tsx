import { useEffect, useState, useCallback } from 'react'

/**
 * Tela de adeus exibida após a exclusão de conta.
 *
 * Renderizada por AppRoutes quando sessionStorage contém 'yaya_account_deleted'.
 * Essa flag é setada em useDeleteAccount ANTES de limpar o localStorage,
 * garantindo que AppRoutes mostre esta tela mesmo após onAuthStateChange
 * disparar user=null (o que de outra forma causaria OnboardingPage).
 *
 * Fluxo:
 *   1. useDeleteAccount: seta flag + limpa localStorage → chama reload()
 *   2. AppRoutes vê a flag → renderiza esta página (antes de auth check)
 *   3. Countdown de 10s → handleLeave: remove flag + reload()
 *   4. AppRoutes não vê flag → auth check → sem sessão → LoginPage ✓
 */
export default function DeletedAccountPage() {
  const [seconds, setSeconds] = useState(10)

  const handleLeave = useCallback(() => {
    try {
      sessionStorage.removeItem('yaya_account_deleted')
    } catch { /* ignore */ }
    window.location.reload()
  }, [])

  useEffect(() => {
    if (seconds <= 0) {
      handleLeave()
      return
    }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [seconds, handleLeave])

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-6 px-8 text-center">
      <span className="material-symbols-outlined text-on-surface/25" style={{ fontSize: 72 }}>
        heart_broken
      </span>

      <div className="space-y-2">
        <h1 className="font-headline text-2xl font-bold text-on-surface">
          Sua conta foi excluída
        </h1>
        <p className="font-body text-sm text-on-surface-variant leading-relaxed max-w-xs mx-auto">
          Lamentamos ver você partir. Todos os seus dados foram
          removidos com segurança dos nossos servidores.
        </p>
      </div>

      <p className="text-xs text-on-surface/40">
        Redirecionando em {seconds}s…
      </p>

      <button
        onClick={handleLeave}
        className="px-6 py-3 rounded-md bg-primary text-on-primary font-label font-semibold text-sm"
      >
        Ir para o login agora
      </button>
    </div>
  )
}
