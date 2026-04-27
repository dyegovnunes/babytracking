// useGuideAccess — hook que valida sessão Supabase + compra do guia.
// Status:
//   loading      → ainda checando
//   no-session   → não logado (precisa magic link)
//   no-access    → logado mas sem compra completed (mostra CTA pra comprar)
//   authorized   → tem compra → libera leitura
//   error        → falha de rede/RLS

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Guide } from '../../types'

export type AccessStatus = 'loading' | 'no-session' | 'no-access' | 'authorized' | 'error'

export interface AccessState {
  status: AccessStatus
  guide: Guide | null
  userId: string | null
  email: string | null
  errorMsg?: string
}

export function useGuideAccess(guideSlug: string): AccessState {
  const [state, setState] = useState<AccessState>({
    status: 'loading', guide: null, userId: null, email: null,
  })

  useEffect(() => {
    let cancelled = false

    async function check() {
      try {
        // 1. Busca o guia (anon pode ler quando status='published'; pra draft só admin
        // ou comprador via RLS — mas se nem o guide aparecer já é no-access)
        const { data: guide, error: guideErr } = await supabase
          .from('guides')
          .select('*')
          .eq('slug', guideSlug)
          .single()

        if (cancelled) return

        if (guideErr || !guide) {
          setState({ status: 'error', guide: null, userId: null, email: null,
            errorMsg: 'Guia não encontrado' })
          return
        }

        // 2. Sessão atual
        const { data: { session } } = await supabase.auth.getSession()

        if (cancelled) return

        if (!session?.user) {
          setState({ status: 'no-session', guide, userId: null, email: null })
          return
        }

        // 3. Tem compra completed?
        const { data: purchases } = await supabase
          .from('guide_purchases')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('guide_id', guide.id)
          .eq('status', 'completed')
          .limit(1)

        if (cancelled) return

        if (!purchases || purchases.length === 0) {
          setState({
            status: 'no-access',
            guide,
            userId: session.user.id,
            email: session.user.email ?? null,
          })
          return
        }

        setState({
          status: 'authorized',
          guide,
          userId: session.user.id,
          email: session.user.email ?? null,
        })
      } catch (err) {
        if (cancelled) return
        setState({ status: 'error', guide: null, userId: null, email: null,
          errorMsg: (err as Error).message })
      }
    }

    check()

    // Re-check ao mudar sessão (magic link login dispara isso)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      check()
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [guideSlug])

  return state
}
