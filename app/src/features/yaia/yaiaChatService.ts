import { supabase, supabaseUrl } from '../../lib/supabase'

export interface YaIAResponse {
  reply: string
  remaining: number | null
}

export type YaIAError =
  | 'NOT_AUTHED'
  | 'LIMIT_REACHED'
  | 'CONSENT_REQUIRED'
  | 'NO_BABY'
  | 'NETWORK'
  | 'UNKNOWN'

export class YaIAChatError extends Error {
  code: YaIAError
  constructor(code: YaIAError, message?: string) {
    super(message ?? code)
    this.name = 'YaIAChatError'
    this.code = code
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

  if (res.status === 402) throw new YaIAChatError('LIMIT_REACHED')
  if (res.status === 428) throw new YaIAChatError('CONSENT_REQUIRED')
  if (res.status === 401) throw new YaIAChatError('NOT_AUTHED')
  if (!res.ok) throw new YaIAChatError('UNKNOWN')

  const data = await res.json()
  if (!data?.reply) throw new YaIAChatError('UNKNOWN')
  return { reply: data.reply, remaining: data.remaining ?? null }
}

export async function markConsent(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new YaIAChatError('NOT_AUTHED')
  const { error } = await supabase
    .from('profiles')
    .update({ yaia_consent_at: new Date().toISOString() })
    .eq('id', session.user.id)
  if (error) throw new YaIAChatError('UNKNOWN', error.message)
}
