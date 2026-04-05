import { View, Text, ScrollView, ActivityIndicator } from 'react-native'
import { useAppState } from '../contexts/AppContext'
import { useInsights } from '../hooks/useInsights'
import DaySummaryCard from '../components/insights/DaySummaryCard'
import FeedingInsights from '../components/insights/FeedingInsights'
import SleepInsights from '../components/insights/SleepInsights'
import WeekChart from '../components/insights/WeekChart'

export default function InsightsScreen() {
  const { logs, loading } = useAppState()
  const insights = useInsights(logs)

  if (loading) {
    return (
      <View className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator color="#b79fff" size="large" />
      </View>
    )
  }

  if (logs.length === 0) {
    return (
      <View className="flex-1 bg-surface">
        <View className="px-5 pt-6 pb-4">
          <Text className="font-headline text-2xl font-bold text-on-surface mb-1">
            Insights
          </Text>
          <Text className="font-label text-sm text-on-surface-variant">
            Padrões e tendências
          </Text>
        </View>
        <View className="items-center justify-center py-16 px-5">
          <Text className="text-4xl mb-4">📊</Text>
          <Text className="text-center text-on-surface-variant font-label text-sm">
            Registre atividades para ver os insights do seu bebê.
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-surface">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 16 }}>
        <View className="px-5 pt-6 pb-4">
          <Text className="font-headline text-2xl font-bold text-on-surface mb-1">
            Insights
          </Text>
          <Text className="font-label text-sm text-on-surface-variant">
            Padrões e tendências
          </Text>
        </View>

        <View className="px-5 gap-4">
          <DaySummaryCard summary={insights.todaySummary} />
          <FeedingInsights pattern={insights.feedingPattern} />
          <SleepInsights pattern={insights.sleepPattern} />
          <WeekChart trends={insights.weekTrends} />
        </View>
      </ScrollView>
    </View>
  )
}
