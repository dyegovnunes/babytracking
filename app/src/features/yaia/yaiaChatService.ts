import { supabase, supabaseUrl } from '../../lib/supabase'

export interface YaIASource {
  title: string
  url: string
}

export interface YaIARemaining {
  daily: number
  monthly: number
}

export type YaIAResetWhen = 'tomorrow' | 'next_month'

export interface YaIAResponse {
  messages: string[]
  suggestions: string[]
  sources: YaIASource[]
  messageId?: string
  remaining: YaIARemaining | null
}

export type YaIAError =
  | 'NOT_AUTHED'
  | 'LIMIT_REACHED'
  | 'CONSENT_REQUIRED'
  | 'NO_CONTEXT'
  | 'NO_BABY'
  | 'NETWORK'
  | 'UNKNOWN'

export class YaIAChatError extends Error {
  code: YaIAError
  /** Só preenchido em LIMIT_REACHED: distingue estouro diário de mensal. */
  resetWhen?: YaIAResetWhen
  /** Só preenchido em LIMIT_REACHED: o que ainda resta no outro contador. */
  remaining?: YaIARemaining
  constructor(code: YaIAError, opts?: { message?: string; resetWhen?: YaIAResetWhen; remaining?: YaIARemaining }) {
    super(opts?.message ?? code)
    this.name = 'YaIAChatError'
    this.code = code
    this.resetWhen = opts?.resetWhen
    this.remaining = opts?.remaining
  }
}

export async function sendToYaIA(params: {
  message: string
  babyId: string
}): Promise<YaIAResponse> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new YaIAChatError('NOT_AUTHED')

  let res: Response
  try {
    res = await fetch(`${supabaseUrl}/functions/v1/yaia-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        message: params.message,
        baby_id: params.babyId,
      }),
    })
  } catch {
    throw new YaIAChatError('NETWORK')
  }

  if (res.status === 402) {
    const body = await res.json().catch(() => null)
    const resetWhen: YaIAResetWhen | undefined =
      body?.reset === 'tomorrow' || body?.reset === 'next_month' ? body.reset : undefined
    const remaining: YaIARemaining | undefined =
      body?.remaining && typeof body.remaining === 'object'
        ? { daily: Number(body.remaining.daily ?? 0), monthly: Number(body.remaining.monthly ?? 0) }
        : undefined
    throw new YaIAChatError('LIMIT_REACHED', { resetWhen, remaining })
  }
  if (res.status === 428) throw new YaIAChatError('CONSENT_REQUIRED')
  if (res.status === 503) throw new YaIAChatError('NO_CONTEXT')
  if (res.status === 401) throw new YaIAChatError('NOT_AUTHED')
  if (!res.ok) throw new YaIAChatError('UNKNOWN')

  const data = await res.json().catch(() => null)
  if (!data) throw new YaIAChatError('UNKNOWN')

  const messages: string[] = Array.isArray(data.messages)
    ? data.messages.filter((m: unknown): m is string => typeof m === 'string' && m.trim().length > 0)
    : []
  if (!messages.length) throw new YaIAChatError('UNKNOWN')

  const suggestions: string[] = Array.isArray(data.suggestions)
    ? data.suggestions.filter((s: unknown): s is string => typeof s === 'string' && s.trim().length > 0)
    : []
  const sources: YaIASource[] = Array.isArray(data.sources)
    ? data.sources.filter((s: unknown): s is YaIASource =>
        !!s && typeof (s as YaIASource).title === 'string' && typeof (s as YaIASource).url === 'string',
      )
    : []

  // remaining agora vem como { daily, monthly } (objeto). Se vier number
  // puro (backend antigo), normaliza pra null pra não quebrar a UI.
  const rawRemaining = data.remaining
  const remaining: YaIARemaining | null =
    rawRemaining && typeof rawRemaining === 'object'
      ? { daily: Number(rawRemaining.daily ?? 0), monthly: Number(rawRemaining.monthly ?? 0) }
      : null

  return {
    messages,
    suggestions,
    sources,
    messageId: typeof data.message_id === 'string' ? data.message_id : undefined,
    remaining,
  }
}

export async function markConsent(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new YaIAChatError('NOT_AUTHED')
  const { error } = await supabase
    .from('profiles')
    .update({ yaia_consent_at: new Date().toISOString() })
    .eq('id', session.user.id)
  if (error) throw new YaIAChatError('UNKNOWN', { message: error.message })
}

export async function submitFeedback(params: {
  messageId: string
  rating: 1 | -1
  reasonTag?: string
  note?: string
}): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new YaIAChatError('NOT_AUTHED')
  const { error } = await supabase
    .from('yaia_feedback')
    .upsert(
      {
        message_id: params.messageId,
        user_id: session.user.id,
        rating: params.rating,
        reason_tag: params.reasonTag ?? null,
        note: params.note ?? null,
      },
      { onConflict: 'message_id,user_id' },
    )
  if (error) throw new YaIAChatError('UNKNOWN', { message: error.message })
}
