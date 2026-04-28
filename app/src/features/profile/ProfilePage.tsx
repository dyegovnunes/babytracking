import { useCallback, useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAppState, useAppDispatch, updateBaby, updateMemberRole, removeMember } from '../../contexts/AppContext'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import type { Baby } from '../../types'
import BabyCard from './components/BabyCard'
import GrowthSection from './components/GrowthSection'
import CaregiverEditSheet from './components/CaregiverEditSheet'
import Toast from '../../components/ui/Toast'
import BabySwitcher from '../../components/ui/BabySwitcher'
import { PaywallModal } from '../../components/ui/PaywallModal'
import SharedReports from './components/SharedReports'
import { hapticLight } from '../../lib/haptics'
import { contractionDe } from '../../lib/genderUtils'
import { useSheetBackClose } from '../../hooks/useSheetBackClose'
import { useInviteCodes } from './useInviteCodes'
import { useCaregiverSchedule } from './useCaregiverSchedule'
import { useVaccines } from '../vaccines'
import { useMedications } from '../medications'
import { getActiveLeap, getUpcomingLeap, DEVELOPMENT_LEAPS } from '../milestones'
import { useMyRole } from '../../hooks/useMyRole'
import { useBabyPremium } from '../../hooks/useBabyPremium'
import { useMyCaregiverPermissions } from '../../hooks/useMyCaregiverPermissions'
import { can, roleLabel, nextRoleUp, nextRoleDown, type BabyRole } from '../../lib/roles'

interface Caregiver {
  userId: string
  displayName: string
  role: string
}

