import { useState, useRef, useEffect, useCallback } from 'react'
import { View, Text, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { signInWithEmail, signInWithGoogle, verifyOtp } from '../contexts/AuthContext'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [otp, setOtp] = useState(['', '', '', ''])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [socialLoading, setSocialLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const inputRefs = useRef<(TextInput | null)[]>([])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0) return
    setError(null)
    const result = await signInWithEmail(email.trim())
    if (result.error) {
      setError(result.error)
    } else {
      setResendCooldown(60)
      setOtp(['', '', '', ''])
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    }
  }, [email, resendCooldown])

  async function handleGoogle() {
    setSocialLoading(true)
    setError(null)
    const result = await signInWithGoogle()
    if (result.error) {
      setError(result.error)
    }
    setSocialLoading(false)
  }

  async function handleSubmit() {
    if (!email.trim()) return
    setLoading(true)
    setError(null)

    const result = await signInWithEmail(email.trim())
    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else {
      setSent(true)
      setOtp(['', '', '', ''])
      setResendCooldown(60)
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    }
  }

  function handleOtpChange(index: number, value: string) {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 4).split('')
      const newOtp = [...otp]
      digits.forEach((d, i) => {
        if (index + i < 4) newOtp[index + i] = d
      })
      setOtp(newOtp)
      const nextIndex = Math.min(index + digits.length, 3)
      inputRefs.current[nextIndex]?.focus()

      if (newOtp.every((d) => d !== '')) {
        submitOtp(newOtp.join(''))
      }
      return
    }

    const digit = value.replace(/\D/g, '')
    const newOtp = [...otp]
    newOtp[index] = digit
    setOtp(newOtp)

    if (digit && index < 3) {
      inputRefs.current[index + 1]?.focus()
    }

    if (newOtp.every((d) => d !== '')) {
      submitOtp(newOtp.join(''))
    }
  }

  function handleOtpKeyPress(index: number, key: string) {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  async function submitOtp(code: string) {
    setVerifying(true)
    setError(null)

    const result = await verifyOtp(email, code)
    if (result.error) {
      setError('Código inválido. Tente novamente.')
      setOtp(['', '', '', ''])
      setVerifying(false)
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    }
  }

  if (sent) {
    return (
      <View className="flex-1 bg-surface justify-center items-center px-6">
        <View className="w-full max-w-sm items-center">
          <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center mb-4">
            <Text className="text-3xl">🔑</Text>
          </View>
          <Text className="font-headline text-lg font-bold text-on-surface mb-2">
            Digite o código
          </Text>
          <Text className="font-label text-sm text-on-surface-variant mb-6 text-center">
            Enviamos um código para{' '}
            <Text className="text-on-surface font-bold">{email}</Text>
          </Text>

          <View className="flex-row justify-center gap-2 mb-4">
            {otp.map((digit, i) => (
              <TextInput
                key={i}
                ref={(el) => { inputRefs.current[i] = el }}
                keyboardType="number-pad"
                maxLength={i === 0 ? 4 : 1}
                value={digit}
                onChangeText={(v) => handleOtpChange(i, v)}
                onKeyPress={({ nativeEvent }) => handleOtpKeyPress(i, nativeEvent.key)}
                editable={!verifying}
                className="w-9 h-12 bg-surface-container-low rounded-lg text-center text-on-surface font-headline text-xl font-bold"
                style={{ opacity: verifying ? 0.5 : 1 }}
              />
            ))}
          </View>

          {error && (
            <Text className="font-label text-sm text-error mb-4">{error}</Text>
          )}

          {verifying && (
            <View className="flex-row items-center gap-2 mb-4">
              <ActivityIndicator color="#b79fff" size="small" />
              <Text className="font-label text-sm text-on-surface-variant">
                Verificando...
              </Text>
            </View>
          )}

          <View className="flex-row items-center gap-4">
            <Pressable onPress={handleResend} disabled={resendCooldown > 0}>
              <Text
                className="font-label text-sm font-medium"
                style={{ color: resendCooldown > 0 ? '#aca7cc60' : '#b79fff' }}
              >
                {resendCooldown > 0 ? `Reenviar (${resendCooldown}s)` : 'Reenviar código'}
              </Text>
            </Pressable>
            <Text className="text-on-surface-variant/30">|</Text>
            <Pressable onPress={() => { setSent(false); setError(null) }}>
              <Text className="font-label text-sm text-on-surface-variant font-medium">
                Outro email
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    )
  }

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
          {/* Logo */}
          <View className="items-center mb-10">
            <View className="w-20 h-20 rounded-full bg-primary-container/20 items-center justify-center mb-5">
              <Text className="text-4xl">👶</Text>
            </View>
            <Text className="font-headline text-3xl font-extrabold text-on-surface tracking-tight">
              Ya<Text className="text-primary">ya</Text>
            </Text>
            <Text className="font-label text-sm text-on-surface-variant mt-2">
              Cada momento conta.
            </Text>
          </View>

          {/* Google button */}
          <Pressable
            onPress={handleGoogle}
            disabled={socialLoading}
            className="w-full py-3.5 rounded-xl bg-surface-container-low flex-row items-center justify-center gap-3 active:bg-surface-container-high"
            style={{ opacity: socialLoading ? 0.5 : 1 }}
          >
            {socialLoading ? (
              <ActivityIndicator color="#e7e2ff" />
            ) : (
              <>
                <Svg width={20} height={20} viewBox="0 0 24 24">
                  <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </Svg>
                <Text className="font-label font-semibold text-base text-on-surface">
                  Entrar com Google
                </Text>
              </>
            )}
          </Pressable>

          {/* Separator */}
          <View className="flex-row items-center gap-3 my-6 w-full">
            <View className="flex-1 h-px bg-outline-variant/30" />
            <Text className="font-label text-xs text-on-surface-variant">ou</Text>
            <View className="flex-1 h-px bg-outline-variant/30" />
          </View>

          {/* Email form */}
          <View className="w-full">
            <Text className="font-label text-xs text-primary font-semibold uppercase tracking-wider mb-2">
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="seu@email.com"
              placeholderTextColor="#aca7cc"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              className="w-full bg-surface-container-low rounded-lg px-4 py-3.5 text-on-surface font-body text-base mb-4"
            />

            {error && (
              <Text className="font-label text-sm text-error mb-4">{error}</Text>
            )}

            <Pressable
              onPress={handleSubmit}
              disabled={loading || !email.trim()}
              className="w-full py-3.5 rounded-xl bg-primary items-center active:opacity-80"
              style={{ opacity: loading || !email.trim() ? 0.5 : 1 }}
            >
              {loading ? (
                <ActivityIndicator color="#361083" />
              ) : (
                <Text className="text-on-primary font-label font-bold text-base">
                  Enviar código de acesso
                </Text>
              )}
            </Pressable>

            <Text className="text-center font-label text-xs text-on-surface-variant mt-4">
              Enviaremos um código de acesso para seu email.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
