import { useMemo } from 'react'
import { parseLocalDate } from '../../../lib/formatters'
import { contractionDe } from '../../../lib/genderUtils'

interface Props {
  babyName: string
  gender: 'boy' | 'girl' | undefined
  birthDate: string
}

// Tips atemporais pré-parto — não dependem de data nem idade gestacional.
// Podem ser exibidas em qualquer momento da gravidez sem ficar desatualizadas.
const PRENATAL_TIPS = [
  {
    emoji: '🍼',
    title: 'Prepare a bolsa da maternidade',
    body: 'Deixe pronta entre 32 e 36 semanas. Separe documentos, roupinhas, fraldas e o que você e o bebê vão precisar.',
  },
  {
    emoji: '🛏️',
    title: 'Escolha onde o bebê vai dormir',
    body: 'Berço no quarto dos pais nos primeiros meses é a recomendação da SBP. Evita colo noturno e reduz risco de SMSL.',
  },
  {
    emoji: '🤱',
    title: 'Informe-se sobre amamentação',
    body: 'Saber pegar o peito direito antes do parto reduz muita frustração. Busque um grupo de apoio ou doula.',
  },
  {
    emoji: '📞',
    title: 'Defina uma rede de apoio',
    body: 'Liste quem pode ajudar nos primeiros 30 dias: comida, limpeza, companhia. Pedir ajuda não é fraqueza.',
  },
  {
    emoji: '💉',
    title: 'Confira a caderneta de vacinas',
    body: 'Tríplice bacteriana (dTpa) na gestação protege o bebê nos primeiros meses. Gripe também é recomendada.',
  },
  {
    emoji: '🧘',
    title: 'Cuide do sono dos próximos meses',
    body: 'Durma bem agora. Nos primeiros 3 meses do bebê, o sono dos pais fica fragmentado. Banco de sono é real.',
  },
  {
    emoji: '🩺',
    title: 'Tenha um pediatra de confiança',
    body: 'Antes do parto, marque uma consulta com o pediatra pra apresentação. A primeira consulta do bebê é até 7 dias após o nascimento.',
  },
]

function formatDaysOrWeeks(daysUntil: number): string {
  if (daysUntil <= 7) {
    return `${daysUntil} dia${daysUntil !== 1 ? 's' : ''}`
  }
  const weeks = Math.ceil(daysUntil / 7)
  return `${weeks} semana${weeks !== 1 ? 's' : ''}`
}

/**
 * View exibida quando o bebê ainda não nasceu (birth_date > hoje).
 * Countdown + dicas atemporais pré-parto. Sem registros de atividade,
 * marcos, vacinas, etc. — esses só fazem sentido depois do nascimento.
 */
export default function PrenatalView({ babyName, gender, birthDate }: Props) {
  const { daysUntil, formattedDate } = useMemo(() => {
    const birth = parseLocalDate(birthDate)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const days = Math.ceil((birth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return {
      daysUntil: days,
      formattedDate: birth.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
    }
  }, [birthDate])

  const prep = contractionDe(gender ?? 'boy')

  return (
    <div className="pb-4 page-enter">
      {/* Hero countdown */}
      <section className="px-5 pt-8 pb-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-4">
          <span className="material-symbols-outlined text-primary text-sm">schedule</span>
          <span className="font-label text-xs font-semibold text-primary uppercase tracking-wider">
            Esperando chegar
          </span>
        </div>
        <h1 className="font-headline text-3xl font-extrabold text-on-surface mb-2">
          {babyName}
        </h1>
        <p className="font-label text-base text-on-surface-variant mb-6">
          Chegada prevista em{' '}
          <strong className="text-on-surface">{formattedDate}</strong>
        </p>
        <div className="inline-block px-6 py-4 rounded-md bg-surface-container">
          <p className="font-label text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">
            Faltam
          </p>
          <p className="font-headline text-4xl font-extrabold text-primary leading-none">
            {formatDaysOrWeeks(daysUntil)}
          </p>
        </div>
      </section>

      {/* Info: registros só depois do nascimento */}
      <section className="px-5 mt-4">
        <div className="rounded-md bg-tertiary/5 border border-tertiary/15 p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-tertiary text-lg shrink-0">info</span>
          <p className="font-body text-sm text-on-surface leading-snug">
            Os registros de rotina liberam quando {contractionDe(gender ?? 'boy')} {babyName} nascer.
            Enquanto isso, aproveita essas dicas {prep} gente que já passou.
          </p>
        </div>
      </section>

      {/* Dicas atemporais */}
      <section className="px-5 mt-6">
        <h2 className="font-headline text-base font-bold text-on-surface mb-3">
          Dicas pra se preparar
        </h2>
        <div className="space-y-2.5">
          {PRENATAL_TIPS.map((tip) => (
            <div
              key={tip.title}
              className="rounded-md bg-surface-container p-4 flex items-start gap-3"
            >
              <span className="text-2xl shrink-0">{tip.emoji}</span>
              <div className="flex-1 min-w-0">
                <h3 className="font-headline text-sm font-bold text-on-surface mb-1">
                  {tip.title}
                </h3>
                <p className="font-body text-xs text-on-surface-variant leading-relaxed">
                  {tip.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
