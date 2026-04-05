import { useState } from 'react'
import { View, Text, TextInput, Pressable, Modal } from 'react-native'

interface Props {
  visible: boolean
  onConfirm: (ml: number) => void
  onClose: () => void
}

const quickAmounts = [30, 60, 90, 120]

export default function BottleModal({ visible, onConfirm, onClose }: Props) {
  const [amount, setAmount] = useState('60')

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/75 justify-end" onPress={onClose}>
        <Pressable className="w-full bg-surface-container-highest rounded-t-3xl p-6" onPress={() => {}}>
          <View className="flex-row items-center gap-3 mb-1">
            <Text className="text-2xl">🍼</Text>
            <Text className="font-headline text-lg font-bold text-on-surface">
              Quanto mamou?
            </Text>
          </View>
          <Text className="font-label text-sm text-on-surface-variant mb-5">
            Volume em ml
          </Text>

          <View className="flex-row gap-2 mb-4">
            {quickAmounts.map((val) => (
              <Pressable
                key={val}
                onPress={() => setAmount(String(val))}
                className="flex-1 py-2.5 rounded-full items-center"
                style={{
                  backgroundColor: amount === String(val) ? '#b79fff' : '#2a2547',
                }}
              >
                <Text
                  className="font-label text-sm font-semibold"
                  style={{ color: amount === String(val) ? '#0d0a27' : '#aca7cc' }}
                >
                  {val}ml
                </Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            keyboardType="number-pad"
            value={amount}
            onChangeText={setAmount}
            placeholder="Quantidade em ml"
            placeholderTextColor="#aca7cc"
            className="w-full bg-surface-container-low rounded-lg px-4 py-3 text-on-surface font-body text-base mb-5"
          />

          <View className="flex-row gap-3">
            <Pressable
              onPress={onClose}
              className="flex-1 py-3 rounded-xl bg-surface-variant items-center"
            >
              <Text className="text-on-surface-variant font-label font-semibold text-sm">
                Cancelar
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                const ml = parseInt(amount)
                if (ml > 0) onConfirm(ml)
              }}
              className="flex-1 py-3 rounded-xl bg-primary items-center"
            >
              <Text className="text-on-primary font-label font-semibold text-sm">
                Confirmar
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
