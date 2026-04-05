import { useCallback, useState } from 'react'
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Image, Alert } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { useAppState, useAppDispatch, updateBaby, clearAllLogs } from '../contexts/AppContext'
import { signOut } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { formatAge } from '../lib/formatters'
import type { Baby } from '../types'
import Toast from '../components/ui/Toast'

export default function ProfileScreen() {
  const { baby, logs, loading } = useAppState()
  const dispatch = useAppDispatch()
  const [toast, setToast] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(baby?.name ?? '')
  const [uploading, setUploading] = useState(false)

  const handleSaveBaby = useCallback(
    async (updated: Baby) => {
      const ok = await updateBaby(dispatch, updated)
      if (ok) setToast('Dados do bebê atualizados!')
    },
    [dispatch],
  )

  const handleClearHistory = useCallback(() => {
    if (!baby) return
    Alert.alert(
      'Limpar histórico',
      `Tem certeza? Isso apagará todos os ${logs.length} registros.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: async () => {
            const ok = await clearAllLogs(dispatch, baby.id)
            if (ok) setToast('Histórico limpo!')
          },
        },
      ],
    )
  }, [dispatch, baby, logs.length])

  const handlePickPhoto = useCallback(async () => {
    if (!baby) return
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })

    if (result.canceled || !result.assets[0]) return

    setUploading(true)
    const uri = result.assets[0].uri
    const ext = uri.split('.').pop() ?? 'jpg'
    const path = `${baby.id}/photo.${ext}`

    const response = await fetch(uri)
    const blob = await response.blob()

    const { error } = await supabase.storage
      .from('baby-photos')
      .upload(path, blob, { upsert: true, contentType: `image/${ext}` })

    if (!error) {
      const { data } = supabase.storage.from('baby-photos').getPublicUrl(path)
      const photoUrl = data.publicUrl + '?t=' + Date.now()
      handleSaveBaby({ ...baby, photoUrl })
    }
    setUploading(false)
  }, [baby, handleSaveBaby])

  const handleSave = useCallback(() => {
    if (!baby) return
    handleSaveBaby({ ...baby, name })
    setEditing(false)
  }, [baby, name, handleSaveBaby])

  const handleSignOut = useCallback(() => {
    Alert.alert('Sair', 'Deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: signOut },
    ])
  }, [])

  if (loading || !baby) {
    return (
      <View className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator color="#b79fff" size="large" />
      </View>
    )
  }

  return (
    <View className="flex-1 bg-surface">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 16 }}>
        <View className="px-5 pt-6 pb-4">
          <Text className="font-headline text-2xl font-bold text-on-surface mb-1">
            Perfil
          </Text>
          <Text className="font-label text-sm text-on-surface-variant">
            Dados do bebê
          </Text>
        </View>

        <View className="px-5 gap-4">
          {/* Baby Card */}
          <Pressable
            onPress={() => { setName(baby.name); setEditing(true) }}
            className="bg-surface-container rounded-lg p-5 flex-row items-center gap-4 active:opacity-70"
          >
            <Pressable onPress={handlePickPhoto} className="w-16 h-16 rounded-full overflow-hidden bg-primary-container/20 items-center justify-center">
              {baby.photoUrl ? (
                <Image source={{ uri: baby.photoUrl }} className="w-full h-full" />
              ) : (
                <Text className="text-3xl">👶</Text>
              )}
              {uploading && (
                <View className="absolute inset-0 bg-black/50 items-center justify-center">
                  <ActivityIndicator color="#fff" size="small" />
                </View>
              )}
            </Pressable>
            <View className="flex-1">
              <Text className="text-on-surface font-headline font-bold text-lg">{baby.name}</Text>
              <Text className="text-on-surface-variant font-label text-sm">
                {formatAge(baby.birthDate)} de vida
              </Text>
              <Text className="text-on-surface-variant font-label text-xs mt-0.5">
                Nasceu em {new Date(baby.birthDate).toLocaleDateString('pt-BR')}
              </Text>
            </View>
            <Text className="text-on-surface-variant text-xl">✏️</Text>
          </Pressable>

          {/* Edit mode */}
          {editing && (
            <View className="bg-surface-container rounded-lg p-5">
              <Text className="font-label text-xs text-primary font-semibold uppercase tracking-wider mb-1.5">
                Nome
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                className="w-full bg-surface-container-low rounded-lg px-4 py-3 text-on-surface font-body text-base mb-4"
              />
              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => setEditing(false)}
                  className="flex-1 py-2.5 rounded-xl bg-surface-variant items-center"
                >
                  <Text className="text-on-surface-variant font-label font-semibold text-sm">Cancelar</Text>
                </Pressable>
                <Pressable
                  onPress={handleSave}
                  className="flex-1 py-2.5 rounded-xl bg-primary items-center"
                >
                  <Text className="text-on-primary font-label font-semibold text-sm">Salvar</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Data management */}
          <Pressable
            onPress={handleClearHistory}
            className="bg-surface-container rounded-lg p-4 flex-row items-center gap-3 active:opacity-70"
          >
            <Text className="text-xl">🗑️</Text>
            <View className="flex-1">
              <Text className="text-on-surface font-body text-sm font-medium">Limpar histórico</Text>
              <Text className="text-on-surface-variant font-label text-xs">
                {logs.length} registro{logs.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <Text className="text-on-surface-variant">›</Text>
          </Pressable>

          {/* Sign out */}
          <Pressable
            onPress={handleSignOut}
            className="bg-surface-container rounded-lg p-4 flex-row items-center gap-3 active:opacity-70"
          >
            <Text className="text-xl">🚪</Text>
            <View className="flex-1">
              <Text className="text-error font-body text-sm font-medium">Sair da conta</Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </View>
  )
}
