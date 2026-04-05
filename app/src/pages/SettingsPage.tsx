import { useNavigate } from 'react-router-dom'
import { useAppState, useAppDispatch, updateIntervals } from '../contexts/AppContext'
import { useAuth, signOut } from '../contexts/AuthContext'
import type { IntervalConfig } from '../types'
import IntervalSettings from '../components/profile/IntervalSettings'
import { useState, useCallback } from 'react'
import Toast from '../components/ui/Toast'

export default function SettingsPage() {
  const { baby, intervals } = useAppState()
  const { user } = useAuth()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [toast, setToast] = useState<string | null>(null)

  const handleSaveIntervals = useCallback(
    async (updated: Record<string, IntervalConfig>) => {
      if (!baby) return
      const ok = await updateIntervals(dispatch, baby.id, updated)
      if (ok) setToast('Intervalos atualizados!')
    },
    [dispatch, baby],
  )

  return (
    <div className="pb-4 page-enter">
      <section className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-xl">
              arrow_back
            </span>
          </button>
          <h1 className="font-headline text-2xl font-bold text-on-surface">
            Configurações
          </h1>
        </div>
      </section>

      <div className="px-5 space-y-4">
        {/* Intervalos */}
        <IntervalSettings intervals={intervals} onSave={handleSaveIntervals} />

        {/* Notificações (placeholder) */}
        <div className="bg-surface-container rounded-lg overflow-hidden">
          <div className="flex items-center gap-3 p-4">
            <span className="material-symbols-outlined text-primary text-xl">
              notifications
            </span>
            <h3 className="text-on-surface font-headline text-sm font-bold">
              Notificações
            </h3>
          </div>

          <div className="px-4 pb-4 space-y-3">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-body text-sm text-on-surface">Alertas de projeção</p>
                <p className="font-label text-xs text-on-surface-variant">Avisa quando estiver perto da hora</p>
              </div>
              <div className="w-11 h-6 bg-primary/30 rounded-full relative cursor-pointer">
                <div className="w-5 h-5 bg-primary rounded-full absolute top-0.5 right-0.5" />
              </div>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-body text-sm text-on-surface">Alertas de atraso</p>
                <p className="font-label text-xs text-on-surface-variant">Avisa quando passar do horário</p>
              </div>
              <div className="w-11 h-6 bg-primary/30 rounded-full relative cursor-pointer">
                <div className="w-5 h-5 bg-primary rounded-full absolute top-0.5 right-0.5" />
              </div>
            </div>
          </div>

          <p className="px-4 pb-4 font-label text-[10px] text-on-surface-variant/50">
            Push notifications estarão disponíveis na versão nativa
          </p>
        </div>

        {/* Aparência (placeholder) */}
        <div className="bg-surface-container rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="material-symbols-outlined text-primary text-xl">
              palette
            </span>
            <h3 className="text-on-surface font-headline text-sm font-bold">
              Aparência
            </h3>
          </div>
          <div className="flex items-center justify-between py-2">
            <p className="font-body text-sm text-on-surface">Tema escuro</p>
            <div className="w-11 h-6 bg-primary/30 rounded-full relative cursor-pointer">
              <div className="w-5 h-5 bg-primary rounded-full absolute top-0.5 right-0.5" />
            </div>
          </div>
        </div>

        {/* Conta */}
        <div className="bg-surface-container rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="material-symbols-outlined text-on-surface-variant text-xl">
              account_circle
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-on-surface font-body text-sm font-medium truncate">
                {user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full py-2.5 rounded-xl bg-error/10 text-error font-label font-semibold text-sm"
          >
            Sair da conta
          </button>
        </div>

        <div className="pt-2 text-center">
          <p className="font-label text-[10px] text-on-surface-variant/50">
            BabyTracking v0.1.0
          </p>
        </div>
      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}
