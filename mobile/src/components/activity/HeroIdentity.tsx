import { View, Text, Pressable } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useTimer } from '../../hooks/useTimer'
import { useAppState } from '../../contexts/AppContext'
import { formatTime, formatDateLong, formatAge } from '../../lib/formatters'

export default function HeroIdentity() {
  const navigation = useNavigation<any>()
  const now = useTimer()
  const { baby } = useAppState()

  return (
    <View className="py-6 px-5">
      {/* Settings gear - top right */}
      <Pressable
        onPress={() => navigation.navigate('Settings')}
        className="absolute top-4 right-5 w-10 h-10 rounded-full bg-surface-container items-center justify-center active:opacity-70"
        style={{ zIndex: 10 }}
      >
        <Text className="text-lg" style={{ opacity: 0.6 }}>⚙️</Text>
      </Pressable>

      <View className="items-center">
        {baby && (
          <View className="flex-row items-center gap-2 bg-surface-container rounded-full px-4 py-1.5 mb-4">
            <Text className="text-base">👶</Text>
            <Text className="font-label text-sm text-on-surface font-medium">
              {baby.name}
            </Text>
            <Text className="text-on-surface-variant font-label text-xs">
              {formatAge(baby.birthDate)}
            </Text>
          </View>
        )}
        <Text className="font-headline text-5xl font-extrabold text-on-surface tracking-tight">
          {formatTime(now)}
        </Text>
        <Text className="font-label text-sm text-on-surface-variant mt-1 capitalize">
          {formatDateLong(now)}
        </Text>
      </View>
    </View>
  )
}
