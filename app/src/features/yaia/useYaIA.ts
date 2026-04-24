import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAppState } from '../../contexts/AppContext'
import { useAuth } from '../../contexts/AuthContext'
import {
  sendToYaIA,
  submitFeedback,
  YaIAChatError,
  type YaIARemaining,
  type YaIAResetWhen,
  type YaIASource,
} from './yaiaChatService'

const BUBBLE_SEPARATOR = '\n\n---\n\n'

export interface YaIAMessage {
  id: string
  role: 'user' | 'assistant'
  /** user: 1 item. assistant: 1-3 bubbles. */
  bubbles: string[]
  createdAt: string
  pending?: boolean
  failed?: boolean
  /** Só aplicável à última mensagem assistant (volátil por turno, mas agora sobrevive a reload). */
  suggestions?: string[]
  sources?: YaIASource[]
}

export interface UseYaIAReturn {
  /** Todas as mensagens carregadas (inclui sessões anteriores). */
  messages: YaIAMessage[]
  /** Mensagens da sessão corrente (>= sessionStartedAt). */
  currentSession: YaIAMessage[]
  /** Quantas mensagens ficaram atrás de "Ver mensagens anteriores". */
  previousCount: number
  /** Expand/collapse das anteriores na UI. */
  showPrevious: boolean
  togglePrevious: () => void
  /** timestamp ISO de criação da última assistant — usado pro auto-prompt de sessão. */
  lastAssistantAt: string | null
  isLoading: boolean
  isHistoryLoading: boolean
  remaining: YaIARemaining | null
  limitResetWhen: YaIAResetWhen | null
  consentNeeded: boolean
  limitReached: boolean
  error: string | null
  sendMessage: (content: string) => Promise<void>
  retryMessage: (messageId: string) => Promise<void>
  giveFeedback: (messageId: string, rating: 1 | -1, reasonTag?: string) => Promise<void>
  /** Encerra sessão atual: colapsa histórico e gera novo sessionStartedAt. */
  endSession: () => void
  dismissLimit: () => void
  refreshConsent: () => Promise<void>
}

const HISTORY_LIMIT = 50

function sessionStorageKey(babyId: string) {
  return `yaia_session_${babyId}`
}

