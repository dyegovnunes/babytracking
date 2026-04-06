import { useState } from 'react'
import { View, Text, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface Props {
  onComplete: () => void
  onBack: () => void
}

export default function JoinBabyScreen({ onComplete, onBack }: Props) {
  const { user } = useAuth()
  const [code, setCode] = useState('')
  const [parentName, setParentName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleJoin() {
    if (!code.trim() || !parentName.trim() || !user) return

    setLoading(true)
    setError(null)

    const normalizedCode = code.trim().toUpperCase()

    // Look up the invite code
    const { data: invite, error: lookupError } = await supabase
      .from('invite_codes')
      .select('id, baby_id, used_by, expires_at')
      .eq('code', normalizedCode)
      .single()

    if (lookupError || !invite) {
      setError('Código não encontrado. Verifique e tente novamente.')
      setLoading(false)
      return
    }

    if (invite.used_by) {
      setError('Este código já foi utilizado.')
      setLoading(false)
      return
    }

    if (new Date(invite.expires_at) < new Date()) {
      setError('Este código expirou. Peça um novo código.')
      setLoading(false)
      return
    }

    // Check if user is already a member
    const { data: existing } = await supabase
      .from('baby_members')
      .select('id')
      .eq('baby_id', invite.baby_id)
      .eq('user_id', user.id)
      .limit(1)

    if (existing && existing.length > 0) {
      setError('Você já tem acesso a este bebê!')
      setLoading(false)
      return
    }

    // Add user as member
    const { error: memberError } = await supabase
      .from('baby_members')
      .insert({
        baby_id: invite.baby_id,
        user_id: user.id,
        role: 'parent',
        display_name: parentName.trim(),
      })

    if (memberError) {
      setError('Erro ao entrar. Tente novamente.')
      setLoading(false)
      return
    }

    // Mark invite as used
    await supabase
      .from('invite_codes')
      .update({ used_by: user.id, used_at: new Date().toISOString() })
      .eq('id', invite.id)

    setLoading(false)
    onComplete()
  }

  const canSubmit = code.trim().length >= 6 && parentName.trim()

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
              <Text className="text-3xl">🤝</Text>
            </View>
            <Text className="font-headline text-2xl font-bold text-on-surface mb-1">
              Entrar com código
            </Text>
            <Text className="font-label text-sm text-on-surface-variant text-center">
              Insira o código que você recebeu para acompanhar o bebê junto
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
                placeholder="Ex: Mamãe, Papai, Vovó"
                placeholderTextColor="#aca7cc"
                className="w-full bg-surface-container-low rounded-lg px-4 py-3.5 text-on-surface font-body text-base"
              />
            </View>

            {/* Invite code */}
            <View className="mb-6">
              <Text className="font-label text-xs text-primary font-semibold uppercase tracking-wider mb-1.5">
                Código de convite
              </Text>
              <TextInput
                value={code}
                onChangeText={(t) => setCode(t.toUpperCase())}
                placeholder="Ex: ABC123"
                placeholderTextColor="#aca7cc"
                autoCapitalize="characters"
                maxLength={6}
                className="w-full bg-surface-container-low rounded-lg px-4 py-3.5 text-on-surface font-headline text-xl text-center tracking-[8px]"
              />
            </View>

            {error && (
              <Text className="font-label text-sm text-error mb-4 text-center">{error}</Text>
            )}

            <Pressable
              onPress={handleJoin}
              disabled={loading || !canSubmit}
              className="w-full py-3.5 rounded-xl bg-primary items-center active:opacity-80 mb-4"
              style={{ opacity: loading || !canSubmit ? 0.5 : 1 }}
            >
              {loading ? (
                <ActivityIndicator color="#361083" />
              ) : (
                <Text className="text-on-primary font-label font-bold text-base">
                  Entrar
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={onBack}
              className="w-full py-3 items-center active:opacity-70"
            >
              <Text className="text-on-surface-variant font-label text-sm">
                Voltar
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
