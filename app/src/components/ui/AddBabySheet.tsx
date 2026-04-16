import { useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useAppState, useAppDispatch, switchBaby } from '../../contexts/AppContext'
import { getDefaultIntervals } from '../../lib/ageUtils'
import { useSheetBackClose } from '../../hooks/useSheetBackClose'
import { hapticLight, hapticSuccess } from '../../lib/haptics'
import { autoRegisterPastMilestones } from '../../features/milestones/autoRegister'
import { autoRegisterPastVaccines } from '../../features/vaccines/autoRegister'
import { PaywallModal } from './PaywallModal'
import Toast from './Toast'

interface Props {
  onClose: () => void
}

const FREE_BABY_LIMIT = 1
const PREMIUM_BABY_LIMIT = 2

/**
 * Modal sheet for adding an additional baby (user already has at least one).
 * Simpler than the first-time onboarding — doesn't ask for the user's name
 * (reuses the display_name from existing memberships).
 */
export default function AddBabySheet({ onClose }: Props) {
  const { user } = useAuth()
  const { members, babiesWithRole } = useAppState()
  const dispatch = useAppDispatch()
  useSheetBackClose(true, onClose)

  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState<'boy' | 'girl' | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPaywall, setShowPaywall] = useState(false)

  // Quantos bebês o usuário é parent + se algum é premium (define o plano "efetivo" do user)
  const parentedBabies = useMemo(
    () => babiesWithRole.filter(b => b.myRole === 'parent'),
    [babiesWithRole],
  )
  const userHasPremium = parentedBabies.some(b => b.isPremium)
  const currentLimit = userHasPremium ? PREMIUM_BABY_LIMIT : FREE_BABY_LIMIT
  const reachedLimit = parentedBabies.length >= currentLimit

  // Reuse the user's name from existing membership (or fallback to email prefix)
  const existingDisplayName =
    (user && members[user.id]?.displayName) ||
    user?.email?.split('@')[0] ||
    'Responsável'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !birthDate || !gender || !user) return
    // Enforce limite de bebês por plano
    if (reachedLimit) {
      setShowPaywall(true)
      return
    }
    hapticLight()
    setLoading(true)
    setError(null)

    const { data: baby, error: babyError } = await supabase
      .from('babies')
      .insert({
        name: name.trim(),
        birth_date: birthDate,
        gender,
        created_by: user.id,
        // TODO(premium): remover quando webhook RevenueCat estiver em produção
        // Por ora (fase de teste) todos os bebês novos já vêm premium
        is_premium: true,
      })
      .select()
      .single()

    if (babyError || !baby) {
      setError(babyError?.message ?? 'Erro ao criar perfil do bebê')
      setLoading(false)
      return
    }

    const { error: memberError } = await supabase
      .from('baby_members')
      .insert({
        baby_id: baby.id,
        user_id: user.id,
        role: 'parent',
        display_name: existingDisplayName,
      })

    if (memberError) {
      setError(memberError.message)
      setLoading(false)
      return
    }

    await supabase.from('interval_configs').insert(getDefaultIntervals(baby.id, birthDate))

    // Auto-registrar marcos passados se o bebê tem idade > 14 dias
    await autoRegisterPastMilestones(baby.id, birthDate).catch(() => {})

    // Auto-registrar vacinas obrigatórias (PNI) até a idade atual
    await autoRegisterPastVaccines(baby.id, birthDate).catch(() => {})

    hapticSuccess()
    // Switch to the newly created baby
    await switchBaby(dispatch, baby.id)
    // Full reload so babies list rehydrates via AppContext load()
    window.location.href = '/'
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/75 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-surface-container-highest rounded-t-md p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] border-t-2 border-primary-fixed animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-headline text-lg font-bold text-on-surface">Adicionar bebê</h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="p-1 -m-1 rounded-md active:bg-surface-container"
          >
            <span className="material-symbols-outlined text-on-surface-variant">close</span>
          </button>
        </div>

        {reachedLimit && (
          <div className="mb-4 p-3 rounded-md bg-primary/10 border border-primary/20 flex items-start gap-2">
            <span className="material-symbols-outlined text-primary text-base mt-0.5">lock</span>
            <div className="flex-1">
              <p className="font-label text-xs text-on-surface leading-relaxed">
                {userHasPremium
                  ? `Seu plano Yaya+ cobre até ${PREMIUM_BABY_LIMIT} bebês. Para adicionar mais, em breve teremos perfis extras.`
                  : `No plano grátis você pode ter ${FREE_BABY_LIMIT} bebê cadastrado. Assine o Yaya+ para acompanhar até ${PREMIUM_BABY_LIMIT} bebês.`
                }
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div>
            <label className="block font-label text-xs text-on-surface-variant mb-1">Nome do bebê</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Helena"
              className="w-full px-3 py-2.5 rounded-md bg-surface-container border border-outline-variant text-on-surface font-body text-sm focus:outline-none focus:border-primary"
              maxLength={30}
              required
            />
          </div>

          {/* Data de nascimento */}
          <div>
            <label className="block font-label text-xs text-on-surface-variant mb-1">Data de nascimento</label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2.5 rounded-md bg-surface-container border border-outline-variant text-on-surface font-body text-sm focus:outline-none focus:border-primary"
              required
            />
          </div>

          {/* Gênero */}
          <div>
            <label className="block font-label text-xs text-on-surface-variant mb-2">Gênero</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setGender('boy')}
                className={`py-3 rounded-md flex items-center justify-center gap-2 transition-all ${
                  gender === 'boy'
                    ? 'bg-primary/15 ring-2 ring-primary text-primary'
                    : 'bg-surface-container active:bg-surface-container-high text-on-surface'
                }`}
              >
                <span className="text-lg">👦</span>
                <span className="font-label text-sm">Menino</span>
              </button>
              <button
                type="button"
                onClick={() => setGender('girl')}
                className={`py-3 rounded-md flex items-center justify-center gap-2 transition-all ${
                  gender === 'girl'
                    ? 'bg-primary/15 ring-2 ring-primary text-primary'
                    : 'bg-surface-container active:bg-surface-container-high text-on-surface'
                }`}
              >
                <span className="text-lg">👧</span>
                <span className="font-label text-sm">Menina</span>
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !name.trim() || !birthDate || !gender}
            className="w-full py-3 rounded-md bg-primary text-on-primary font-label font-semibold text-sm disabled:opacity-40"
          >
            {loading ? 'Criando...' : 'Criar perfil do bebê'}
          </button>
        </form>

        {error && <Toast message={error} onDismiss={() => setError(null)} />}
      </div>

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        trigger="multi_profile"
      />
    </div>
  )
}
