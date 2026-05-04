// analytics.ts — utilitário leve de rastreamento de eventos
//
// Regra crítica: track() e trackOnce() são sempre fire-and-forget.
// Nunca devem bloquear a UI. Erros são silenciosos.
//
// Uso:
//   track('paywall_viewed', { trigger: 'streak', plan_highlighted: 'annual' })
//   trackOnce('yaia_first_message', 'yaia_first_message', { baby_age_days: 45 })

import { supabase } from './supabase'

/**
 * Registra um evento de analytics. Fire-and-forget — nunca bloqueia a UI.
 * Erros são silenciosos para não afetar a experiência do usuário.
 */
export function track(eventName: string, metadata?: Record<string, unknown>): void {
  void supabase
    .from('analytics_events')
    .insert({
      event_name: eventName,
      metadata: metadata ?? {},
    })
}

// Guard em memória para evitar chamadas repetidas na mesma sessão
const _firedLocally = new Set<string>()

/**
 * Registra um evento apenas uma vez na vida do usuário.
 * Usa localStorage como guard persistente entre sessões.
 *
 * @param localKey   Chave única no localStorage (ex: 'yaia_first_message')
 * @param eventName  Nome do evento a registrar (ex: 'yaia_first_message')
 * @param metadata   Dados opcionais do evento
 *
 * Nota: em caso de reinstalação do app, o guard é perdido e pode inserir
 * duplicado — aceitável, pois as queries de funil usam COUNT(DISTINCT user_id).
 */
export function trackOnce(
  localKey: string,
  eventName: string,
  metadata?: Record<string, unknown>,
): void {
  const storageKey = `yaya_evt_${localKey}`
  if (_firedLocally.has(storageKey)) return
  if (localStorage.getItem(storageKey)) return
  _firedLocally.add(storageKey)
  localStorage.setItem(storageKey, '1')
  track(eventName, metadata)
}
