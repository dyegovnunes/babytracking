import { useState } from 'react'
import { useAuth, signOut } from '../../../contexts/AuthContext'
import DeleteAccountModal from '../modals/DeleteAccountModal'

interface Props {
  onToast: (msg: string) => void
}

export default function AccountSection({ onToast }: Props) {
  const { user } = useAuth()
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <section className="bg-surface-container rounded-md p-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="material-symbols-outlined text-on-surface-variant text-lg">
            account_circle
          </span>
          <p className="text-on-surface font-body text-sm truncate flex-1">
            {user?.email}
          </p>
        </div>
        <button
          onClick={signOut}
          className="w-full py-2.5 rounded-md bg-error/10 text-error font-label font-semibold text-sm"
        >
          Sair da conta
        </button>
        {/* "Excluir minha conta" — obrigatório pela Apple (5.1.1 v). Fica
            discreto e texto-only pra não parecer um botão primário, mas está
            ali visível. Abre DeleteAccountModal que exige digitar "EXCLUIR". */}
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="w-full mt-2 py-2 text-error/80 font-label text-[11px] font-semibold active:text-error"
        >
          Excluir minha conta
        </button>
      </section>

      <DeleteAccountModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onToast={onToast}
      />
    </>
  )
}
