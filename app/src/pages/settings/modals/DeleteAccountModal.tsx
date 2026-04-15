import { useState } from 'react'
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
 * UX defensiva:
 *  - Aviso vermelho enorme listando o que será apagado
 *  - Input exige digitar "EXCLUIR" em maiúsculas pra habilitar o botão
 *  - Botão de ação só fica enabled quando o texto bate
 *  - Loading state durante a chamada da edge function
 *  - Em sucesso, `useDeleteAccount` já chama `signOut()` e o AuthProvider
 *    deslogando automaticamente leva pro LoginPage
 */
export default function DeleteAccountModal({ isOpen, onClose, onToast }: Props) {
  const [confirmText, setConfirmText] = useState('')
  const { deleteAccount, loading } = useDeleteAccount()

  useSheetBackClose(isOpen, () => {
    if (!loading) {
      setConfirmText('')
      onClose()
    }
  })

  if (!isOpen) return null

  const canDelete = confirmText === 'EXCLUIR' && !loading

  async function handleConfirm() {
    if (!canDelete) return
    hapticMedium()
    const res = await deleteAccount()
    if (!res.ok) {
      onToast(res.error ?? 'Erro ao excluir conta')
      return
    }
    // Sucesso: signOut já rolou dentro do hook, o listener do AuthProvider
    // vai tirar a gente dessa tela. Não precisa fazer nada aqui.
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
        className="bg-surface-container w-full max-w-sm rounded-t-md sm:rounded-md p-5 sm:mx-4"
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
