import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface Props {
  onComplete: () => void
}

export default function OnboardingPage({ onComplete }: Props) {
  const { user } = useAuth()
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose')
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState<'boy' | 'girl' | null>(null)
  const [parentName, setParentName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !birthDate || !gender || !parentName.trim() || !user) return

    setLoading(true)
    setError(null)

    const { data: baby, error: babyError } = await supabase
      .from('babies')
      .insert({
        name: name.trim(),
        birth_date: birthDate,
        gender,
        created_by: user.id,
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
        display_name: parentName.trim(),
      })

    if (memberError) {
      setError(memberError.message)
      setLoading(false)
      return
    }

    const defaultIntervals = [
      { baby_id: baby.id, category: 'feed', minutes: 180, warn: 150, mode: 'interval', scheduled_hours: null },
      { baby_id: baby.id, category: 'diaper', minutes: 120, warn: 90, mode: 'interval', scheduled_hours: null },
      { baby_id: baby.id, category: 'bath', minutes: 0, warn: 15, mode: 'scheduled', scheduled_hours: '[18]' },
      { baby_id: baby.id, category: 'sleep_nap', minutes: 90, warn: 75, mode: 'interval', scheduled_hours: null },
      { baby_id: baby.id, category: 'sleep_awake', minutes: 120, warn: 100, mode: 'interval', scheduled_hours: null },
    ]

    await supabase.from('interval_configs').insert(defaultIntervals)

    setLoading(false)
    onComplete()
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteCode.trim() || !parentName.trim() || !user) return

    setLoading(true)
    setError(null)

    // Find active invite code
    const { data: invite, error: inviteError } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('code', inviteCode.trim().toUpperCase())
      .eq('active', true)
      .single()

    if (inviteError || !invite) {
      setError('Código inválido ou desativado.')
      setLoading(false)
      return
    }

    // Check expiry
    if (new Date(invite.expires_at) < new Date()) {
      setError('Este código expirou.')
      setLoading(false)
      return
    }

    // Check if already member
    const { data: existing } = await supabase
      .from('baby_members')
      .select('id')
      .eq('baby_id', invite.baby_id)
      .eq('user_id', user.id)
      .single()

    if (existing) {
      setError('Você já faz parte deste bebê.')
      setLoading(false)
      return
    }

    // Add as member
    const { error: memberError } = await supabase
      .from('baby_members')
      .insert({
        baby_id: invite.baby_id,
        user_id: user.id,
        role: 'caregiver',
        display_name: parentName.trim(),
      })

    if (memberError) {
      setError(memberError.message)
      setLoading(false)
      return
    }

    setLoading(false)
    onComplete()
  }

  // Choose mode screen
  if (mode === 'choose') {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm page-enter">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-primary-container/20 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-primary text-3xl">celebration</span>
            </div>
            <h1 className="font-headline text-2xl font-bold text-on-surface mb-1">Bem-vindo ao Yaya!</h1>
            <p className="font-label text-sm text-on-surface-variant">Como você gostaria de começar?</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setMode('create')}
              className="w-full bg-surface-container rounded-xl p-4 flex items-center gap-4 active:bg-surface-container-high active:scale-[0.98] transition-all text-left"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-primary text-xl">child_care</span>
              </div>
              <div>
                <p className="font-body text-sm text-on-surface font-semibold">Cadastrar meu bebê</p>
                <p className="font-label text-xs text-on-surface-variant mt-0.5">Criar um novo perfil do zero</p>
              </div>
            </button>

            <button
              onClick={() => setMode('join')}
              className="w-full bg-surface-container rounded-xl p-4 flex items-center gap-4 active:bg-surface-container-high active:scale-[0.98] transition-all text-left"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-primary text-xl">group_add</span>
              </div>
              <div>
                <p className="font-body text-sm text-on-surface font-semibold">Tenho um código de convite</p>
                <p className="font-label text-xs text-on-surface-variant mt-0.5">Acompanhar um bebê já cadastrado</p>
              </div>
            </button>
          </div>

          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full mt-6 text-center font-label text-sm text-on-surface-variant hover:text-error transition-colors"
          >
            Sair da conta
          </button>
        </div>
      </div>
    )
  }

  // Join mode
  if (mode === 'join') {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm page-enter">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-primary-container/20 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-primary text-3xl">group_add</span>
            </div>
            <h1 className="font-headline text-2xl font-bold text-on-surface mb-1">Entrar com código</h1>
            <p className="font-label text-sm text-on-surface-variant">
              Insira o código de convite que você recebeu
            </p>
          </div>

          <form onSubmit={handleJoin}>
            <div className="mb-4">
              <label className="font-label text-[11px] text-primary font-semibold uppercase tracking-wider block mb-1.5">
                Seu nome
              </label>
              <input
                type="text"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                placeholder="Ex: Papai, Vovó, Babá"
                className="w-full bg-surface-container-low rounded-lg px-4 py-3.5 text-on-surface font-body text-base outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div className="mb-6">
              <label className="font-label text-[11px] text-primary font-semibold uppercase tracking-wider block mb-1.5">
                Código de convite
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="Ex: ABC123"
                maxLength={6}
                className="w-full bg-surface-container-low rounded-lg px-4 py-3.5 text-on-surface font-headline text-xl text-center tracking-widest uppercase outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            {error && <p className="font-label text-sm text-error mb-4">{error}</p>}

            <button
              type="submit"
              disabled={loading || !parentName.trim() || !inviteCode.trim()}
              className="w-full py-3.5 rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary font-label font-bold text-base disabled:opacity-50 transition-opacity"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin text-xl align-middle">progress_activity</span>
              ) : (
                'Entrar'
              )}
            </button>

            <button
              type="button"
              onClick={() => { setMode('choose'); setError(null) }}
              className="w-full mt-3 py-2 text-on-surface-variant font-label text-sm"
            >
              Voltar
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Create mode (original onboarding)
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm page-enter">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary-container/20 flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-primary text-3xl">child_care</span>
          </div>
          <h1 className="font-headline text-2xl font-bold text-on-surface mb-1">
            Cadastrar bebê
          </h1>
          <p className="font-label text-sm text-on-surface-variant">
            Conte-nos sobre seu bebê
          </p>
        </div>

        <form onSubmit={handleCreate}>
          <div className="mb-4">
            <label className="font-label text-[11px] text-primary font-semibold uppercase tracking-wider block mb-1.5">
              Seu nome
            </label>
            <input
              type="text"
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              placeholder="Ex: Mamãe, Papai, Ana"
              className="w-full bg-surface-container-low rounded-lg px-4 py-3.5 text-on-surface font-body text-base outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="mb-4">
            <label className="font-label text-[11px] text-primary font-semibold uppercase tracking-wider block mb-1.5">
              Nome do bebê
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Sofia"
              className="w-full bg-surface-container-low rounded-lg px-4 py-3.5 text-on-surface font-body text-base outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="mb-4">
            <label className="font-label text-[11px] text-primary font-semibold uppercase tracking-wider block mb-1.5">
              Menino ou menina?
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setGender('boy')}
                className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                  gender === 'boy'
                    ? 'bg-blue-500/20 ring-2 ring-blue-400'
                    : 'bg-surface-container-low'
                }`}
              >
                <span className="text-xl">👦</span>
                <span className={`font-label text-sm font-semibold ${gender === 'boy' ? 'text-blue-400' : 'text-on-surface-variant'}`}>
                  Menino
                </span>
              </button>
              <button
                type="button"
                onClick={() => setGender('girl')}
                className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                  gender === 'girl'
                    ? 'bg-pink-500/20 ring-2 ring-pink-400'
                    : 'bg-surface-container-low'
                }`}
              >
                <span className="text-xl">👧</span>
                <span className={`font-label text-sm font-semibold ${gender === 'girl' ? 'text-pink-400' : 'text-on-surface-variant'}`}>
                  Menina
                </span>
              </button>
            </div>
          </div>

          <div className="mb-6">
            <label className="font-label text-[11px] text-primary font-semibold uppercase tracking-wider block mb-1.5">
              Data de nascimento do bebê
            </label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full bg-surface-container-low rounded-lg px-4 py-3.5 text-on-surface font-body text-base outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {error && <p className="font-label text-sm text-error mb-4">{error}</p>}

          <button
            type="submit"
            disabled={loading || !parentName.trim() || !name.trim() || !birthDate || !gender}
            className="w-full py-3.5 rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary font-label font-bold text-base disabled:opacity-50 transition-opacity"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin text-xl align-middle">progress_activity</span>
            ) : (
              'Começar'
            )}
          </button>

          <button
            type="button"
            onClick={() => { setMode('choose'); setError(null) }}
            className="w-full mt-3 py-2 text-on-surface-variant font-label text-sm"
          >
            Voltar
          </button>
        </form>
      </div>
    </div>
  )
}
