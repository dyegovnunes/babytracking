import { useCallback, useState, useEffect } from 'react'
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Image, Alert, Share } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import * as Clipboard from 'expo-clipboard'
import * as ImagePicker from 'expo-image-picker'
import { useAppState, useAppDispatch, updateBaby, clearAllLogs } from '../contexts/AppContext'
import { useAuth } from '../contexts/AuthContext'
import { signOut } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { formatAge, formatBirthDate } from '../lib/formatters'
import type { Baby } from '../types'
import Toast from '../components/ui/Toast'

export default function ProfileScreen() {
  const navigation = useNavigation<any>()
  const { baby, logs, members, loading } = useAppState()
  const { user } = useAuth()
  const dispatch = useAppDispatch()
  const [toast, setToast] = useState<string | null>(null)

  // Baby editing
  const [editingBaby, setEditingBaby] = useState(false)
  const [babyName, setBabyName] = useState(baby?.name ?? '')
  const [uploading, setUploading] = useState(false)

  // User editing
  const [editingUser, setEditingUser] = useState(false)
  const [displayName, setDisplayName] = useState('')

  // Invite
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [generatingCode, setGeneratingCode] = useState(false)

  // Load current user's display_name
  const currentMember = user ? members[user.id] : null

  useEffect(() => {
    if (currentMember) setDisplayName(currentMember.displayName)
  }, [currentMember])

  const handleSaveBaby = useCallback(
    async (updated: Baby) => {
      const ok = await updateBaby(dispatch, updated)
      if (ok) setToast('Dados do bebê atualizados!')
    },
    [dispatch],
  )

  const handleSaveBabyName = useCallback(() => {
    if (!baby) return
    handleSaveBaby({ ...baby, name: babyName })
    setEditingBaby(false)
  }, [baby, babyName, handleSaveBaby])

  const handleSaveDisplayName = useCallback(async () => {
    if (!user || !baby) return
    const { error } = await supabase
      .from('baby_members')
      .update({ display_name: displayName.trim() })
      .eq('baby_id', baby.id)
      .eq('user_id', user.id)

    if (!error) {
      setToast('Nome atualizado!')
      setEditingUser(false)
    }
  }, [user, baby, displayName])

  const handlePhotoAction = useCallback(() => {
    if (!baby) return
    if (baby.photoUrl) {
      Alert.alert('Foto do bebê', 'O que deseja fazer?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Trocar foto', onPress: () => pickPhoto() },
        { text: 'Remover foto', style: 'destructive', onPress: () => removePhoto() },
      ])
    } else {
      pickPhoto()
    }
  }, [baby])

  const pickPhoto = useCallback(async () => {
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

  const removePhoto = useCallback(async () => {
    if (!baby) return
    setUploading(true)
    // Remove from storage
    await supabase.storage.from('baby-photos').remove([`${baby.id}/photo.jpg`, `${baby.id}/photo.png`, `${baby.id}/photo.jpeg`])
    // Clear URL in database
    handleSaveBaby({ ...baby, photoUrl: undefined })
    setUploading(false)
    setToast('Foto removida!')
  }, [baby, handleSaveBaby])

  const handleGenerateInvite = useCallback(async () => {
    if (!baby || !user) return
    setGeneratingCode(true)

    // Generate 6 char alphanumeric code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)]
    }

    const { error } = await supabase.from('invite_codes').insert({
      baby_id: baby.id,
      code,
      created_by: user.id,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })

    if (!error) {
      setInviteCode(code)
    } else {
      setToast('Erro ao gerar código')
    }
    setGeneratingCode(false)
  }, [baby, user])

  const handleShareInvite = useCallback(async () => {
    if (!inviteCode || !baby) return
    try {
      await Share.share({
        message: `Oi! Estou usando o app para acompanhar o(a) ${baby.name}. Use o código ${inviteCode} para entrar no app e acompanhar junto comigo!`,
      })
    } catch {
      // user cancelled
    }
  }, [inviteCode, baby])

  const handleCopyCode = useCallback(async () => {
    if (!inviteCode) return
    await Clipboard.setStringAsync(inviteCode)
    setToast('Código copiado!')
  }, [inviteCode])

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

  const membersList = Object.values(members)

  return (
    <View className="flex-1 bg-surface">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 16 }}>
        <View className="px-5 pt-6 pb-4">
          <Text className="font-headline text-2xl font-bold text-on-surface mb-1">
            Perfil
          </Text>
        </View>

        <View className="px-5 gap-4">
          {/* ===== MEU PERFIL ===== */}
          <View>
            <Text className="font-label text-xs text-primary font-semibold uppercase tracking-wider mb-2">
              Meu perfil
            </Text>
            <Pressable
              onPress={() => setEditingUser(true)}
              className="bg-surface-container rounded-lg p-4 flex-row items-center gap-3 active:opacity-70"
            >
              <View className="w-11 h-11 rounded-full bg-primary-container/20 items-center justify-center">
                <Text className="text-xl">👤</Text>
              </View>
              <View className="flex-1">
                <Text className="text-on-surface font-body text-base font-medium">
                  {currentMember?.displayName || 'Sem nome'}
                </Text>
                <Text className="text-on-surface-variant font-label text-xs">
                  {user?.email ?? ''}
                </Text>
              </View>
              <Text className="text-on-surface-variant text-xl">✏️</Text>
            </Pressable>
          </View>

          {/* Edit user name */}
          {editingUser && (
            <View className="bg-surface-container rounded-lg p-5">
              <Text className="font-label text-xs text-primary font-semibold uppercase tracking-wider mb-1.5">
                Meu nome
              </Text>
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Ex: Mamãe, Papai, Ana"
                placeholderTextColor="#aca7cc"
                className="w-full bg-surface-container-low rounded-lg px-4 py-3 text-on-surface font-body text-base mb-4"
              />
              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => setEditingUser(false)}
                  className="flex-1 py-2.5 rounded-xl bg-surface-variant items-center"
                >
                  <Text className="text-on-surface-variant font-label font-semibold text-sm">Cancelar</Text>
                </Pressable>
                <Pressable
                  onPress={handleSaveDisplayName}
                  className="flex-1 py-2.5 rounded-xl bg-primary items-center"
                >
                  <Text className="text-on-primary font-label font-semibold text-sm">Salvar</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* ===== BEBÊ ===== */}
          <View>
            <Text className="font-label text-xs text-primary font-semibold uppercase tracking-wider mb-2">
              Bebê
            </Text>
            <Pressable
              onPress={() => { setBabyName(baby.name); setEditingBaby(true) }}
              className="bg-surface-container rounded-lg p-4 flex-row items-center gap-3 active:opacity-70"
            >
              <Pressable onPress={handlePhotoAction} className="w-14 h-14 rounded-full overflow-hidden bg-primary-container/20 items-center justify-center">
                {baby.photoUrl ? (
                  <Image source={{ uri: baby.photoUrl }} className="w-full h-full" />
                ) : (
                  <Text className="text-2xl">👶</Text>
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
                  Nasceu em {formatBirthDate(baby.birthDate)}
                </Text>
              </View>
              <Text className="text-on-surface-variant text-xl">✏️</Text>
            </Pressable>
          </View>

          {/* Edit baby name */}
          {editingBaby && (
            <View className="bg-surface-container rounded-lg p-5">
              <Text className="font-label text-xs text-primary font-semibold uppercase tracking-wider mb-1.5">
                Nome do bebê
              </Text>
              <TextInput
                value={babyName}
                onChangeText={setBabyName}
                className="w-full bg-surface-container-low rounded-lg px-4 py-3 text-on-surface font-body text-base mb-4"
              />
              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => setEditingBaby(false)}
                  className="flex-1 py-2.5 rounded-xl bg-surface-variant items-center"
                >
                  <Text className="text-on-surface-variant font-label font-semibold text-sm">Cancelar</Text>
                </Pressable>
                <Pressable
                  onPress={handleSaveBabyName}
                  className="flex-1 py-2.5 rounded-xl bg-primary items-center"
                >
                  <Text className="text-on-primary font-label font-semibold text-sm">Salvar</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* ===== CUIDADORES ===== */}
          <View>
            <Text className="font-label text-xs text-primary font-semibold uppercase tracking-wider mb-2">
              Cuidadores
            </Text>
            <View className="bg-surface-container rounded-lg overflow-hidden">
              {membersList.map((member, i) => (
                <View
                  key={member.userId}
                  className={`p-4 flex-row items-center gap-3 ${i > 0 ? 'border-t border-outline-variant/20' : ''}`}
                >
                  <View className="w-9 h-9 rounded-full bg-primary-container/20 items-center justify-center">
                    <Text className="text-base">
                      {member.userId === user?.id ? '⭐' : '👤'}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-on-surface font-body text-sm font-medium">
                      {member.displayName || 'Sem nome'}
                    </Text>
                    <Text className="text-on-surface-variant font-label text-xs">
                      {member.role === 'parent' ? 'Responsável' : member.role}
                      {member.userId === user?.id ? ' (você)' : ''}
                    </Text>
                  </View>
                </View>
              ))}

              {/* Invite button */}
              <Pressable
                onPress={inviteCode ? handleCopyCode : handleGenerateInvite}
                disabled={generatingCode}
                className="p-4 flex-row items-center gap-3 border-t border-outline-variant/20 active:opacity-70"
              >
                <View className="w-9 h-9 rounded-full bg-primary/20 items-center justify-center">
                  {generatingCode ? (
                    <ActivityIndicator color="#b79fff" size="small" />
                  ) : (
                    <Text className="text-base">➕</Text>
                  )}
                </View>
                <View className="flex-1">
                  {inviteCode ? (
                    <>
                      <View className="flex-row items-center gap-2">
                        <Text className="text-primary font-headline font-bold text-lg tracking-widest">
                          {inviteCode}
                        </Text>
                        <Text className="text-on-surface-variant font-label text-xs">
                          (toque para copiar)
                        </Text>
                      </View>
                      <Text className="text-on-surface-variant font-label text-xs">
                        Válido por 7 dias
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text className="text-primary font-body text-sm font-medium">
                        Convidar cuidador
                      </Text>
                      <Text className="text-on-surface-variant font-label text-xs">
                        Gerar código para compartilhar
                      </Text>
                    </>
                  )}
                </View>
                {inviteCode && (
                  <Pressable onPress={handleShareInvite} className="px-3 py-1.5 rounded-lg bg-primary/20 active:opacity-70">
                    <Text className="text-primary font-label text-xs font-semibold">Enviar</Text>
                  </Pressable>
                )}
              </Pressable>
            </View>
          </View>

          {/* ===== AÇÕES ===== */}
          <View className="gap-2 mt-2">
            {/* Settings */}
            <Pressable
              onPress={() => navigation.navigate('Settings')}
              className="bg-surface-container rounded-lg p-4 flex-row items-center gap-3 active:opacity-70"
            >
              <Text className="text-xl">⚙️</Text>
              <View className="flex-1">
                <Text className="text-on-surface font-body text-sm font-medium">Configurações</Text>
                <Text className="text-on-surface-variant font-label text-xs">
                  Intervalos, notificações
                </Text>
              </View>
              <Text className="text-on-surface-variant">›</Text>
            </Pressable>

            {/* Clear history */}
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
        </View>
      </ScrollView>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </View>
  )
}
