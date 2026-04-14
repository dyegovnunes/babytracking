import { supabase } from '../../lib/supabase'

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export function generateToken(): string {
  const array = new Uint8Array(24)
  crypto.getRandomValues(array)
  return Array.from(array).map(b => b.toString(36).padStart(2, '0')).join('').slice(0, 32)
}

export interface SharedReport {
  id: string
  baby_id: string
  user_id: string
  name: string
  token: string
  enabled: boolean
  expires_at: string | null
  created_at: string
}

export async function createSharedReport(
  babyId: string,
  userId: string,
  name: string,
  password: string,
  expiresAt: string | null,
): Promise<SharedReport | null> {
  const token = generateToken()
  const password_hash = await hashPassword(password)

  const { data, error } = await supabase
    .from('shared_reports')
    .insert({
      baby_id: babyId,
      user_id: userId,
      name,
      token,
      password_hash,
      enabled: true,
      expires_at: expiresAt,
    })
    .select('id, baby_id, user_id, name, token, enabled, expires_at, created_at')
    .single()

  if (error) {
    console.error('Error creating shared report:', error)
    return null
  }
  return data
}

export async function listSharedReports(babyId: string): Promise<SharedReport[]> {
  const { data, error } = await supabase
    .from('shared_reports')
    .select('id, baby_id, user_id, name, token, enabled, expires_at, created_at')
    .eq('baby_id', babyId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error listing shared reports:', error)
    return []
  }
  return data ?? []
}

export async function deleteSharedReport(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('shared_reports')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting shared report:', error)
    return false
  }
  return true
}

export async function toggleSharedReport(id: string, enabled: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('shared_reports')
    .update({ enabled })
    .eq('id', id)

  if (error) {
    console.error('Error toggling shared report:', error)
    return false
  }
  return true
}

export function getReportUrl(token: string): string {
  return `https://yayababy.app/r/${token}`
}

export function getExpirationDate(preset: string): string | null {
  if (preset === 'none') return null
  const now = Date.now()
  const ms: Record<string, number> = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  }
  if (ms[preset]) return new Date(now + ms[preset]).toISOString()
  return null
}
