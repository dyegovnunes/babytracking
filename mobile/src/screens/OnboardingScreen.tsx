import { useState } from 'react'
import { View, Text, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import DateTimePicker from '@react-native-community/datetimepicker'

interface Props {
  onComplete: () => void
  onJoin?: () => void
}

export default function OnboardingScreen({ onComplete, onJoin }: Props) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState<Date | null>(null)
  const [parentName, setParentName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)

  async function handleSubmit() {
    if (!name.trim() || !birthDate || !parentName.trim() || !user) return

    setLoading(true)
    setError(null)

    const dateStr = birthDate.toISOString().slice(0, 10)

    const { data: baby, error: babyError } = await supabase
      .from('babies')
      .insert({
        name: name.trim(),
        birth_date: dateStr,
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
      { baby_id: baby.id, category: 'feed', minutes: 180, warn: 150 },
      { baby_id: baby.id, category: 'diaper', minutes: 120, warn: 90 },
      { baby_id: baby.id, category: 'bath', minutes: 1440, warn: 1200 },
      { baby_id: baby.id, category: 'sleep', minutes: 90, warn: 60 },
    ]

    await supabase.from('interval_configs').insert(defaultIntervals)

    setLoading(false)
    onComplete()
  }

  const canSubmit = parentName.trim() && name.trim() && birthDate

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-surface"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
        className="px-6"
      >
        <View className="w-full items-center">
          <View className="items-center mb-8">
            <View className="w-16 h-16 rounded-full bg-primary-container/20 items-center justify-center mb-4">
              <Text className="text-3xl">🎉</Text>
            </View>
            <Text className="font-headline text-2xl font-bold text-on-surface mb-1">
              Bem-vindo!
            </Text>
            <Text className="font-label text-sm text-on-surface-variant">
              Conte-nos sobre seu bebê
            </Text>
          </View>

          <View className="w-full">
            {/* Parent name */}
            <View className="mb-4">
              <Text className="font-label text-xs text-primary font-semibold uppercase tracking-wider mb-1.5">
                Seu nome
              </Text>
              <TextInput
                value={parentName}
                onChangeText={setParentName}
                placeholder="Ex: Mamãe, Papai, Ana"
                placeholderTextColor="#aca7cc"
                className="w-full bg-surface-container-low rounded-lg px-4 py-3.5 text-on-surface font-body text-base"
              />
            </View>

            {/* Baby name */}
            <View className="mb-4">
              <Text className="font-label text-xs text-primary font-semibold uppercase tracking-wider mb-1.5">
                Nome do bebê
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Ex: Sofia"
                placeholderTextColor="#aca7cc"
                className="w-full bg-surface-container-low rounded-lg px-4 py-3.5 text-on-surface font-body text-base"
              />
            </View>

            {/* Birth date */}
            <View className="mb-6">
              <Text className="font-label text-xs text-primary font-semibold uppercase tracking-wider mb-1.5">
                Data de nascimento
              </Text>
              <Pressable
                onPress={() => setShowDatePicker(true)}
                className="w-full bg-surface-container-low rounded-lg px-4 py-3.5"
              >
                <Text className={birthDate ? 'text-on-surface font-body text-base' : 'text-on-surface-variant font-body text-base'}>
                  {birthDate
                    ? birthDate.toLocaleDateString('pt-BR')
                    : 'Selecione a data'}
                </Text>
              </Pressable>
              {showDatePicker && (
                <DateTimePicker
                  value={birthDate ?? new Date()}
                  mode="date"
                  display="default"
                  maximumDate={new Date()}
                  onChange={(_event, date) => {
                    setShowDatePicker(false)
                    if (date) setBirthDate(date)
                  }}
                />
              )}
            </View>

            {error && (
              <Text className="font-label text-sm text-error mb-4">{error}</Text>
            )}

            <Pressable
              onPress={handleSubmit}
              disabled={loading || !canSubmit}
              className="w-full py-3.5 rounded-xl bg-primary items-center active:opacity-80 mb-4"
              style={{ opacity: loading || !canSubmit ? 0.5 : 1 }}
            >
              {loading ? (
                <ActivityIndicator color="#361083" />
              ) : (
                <Text className="text-on-primary font-label font-bold text-base">
                  Começar
                </Text>
              )}
            </Pressable>

            {onJoin && (
              <Pressable
                onPress={onJoin}
                className="w-full py-3 items-center active:opacity-70"
              >
                <Text className="text-primary font-label text-sm font-medium">
                  Já tenho um código de convite
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
