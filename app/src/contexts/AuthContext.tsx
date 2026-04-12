import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { App as CapApp } from '@capacitor/app'

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
      (_event, session) => {
        setState({
          user: session?.user ?? null,
          session,
          loading: false,
        })
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
  return signInWithOAuthProvider('apple')
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}