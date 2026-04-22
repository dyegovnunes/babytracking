import { useState, useEffect } from 'react'
import { useSheetBackClose } from '../../../hooks/useSheetBackClose'
import { useDeleteAccount } from '../../../hooks/useDeleteAccount'
import { hapticMedium } from '../../../lib/haptics'

interface Props {
  isOpen: boolean
  onClose: () => void
  onToast: (msg: string) => void
}

/**
 * Modal de exclusão de conta.
 *
 * Obrigatório pela Apple (Guideline 5.1.1(v)): todo app que permite
 * criação de conta precisa oferecer exclusão dentro do próprio app,
 * sem redirecionar pra um site.
 *
 * Fluxo:
 *  1. Usuário digita "EXCLUIR" e confirma
 *  2. Edge function deleta a conta + signOut local + localStorage.clear()
 *  3. Modal troca pra tela de adeus com countdown de 10s (React state,
 *     sem navegação — evita o problema do Capacitor Android interceptar
 *     window.location.href como client-side nav e preservar estado stale)
 *  4. Countdown ou botão dispara window.location.reload(), que força
 *     reload verdadeiro. Com localStorage limpo, Supabase não acha sessão
 *     → user = null → AuthenticatedRoutes renderiza LoginPage corretamente.
 */
export default function DeleteAccountModal({ isOpen, onClose, onToast }: Props) {
  const [confirmText, setConfirmText] = useState('')
  const [deleted, setDeleted] = useState(false)
  const [seconds, setSeconds] = useState(10)
  const { deleteAccount, loading } = useDeleteAccount()

  // Impede fechar com back gesture após deletar (já não há conta)
  useSheetBackClose(isOpen && !deleted, () => {
    if (!loading) {
      setConfirmText('')
      onClose()
    }
  })

  // Countdown pós-exclusão
  useEffect(() => {
    if (!deleted) return
    if (seconds <= 0) { window.location.reload(); return }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [deleted, seconds])

  if (!isOpen) return null

  // ── Tela de adeus ──────────────────────────────────────────────────────
  if (deleted) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-6 px-8 text-center bg-surface">
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
          onClick={() => window.location.reload()}
          className="px-6 py-3 rounded-md bg-primary text-on-primary font-label font-semibold text-sm"
        >
          Ir para o login agora
        </button>
      </div>
    )
  }

  // ── Tela de confirmação ────────────────────────────────────────────────
  const canDelete = confirmText === 'EXCLUIR' && !loading

  async function handleConfirm() {
    if (!canDelete) return
    hapticMedium()
    const res = await deleteAccount()
    if (!res.ok) {
      onToast(res.error ?? 'Erro ao excluir conta')
      return
    }
    // Conta deletada — mostra tela de adeus sem navegar.
    // A navegação real acontece via window.location.reload() no countdown.
    setDeleted(true)
  }

  function handleClose() {
    if (loading) return
    setConfirmText('')
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="bg-surface-container w-full max-w-sm rounded-t-md sm:rounded-md pt-5 px-5 pb-sheet-sm sm:mx-4 sm:pb-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-error text-2xl">
            warning
          </span>
          <h3 className="font-headline text-lg font-bold text-on-surface">
            Excluir conta
          </h3>
        </div>

        <div className="bg-error/10 rounded-md p-3 mb-4">
          <p className="font-body text-sm text-error mb-2 font-semibold">
            Esta ação é irreversível.
          </p>
          <p className="font-body text-xs text-on-surface-variant leading-relaxed">
            Todos os dados do(s) seu(s) bebê(s), incluindo registros de
            alimentação, sono, fraldas, crescimento, marcos, vacinas,
            medicamentos e fotos serão permanentemente apagados. Não há como
            recuperar depois.
          </p>
        </div>

        <label className="font-label text-[11px] text-on-surface-variant font-semibold uppercase tracking-wider block mb-1.5">
          Digite <span className="text-error font-bold">EXCLUIR</span> para confirmar
        </label>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="EXCLUIR"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          disabled={loading}
          className="w-full bg-surface-container-low rounded-md px-4 py-3 text-on-surface font-body text-base outline-none focus:ring-2 focus:ring-error/40 mb-5"
        />

        <div className="flex gap-3">
          <button
            onClick={handleClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-md bg-surface-variant text-on-surface-variant font-label font-semibold text-sm disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canDelete}
            className="flex-1 py-2.5 rounded-md bg-gradient-to-br from-error-dim to-error text-on-error font-label font-semibold text-sm disabled:opacity-40"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin text-lg align-middle">
                progress_activity
              </span>
            ) : (
              'Excluir'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
