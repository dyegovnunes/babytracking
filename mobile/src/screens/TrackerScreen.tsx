import { useState, useCallback } from 'react'
import { View, Text, ScrollView, ActivityIndicator } from 'react-native'
import { useAppState, useAppDispatch, addLog } from '../contexts/AppContext'
import { useAuth } from '../contexts/AuthContext'
import { DEFAULT_EVENTS } from '../lib/constants'
import { getNextProjection } from '../lib/projections'
import { useTimer } from '../hooks/useTimer'
import { hapticSuccess, hapticLight } from '../lib/haptics'
import { useNotificationSync } from '../hooks/useNotificationSync'
import HeroIdentity from '../components/activity/HeroIdentity'
import ActivityGrid from '../components/activity/ActivityGrid'
import PredictionCard from '../components/activity/PredictionCard'
import RecentLogs from '../components/activity/RecentLogs'
import BottleModal from '../components/ui/BottleModal'
import Toast from '../components/ui/Toast'

const PROJECTION_CATEGORIES: string[] = ['feed', 'diaper', 'sleep_nap', 'sleep_awake', 'bath']

export default function TrackerScreen() {
  useNotificationSync()
  const { logs, intervals, baby, members, loading } = useAppState()
  const dispatch = useAppDispatch()
  const { user } = useAuth()
  const now = useTimer()

  const [bottleModalOpen, setBottleModalOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const handleLog = useCallback(
    async (eventId: string) => {
      if (!baby) return

      const event = DEFAULT_EVENTS.find((e) => e.id === eventId)
      if (!event) return

      if (event.hasAmount) {
        hapticLight()
        setBottleModalOpen(true)
        return
      }

      const log = await addLog(dispatch, eventId, baby.id, undefined, user?.id)
      if (log) {
        hapticSuccess()
        setToast(`${event.label} registrado!`)
      }
    },
    [baby, dispatch, user],
  )

  const handleBottleConfirm = useCallback(
    async (ml: number) => {
      if (!baby) return
      setBottleModalOpen(false)
      const log = await addLog(dispatch, 'bottle', baby.id, ml, user?.id)
      if (log) {
        hapticSuccess()
        setToast(`Mamadeira ${ml}ml registrada!`)
      }
    },
    [baby, dispatch, user],
  )

  void now

  const projections = PROJECTION_CATEGORIES
    .map((cat) => getNextProjection(logs, cat, intervals, DEFAULT_EVENTS, { pauseDuringSleep: false }))
    .filter(Boolean)

  if (loading) {
    return (
      <View className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator color="#b79fff" size="large" />
      </View>
    )
  }

  return (
    <View className="flex-1 bg-surface">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 16 }}>
        <HeroIdentity />
        <ActivityGrid events={DEFAULT_EVENTS} logs={logs} onLog={handleLog} />

        {projections.length > 0 && (
          <View className="px-5 mt-6">
            <Text className="font-headline text-base font-bold text-on-surface mb-3">
              Projeções
            </Text>
            <View className="gap-2">
              {projections.map((p) => (
                <PredictionCard key={p!.label} projection={p!} />
              ))}
            </View>
          </View>
        )}

        <RecentLogs logs={logs} members={members} />
      </ScrollView>

      <BottleModal
        visible={bottleModalOpen}
        onConfirm={handleBottleConfirm}
        onClose={() => setBottleModalOpen(false)}
      />

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </View>
  )
}
