import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAppState } from '../../contexts/AppContext'
import { useAuth } from '../../contexts/AuthContext'
import { sendToYaIA, YaIAChatError } from './yaiaChatService'

export interface YaIAMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  pending?: boolean
}

export interface UseYaIAReturn {
  messages: YaIAMessage[]
  isLoading: boolean
  isHistoryLoading: boolean
  remaining: number | null
  consentNeeded: boolean
  limitReached: boolean
  error: string | null
  sendMessage: (content: string) => Promise<void>
  dismissLimit: () => void
  refreshConsent: () => Promise<void>
}

const HISTORY_LIMIT = 50

export function useYaIA(): UseYaIAReturn {
  const { user } = useAuth()
  const { baby } = useAppState()
  const babyId = baby?.id ?? null

  const [messages, setMessages] = useState<YaIAMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [consentNeeded, setConsentNeeded] = useState(false)
  const [limitReached, setLimitReached] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tempIdRef = useRef(0)

  // Consent check — roda ao abrir a aba
  const refreshConsent = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('profiles')
      .select('yaia_consent_at')
      .eq('id', user.id)
      .maybeSingle()
    setConsentNeeded(!data?.yaia_consent_at)
  }, [user])

  useEffect(() => {
    refreshConsent()
  }, [refreshConsent])

  // Carrega histórico ao montar e a cada troca de bebê
  useEffect(() => {
    if (!user || !babyId) {
      setMessages([])
      return
    }
    let cancelled = false
    setIsHistoryLoading(true)
    ;(async () => {
      const { data } = await supabase
        .from('yaia_conversations')
        .select('id, role, content, created_at')
        .eq('user_id', user.id)
        .eq('baby_id', babyId)
        .order('created_at', { ascending: false })
        .limit(HISTORY_LIMIT)
      if (cancelled) return
      const rows = (data ?? []).slice().reverse().map((r): YaIAMessage => ({
        id: r.id as string,
        role: r.role as 'user' | 'assistant',
        content: r.content as string,
        createdAt: r.created_at as string,
      }))
      setMessages(rows)
      setIsHistoryLoading(false)
    })()
    return () => { cancelled = true }
  }, [user, babyId])

  const sendMessage = useCallback(async (content: string) => {
    const trimmed = content.trim()
    if (!trimmed || !babyId || isLoading) return

    setError(null)
    setIsLoading(true)

    // Optimistic: adiciona mensagem do usuário imediatamente
    const tempId = `tmp_${++tempIdRef.current}`
    const nowIso = new Date().toISOString()
    const userMsg: YaIAMessage = {
      id: tempId,
      role: 'user',
      content: trimmed,
      createdAt: nowIso,
      pending: true,
    }
    setMessages((prev) => [...prev, userMsg])

    try {
      const { reply, remaining: rem } = await sendToYaIA({ message: trimmed, babyId })
      setRemaining(rem)
      setMessages((prev) => {
        const withoutTemp = prev.map((m) =>
          m.id === tempId ? { ...m, pending: false } : m,
        )
        return [
          ...withoutTemp,
          {
            id: `tmp_assist_${++tempIdRef.current}`,
            role: 'assistant',
            content: reply,
            createdAt: new Date().toISOString(),
          },
        ]
      })
    } catch (e) {
      // Remove optimistic em caso de erro
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      if (e instanceof YaIAChatError) {
        if (e.code === 'LIMIT_REACHED') {
          setRemaining(0)
          setLimitReached(true)
        } else if (e.code === 'CONSENT_REQUIRED') {
          setConsentNeeded(true)
        } else if (e.code === 'NETWORK') {
          setError('Tô sem conexão agora. Tenta de novo em instantes?')
        } else {
          setError('Ops, não consegui te ouvir agora. Respira, e a gente tenta mais uma vez?')
        }
      } else {
        setError('Alguma coisa saiu do meu controle aqui. Tenta de novo?')
      }
    } finally {
      setIsLoading(false)
    }
  }, [babyId, isLoading])

  const dismissLimit = useCallback(() => setLimitReached(false), [])

  return {
    messages,
    isLoading,
    isHistoryLoading,
    remaining,
    consentNeeded,
    limitReached,
    error,
    sendMessage,
    dismissLimit,
    refreshConsent,
  }
}