export default function ProfilePage() {
  const { baby, members, logs, loading, babiesWithRole } = useAppState()
  const { user } = useAuth()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const myRole = useMyRole()
  const isPremium = useBabyPremium()
  const caregiverPerms = useMyCaregiverPermissions()
  // Papéis/permissões combinadas: parent/guardian veem por `can.*`; caregiver
  // só vê quando o parent autorizou via permissions.
  const canShowMilestones = can.viewMilestones(myRole) || (myRole === 'caregiver' && caregiverPerms.show_milestones)
  const canShowLeaps = can.viewLeaps(myRole) || (myRole === 'caregiver' && caregiverPerms.show_leaps)
  const canShowVaccines = can.viewVaccines(myRole) || (myRole === 'caregiver' && caregiverPerms.show_vaccines)
  // Crescimento: parent/guardian editam, caregiver só vê se permission liberada
  const canShowGrowth = myRole !== 'caregiver' || caregiverPerms.show_growth
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
  const [confirmPromoteParent, setConfirmPromoteParent] = useState<{ userId: string; currentRole: string } | null>(null)
  const [rolesInfoOpen, setRolesInfoOpen] = useState(false)
  const [babySwitcherOpen, setBabySwitcherOpen] = useState(false)
  const [confirmDeleteBaby, setConfirmDeleteBaby] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deletingBaby, setDeletingBaby] = useState(false)
  const [editingCaregiver, setEditingCaregiver] = useState<string | null>(null)
  const [fullInstructionsOpen, setFullInstructionsOpen] = useState(false)
  useSheetBackClose(!!confirmRemove, () => setConfirmRemove(null))
  useSheetBackClose(!!confirmPromoteParent, () => setConfirmPromoteParent(null))
  useSheetBackClose(rolesInfoOpen, () => setRolesInfoOpen(false))
  useSheetBackClose(confirmDeleteBaby, () => { setConfirmDeleteBaby(false); setDeleteConfirmText('') })
  useSheetBackClose(fullInstructionsOpen, () => setFullInstructionsOpen(false))

  // Instructions do próprio usuário quando ele é caregiver (read-only)
  const { schedule: mySchedule } = useCaregiverSchedule(
    myRole === 'caregiver' ? baby?.id : undefined,
    myRole === 'caregiver' ? user?.id : undefined,
  )
  const myInstructions = mySchedule?.instructions ?? null

  // Invite
  const { code: inviteCode, generating: generatingCode, canInviteMore, generate: generateInvite, deactivate: deactivateInvite } = useInviteCodes()
  const [showCaregiverPaywall, setShowCaregiverPaywall] = useState(false)

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
    if (!canInviteMore) {
      setShowCaregiverPaywall(true)
      return
    }
    const ok = await generateInvite()
    if (ok) setToast('Código gerado!')
    else setToast('Não foi possível gerar o código.')
  }, [generateInvite, canInviteMore])

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

  const isParent = can.manageMembers(myRole)
  const parentCount = Object.values(members).filter(m => m.role === 'parent').length

  // 3.4 — Dimensão do casal: distribuição de registros por autor nos últimos 7 dias.
  // Só aparece quando ≥ 2 membros diferentes têm logs na semana.
  const coupleActivity = useMemo(() => {
    if (!logs || !members) return null
    const weekAgo = Date.now() - 7 * 86400000
    const recentLogs = logs.filter((l) => l.timestamp >= weekAgo && l.createdBy)
    if (recentLogs.length === 0) return null
    const counts = new Map<string, number>()
    for (const log of recentLogs) {
      if (log.createdBy) counts.set(log.createdBy, (counts.get(log.createdBy) ?? 0) + 1)
    }
    if (counts.size < 2) return null
    const total = [...counts.values()].reduce((a, b) => a + b, 0)
    return [...counts.entries()]
      .sort(([, a], [, b]) => b - a)
      .map(([uid, count]) => ({
        name: members[uid]?.displayName ?? 'Membro',
        count,
        pct: Math.round((count / total) * 100),
      }))
  }, [logs, members])

  const handlePromote = useCallback(async (userId: string, currentRole: string) => {
    if (!baby) return
    const next = nextRoleUp(currentRole as BabyRole)
    if (!next) return
    if (next === 'parent') {
      // Free só pode ter 1 parent no bebê. Abre paywall em vez do confirm.
      if (!isPremium && parentCount >= 1) {
        setShowCaregiverPaywall(true)
        return
      }
      // Abre modal de confirmação in-app (não usa confirm() nativo do browser)
      setConfirmPromoteParent({ userId, currentRole })
      return
    }
    const ok = await updateMemberRole(dispatch, baby.id, userId, next)
    if (ok) setToast(`Promovido para ${roleLabel(next)}!`)
  }, [baby, dispatch, isPremium, parentCount])

  const confirmPromoteToParent = useCallback(async () => {
    if (!baby || !confirmPromoteParent) return
    const { userId } = confirmPromoteParent
    setConfirmPromoteParent(null)
    const ok = await updateMemberRole(dispatch, baby.id, userId, 'parent')
    if (ok) setToast('Promovido para Pai/Mãe!')
  }, [baby, dispatch, confirmPromoteParent])

  const handleDemote = useCallback(async (userId: string, currentRole: string) => {
    if (!baby) return
    if (currentRole === 'parent' && parentCount <= 1) {
      setToast('Deve haver pelo menos um pai/mãe')
      return
    }
    const next = nextRoleDown(currentRole as BabyRole)
    if (!next) return
    const ok = await updateMemberRole(dispatch, baby.id, userId, next)
    if (ok) setToast(`Alterado para ${roleLabel(next)}`)
  }, [baby, dispatch, parentCount])

  const handleRemoveMember = useCallback(async (userId: string) => {
    if (!baby) return
    const ok = await removeMember(dispatch, baby.id, userId)
    setConfirmRemove(null)
    if (ok) setToast('Membro removido!')
  }, [baby, dispatch])

  const handleDeleteBaby = useCallback(async () => {
    if (!baby) return
    if (deleteConfirmText.trim().toLowerCase() !== baby.name.trim().toLowerCase()) {
      setToast('Digite o nome do bebê exatamente para confirmar')
      return
    }
    setDeletingBaby(true)
    // ON DELETE CASCADE em babies remove logs, milestones, vaccines, members etc.
    const { data, error } = await supabase
      .from('babies')
      .delete()
      .eq('id', baby.id)
      .select('id')
    if (error || !data || data.length === 0) {
      setDeletingBaby(false)
      setToast('Não foi possível excluir. Verifique se você é Pai/Mãe.')
      return
    }
    // Limpa localStorage do bebê ativo e reload
    localStorage.removeItem('yaya_active_baby')
    window.location.href = '/'
  }, [baby, deleteConfirmText])


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
        {/* ===== INSTRUÇÕES (só para caregiver que tem texto definido) ===== */}
        {myRole === 'caregiver' && myInstructions && (
          <div className="bg-primary/5 border border-primary/15 rounded-md p-4">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-primary text-xl mt-0.5">sticky_note_2</span>
              <div className="flex-1 min-w-0">
                <h3 className="font-headline text-sm font-bold text-on-surface mb-1">Instruções</h3>
                <p className="font-body text-sm text-on-surface leading-relaxed line-clamp-3 whitespace-pre-wrap">
                  {myInstructions}
                </p>
                {myInstructions.length > 120 && (
                  <button
                    onClick={() => { hapticLight(); setFullInstructionsOpen(true) }}
                    className="mt-2 font-label text-xs text-primary font-semibold"
                  >
                    Ver tudo
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== PERFIL DO BEBÊ ===== */}
        <BabyCard baby={baby} onSave={handleSaveBaby} canEdit={can.editBaby(myRole)} />

        {/* ===== CRESCIMENTO ===== */}
        {canShowGrowth && (
          <GrowthSection
            babyId={baby.id}
            readOnly={myRole === 'caregiver'}
            birthDate={baby.birthDate}
            gender={baby.gender}
          />
        )}

        {/* ===== MARCOS DO DESENVOLVIMENTO ===== */}
        {canShowMilestones && (
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
        )}

        {/* ===== SALTOS DO DESENVOLVIMENTO ===== */}
        {canShowLeaps && <button
          onClick={() => navigate('/saltos')}
          className="w-full bg-surface-container rounded-md p-4 flex items-center gap-3 active:bg-surface-container-high transition-colors"
        >
          <span className="material-symbols-outlined text-primary text-xl">bolt</span>
          <div className="flex-1 text-left">
            <h3 className="text-on-surface font-headline text-sm font-bold">Saltos do Desenvolvimento</h3>
            <p className="text-on-surface-variant font-label text-xs">
              {(() => {
                if (!baby?.birthDate) return 'Acompanhe os 10 saltos'
                const active = getActiveLeap(baby.birthDate)
                if (active) {
                  const remaining = DEVELOPMENT_LEAPS.filter(l => l.id > active.id).length
                  return `Salto ${active.id} em andamento · ${remaining} restantes`
                }
                const upcoming = getUpcomingLeap(baby.birthDate)
                if (upcoming) return `Salto ${upcoming.leap.id} em ${upcoming.weeksUntil} semanas`
                const ageWeeks = Math.floor((Date.now() - new Date(baby.birthDate).getTime()) / (7 * 86400000))
                const past = DEVELOPMENT_LEAPS.filter(l => ageWeeks > l.weekEnd + 1).length
                const remaining = DEVELOPMENT_LEAPS.length - past
                return remaining > 0
                  ? `${past} concluídos · ${remaining} restantes`
                  : 'Todos os saltos concluídos!'
              })()}
            </p>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant text-lg">chevron_right</span>
        </button>}

        {/* ===== CADERNETA DE VACINAS ===== */}
        {canShowVaccines && <button
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
        </button>}

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
        {can.manageMembers(myRole) && <div className="bg-surface-container rounded-md p-4">
          <div className="w-full flex items-start gap-3">
            <button
              onClick={() => { hapticLight(); setCaregiversExpanded(!caregiversExpanded) }}
              className="flex items-start gap-3 text-left flex-1 min-w-0"
            >
              <span className="material-symbols-outlined text-primary text-xl mt-0.5">group</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-on-surface font-headline text-sm font-bold">Cuidadores</h3>
                  <span
                    onClick={(e) => { e.stopPropagation(); hapticLight(); setRolesInfoOpen(true) }}
                    role="button"
                    aria-label="Saiba mais sobre os papéis"
                    className="material-symbols-outlined text-on-surface-variant/60 text-base cursor-pointer"
                  >info</span>
                </div>
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
          </div>

          {caregiversExpanded && (
          <div className="mt-4">
          <div className="space-y-2 mb-4">
            {caregivers.map((c) => {
              const isCaregiverRow = c.role === 'caregiver'
              const canEditCaregiver = isParent && isCaregiverRow && c.userId !== user?.id
              const openEdit = () => { hapticLight(); setEditingCaregiver(c.userId) }
              return (
              <div key={c.userId} className="flex items-center gap-3 py-2">
                {canEditCaregiver ? (
                  <button
                    onClick={openEdit}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left -my-2 py-2 rounded-md active:bg-surface-container-high transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="font-label text-xs text-primary font-bold">
                        {c.displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-sm text-on-surface truncate">{c.displayName}</p>
                      <p className="font-label text-xs text-on-surface-variant flex items-center gap-1">
                        <span>{roleLabel(c.role)}</span>
                        <span className="material-symbols-outlined text-[14px] text-primary/80">tune</span>
                      </p>
                    </div>
                  </button>
                ) : (
                  <>
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="font-label text-xs text-primary font-bold">
                        {c.displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-sm text-on-surface truncate">{c.displayName}</p>
                      <p className="font-label text-xs text-on-surface-variant">{roleLabel(c.role)}</p>
                    </div>
                  </>
                )}
                {c.userId === user?.id ? (
                  <span className="font-label text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full">Você</span>
                ) : isParent && (
                  <div className="flex items-center gap-1">
                    {nextRoleUp(c.role as BabyRole) && (
                      <button
                        onClick={() => handlePromote(c.userId, c.role)}
                        className="w-9 h-9 rounded-md bg-surface-variant/50 flex items-center justify-center active:bg-surface-variant"
                        title={`Promover para ${roleLabel(nextRoleUp(c.role as BabyRole))}`}
                      >
                        <span className="material-symbols-outlined text-on-surface-variant text-base">arrow_upward</span>
                      </button>
                    )}
                    {nextRoleDown(c.role as BabyRole) && (
                      <button
                        onClick={() => handleDemote(c.userId, c.role)}
                        className="w-9 h-9 rounded-md bg-surface-variant/50 flex items-center justify-center active:bg-surface-variant"
                        title={`Rebaixar para ${roleLabel(nextRoleDown(c.role as BabyRole))}`}
                      >
                        <span className="material-symbols-outlined text-on-surface-variant text-base">arrow_downward</span>
                      </button>
                    )}
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
              )
            })}
          </div>

          {/* Esta semana — distribuição de registros por membro (discreto) */}
          {coupleActivity && (
            <div className="border-t border-outline-variant/30 pt-3 mb-4">
              <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-wide mb-2">Esta semana</p>
              <div className="space-y-1.5">
                {coupleActivity.map(({ name, pct }) => (
                  <div key={name} className="flex items-center gap-2">
                    <span className="font-body text-xs text-on-surface-variant w-20 truncate">{name}</span>
                    <div className="flex-1 h-1 bg-surface-container-low rounded-full overflow-hidden">
                      <div className="h-full bg-on-surface-variant/30 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="font-label text-[10px] text-on-surface-variant w-7 text-right">{pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
        </div>}

        {/* ===== SUPER RELATÓRIO ===== */}
        {can.generatePDF(myRole) && <div id="shared-reports" className="scroll-mt-6">
          <SharedReports />
        </div>}

        {/* ===== AÇÕES DO BEBÊ ===== */}
        <div className="space-y-3 pt-4">
          <button
            onClick={() => { hapticLight(); setBabySwitcherOpen(true) }}
            className="w-full py-2.5 rounded-md bg-surface-container text-on-surface font-label font-semibold text-sm flex items-center justify-center gap-2 active:bg-surface-container-high"
          >
            <span className="material-symbols-outlined text-base">
              {babiesWithRole.length <= 1 ? 'add_circle' : 'swap_horiz'}
            </span>
            {babiesWithRole.length <= 1 ? 'Adicionar bebê' : 'Trocar bebê'}
          </button>
          {can.editBaby(myRole) && (
            <button
              onClick={() => { hapticLight(); setConfirmDeleteBaby(true) }}
              className="w-full py-1.5 text-on-surface-variant/60 font-label text-xs active:text-on-surface-variant"
            >
              Excluir perfil {contractionDe(baby.gender)} {baby.name}
            </button>
          )}
        </div>
      </div>

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

      {/* Confirmação de promoção para Pai/Mãe */}
      {confirmPromoteParent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm" onClick={() => setConfirmPromoteParent(null)}>
          <div className="bg-surface-container-highest rounded-md p-6 mx-6 max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-primary text-2xl">upgrade</span>
              <h3 className="font-headline text-lg font-bold text-on-surface">Promover para Pai/Mãe</h3>
            </div>
            <p className="font-body text-sm text-on-surface-variant mb-2">
              <strong className="text-on-surface">{members[confirmPromoteParent.userId]?.displayName}</strong> terá acesso <strong>total</strong> ao perfil do bebê:
            </p>
            <ul className="font-body text-xs text-on-surface-variant space-y-1 mb-5 pl-1">
              <li>· Editar dados do bebê</li>
              <li>· Convidar, promover e remover outros membros</li>
              <li>· Gerenciar assinatura Yaya+</li>
            </ul>
            <div className="flex gap-2">
              <button onClick={() => setConfirmPromoteParent(null)} className="flex-1 py-2.5 rounded-md bg-surface-variant text-on-surface-variant font-label text-sm font-semibold">
                Cancelar
              </button>
              <button onClick={confirmPromoteToParent} className="flex-1 py-2.5 rounded-md bg-primary text-on-primary font-label text-sm font-semibold">
                Promover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal informativo sobre os papéis */}
      {rolesInfoOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm" onClick={() => setRolesInfoOpen(false)}>
          <div className="w-full max-w-md bg-surface-container-highest rounded-t-md sm:rounded-md p-6 pb-sheet animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline text-lg font-bold text-on-surface">Papéis do cuidador</h3>
              <button onClick={() => setRolesInfoOpen(false)} aria-label="Fechar" className="p-1 -m-1 rounded-md active:bg-surface-container">
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>

            <p className="font-body text-xs text-on-surface-variant mb-4">
              Cada pessoa convidada tem um papel. Você pode promover ou rebaixar pelo ▲ ▼ nos cuidadores.
            </p>

            <div className="space-y-3">
              {/* Pai/Mãe */}
              <div className="rounded-md bg-primary/5 p-3 border border-primary/20">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-primary text-base">family_restroom</span>
                  <p className="font-label text-sm font-bold text-on-surface">Pai/Mãe</p>
                </div>
                <p className="font-body text-xs text-on-surface-variant leading-relaxed">
                  Acesso total. Edita dados do bebê, convida e promove membros, gerencia a assinatura Yaya+.
                </p>
              </div>

              {/* Responsável */}
              <div className="rounded-md bg-surface-container p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-primary text-base">shield_person</span>
                  <p className="font-label text-sm font-bold text-on-surface">Responsável</p>
                </div>
                <p className="font-body text-xs text-on-surface-variant leading-relaxed">
                  Avó, avô, tio, padrinho. Vê e registra tudo — marcos, saltos, vacinas, relatórios. Não gerencia membros nem assinatura.
                </p>
              </div>

              {/* Cuidador(a) */}
              <div className="rounded-md bg-surface-container p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-primary text-base">badge</span>
                  <p className="font-label text-sm font-bold text-on-surface">Cuidador(a)</p>
                </div>
                <p className="font-body text-xs text-on-surface-variant leading-relaxed">
                  Babá ou cuidador temporário. Vê e registra só o operacional do dia: alimentação, sono, fraldas, medicamentos. Não vê marcos, saltos, vacinas ou insights.
                </p>
              </div>
            </div>

            <p className="font-label text-[11px] text-on-surface-variant/70 mt-4 text-center">
              Todo mundo entra como <strong>Cuidador(a)</strong>. Promova depois se precisar.
            </p>
          </div>
        </div>
      )}

      {/* Baby switcher */}
      {babySwitcherOpen && (
        <BabySwitcher onClose={() => setBabySwitcherOpen(false)} />
      )}

      {/* Confirmação de exclusão de bebê — precisa digitar o nome */}
      {confirmDeleteBaby && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-6"
          onClick={(e) => e.target === e.currentTarget && setConfirmDeleteBaby(false)}
        >
          <div className="w-full max-w-md bg-surface-container-highest rounded-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 rounded-full bg-error/15 flex items-center justify-center">
                <span className="material-symbols-outlined text-error">warning</span>
              </span>
              <h3 className="font-headline text-lg font-bold text-on-surface">
                Excluir perfil {contractionDe(baby.gender)} {baby.name}?
              </h3>
            </div>

            <p className="font-body text-sm text-on-surface-variant mb-2">
              Essa ação é <strong>permanente</strong> e remove tudo:
            </p>
            <ul className="font-body text-xs text-on-surface-variant space-y-0.5 mb-4 pl-1">
              <li>· Todos os registros (sono, mamadas, fraldas, etc.)</li>
              <li>· Marcos, saltos, vacinas e medicamentos</li>
              <li>· Fotos e notas</li>
              <li>· Acesso de todos os cuidadores</li>
            </ul>

            <label className="block font-label text-xs text-on-surface-variant mb-1">
              Para confirmar, digite <strong className="text-on-surface">{baby.name}</strong>:
            </label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={baby.name}
              className="w-full px-3 py-2.5 rounded-md bg-surface-container border border-outline-variant text-on-surface font-body text-sm focus:outline-none focus:border-error mb-5"
              autoFocus
            />

            <div className="flex gap-2">
              <button
                onClick={() => { setConfirmDeleteBaby(false); setDeleteConfirmText('') }}
                disabled={deletingBaby}
                className="flex-1 py-2.5 rounded-md bg-surface-variant text-on-surface-variant font-label text-sm font-semibold disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteBaby}
                disabled={deletingBaby || deleteConfirmText.trim().toLowerCase() !== baby.name.trim().toLowerCase()}
                className="flex-1 py-2.5 rounded-md bg-error text-on-error font-label text-sm font-semibold disabled:opacity-40"
              >
                {deletingBaby ? 'Excluindo...' : 'Excluir tudo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Paywall — cuidador extra no plano free */}
      <PaywallModal
        isOpen={showCaregiverPaywall}
        onClose={() => setShowCaregiverPaywall(false)}
        trigger="multi_caregiver"
      />

      {/* Edição de caregiver (parent only) */}
      {editingCaregiver && baby && (
        <CaregiverEditSheet
          babyId={baby.id}
          caregiverId={editingCaregiver}
          caregiverName={members[editingCaregiver]?.displayName || 'Cuidador(a)'}
          onClose={() => setEditingCaregiver(null)}
          onSaved={() => setToast('Configurações salvas!')}
        />
      )}

      {/* Instruções completas (caregiver read-only) */}
      {fullInstructionsOpen && myInstructions && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/75 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setFullInstructionsOpen(false)}
        >
          <div className="w-full max-w-lg max-h-[80vh] overflow-y-auto bg-surface-container-highest rounded-t-md p-6 pb-sheet border-t-2 border-primary-fixed animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 min-w-0">
                <span className="material-symbols-outlined text-primary text-lg">sticky_note_2</span>
                <h2 className="font-headline text-lg font-bold text-on-surface truncate">Instruções</h2>
              </div>
              <button
                onClick={() => setFullInstructionsOpen(false)}
                aria-label="Fechar"
                className="p-1 -m-1 rounded-md active:bg-surface-container"
              >
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>
            <p className="font-body text-sm text-on-surface leading-relaxed whitespace-pre-wrap">
              {myInstructions}
            </p>
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
