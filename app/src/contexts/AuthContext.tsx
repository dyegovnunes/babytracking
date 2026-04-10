import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

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

    return () => subscription.unsubscribe()
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

export async function signInWithGoogle(): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  })
  return { error: error?.message ?? null }
}

export async function signInWithApple(): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo: window.location.origin,
    },
  })
  return { error: error?.message ?? null }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}
