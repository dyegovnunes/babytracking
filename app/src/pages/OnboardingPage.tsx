import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface Props {
  onComplete: () => void
}

export default function OnboardingPage({ onComplete }: Props) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !birthDate || !user) return

    setLoading(true)
    setError(null)

    // Create baby
    const { data: baby, error: babyError } = await supabase
      .from('babies')
      .insert({
        name: name.trim(),
        birth_date: birthDate,
        created_by: user.id,
      })
      .select()
      .single()

    if (babyError || !baby) {
      setError(babyError?.message ?? 'Erro ao criar perfil do bebê')
      setLoading(false)
      return
    }

    // Add user as member
    const { error: memberError } = await supabase
      .from('baby_members')
      .insert({
        baby_id: baby.id,
        user_id: user.id,
        role: 'parent',
      })

    if (memberError) {
      setError(memberError.message)
      setLoading(false)
      return
    }

    // Insert default intervals
    const defaultIntervals = [
      { baby_id: baby.id, category: 'feed', minutes: 180, warn: 150 },
      { baby_id: baby.id, category: 'diaper', minutes: 120, warn: 90 },
      { baby_id: baby.id, category: 'bath', minutes: 1440, warn: 1200 },
      { baby_id: baby.id, category: 'sleep', minutes: 90, warn: 60 },
    ]

    await supabase.from('interval_configs').insert(defaultIntervals)

    setLoading(false)
    onComplete()
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm page-enter">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary-container/20 flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-primary text-3xl">
              celebration
            </span>
          </div>
          <h1 className="font-headline text-2xl font-bold text-on-surface mb-1">
            Bem-vindo!
          </h1>
          <p className="font-label text-sm text-on-surface-variant">
            Conte-nos sobre seu bebê
          </p>
        </div>

        <form onSubmit={handleSubmit}>
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

          <div className="mb-6">
            <label className="font-label text-[11px] text-primary font-semibold uppercase tracking-wider block mb-1.5">
              Data de nascimento
            </label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full bg-surface-container-low rounded-lg px-4 py-3.5 text-on-surface font-body text-base outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {error && (
            <p className="font-label text-sm text-error mb-4">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !name.trim() || !birthDate}
            className="w-full py-3.5 rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary font-label font-bold text-base disabled:opacity-50 transition-opacity"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin text-xl align-middle">
                progress_activity
              </span>
            ) : (
              'Começar'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
