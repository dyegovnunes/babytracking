// userFlags.ts — flags persistidas por usuário no banco de dados.
//
// Problema que resolve: flags em localStorage somem ao reinstalar o app
// ou trocar de dispositivo, fazendo toasts e a trilha de descoberta
// "reiniciarem" do zero.
//
// Estratégia:
//   - Leituras: sempre do localStorage (síncrono, zero latência)
//   - Escritas: localStorage + DB simultâneo (fire-and-forget no DB)
//   - On load: syncFlags() popula localStorage a partir do banco
//   - Erros de write são logados (silenciosos antes — escondiam bugs)
//   - Fila de retry pra writes que disparam antes de initFlags() ou
//     que falham por motivos transitórios
//
// Uso:
//   setFlag('yaya_trail_dismissed_abc123')           // valor padrão '1'
//   setFlag('yaya_discovery_start_abc123', '1714000000000')  // timestamp

import { supabase } from './supabase'

// user_id em cache — setado pelo AppContext ao carregar o usuário
let _userId: string | null = null

// Fila de retry: writes que falharam ou foram chamados antes de initFlags.
// Drenada quando initFlags roda OU quando um write subsequente sucede.
const _retryQueue = new Map<string, { value: string; attempts: number }>()
const MAX_RETRY_ATTEMPTS = 3

/** Chamar uma vez quando o usuário é identificado (AppContext load) */
export function initFlags(userId: string): void {
  _userId = userId
  drainRetryQueue()
}

/**
 * Carrega todas as flags do banco e popula o localStorage.
 * Chamar no load do app, após identificar o usuário.
 * Só seta chaves que ainda não existem localmente (localStorage ganha em conflito).
 *
 * Retorna uma promise que resolve quando o sync completa — o caller pode
 * aguardar pra evitar race condition de spotlights/intros aparecendo
 * antes do estado ser carregado do banco.
 */
export async function syncFlags(): Promise<void> {
  if (!_userId) return
  try {
    const { data, error } = await supabase
      .from('user_flags')
      .select('key, value')
      .eq('user_id', _userId)

    if (error) {
      console.warn('[userFlags] sync failed:', error.message)
      return
    }

    for (const row of data ?? []) {
      if (!localStorage.getItem(row.key)) {
        localStorage.setItem(row.key, row.value)
      }
    }
  } catch (e) {
    console.warn('[userFlags] sync threw:', e)
  }
}

/**
 * Define uma flag no localStorage E persiste no banco.
 * Fire-and-forget no banco — não bloqueia a UI.
 *
 * Substitui: localStorage.setItem('yaya_...', value)
 */
export function setFlag(key: string, value: string = '1'): void {
  localStorage.setItem(key, value)
  if (!_userId) {
    // Sem user_id ainda — enfileira pra drenar quando initFlags rodar
    _retryQueue.set(key, { value, attempts: 0 })
    return
  }
  void writeFlag(key, value)
}

/**
 * Persiste a flag no banco. Loga erros e enfileira retry em caso de falha.
 * Quando sucede, drena qualquer write antigo da fila.
 */
async function writeFlag(key: string, value: string): Promise<void> {
  if (!_userId) return
  try {
    const { error } = await supabase
      .from('user_flags')
      .upsert({ user_id: _userId, key, value }, { onConflict: 'user_id,key' })

    if (error) {
      const entry = _retryQueue.get(key) ?? { value, attempts: 0 }
      console.warn('[userFlags] write failed:', { key, attempt: entry.attempts + 1, error: error.message })
      if (entry.attempts < MAX_RETRY_ATTEMPTS) {
        _retryQueue.set(key, { value, attempts: entry.attempts + 1 })
      } else {
        // Desisti — loga e descarta pra não acumular pra sempre
        _retryQueue.delete(key)
        console.error('[userFlags] write permanently failed after retries:', key)
      }
      return
    }

    // Sucesso — limpa esse key da fila e tenta drenar o resto
    _retryQueue.delete(key)
    if (_retryQueue.size > 0) drainRetryQueue()
  } catch (e) {
    console.warn('[userFlags] write threw:', { key, error: e })
  }
}

/** Reenvia writes pendentes. Chamado em initFlags e após writes bem-sucedidos. */
function drainRetryQueue(): void {
  if (!_userId || _retryQueue.size === 0) return
  // Snapshot pra evitar mutação concorrente durante a iteração
  const pending = [..._retryQueue.entries()]
  for (const [key, { value }] of pending) {
    void writeFlag(key, value)
  }
}
