import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useAppState, useAppDispatch, switchBaby } from '../../contexts/AppContext'
import { useSheetBackClose } from '../../hooks/useSheetBackClose'
import { hapticLight, hapticSuccess } from '../../lib/haptics'
import Toast from './Toast'

interface Props {
  onClose: () => void
}

/**
 * Modal sheet for joining an existing baby via invite code.
 * Reuses the user's existing display_name so no extra input needed.
 */
export default function JoinWithCodeSheet({ onClose }: Props) {
  const { user } = useAuth()
  const { members } = useAppState()
  const dispatch = useAppDispatch()
  useSheetBackClose(true, onClose)

  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const existingDisplayName =
    (user && members[user.id]?.displayName) ||
    user?.email?.split('@')[0] ||
    'Cuidador'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim() || !user) return
    hapticLight()
    setLoading(true)
    setError(null)

    // Find active invite code
    const { data: invite, error: inviteError } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('code', code.trim().toUpperCase())
      .eq('active', true)
      .single()

    if (inviteError || !invite) {
      setError('Código inválido ou desativado')
      setLoading(false)
      return
    }

    if (new Date(invite.expires_at) < new Date()) {
      setError('Este código expirou')
      setLoading(false)
      return
    }

    // Check if already member
    const { data: existing } = await supabase
      .from('baby_members')
      .select('id')
      .eq('baby_id', invite.baby_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      setError('Você já faz parte deste bebê')
      setLoading(false)
      return
    }

    const { error: memberError } = await supabase
      .from('baby_members')
      .insert({
        baby_id: invite.baby_id,
        user_id: user.id,
        role: 'caregiver',
        display_name: existingDisplayName,
      })

    if (memberError) {
      setError(memberError.message)
      setLoading(false)
      return
    }

    hapticSuccess()
    await switchBaby(dispatch, invite.baby_id)
    window.location.href = '/'
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/75 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-surface-container-highest rounded-t-md p-6 pb-sheet border-t-2 border-primary-fixed animate-slide-up">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-headline text-lg font-bold text-on-surface">Entrar com código</h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="p-1 -m-1 rounded-md active:bg-surface-container"
          >
            <span className="material-symbols-outlined text-on-surface-variant">close</span>
          </button>
        </div>
        <p className="font-label text-xs text-on-surface-variant mb-4">
          Peça o código de convite para quem já acompanha o bebê
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-label text-xs text-on-surface-variant mb-1">Código</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="XXXXXX"
              maxLength={6}
              className="w-full px-3 py-3 rounded-md bg-surface-container border border-outline-variant text-on-surface font-headline font-bold text-2xl tracking-widest text-center uppercase focus:outline-none focus:border-primary"
              required
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading || code.trim().length < 4}
            className="w-full py-3 rounded-md bg-primary text-on-primary font-label font-semibold text-sm disabled:opacity-40"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        {error && <Toast message={error} onDismiss={() => setError(null)} />}
      </div>
    </div>
  )
}
