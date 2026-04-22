import { useEffect, useState } from 'react'

/**
 * Tela exibida imediatamente após a exclusão de conta.
 *
 * Rota pública `/conta-excluida` — não requer autenticação (o usuário
 * acabou de ser deletado). O router captura esse path ANTES de
 * AuthenticatedRoutes, evitando o race condition que causava a tela de
 * onboarding aparecer após a exclusão.
 *
 * Após 10 segundos (ou clique no botão), redireciona pra /login via
 * window.location.href para garantir reload completo do WebView e
 * limpeza total do estado React/AppContext.
 */
export default function DeletedAccountPage() {
  const [seconds, setSeconds] = useState(10)

  useEffect(() => {
    if (seconds <= 0) {
      window.location.href = '/login'
      return
    }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [seconds])

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
        onClick={() => { window.location.href = '/login' }}
        className="px-6 py-3 rounded-md bg-primary text-on-primary font-label font-semibold text-sm"
      >
        Ir para o login agora
      </button>
    </div>
  )
}
