import { useCallback, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppState, useAppDispatch, updateBaby, updateMemberRole, removeMember } from '../contexts/AppContext'
import { useAuth, signOut } from '../contexts/AuthContext'
import type { Baby } from '../types'
import BabyCard from '../components/profile/BabyCard'
import GrowthSection from '../components/profile/GrowthSection'
import Toast from '../components/ui/Toast'
import { AdBanner } from '../components/ui/AdBanner'
import SharedReports from '../components/profile/SharedReports'
import { supabase } from '../lib/supabase'

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
  const [toast, setToast] = useState<string | null>(null)

  // Caregivers
  const [caregivers, setCaregivers] = useState<Caregiver[]>([])

  // Member management
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)

  // Invite
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [inviteId, setInviteId] = useState<string | null>(null)
  const [generatingCode, setGeneratingCode] = useState(false)

  // Load active invite code
  useEffect(() => {
    if (!baby) return
    supabase
      .from('invite_codes')
      .select('id, code')
      .eq('baby_id', baby.id)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setInviteCode(data[0].code)
          setInviteId(data[0].id)
        }
      })
  }, [baby])

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
    if (!user || !baby) return
    setGeneratingCode(true)

    // Deactivate any existing active codes for this baby
    await supabase
      .from('invite_codes')
      .update({ active: false })
      .eq('baby_id', baby.id)
      .eq('active', true)

    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('invite_codes')
      .insert({
        code,
        baby_id: baby.id,
        created_by: user.id,
        expires_at: expiresAt,
      })
      .select('id')
      .single()

    if (!error && data) {
      setInviteCode(code)
      setInviteId(data.id)
      setToast('Código gerado!')
    }
    setGeneratingCode(false)
  }, [user, baby])

  const handleDeactivateCode = useCallback(async () => {
    if (!inviteId && !baby) return

    // Try by ID first, then fallback to deactivating all for this baby
    if (inviteId) {
      const { error } = await supabase
        .from('invite_codes')
        .update({ active: false })
        .eq('id', inviteId)

      if (error) {
        // Fallback: deactivate all active codes for this baby
        await supabase
          .from('invite_codes')
          .update({ active: false })
          .eq('baby_id', baby!.id)
          .eq('active', true)
      }
    } else if (baby) {
      await supabase
        .from('invite_codes')
        .update({ active: false })
        .eq('baby_id', baby.id)
        .eq('active', true)
    }

    setInviteCode(null)
    setInviteId(null)
    setToast('Código desativado!')
  }, [inviteId, baby])

  const handleCopyCode = useCallback(() => {
    if (!inviteCode) return
    navigator.clipboard.writeText(inviteCode)
    setToast('Código copiado!')
  }, [inviteCode])

  const handleShareWhatsApp = useCallback(() => {
    if (!inviteCode || !baby) return
    const text = `Oi! Use o código *${inviteCode}* para acompanhar o(a) ${baby.name} no app Yaya. Baixe em yayababy.app`
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
          className="w-full bg-surface-container rounded-lg p-4 flex items-center gap-3 active:bg-surface-container-high transition-colors"
        >
          <span className="text-xl">🎯</span>
          <div className="flex-1 text-left">
            <h3 className="text-on-surface font-headline text-sm font-bold">Marcos do Desenvolvimento</h3>
            <p className="text-on-surface-variant font-label text-xs">Registre e acompanhe as conquistas</p>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant text-lg">chevron_right</span>
        </button>

        {/* ===== CUIDADORES ===== */}
        <div className="bg-surface-container rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="material-symbols-outlined text-primary text-xl">group</span>
            <h3 className="text-on-surface font-headline text-sm font-bold">Cuidadores</h3>
          </div>

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
                      className="w-9 h-9 rounded-lg bg-surface-variant/50 flex items-center justify-center active:bg-surface-variant"
                      title={c.role === 'parent' ? 'Rebaixar para Cuidador' : 'Promover a Responsável'}
                    >
                      <span className="material-symbols-outlined text-on-surface-variant text-base">
                        {c.role === 'parent' ? 'arrow_downward' : 'arrow_upward'}
                      </span>
                    </button>
                    <button
                      onClick={() => setConfirmRemove(c.userId)}
                      className="w-9 h-9 rounded-lg bg-error/10 flex items-center justify-center active:bg-error/20"
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
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
              <p className="font-label text-xs text-on-surface-variant mb-2">Código de convite ativo</p>
              <p className="font-headline text-2xl font-bold text-primary tracking-widest text-center mb-3">{inviteCode}</p>
              <div className="flex gap-2 mb-2">
                <button onClick={handleCopyCode} className="flex-1 py-2.5 rounded-lg bg-surface-variant text-on-surface-variant font-label text-xs font-semibold flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-sm">content_copy</span> Copiar
                </button>
                <button onClick={handleShareWhatsApp} className="flex-1 py-2.5 rounded-lg bg-[#25D366] text-white font-label text-xs font-semibold flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-sm">share</span> WhatsApp
                </button>
              </div>
              <button
                onClick={handleDeactivateCode}
                className="w-full py-2 rounded-lg bg-error/10 text-error font-label text-xs font-semibold flex items-center justify-center gap-1 active:bg-error/20"
              >
                <span className="material-symbols-outlined text-sm">block</span> Desativar código
              </button>
            </div>
          ) : (
            <button
              onClick={handleGenerateInvite}
              disabled={generatingCode}
              className="w-full py-3 rounded-xl bg-primary/10 text-primary font-label font-semibold text-sm flex items-center justify-center gap-2 active:bg-primary/20 transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-lg">person_add</span>
              {generatingCode ? 'Gerando...' : 'Gerar código de convite'}
            </button>
          )}
        </div>

        {/* ===== SUPER RELATÓRIO ===== */}
        <SharedReports />

        {/* ===== SAIR ===== */}
        <button onClick={signOut} className="w-full py-2.5 rounded-xl bg-error/10 text-error font-label font-semibold text-sm">
          Sair da conta
        </button>
      </div>

      <AdBanner />

      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm" onClick={() => setConfirmRemove(null)}>
          <div className="bg-surface-container-highest rounded-2xl p-6 mx-6 max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-error text-2xl">person_remove</span>
              <h3 className="font-headline text-lg font-bold text-on-surface">Remover membro</h3>
            </div>
            <p className="font-body text-sm text-on-surface-variant mb-5">
              Tem certeza que deseja remover <strong className="text-on-surface">{members[confirmRemove]?.displayName}</strong> do grupo? Essa pessoa perderá acesso aos dados do bebê.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmRemove(null)} className="flex-1 py-2.5 rounded-xl bg-surface-variant text-on-surface-variant font-label text-sm font-semibold">
                Cancelar
              </button>
              <button onClick={() => handleRemoveMember(confirmRemove)} className="flex-1 py-2.5 rounded-xl bg-error text-on-error font-label text-sm font-semibold">
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
