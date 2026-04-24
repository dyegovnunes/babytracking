import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAppState } from '../../contexts/AppContext'
import { useAuth } from '../../contexts/AuthContext'
import { sendToYaIA, submitFeedback, YaIAChatError, type YaIASource } from './yaiaChatService'

const BUBBLE_SEPARATOR = '\n\n---\n\n'

export interface YaIAMessage {
  id: string
  role: 'user' | 'assistant'
  /** user: 1 item. assistant: 1-3 bubbles. */
  bubbles: string[]
  createdAt: string
  pending?: boolean
  failed?: boolean
  /** Só aplicável à última mensagem assistant (volátil, some no próximo turno). */
  suggestions?: string[]
  sources?: YaIASource[]
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
  giveFeedback: (messageId: string, rating: 1 | -1, reasonTag?: string) => Promise<void>
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

  const refreshConsent = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('profiles')
      .select('yaia_consent_at')
      .eq('id', user.id)
      .maybeSingle()
    setConsentNeeded(!data?.yaia_consent_at)
  }, [user])

  useEffect(() => { refreshConsent() }, [refreshConsent])

  // Carrega histórico apenas quando mudamos de bebê (ou entramos com um
  // pela primeira vez). NÃO zera mensagens quando `user` fica null
  // transitoriamente (ex: re-verificação de sessão após voltar de link
  // externo), porque isso apagava a conversa da tela.
  const loadedBabyIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (!user || !babyId) return
    // Se já carregamos esse babyId antes, não recarrega.
    if (loadedBabyIdRef.current === babyId && messages.length > 0) return
    loadedBabyIdRef.current = babyId
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
      const rows = (data ?? []).slice().reverse().map((r): YaIAMessage => {
        const raw = (r.content as string) ?? ''
        const bubbles = raw.split(BUBBLE_SEPARATOR).map((b) => b.trim()).filter(Boolean)
        return {
          id: r.id as string,
          role: r.role as 'user' | 'assistant',
          bubbles: bubbles.length ? bubbles : [raw],
          createdAt: r.created_at as string,
        }
      })
      setMessages(rows)
      setIsHistoryLoading(false)
    })()
    return () => { cancelled = true }
  }, [user, babyId])

  async function dispatchSend(tempId: string, trimmed: string, targetBabyId: string) {
    setError(null)
    setIsLoading(true)
    try {
      const res = await sendToYaIA({ message: trimmed, babyId: targetBabyId })
      setRemaining(res.remaining)
      setMessages((prev) => {
        // Limpa suggestions das mensagens anteriores (volátil).
        const cleaned = prev.map((m) =>
          m.role === 'assistant' ? { ...m, suggestions: undefined } : m,
        )
        const updated = cleaned.map((m) =>
          m.id === tempId ? { ...m, pending: false, failed: false } : m,
        )
        return [
          ...updated,
          {
            id: res.messageId ?? `tmp_assist_${++tempIdRef.current}`,
            role: 'assistant',
            bubbles: res.messages,
            createdAt: new Date().toISOString(),
            suggestions: res.suggestions,
            sources: res.sources,
          },
        ]
      })
    } catch (e) {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m)),
      )
      if (e instanceof YaIAChatError) {
        if (e.code === 'LIMIT_REACHED') {
          setRemaining(0)
          setLimitReached(true)
        } else if (e.code === 'CONSENT_REQUIRED') {
          setConsentNeeded(true)
        } else if (e.code === 'NO_CONTEXT') {
          setError('Não consegui carregar os dados do bebê. Tenta recarregar o app?')
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
    setMessages((prev) => {
      const cleaned = prev.map((m) =>
        m.role === 'assistant' ? { ...m, suggestions: undefined } : m,
      )
      return [
        ...cleaned,
        {
          id: tempId,
          role: 'user',
          bubbles: [trimmed],
          createdAt: nowIso,
          pending: true,
        },
      ]
    })
    await dispatchSend(tempId, trimmed, babyId)
  }, [babyId, isLoading])

  const retryMessage = useCallback(async (messageId: string) => {
    if (!babyId || isLoading) return
    const target = messages.find((m) => m.id === messageId && m.role === 'user')
    if (!target) return
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, pending: true, failed: false } : m)),
    )
    await dispatchSend(messageId, target.bubbles[0] ?? '', babyId)
  }, [babyId, isLoading, messages])

  const giveFeedback = useCallback(async (messageId: string, rating: 1 | -1, reasonTag?: string) => {
    try {
      await submitFeedback({ messageId, rating, reasonTag })
    } catch (e) {
      console.error('[yaia] feedback failed', e)
    }
  }, [])

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
    giveFeedback,
    dismissLimit,
    refreshConsent,
  }
}
