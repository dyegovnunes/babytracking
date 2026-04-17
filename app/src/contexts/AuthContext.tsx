import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { App as CapApp } from '@capacitor/app'
import { SignInWithApple } from '@capacitor-community/apple-sign-in'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
}

const AuthContext = createContext<AuthState>({
  user: null,
  session: null,
  loading: true,
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  })

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({
        user: session?.user ?? null,
        session,
        loading: false,
      })
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setState({
          user: session?.user ?? null,
          session,
          loading: false,
        })

        // MGM: ao signup/primeiro sign-in, se há código de indicação em
        // localStorage (capturado pela landing/login via ?ref ou /i/:code),
        // associa ao novo profile. Idempotente — RPC retorna false se já
        // existe referral pro user.
        if (event === 'SIGNED_IN' && session?.user) {
          try {
            const pendingCode = localStorage.getItem('yaya_pending_ref')
            if (pendingCode) {
              await supabase.rpc('accept_referral', { p_code: pendingCode })
              // Limpa do localStorage (evita tentar de novo em sessões futuras)
              localStorage.removeItem('yaya_pending_ref')
            }
          } catch { /* silencia — não bloqueia auth */ }
        }
      },
    )

    // Listen for deep link callbacks (OAuth redirect on native)
    let appUrlListener: { remove: () => void } | undefined
    if (Capacitor.isNativePlatform()) {
      CapApp.addListener('appUrlOpen', async ({ url }: { url: string }) => {
        if (url.startsWith('app.yayababy://login-callback')) {
          const hashPart = url.includes('#') ? url.split('#')[1] : ''
          const params = new URLSearchParams(hashPart)
          const accessToken = params.get('access_token')
          const refreshToken = params.get('refresh_token')

          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })
          }

          await Browser.close()
        }
      }).then((listener: { remove: () => void }) => { appUrlListener = listener })
    }

    return () => {
      subscription.unsubscribe()
      appUrlListener?.remove()
    }
  }, [])

  return (
    <AuthContext.Provider value={state}>
      {children}
    </AuthContext.Provider>
  )
}

export async function signInWithEmail(email: string): Promise<{ error: string | null }> {
  // Skip OTP send for test account — reviewer just enters 000000
  if (email.toLowerCase() === TEST_ACCOUNT_EMAIL) {
    return { error: null }
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
    },
  })
  return { error: error?.message ?? null }
}

const TEST_ACCOUNT_EMAIL = 'teste@yayababy.app'
const TEST_ACCOUNT_OTP = '000000'

export async function verifyOtp(email: string, token: string): Promise<{ error: string | null }> {
  // Bypass for Google Play review test account
  if (email.toLowerCase() === TEST_ACCOUNT_EMAIL && token === TEST_ACCOUNT_OTP) {
    const { error } = await supabase.auth.signInWithPassword({
      email: TEST_ACCOUNT_EMAIL,
      password: TEST_ACCOUNT_OTP,
    })
    return { error: error?.message ?? null }
  }

  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  })
  return { error: error?.message ?? null }
}

async function signInWithOAuthProvider(provider: 'google' | 'apple'): Promise<{ error: string | null }> {
  if (Capacitor.isNativePlatform()) {
    try {
      // On native: get the OAuth URL and open in in-app browser
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: 'app.yayababy://login-callback',
          skipBrowserRedirect: true,
        },
      })
      if (error) return { error: error.message }
      if (!data?.url) return { error: 'Não foi possível iniciar o login' }

      await Browser.open({ url: data.url })
      return { error: null }
    } catch (e: any) {
      console.error('OAuth native error:', e)
      return { error: `Erro: ${e?.message || e}` }
    }
  }

  // On web: standard redirect
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: window.location.origin,
    },
  })
  return { error: error?.message ?? null }
}

export async function signInWithGoogle(): Promise<{ error: string | null }> {
  return signInWithOAuthProvider('google')
}

export async function signInWithApple(): Promise<{ error: string | null }> {
  // No iOS, o OAuth web (Safari embedded) quebra em iPadOS 26 — Apple
  // exige Sign in with Apple nativo pra qualquer app que use outros
  // provedores sociais (guideline 4.8). Por isso, no iOS usamos o plugin
  // nativo que dispara o sheet nativo e retorna um identity token JWT,
  // que por sua vez é trocado pela sessão Supabase via signInWithIdToken.
  //
  // Web/Android continuam no fluxo OAuth tradicional — o Google Android já
  // usa o mesmo `signInWithOAuthProvider` e no web o redirect padrão funciona.
  if (Capacitor.getPlatform() === 'ios') {
    try {
      const result = await SignInWithApple.authorize({
        // No iOS nativo, o clientId é o BUNDLE ID do app, não o Services ID.
        // O Services ID só é usado no fluxo web OAuth. O `aud` do identity
        // token emitido será `app.yayababy`, então precisamos garantir que
        // esse valor está em "Authorized Client IDs" no Supabase Auth.
        clientId: 'app.yayababy',
        // redirectURI é ignorado pelo plugin no fluxo nativo (o sheet do
        // sistema não redireciona), mas o plugin exige o campo. Apontamos
        // pro callback Supabase por consistência com o fluxo web.
        redirectURI: 'https://kgfjfdizxziacblgvplh.supabase.co/auth/v1/callback',
        scopes: 'email name',
      })
      const idToken = result.response?.identityToken
      if (!idToken) {
        return { error: 'Token Apple não retornado' }
      }
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: idToken,
      })
      return { error: error?.message ?? null }
    } catch (e: unknown) {
      // Código 1001 = usuário cancelou o sheet nativo. Tratamos como "sem
      // erro" pra não mostrar toast vermelho quando o dedo escorrega.
      const err = e as { code?: string; message?: string }
      if (err?.code === '1001') return { error: null }
      return { error: err?.message ?? 'Erro no login com Apple' }
    }
  }

  // Web + Android: OAuth redirect via Supabase (fluxo atual, preservado)
  return signInWithOAuthProvider('apple')
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}