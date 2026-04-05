import { useEffect } from 'react'
import { View, Text, Animated } from 'react-native'

interface Props {
  message: string
  onDismiss: () => void
  duration?: number
}

export default function Toast({ message, onDismiss, duration = 3000 }: Props) {
  const opacity = new Animated.Value(0)

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start()

    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => onDismiss())
    }, duration)

    return () => clearTimeout(timer)
  }, [])

  return (
    <View className="absolute bottom-24 left-0 right-0 items-center" pointerEvents="none">
      <Animated.View style={{ opacity }} className="bg-primary px-5 py-2.5 rounded-full">
        <Text className="text-on-primary font-label text-sm font-semibold">
          {message}
        </Text>
      </Animated.View>
    </View>
  )
}
