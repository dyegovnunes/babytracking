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
  failed?: boolean
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
  retryMessage: (messageId: string) => Promise<void>
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

  // Núcleo do envio: recebe uma mensagem já presente no state (com pending=true)
  // e cuida de tentar enviar, marcando failed=true em caso de erro (sem remover).
  async function dispatchSend(tempId: string, trimmed: string, targetBabyId: string) {
    setError(null)
    setIsLoading(true)
    try {
      const { reply, remaining: rem } = await sendToYaIA({ message: trimmed, babyId: targetBabyId })
      setRemaining(rem)
      setMessages((prev) => {
        const updated = prev.map((m) =>
          m.id === tempId ? { ...m, pending: false, failed: false } : m,
        )
        return [
          ...updated,
          {
            id: `tmp_assist_${++tempIdRef.current}`,
            role: 'assistant',
            content: reply,
            createdAt: new Date().toISOString(),
          },
        ]
      })
    } catch (e) {
      // Mantém a mensagem do usuário visível, marca como falha.
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...m, pending: false, failed: true } : m,
        ),
      )
      if (e instanceof YaIAChatError) {
        if (e.code === 'LIMIT_REACHED') {
          setRemaining(0)
          setLimitReached(true)
        } else if (e.code === 'CONSENT_REQUIRED') {
          setConsentNeeded(true)
        } else if (e.code === 'NETWORK') {
          setError('Tô sem conexão agora. Sua mensagem ficou aqui, toca pra tentar de novo quando voltar.')
        } else {
          setError('Tive um probleminha pra responder. Sua mensagem não se perdeu, toca nela pra gente tentar de novo.')
        }
      } else {
        setError('Alguma coisa saiu do meu controle. Toca na sua mensagem pra tentar de novo.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = useCallback(async (content: string) => {
    const trimmed = content.trim()
    if (!trimmed || !babyId || isLoading) return

    const tempId = `tmp_${++tempIdRef.current}`
    const nowIso = new Date().toISOString()
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        role: 'user',
        content: trimmed,
        createdAt: nowIso,
        pending: true,
      },
    ])
    await dispatchSend(tempId, trimmed, babyId)
  }, [babyId, isLoading])

  // Reusa a mesma mensagem do usuário (mantém id/ordem), apenas reenvia.
  const retryMessage = useCallback(async (messageId: string) => {
    if (!babyId || isLoading) return
    const target = messages.find((m) => m.id === messageId && m.role === 'user')
    if (!target) return
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, pending: true, failed: false } : m,
      ),
    )
    await dispatchSend(messageId, target.content, babyId)
  }, [babyId, isLoading, messages])

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
    retryMessage,
    dismissLimit,
    refreshConsent,
  }
}
