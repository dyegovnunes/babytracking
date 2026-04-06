import { useCallback, useState, useEffect } from 'react'
import { useAppState, useAppDispatch, updateBaby, clearAllLogs } from '../contexts/AppContext'
import { useAuth } from '../contexts/AuthContext'
import type { Baby } from '../types'
import BabyCard from '../components/profile/BabyCard'
import DataManagement from '../components/profile/DataManagement'
import Toast from '../components/ui/Toast'
import { supabase } from '../lib/supabase'

interface Caregiver {
  userId: string
  displayName: string
  role: string
}

export default function ProfilePage() {
  const { baby, logs, members, loading } = useAppState()
  const { user } = useAuth()
  const dispatch = useAppDispatch()
  const [toast, setToast] = useState<string | null>(null)

  // User profile
  const [displayName, setDisplayName] = useState('')
  const [editingName, setEditingName] = useState(false)

  // Caregivers
  const [caregivers, setCaregivers] = useState<Caregiver[]>([])

  // Invite
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [generatingCode, setGeneratingCode] = useState(false)

  useEffect(() => {
    if (members && user) {
      const me = members[user.id]
      if (me) setDisplayName(me.displayName)

      const list = Object.entries(members).map(([uid, m]) => ({
        userId: uid,
        displayName: m.displayName,
        role: m.role,
      }))
      setCaregivers(list)
    }
  }, [members, user])

  const handleSaveBaby = useCallback(
    async (updated: Baby) => {
      const ok = await updateBaby(dispatch, updated)
      if (ok) setToast('Dados do bebê atualizados!')
    },
    [dispatch],
  )

  const handleSaveDisplayName = useCallback(async () => {
    if (!user || !baby || !displayName.trim()) return
    const { error } = await supabase
      .from('baby_members')
      .update({ display_name: displayName.trim() })
      .eq('user_id', user.id)
      .eq('baby_id', baby.id)
    if (!error) {
      setEditingName(false)
      setToast('Nome atualizado!')
    }
  }, [user, baby, displayName])

  const handleGenerateInvite = useCallback(async () => {
    if (!user || !baby) return
    setGeneratingCode(true)
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const { error } = await supabase
      .from('invite_codes')
      .insert({
        code,
        baby_id: baby.id,
        created_by: user.id,
        expires_at: expiresAt,
      })

    if (!error) {
      setInviteCode(code)
      setToast('Código gerado!')
    }
    setGeneratingCode(false)
  }, [user, baby])

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

  const handleClearHistory = useCallback(async () => {
    if (!baby) return
    const ok = await clearAllLogs(dispatch, baby.id)
    if (ok) setToast('Histórico limpo!')
  }, [dispatch, baby])

  const birthDate = baby?.birthDate ? new Date(baby.birthDate) : null
  const ageText = birthDate ? getAgeText(birthDate) : ''

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
          Seus dados e do bebê
        </p>
      </section>

      <div className="px-5 space-y-4">
        {/* ===== PERFIL DO USUÁRIO ===== */}
        <div className="bg-surface-container rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="material-symbols-outlined text-primary text-xl">person</span>
            <h3 className="text-on-surface font-headline text-sm font-bold">Seu perfil</h3>
          </div>

          <div className="space-y-3">
            <div>
              <p className="font-label text-[11px] text-on-surface-variant uppercase tracking-wider mb-1">Email</p>
              <p className="font-body text-sm text-on-surface">{user?.email}</p>
            </div>

            <div>
              <p className="font-label text-[11px] text-on-surface-variant uppercase tracking-wider mb-1">Nome de exibição</p>
              {editingName ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="flex-1 bg-surface-container-low rounded-lg px-3 py-2 text-on-surface font-body text-sm outline-none focus:ring-2 focus:ring-primary/40"
                    autoFocus
                  />
                  <button onClick={handleSaveDisplayName} className="px-3 py-2 rounded-lg bg-primary text-on-primary font-label text-xs font-semibold">
                    Salvar
                  </button>
                  <button onClick={() => setEditingName(false)} className="px-3 py-2 rounded-lg bg-surface-variant text-on-surface-variant font-label text-xs font-semibold">
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingName(true)}
                  className="flex items-center gap-2 group"
                >
                  <span className="font-body text-sm text-on-surface">{displayName || 'Definir nome'}</span>
                  <span className="material-symbols-outlined text-on-surface-variant text-sm opacity-0 group-hover:opacity-100 transition-opacity">edit</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ===== PERFIL DO BEBÊ ===== */}
        <BabyCard baby={baby} onSave={handleSaveBaby} />

        {ageText && (
          <div className="bg-surface-container rounded-lg p-4 flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-xl">cake</span>
            <p className="font-body text-sm text-on-surface">{ageText}</p>
          </div>
        )}

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
                {c.userId === user?.id && (
                  <span className="font-label text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full">Você</span>
                )}
              </div>
            ))}
          </div>

          {/* Invite section */}
          {inviteCode ? (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
              <p className="font-label text-xs text-on-surface-variant mb-2">Código de convite (válido por 7 dias)</p>
              <p className="font-headline text-2xl font-bold text-primary tracking-widest text-center mb-3">{inviteCode}</p>
              <div className="flex gap-2">
                <button onClick={handleCopyCode} className="flex-1 py-2 rounded-lg bg-surface-variant text-on-surface-variant font-label text-xs font-semibold flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-sm">content_copy</span> Copiar
                </button>
                <button onClick={handleShareWhatsApp} className="flex-1 py-2 rounded-lg bg-[#25D366] text-white font-label text-xs font-semibold flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-sm">share</span> WhatsApp
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleGenerateInvite}
              disabled={generatingCode}
              className="w-full py-3 rounded-xl bg-primary/10 text-primary font-label font-semibold text-sm flex items-center justify-center gap-2 active:bg-primary/20 transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-lg">person_add</span>
              {generatingCode ? 'Gerando...' : 'Convidar cuidador'}
            </button>
          )}
        </div>

        {/* ===== DADOS ===== */}
        <DataManagement logs={logs} babyName={baby.name} onClearHistory={handleClearHistory} />
      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}

function getAgeText(birthDate: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - birthDate.getTime()
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (days < 0) return ''
  if (days === 0) return 'Nascido(a) hoje!'
  if (days < 30) return `${days} dia${days > 1 ? 's' : ''} de vida`

  const months = Math.floor(days / 30.44)
  const remainingDays = Math.floor(days - months * 30.44)
  if (months < 12) {
    return remainingDays > 0
      ? `${months} ${months === 1 ? 'mês' : 'meses'} e ${remainingDays} dias`
      : `${months} ${months === 1 ? 'mês' : 'meses'}`
  }

  const years = Math.floor(months / 12)
  const remainingMonths = months % 12
  return remainingMonths > 0
    ? `${years} ano${years > 1 ? 's' : ''} e ${remainingMonths} ${remainingMonths === 1 ? 'mês' : 'meses'}`
    : `${years} ano${years > 1 ? 's' : ''}`
}
