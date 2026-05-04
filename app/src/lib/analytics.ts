// analytics.ts — utilitário leve de rastreamento de eventos
//
// Regra crítica: track() e trackOnce() são sempre fire-and-forget.
// Nunca devem bloquear a UI. Erros são silenciosos.
//
// Uso:
//   track('paywall_viewed', { trigger: 'streak', plan_highlighted: 'annual' })
//   trackOnce('yaia_first_message', 'yaia_first_message', { baby_age_days: 45 }, baby.id)
//   setTrailKey('milestone_registered', baby.id)  // para eventos que disparam N vezes

import { supabase } from './supabase'

// user_id em cache via onAuthStateChange — evita async no hot path
let _currentUserId: string | null = null
supabase.auth.onAuthStateChange((_, session) => {
  _currentUserId = session?.user?.id ?? null
})

/**
 * Registra um evento de analytics. Fire-and-forget — nunca bloqueia a UI.
 * Erros são silenciosos para não afetar a experiência do usuário.
 */
export function track(eventName: string, metadata?: Record<string, unknown>): void {
  if (!_currentUserId) return // não rastreia usuários não autenticados
  void supabase
    .from('analytics_events')
    .insert({
      user_id: _currentUserId,
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
 * @param babyId     Quando fornecido, também seta chave baby-scoped para a DiscoveryTrail
 *
 * Nota: em caso de reinstalação do app, o guard é perdido e pode inserir
 * duplicado — aceitável, pois as queries de funil usam COUNT(DISTINCT user_id).
 */
export function trackOnce(
  localKey: string,
  eventName: string,
  metadata?: Record<string, unknown>,
  babyId?: string,
): void {
  const globalKey = `yaya_evt_${localKey}`

  // Chave baby-scoped para a DiscoveryTrail — sempre seta quando babyId fornecido
  if (babyId) {
    localStorage.setItem(`${globalKey}_${babyId}`, '1')
  }

  // Evento analytics: dispara só uma vez por browser (dedup global)
  if (_firedLocally.has(globalKey)) return
  if (localStorage.getItem(globalKey)) return
  _firedLocally.add(globalKey)
  localStorage.setItem(globalKey, '1')
  track(eventName, metadata)
}

/**
 * Marca um passo da DiscoveryTrail como concluído para um bebê específico.
 * Usar quando o evento de analytics dispara múltiplas vezes (ex: milestone_registered)
 * mas o step da trilha deve ser marcado apenas na primeira ocorrência.
 */
export function setTrailKey(localKey: string, babyId: string): void {
  localStorage.setItem(`yaya_evt_${localKey}_${babyId}`, '1')
}
