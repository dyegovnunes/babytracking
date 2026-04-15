import { useCallback, useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAppState, useAppDispatch, updateBaby, updateMemberRole, removeMember } from '../../contexts/AppContext'
import { useAuth, signOut } from '../../contexts/AuthContext'
import type { Baby } from '../../types'
import BabyCard from './components/BabyCard'
import GrowthSection from './components/GrowthSection'
import Toast from '../../components/ui/Toast'
import { AdBanner } from '../../components/ui/AdBanner'
import SharedReports from './components/SharedReports'
import { hapticLight } from '../../lib/haptics'
import { contractionDe } from '../../lib/genderUtils'
import { useSheetBackClose } from '../../hooks/useSheetBackClose'
import { useInviteCodes } from './useInviteCodes'
import { useVaccines } from '../vaccines'
import { useMedications } from '../medications'

interface Caregiver {
  userId: string
  displayName: string
  role: string
}

export default function ProfilePage() {
  const { baby, members, loading } = useAppState()
  const { user } = useAuth()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const [toast, setToast] = useState<string | null>(null)

  // Se navegamos aqui com hash #shared-reports, rola até a seção
  useEffect(() => {
    if (location.hash !== '#shared-reports') return
    // Espera o primeiro paint para o elemento existir
    const id = requestAnimationFrame(() => {
      const el = document.getElementById('shared-reports')
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    return () => cancelAnimationFrame(id)
  }, [location.hash])

  // Caregivers
  const [caregivers, setCaregivers] = useState<Caregiver[]>([])
  const [caregiversExpanded, setCaregiversExpanded] = useState(false)

  // Member management
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  useSheetBackClose(!!confirmRemove, () => setConfirmRemove(null))

  // Invite
  const { code: inviteCode, generating: generatingCode, generate: generateInvite, deactivate: deactivateInvite } = useInviteCodes()

  // Vaccines — só para o subtítulo do botão
  const { counts: vaccineCounts } = useVaccines(baby?.id, baby?.birthDate)

  // Medications — só para o subtítulo do botão (não precisa de members aqui).
  // Referência estável pro objeto vazio, pra não invalidar memos do hook.
  const emptyMembers = useMemo(() => ({}), [])
  const { activeMedications } = useMedications(baby?.id, emptyMembers)

  useEffect(() => {
    if (members) {
      const list = Object.entries(members).map(([uid, m]) => ({
        userId: uid,
        displayName: m.displayName,
        role: m.role,
      }))
      setCaregivers(list)
    }
  }, [members])

  const handleSaveBaby = useCallback(
    async (updated: Baby) => {
      const ok = await updateBaby(dispatch, updated)
      if (ok) setToast('Dados do bebê atualizados!')
    },
    [dispatch],
  )

  const handleGenerateInvite = useCallback(async () => {
    const ok = await generateInvite()
    if (ok) setToast('Código gerado!')
  }, [generateInvite])

  const handleDeactivateCode = useCallback(async () => {
    const ok = await deactivateInvite()
    if (ok) setToast('Código desativado!')
    else setToast('Não foi possível desativar o código. Tente novamente.')
  }, [deactivateInvite])

  const handleCopyCode = useCallback(() => {
    if (!inviteCode) return
    navigator.clipboard.writeText(inviteCode)
    setToast('Código copiado!')
  }, [inviteCode])

  const handleShareWhatsApp = useCallback(() => {
    if (!inviteCode || !baby) return
    const de = contractionDe(baby.gender)
    const text = `Oi! Use o código *${inviteCode}* para acompanhar ${de} ${baby.name} no app Yaya. Baixe em yayababy.app`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }, [inviteCode, baby])

  const isParent = user ? members[user.id]?.role === 'parent' : false
  const parentCount = Object.values(members).filter(m => m.role === 'parent').length

  const handleToggleRole = useCallback(async (userId: string, currentRole: string) => {
    if (!baby) return
    if (currentRole === 'parent' && parentCount <= 1) {
      setToast('Deve haver pelo menos um responsável')
      return
    }
    const newRole = currentRole === 'parent' ? 'caregiver' : 'parent'
    const ok = await updateMemberRole(dispatch, baby.id, userId, newRole)
    if (ok) setToast(newRole === 'parent' ? 'Promovido a Responsável!' : 'Alterado para Cuidador!')
  }, [baby, dispatch, parentCount])

  const handleRemoveMember = useCallback(async (userId: string) => {
    if (!baby) return
    const ok = await removeMember(dispatch, baby.id, userId)
    setConfirmRemove(null)
    if (ok) setToast('Membro removido!')
  }, [baby, dispatch])


  if (loading || !baby) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="material-symbols-outlined text-primary text-4xl animate-spin">
          progress_activity
        </span>
      </div>
    )
  }

  return (
    <div className="pb-4 page-enter">
      <section className="px-5 pt-6 pb-4">
        <h1 className="font-headline text-2xl font-bold text-on-surface mb-1">
          Perfil
        </h1>
        <p className="font-label text-sm text-on-surface-variant">
          Dados do bebê
        </p>
      </section>

      <div className="px-5 space-y-4">
        {/* ===== PERFIL DO BEBÊ ===== */}
        <BabyCard baby={baby} onSave={handleSaveBaby} />

        {/* ===== CRESCIMENTO ===== */}
        <GrowthSection babyId={baby.id} />

        {/* ===== MARCOS DO DESENVOLVIMENTO ===== */}
        <button
          onClick={() => navigate('/marcos')}
          className="w-full bg-surface-container rounded-md p-4 flex items-center gap-3 active:bg-surface-container-high transition-colors"
        >
          <span className="material-symbols-outlined text-primary text-xl">flag</span>
          <div className="flex-1 text-left">
            <h3 className="text-on-surface font-headline text-sm font-bold">Marcos do Desenvolvimento</h3>
            <p className="text-on-surface-variant font-label text-xs">
              Registre e acompanhe a evolução {contractionDe(baby.gender)} {baby.name}
            </p>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant text-lg">chevron_right</span>
        </button>

        {/* ===== CADERNETA DE VACINAS ===== */}
        <button
          onClick={() => navigate('/vacinas')}
          className="w-full bg-surface-container rounded-md p-4 flex items-center gap-3 active:bg-surface-container-high transition-colors"
        >
          <span
            className="material-symbols-outlined text-primary text-xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            vaccines
          </span>
          <div className="flex-1 text-left">
            <h3 className="text-on-surface font-headline text-sm font-bold">Caderneta de Vacinas</h3>
            <p className="text-on-surface-variant font-label text-xs">
              {formatVaccineSubtitle(vaccineCounts)}
            </p>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant text-lg">chevron_right</span>
        </button>

        {/* ===== MEDICAMENTOS ===== */}
        <button
          onClick={() => navigate('/medicamentos')}
          className="w-full bg-surface-container rounded-md p-4 flex items-center gap-3 active:bg-surface-container-high transition-colors"
        >
          <span
            className="material-symbols-outlined text-primary text-xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            medication
          </span>
          <div className="flex-1 text-left">
            <h3 className="text-on-surface font-headline text-sm font-bold">Medicamentos</h3>
            <p className="text-on-surface-variant font-label text-xs">
              {activeMedications.length === 0
                ? 'Nenhum ativo'
                : `${activeMedications.length} ${activeMedications.length === 1 ? 'ativo agora' : 'ativos agora'}`}
            </p>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant text-lg">chevron_right</span>
        </button>

        {/* ===== CUIDADORES ===== */}
        <div className="bg-surface-container rounded-md p-4">
          <button
            onClick={() => { hapticLight(); setCaregiversExpanded(!caregiversExpanded) }}
            className="w-full flex items-start gap-3 text-left"
          >
            <span className="material-symbols-outlined text-primary text-xl mt-0.5">group</span>
            <div className="flex-1 min-w-0">
              <h3 className="text-on-surface font-headline text-sm font-bold">Cuidadores</h3>
              {!caregiversExpanded && (
                <>
                  <p className="font-body text-xs text-on-surface-variant mt-0.5 truncate">
                    {caregivers.length > 0
                      ? caregivers.map((c) => c.displayName.split(' ')[0]).join(', ')
                      : 'Nenhum cuidador ainda'}
                  </p>
                  <p className="font-label text-[11px] text-primary mt-1">
                    {inviteCode ? 'Código de convite ativo · toque para gerenciar' : 'Toque para convidar outro cuidador'}
                  </p>
                </>
              )}
            </div>
            <span className={`material-symbols-outlined text-on-surface-variant text-base mt-0.5 transition-transform ${caregiversExpanded ? 'rotate-180' : ''}`}>
              expand_more
            </span>
          </button>

          {caregiversExpanded && (
          <div className="mt-4">
          <div className="space-y-2 mb-4">
            {caregivers.map((c) => (
              <div key={c.userId} className="flex items-center gap-3 py-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="font-label text-xs text-primary font-bold">
                    {c.displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm text-on-surface truncate">{c.displayName}</p>
                  <p className="font-label text-xs text-on-surface-variant">{c.role === 'parent' ? 'Responsável' : 'Cuidador'}</p>
                </div>
                {c.userId === user?.id ? (
                  <span className="font-label text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full">Você</span>
                ) : isParent && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleRole(c.userId, c.role)}
                      className="w-9 h-9 rounded-md bg-surface-variant/50 flex items-center justify-center active:bg-surface-variant"
                      title={c.role === 'parent' ? 'Rebaixar para Cuidador' : 'Promover a Responsável'}
                    >
                      <span className="material-symbols-outlined text-on-surface-variant text-base">
                        {c.role === 'parent' ? 'arrow_downward' : 'arrow_upward'}
                      </span>
                    </button>
                    <button
                      onClick={() => setConfirmRemove(c.userId)}
                      className="w-9 h-9 rounded-md bg-error/10 flex items-center justify-center active:bg-error/20"
                      title="Remover membro"
                    >
                      <span className="material-symbols-outlined text-error text-base">person_remove</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Invite section */}
          {inviteCode ? (
            <div className="bg-primary/5 border border-primary/20 rounded-md p-4">
              <p className="font-label text-xs text-on-surface-variant mb-2">Código de convite ativo</p>
              <p className="font-headline text-2xl font-bold text-primary tracking-widest text-center mb-3">{inviteCode}</p>
              <div className="flex gap-2 mb-2">
                <button onClick={handleCopyCode} className="flex-1 py-2.5 rounded-md bg-surface-variant text-on-surface-variant font-label text-xs font-semibold flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-sm">content_copy</span> Copiar
                </button>
                <button onClick={handleShareWhatsApp} className="flex-1 py-2.5 rounded-md bg-[#25D366] text-white font-label text-xs font-semibold flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-sm">share</span> WhatsApp
                </button>
              </div>
              <button
                onClick={handleDeactivateCode}
                className="w-full py-2 rounded-md bg-error/10 text-error font-label text-xs font-semibold flex items-center justify-center gap-1 active:bg-error/20"
              >
                <span className="material-symbols-outlined text-sm">block</span> Desativar código
              </button>
            </div>
          ) : (
            <button
              onClick={handleGenerateInvite}
              disabled={generatingCode}
              className="w-full py-3 rounded-md bg-primary/10 text-primary font-label font-semibold text-sm flex items-center justify-center gap-2 active:bg-primary/20 transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-lg">person_add</span>
              {generatingCode ? 'Gerando...' : 'Gerar código de convite'}
            </button>
          )}
          </div>
          )}
        </div>

        {/* ===== SUPER RELATÓRIO ===== */}
        <div id="shared-reports" className="scroll-mt-6">
          <SharedReports />
        </div>

        {/* ===== SAIR ===== */}
        <button onClick={signOut} className="w-full py-2.5 rounded-md bg-error/10 text-error font-label font-semibold text-sm">
          Sair da conta
        </button>
      </div>

      <AdBanner />

      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm" onClick={() => setConfirmRemove(null)}>
          <div className="bg-surface-container-highest rounded-md p-6 mx-6 max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-error text-2xl">person_remove</span>
              <h3 className="font-headline text-lg font-bold text-on-surface">Remover membro</h3>
            </div>
            <p className="font-body text-sm text-on-surface-variant mb-5">
              Tem certeza que deseja remover <strong className="text-on-surface">{members[confirmRemove]?.displayName}</strong> do grupo? Essa pessoa perderá acesso aos dados do bebê.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmRemove(null)} className="flex-1 py-2.5 rounded-md bg-surface-variant text-on-surface-variant font-label text-sm font-semibold">
                Cancelar
              </button>
              <button onClick={() => handleRemoveMember(confirmRemove)} className="flex-1 py-2.5 rounded-md bg-error text-on-error font-label text-sm font-semibold">
                Remover
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers locais
// ---------------------------------------------------------------------------

function formatVaccineSubtitle(counts: {
  overdue: number
  canTake: number
  applied: number
  total: number
}): string {
  if (counts.overdue > 0 && counts.canTake > 0) {
    return `${counts.overdue} ${counts.overdue === 1 ? 'atrasada' : 'atrasadas'} · ${counts.canTake} ${counts.canTake === 1 ? 'próxima' : 'próximas'}`
  }
  if (counts.overdue > 0) {
    return `${counts.overdue} ${counts.overdue === 1 ? 'vacina atrasada' : 'vacinas atrasadas'}`
  }
  if (counts.canTake > 0) {
    return `${counts.canTake} ${counts.canTake === 1 ? 'pode ser tomada agora' : 'podem ser tomadas agora'}`
  }
  return `${counts.applied}/${counts.total} vacinas registradas`
}
