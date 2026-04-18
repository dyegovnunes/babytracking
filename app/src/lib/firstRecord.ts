import type { LogEntry } from '../types'

/**
 * Detecta se um registro é o primeiro do tipo pra esse bebê, e retorna
 * a mensagem celebrativa adequada. Se não for primeiro, retorna null —
 * consumer usa sua mensagem padrão de registro.
 *
 * Design: micro-momento (toast success, não modal fullscreen). Mensagens
 * são específicas por tipo pra reconhecer a entrada em cada "clube"
 * (primeira mamada, primeira fralda, etc). Zero fanfare — só acolher e
 * marcar o momento.
 *
 * Base da detecção: state.logs local. Como o AppContext já carrega todos
 * os logs do bebê no SET_INITIAL, esta checagem é instantânea (zero query
 * extra ao Supabase).
 */

// IDs reais em lib/constants.ts: breast_left/right/both, bottle,
// diaper_wet, diaper_dirty, bath, sleep, wake.
const FIRST_MESSAGES: Record<string, string> = {
  breast_left: 'Primeira mamada registrada ✨',
  breast_right: 'Primeira mamada registrada ✨',
  breast_both: 'Primeira mamada registrada ✨',
  bottle: 'Primeira mamadeira registrada 🍼',
  diaper_wet: 'Primeira troca registrada 💧',
  diaper_dirty: 'Primeiro cocô registrado 💩',
  bath: 'Primeiro banho registrado 🫧',
  sleep: 'Primeiro sono registrado 🌙',
  wake: 'Primeiro despertar registrado ☀️',
}

/**
 * Checa se é o primeiro log daquele `eventId` pro bebê atual, olhando
 * no estado local. `logs` deve ser o array COMPLETO do AppState ANTES
 * do novo registro entrar (ou seja, a chamada precisa acontecer ANTES
 * do addLog).
 */
export function isFirstOfType(logs: LogEntry[], eventId: string): boolean {
  // Breast variants (left/right/both) contam como "mamada" genérica —
  // a primeira em qualquer lado desbloqueia a mensagem celebrativa,
  // as outras variantes seguintes viram toast normal.
  if (eventId.startsWith('breast_')) {
    return !logs.some((l) => l.eventId.startsWith('breast_'))
  }
  // Diaper variants (wet/dirty) são eventos distintos no app — primeira
  // xixi e primeiro cocô celebrados separadamente (cada um tem mensagem
  // específica). Então checamos exatamente o mesmo eventId.
  return !logs.some((l) => l.eventId === eventId)
}

/**
 * Retorna a mensagem celebrativa pra esse eventId, ou null se não
 * houver uma mensagem mapeada. Consumer decide o que fazer quando é
 * null (provavelmente cai na mensagem padrão).
 */
export function getFirstRecordMessage(eventId: string): string | null {
  // Breast variants → mamada
  if (eventId.startsWith('breast_')) return FIRST_MESSAGES.breast_left
  return FIRST_MESSAGES[eventId] ?? null
}