export function useYaIA(): UseYaIAReturn {
  const { user } = useAuth()
  const { baby } = useAppState()
  const babyId = baby?.id ?? null

  const [messages, setMessages] = useState<YaIAMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [remaining, setRemaining] = useState<YaIARemaining | null>(null)
  const [limitResetWhen, setLimitResetWhen] = useState<YaIAResetWhen | null>(null)
  const [consentNeeded, setConsentNeeded] = useState(false)
  const [limitReached, setLimitReached] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** ISO de início da sessão corrente (por bebê, em localStorage). */
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null)
  const [showPrevious, setShowPrevious] = useState(false)

  const tempIdRef = useRef(0)

  // Carrega/inicializa sessionStartedAt quando baby muda.
  useEffect(() => {
    if (!babyId) {
      setSessionStartedAt(null)
      return
    }
    try {
      const stored = localStorage.getItem(sessionStorageKey(babyId))
      if (stored) {
        setSessionStartedAt(stored)
        return
      }
    } catch {
      /* ignore */
    }
    // Sem valor armazenado: inicia sessão agora. Como só mensagens >=
    // sessionStartedAt aparecem como "corrente", e nenhuma é >= "agora",
    // a tela começa limpa — o que a gente quer pro primeiro acesso.
    // Se já houver histórico, usuário vê "Ver N mensagens anteriores".
    const startNow = new Date().toISOString()
    try { localStorage.setItem(sessionStorageKey(babyId), startNow) } catch { /* ignore */ }
    setSessionStartedAt(startNow)
  }, [babyId])

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

  // Carrega histórico sempre que user.id OU babyId mudarem (ou na montagem).
  // Usa user?.id como dep (nao o objeto user) pra evitar re-disparos
  // desnecessarios quando o AuthContext re-renderiza com objeto novo mas
  // mesmo id. NUNCA zera mensagens sozinho: se vier null temporariamente
  // (ex: re-verificacao de sessao ao voltar de link externo), so nao faz
  // nada e mantém o que ja estava na tela.
  const userId = user?.id
  useEffect(() => {
    if (!userId || !babyId) return
    let cancelled = false
    setIsHistoryLoading(true)
    ;(async () => {
      const { data, error } = await supabase
        .from('yaia_conversations')
        .select('id, role, content, created_at, sources, suggestions')
        .eq('user_id', userId)
        .eq('baby_id', babyId)
        .order('created_at', { ascending: false })
        .limit(HISTORY_LIMIT)
      if (cancelled) return
      if (error) {
        console.error('[yaia] erro ao carregar conversa', error)
        setIsHistoryLoading(false)
        return
      }
      const ordered = (data ?? []).slice().reverse()
      const rows: YaIAMessage[] = ordered.map((r, idx, arr): YaIAMessage => {
        const raw = (r.content as string) ?? ''
        const bubbles = raw.split(BUBBLE_SEPARATOR).map((b) => b.trim()).filter(Boolean)
        const rawSources = r.sources as unknown
        const sources: YaIASource[] | undefined = Array.isArray(rawSources)
          ? (rawSources.filter(
              (s): s is YaIASource =>
                !!s && typeof (s as YaIASource).title === 'string' && typeof (s as YaIASource).url === 'string',
            ) as YaIASource[])
          : undefined
        const rawSug = r.suggestions as unknown
        const isLast = idx === arr.length - 1
        // Suggestions só renderiza na ÚLTIMA assistant — mesma regra de turno.
        const suggestions: string[] | undefined =
          isLast && Array.isArray(rawSug)
            ? (rawSug.filter((s): s is string => typeof s === 'string' && s.trim().length > 0) as string[])
            : undefined
        return {
          id: r.id as string,
          role: r.role as 'user' | 'assistant',
          bubbles: bubbles.length ? bubbles : [raw],
          createdAt: r.created_at as string,
          sources: sources && sources.length ? sources : undefined,
          suggestions: suggestions && suggestions.length ? suggestions : undefined,
        }
      })
      console.log('[yaia] carregou', rows.length, 'mensagens do DB')
      setMessages(rows)
      setIsHistoryLoading(false)
    })()
    return () => { cancelled = true }
  }, [userId, babyId])

  async function dispatchSend(tempId: string, trimmed: string, targetBabyId: string) {
    setError(null)
    setIsLoading(true)
    try {
      const res = await sendToYaIA({ message: trimmed, babyId: targetBabyId })
      setRemaining(res.remaining)
      setMessages((prev) => {
        // Limpa suggestions das mensagens anteriores (só a última mostra).
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
          if (e.remaining) setRemaining(e.remaining)
          else setRemaining({ daily: 0, monthly: 0 })
          setLimitResetWhen(e.resetWhen ?? 'tomorrow')
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

  const endSession = useCallback(() => {
    if (!babyId) return
    const now = new Date().toISOString()
    try { localStorage.setItem(sessionStorageKey(babyId), now) } catch { /* ignore */ }
    setSessionStartedAt(now)
    setShowPrevious(false)
    // Limpa suggestions/chips da última assistant — usuário acabou a sessão.
    setMessages((prev) =>
      prev.map((m) => (m.role === 'assistant' ? { ...m, suggestions: undefined } : m)),
    )
  }, [babyId])

  const togglePrevious = useCallback(() => setShowPrevious((v) => !v), [])

  const dismissLimit = useCallback(() => setLimitReached(false), [])

  // Split entre sessão anterior e corrente. sessionStartedAt pode ser null
  // brevemente na montagem — nesse caso trata tudo como corrente.
  const { currentSession, previousCount, lastAssistantAt } = useMemo(() => {
    if (!sessionStartedAt) {
      const lastA = [...messages].reverse().find((m) => m.role === 'assistant')
      return {
        currentSession: messages,
        previousCount: 0,
        lastAssistantAt: lastA?.createdAt ?? null,
      }
    }
    const current: YaIAMessage[] = []
    let prevCount = 0
    for (const m of messages) {
      if (m.createdAt >= sessionStartedAt) current.push(m)
      else prevCount++
    }
    const lastA = [...current].reverse().find((m) => m.role === 'assistant')
    return {
      currentSession: current,
      previousCount: prevCount,
      lastAssistantAt: lastA?.createdAt ?? null,
    }
  }, [messages, sessionStartedAt])

  return {
    messages,
    currentSession,
    previousCount,
    showPrevious,
    togglePrevious,
    lastAssistantAt,
    isLoading,
    isHistoryLoading,
    remaining,
    limitResetWhen,
    consentNeeded,
    limitReached,
    error,
    sendMessage,
    retryMessage,
    giveFeedback,
    endSession,
    dismissLimit,
    refreshConsent,
  }
}
