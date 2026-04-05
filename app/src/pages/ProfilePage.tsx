import { useCallback, useState } from 'react'
import { useAppState, useAppDispatch, updateBaby, clearAllLogs } from '../contexts/AppContext'
import type { Baby } from '../types'
import BabyCard from '../components/profile/BabyCard'
import DataManagement from '../components/profile/DataManagement'
import Toast from '../components/ui/Toast'

export default function ProfilePage() {
  const { baby, logs, loading } = useAppState()
  const dispatch = useAppDispatch()
  const [toast, setToast] = useState<string | null>(null)

  const handleSaveBaby = useCallback(
    async (updated: Baby) => {
      const ok = await updateBaby(dispatch, updated)
      if (ok) setToast('Dados do bebê atualizados!')
    },
    [dispatch],
  )

  const handleClearHistory = useCallback(async () => {
    if (!baby) return
    const ok = await clearAllLogs(dispatch, baby.id)
    if (ok) setToast('Histórico limpo!')
  }, [dispatch, baby])

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
        <BabyCard baby={baby} onSave={handleSaveBaby} />
        <DataManagement logs={logs} babyName={baby.name} onClearHistory={handleClearHistory} />
      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}
