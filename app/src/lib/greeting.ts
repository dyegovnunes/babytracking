/**
 * Greeting contextual pro Hero da home — saudação por horário do dia,
 * respeitando a faixa de "quiet hours" configurada pelo usuário pra
 * identificar "madrugada" (onde o tom muda).
 *
 * Decisões validadas no plano jornada-v1:
 * - Passivo, zero ação de tap (só texto)
 * - Formato eyebrow (uppercase pequeno, acima do hero existente)
 * - No tom `night` (dentro de quietHours), a saudação se adapta pro
 *   momento de bebê dormindo — sem comemorar, só acolher.
 */

export type GreetingTone = 'morning' | 'day' | 'dusk' | 'night'

export interface Greeting {
  salutation: string
  tone: GreetingTone
}

interface QuietHours {
  start: number // 0-23
  end: number // 0-23
}

/**
 * Retorna true se `hour` está dentro da faixa de quiet hours.
 * Suporta wraparound (ex: start=22, end=7 cobre 22h–7h).
 */
function isInQuietHours(hour: number, qh: QuietHours): boolean {
  if (qh.start === qh.end) return false
  if (qh.start < qh.end) {
    return hour >= qh.start && hour < qh.end
  }
  // wraparound
  return hour >= qh.start || hour < qh.end
}

/**
 * Escolhe saudação + tom baseado em hora local, nome do pai/mãe
 * (opcional) e nome do bebê (pra variação noturna).
 *
 * Regra:
 * - Durante quietHours → tom `night` (sempre, mesmo que seja 22h)
 * - 5h–11h (fora qh) → morning
 * - 11h–17h → day
 * - 17h–22h → dusk
 *
 * Se `parentFirstName` for vazio, retorna string vazia em `salutation` —
 * consumer decide se mostra algo genérico ou esconde o eyebrow.
 */
export function getGreeting(
  now: Date,
  parentFirstName: string | undefined,
  babyName: string,
  quietHours: QuietHours,
): Greeting {
  const hour = now.getHours()
  const firstName = (parentFirstName ?? '').trim().split(/\s+/)[0] ?? ''

  // Tom noturno tem prioridade sobre faixa horária fixa
  if (isInQuietHours(hour, quietHours)) {
    const baseNight = babyName
      ? `Boa madrugada · ${babyName} está dormindo?`
      : 'Boa madrugada'
    return { salutation: baseNight, tone: 'night' }
  }

  if (!firstName) {
    // Sem nome do pai/mãe: retorna apenas o período — consumer pode
    // optar por ocultar o eyebrow em vez de mostrar "BOM DIA, " solto.
    if (hour >= 5 && hour < 11) return { salutation: 'Bom dia', tone: 'morning' }
    if (hour >= 11 && hour < 17) return { salutation: 'Olá', tone: 'day' }
    return { salutation: 'Boa noite', tone: 'dusk' }
  }

  if (hour >= 5 && hour < 11) {
    return { salutation: `Bom dia, ${firstName}`, tone: 'morning' }
  }
  if (hour >= 11 && hour < 17) {
    return { salutation: `Oi, ${firstName}`, tone: 'day' }
  }
  return { salutation: `Boa noite, ${firstName}`, tone: 'dusk' }
}
