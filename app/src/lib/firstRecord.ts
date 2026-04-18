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

const FIRST_MESSAGES: Record<string, string> = {
  // Alimentação
  breast_left: 'Primeira mamada registrada ✨',
  breast_right: 'Primeira mamada registrada ✨',
  breast_both: 'Primeira mamada registrada ✨',
  bottle: 'Primeira mamadeira registrada 🍼',
  solids: 'Primeira comidinha! 🥄',
  // Higiene
  diaper: 'Primeira troca registrada 💧',
  pee: 'Primeira troca registrada 💧',
  poop: 'Primeiro cocô registrado 💩',
  bath: 'Primeiro banho registrado 🫧',
  // Sono
  sleep_start: 'Primeiro sono registrado 🌙',
  sleep_end: 'Primeiro sono registrado 🌙',
  sleep: 'Primeiro sono registrado 🌙',
  wake: 'Primeiro despertar registrado ☀️',
  // Outros
  medicine: 'Primeiro medicamento registrado 💊',
  vomit: 'Registrado. Esperamos que passe rápido 💜',
  burp: 'Primeira arrotada registrada ✨',
}

/**
 * Checa se é o primeiro log daquele `eventId` pro bebê atual, olhando
 * no estado local. `logs` deve ser o array COMPLETO do AppState ANTES
 * do novo registro entrar (ou seja, a chamada precisa acontecer ANTES
 * do addLog).
 */
export function isFirstOfType(logs: LogEntry[], eventId: string): boolean {
  // Breast variants contam como "mamada" genérica — primeira mamada em
  // qualquer lado desbloqueia a mensagem, outras variantes depois não.
  const breastLike = eventId.startsWith('breast_')
  if (breastLike) {
    return !logs.some((l) => l.eventId.startsWith('breast_'))
  }
  // Sono: sleep_start / sleep_end / sleep / wake agrupam — primeiro
  // qualquer deles conta.
  const sleepLike =
    eventId === 'sleep' ||
    eventId === 'sleep_start' ||
    eventId === 'sleep_end' ||
    eventId === 'wake'
  if (sleepLike) {
    return !logs.some(
      (l) =>
        l.eventId === 'sleep' ||
        l.eventId === 'sleep_start' ||
        l.eventId === 'sleep_end' ||
        l.eventId === 'wake',
    )
  }
  // Diaper variants (pee/poop/diaper genérico)
  const diaperLike =
    eventId === 'diaper' || eventId === 'pee' || eventId === 'poop'
  if (diaperLike) {
    return !logs.some(
      (l) => l.eventId === 'diaper' || l.eventId === 'pee' || l.eventId === 'poop',
    )
  }
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
