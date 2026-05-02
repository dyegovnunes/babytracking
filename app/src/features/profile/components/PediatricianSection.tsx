import { useState } from 'react'
import type { Baby } from '../../../types'
import type { BabyRole } from '../../../lib/roles'
import { usePediatricianLink } from '../usePediatricianLink'
import LinkPediatricianSheet from './LinkPediatricianSheet'
import { hapticLight } from '../../../lib/haptics'

interface Props {
  baby: Baby
  myRole: BabyRole
}

export default function PediatricianSection({ baby, myRole }: Props) {
  const { linked, loading, unlink, reload } = usePediatricianLink(baby.id)
  const [linkSheetOpen, setLinkSheetOpen] = useState(false)
  const [confirmUnlink, setConfirmUnlink] = useState<string | null>(null) // pediatricianId
  const [unlinking, setUnlinking] = useState(false)

  const canManage = myRole === 'parent' || myRole === 'guardian'

  const handleUnlink = async () => {
    if (!confirmUnlink) return
    setUnlinking(true)
    hapticLight()
    await unlink(confirmUnlink)
    setUnlinking(false)
    setConfirmUnlink(null)
  }

  const formatLinkedDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const pedToUnlink = linked.find((p) => p.pediatricianId === confirmUnlink)

  return (
    <>
      <div className="bg-surface-container rounded-md overflow-hidden">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary text-lg">stethoscope</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-headline text-sm font-bold text-on-surface">
              Pediatra {linked.length > 0 ? `de ${baby.name}` : `do ${baby.name}`}
            </h3>
            {loading ? (
              <p className="font-label text-xs text-on-surface-variant">Carregando...</p>
            ) : linked.length === 0 ? (
              <p className="font-label text-xs text-on-surface-variant">
                Nenhuma pediatra vinculada
              </p>
            ) : (
              <p className="font-label text-xs text-primary">
                {linked.length === 1
                  ? '1 profissional com acesso'
                  : `${linked.length} profissionais com acesso`}
              </p>
            )}
          </div>
        </div>

        {/* Lista de vinculadas */}
        {linked.length > 0 && (
          <div className="border-t border-outline-variant/20">
            {linked.map((ped) => (
              <div
                key={ped.linkId}
                className="flex items-center gap-3 px-4 py-3 border-b border-outline-variant/10 last:border-b-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm font-medium text-on-surface truncate">
                    {ped.name}
                  </p>
                  <p className="font-label text-xs text-on-surface-variant">
                    CRM {ped.crm}/{ped.crmState} · vinculada em {formatLinkedDate(ped.linkedAt)}
                  </p>
                </div>
                {canManage && (
                  <button
                    onClick={() => setConfirmUnlink(ped.pediatricianId)}
                    className="font-label text-xs text-on-surface-variant/60 active:text-error transition-colors px-2 py-1 rounded"
                  >
                    Remover
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Botão adicionar */}
        {canManage && (
          <div className={linked.length > 0 ? 'border-t border-outline-variant/20' : ''}>
            <button
              onClick={() => setLinkSheetOpen(true)}
              className="flex items-center gap-2 w-full px-4 py-3 text-primary active:bg-primary/5 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              <span className="font-label text-sm font-semibold">
                {linked.length === 0 ? 'Adicionar pediatra' : 'Adicionar outra pediatra'}
              </span>
            </button>
          </div>
        )}

        {/* Aviso somente-leitura para caregiver */}
        {!canManage && linked.length === 0 && (
          <p className="px-4 pb-4 font-label text-xs text-on-surface-variant/70">
            Somente pais e responsáveis podem vincular uma pediatra.
          </p>
        )}
      </div>

      {/* Sheet de vinculação */}
      <LinkPediatricianSheet
        isOpen={linkSheetOpen}
        onClose={() => setLinkSheetOpen(false)}
        babyId={baby.id}
        babyName={baby.name}
        onLinked={() => { reload() }}
      />

      {/* Modal de confirmação de remoção */}
      {confirmUnlink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setConfirmUnlink(null)}
          />
          <div className="relative bg-surface rounded-xl p-6 w-full max-w-sm">
            <h3 className="font-headline text-base font-bold text-on-surface mb-2">
              Remover acesso?
            </h3>
            <p className="font-body text-sm text-on-surface-variant mb-5">
              {pedToUnlink?.name ?? 'Esta profissional'} não poderá mais visualizar os dados de{' '}
              <strong>{baby.name}</strong> pelo portal.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmUnlink(null)}
                className="flex-1 py-2.5 rounded-md border border-outline-variant text-on-surface-variant font-label text-sm active:bg-surface-variant"
              >
                Cancelar
              </button>
              <button
                onClick={handleUnlink}
                disabled={unlinking}
                className="flex-1 py-2.5 rounded-md bg-error/15 border border-error/30 text-error font-label text-sm font-semibold active:bg-error/25 disabled:opacity-50"
              >
                {unlinking ? 'Removendo...' : 'Remover acesso'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
