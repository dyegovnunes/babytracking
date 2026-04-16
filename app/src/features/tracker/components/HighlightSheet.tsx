import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Highlight } from '../highlights'
import { dismissHighlight } from '../highlights'
import { formatDueSoon, formatOverdue } from '../../medications'
import { hapticLight, hapticMedium } from '../../../lib/haptics'
import { contractionDe } from '../../../lib/genderUtils'
import { useSheetBackClose } from '../../../hooks/useSheetBackClose'

interface Props {
  highlight: Highlight
  babyName: string
  babyGender?: 'boy' | 'girl'
  birthDate: string
  onClose: () => void
  onDismissed: () => void
  onNavigated: () => void
}

/**
 * Bottom sheet genérico para um destaque.
 *
 * Renderiza um layout compartilhado (emoji grande, kicker, título, conteúdo)
 * e três ações padrão:
 *   - Fechar:    fecha o sheet, destaque continua ativo
 *   - Dispensar: grava timestamp no localStorage, some por N dias
 *   - Ver mais:  navega para a página de destino (ou no-op quando não há)
 *
 * Conteúdo específico por tipo é montado pela função `renderContent`.
 */
export default function HighlightSheet({
  highlight,
  babyName,
  babyGender,
  birthDate,
  onClose,
  onDismissed,
  onNavigated,
}: Props) {
  const navigate = useNavigate()
  useSheetBackClose(true, onClose)

  // Travar scroll do body enquanto o sheet está aberto
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const handleDismiss = () => {
    hapticMedium()
    dismissHighlight({ type: highlight.type, id: highlight.id })
    onDismissed()
  }

  const handleSeeMore = () => {
    hapticLight()
    if (highlight.data.type === 'milestone') {
      navigate('/marcos')
      onNavigated()
      return
    }
    if (
      highlight.data.type === 'vaccine_overdue' ||
      highlight.data.type === 'vaccine_upcoming'
    ) {
      navigate('/vacinas')
      onNavigated()
      return
    }
    if (
      highlight.data.type === 'medication_overdue' ||
      highlight.data.type === 'medication_due_soon'
    ) {
      navigate('/medicamentos')
      onNavigated()
      return
    }
    if (highlight.data.type === 'leap_active' || highlight.data.type === 'leap_upcoming') {
      navigate('/saltos')
      onNavigated()
      return
    }
  }

  const content = renderContent({ highlight, babyName, babyGender, birthDate })

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-md bg-surface-container-highest p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] max-h-[85vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full bg-on-surface-variant/30 mx-auto mb-4" />

        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-14 h-14 rounded-md bg-surface-container flex items-center justify-center shrink-0">
            <span className="text-3xl leading-none">{highlight.emoji}</span>
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <p className="font-label text-[10px] font-bold uppercase tracking-wider text-primary">
              {highlight.kicker}
            </p>
            <h3 className="font-headline text-lg font-bold text-on-surface leading-tight mt-0.5">
              {content.heading}
            </h3>
            {content.subheading && (
              <p className="font-label text-xs text-on-surface-variant mt-1">
                {content.subheading}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant active:bg-surface-variant"
            aria-label="Fechar"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Body (custom per type) */}
        <div className="mb-5">{content.body}</div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="flex-1 py-3 rounded-md bg-surface-variant/50 text-on-surface-variant font-label text-xs font-semibold active:bg-surface-variant"
          >
            Dispensar
          </button>
          {content.seeMoreLabel && (
            <button
              type="button"
              onClick={handleSeeMore}
              className="flex-1 py-3 rounded-md bg-primary text-on-primary font-label text-xs font-bold active:opacity-90"
            >
              {content.seeMoreLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------- Per-type content ----------

interface RenderedContent {
  heading: string
  subheading?: string
  body: React.ReactNode
  seeMoreLabel?: string
}

function renderContent({
  highlight,
  babyName,
  babyGender,
  birthDate,
}: {
  highlight: Highlight
  babyName: string
  babyGender?: 'boy' | 'girl'
  birthDate: string
}): RenderedContent {
  const data = highlight.data
  void birthDate // reservado para quando precisarmos calcular idade exata do destaque

  // ---------- LEAP ACTIVE ----------
  if (data.type === 'leap_active') {
    const leap = data.leap
    const adjAgitado = babyGender === 'girl' ? 'agitada' : 'agitado'
    return {
      heading: leap.name,
      subheading: leap.subtitle,
      seeMoreLabel: 'Ver todos os saltos',
      body: (
        <>
          <p className="font-body text-sm text-on-surface-variant leading-relaxed mb-4">
            {babyName} pode estar mais {adjAgitado}. {leap.description}
          </p>

          <Subsection label="O que esperar">
            <ul className="space-y-1.5">
              {leap.whatToExpect.map((item, i) => (
                <li key={i} className="flex gap-2 items-start">
                  <span className="text-primary text-sm leading-tight">•</span>
                  <span className="font-body text-xs text-on-surface leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </Subsection>

          <Subsection label="Dicas">
            <ul className="space-y-1.5">
              {leap.tips.map((tip, i) => (
                <li key={i} className="flex gap-2 items-start">
                  <span className="text-tertiary text-sm leading-tight">✓</span>
                  <span className="font-body text-xs text-on-surface leading-relaxed">{tip}</span>
                </li>
              ))}
            </ul>
          </Subsection>

          <div className="mt-3 p-3 rounded-md bg-primary/5 border border-primary/15">
            <p className="font-label text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
              Impacto no registro
            </p>
            <p className="font-body text-xs text-on-surface-variant leading-relaxed">
              {leap.registroImpact}
            </p>
          </div>
        </>
      ),
    }
  }

  // ---------- LEAP UPCOMING ----------
  if (data.type === 'leap_upcoming') {
    const leap = data.leap
    return {
      heading: `Salto ${leap.id}: ${leap.name}`,
      subheading: `Chega em ${data.weeksUntil} ${data.weeksUntil === 1 ? 'semana' : 'semanas'}`,
      seeMoreLabel: 'Ver todos os saltos',
      body: (
        <>
          <p className="font-body text-sm text-on-surface-variant leading-relaxed mb-4">
            {leap.description}
          </p>
          <Subsection label="O que vai acontecer">
            <ul className="space-y-1.5">
              {leap.whatToExpect.map((item, i) => (
                <li key={i} className="flex gap-2 items-start">
                  <span className="text-primary text-sm leading-tight">•</span>
                  <span className="font-body text-xs text-on-surface leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </Subsection>
        </>
      ),
    }
  }

  // ---------- VACCINE OVERDUE ----------
  if (data.type === 'vaccine_overdue') {
    const v = data.vaccine
    const de = contractionDe(babyGender)
    const dias = data.overdueBy
    const total = 1 + data.othersCount
    return {
      heading:
        total > 1 ? `${total} vacinas atrasadas` : v.name,
      subheading:
        total > 1
          ? `${v.name} e mais ${data.othersCount}`
          : dias > 0
            ? `Atrasada há ${dias} ${dias === 1 ? 'dia' : 'dias'}`
            : 'Atrasada',
      seeMoreLabel: 'Ver caderneta',
      body: (
        <>
          <p className="font-body text-sm text-on-surface-variant leading-relaxed mb-3">
            {total > 1
              ? `${babyName} tem ${total} vacinas em atraso. Converse com o pediatra ${de} ${babyName} para colocar o calendário em dia.`
              : `Esta vacina já passou da data recomendada para ${babyName}. Converse com o pediatra ${de} ${babyName} para colocar em dia.`}
          </p>

          {data.othersCount > 0 && (
            <Subsection label="Todas as atrasadas">
              <ul className="space-y-1">
                <li className="flex gap-2 items-start">
                  <span className="text-yellow-400 text-sm leading-tight">•</span>
                  <span className="font-body text-xs text-on-surface leading-relaxed">
                    <strong>{v.name}</strong>
                    {dias > 0 ? ` · há ${dias}d` : ''}
                  </span>
                </li>
                {data.otherNames.map((name, i) => (
                  <li key={i} className="flex gap-2 items-start">
                    <span className="text-yellow-400 text-sm leading-tight">•</span>
                    <span className="font-body text-xs text-on-surface leading-relaxed">
                      {name}
                    </span>
                  </li>
                ))}
              </ul>
            </Subsection>
          )}

          {data.othersCount === 0 && (
            <>
              <Subsection label="Protege contra">
                <p className="font-body text-xs text-on-surface leading-relaxed">
                  {v.protectsAgainst}
                </p>
              </Subsection>
              <Subsection label="Esquema">
                <p className="font-body text-xs text-on-surface leading-relaxed">
                  {v.doseLabel}
                  {v.totalDoses > 1 ? ` · ${v.totalDoses} doses no total` : ''}
                </p>
              </Subsection>
            </>
          )}

          <div className="mt-3 p-3 rounded-md bg-yellow-500/5 border border-yellow-500/20">
            <p className="font-label text-[10px] font-bold uppercase tracking-wider text-yellow-400 mb-1">
              Importante
            </p>
            <p className="font-body text-xs text-on-surface-variant leading-relaxed">
              Atraso na vacinação não significa recomeçar o esquema — o
              pediatra vai te orientar sobre como seguir.
            </p>
          </div>
        </>
      ),
    }
  }

  // ---------- VACCINE UPCOMING ----------
  if (data.type === 'vaccine_upcoming') {
    const v = data.vaccine
    const dias = data.daysUntil
    const total = 1 + data.othersCount
    const singleSub =
      dias <= 0
        ? 'Já pode tomar'
        : dias === 1
          ? 'Em 1 dia'
          : `Em ${dias} dias`
    return {
      heading:
        total > 1 ? `${total} vacinas chegando` : v.name,
      subheading:
        total > 1 ? `${v.name} e mais ${data.othersCount}` : singleSub,
      seeMoreLabel: 'Ver caderneta',
      body: (
        <>
          <p className="font-body text-sm text-on-surface-variant leading-relaxed mb-3">
            {total > 1
              ? `${babyName} tem ${total} vacinas chegando nos próximos dias. Veja a caderneta para planejar com o pediatra.`
              : dias <= 0
                ? `${babyName} já pode tomar esta vacina. Agende com o pediatra quando puder.`
                : `${babyName} poderá tomar esta vacina em breve. Fique de olho na agenda do pediatra.`}
          </p>

          {data.othersCount > 0 && (
            <Subsection label="Todas as próximas">
              <ul className="space-y-1">
                <li className="flex gap-2 items-start">
                  <span className="text-primary text-sm leading-tight">•</span>
                  <span className="font-body text-xs text-on-surface leading-relaxed">
                    <strong>{v.name}</strong> · {singleSub}
                  </span>
                </li>
                {data.otherNames.map((name, i) => (
                  <li key={i} className="flex gap-2 items-start">
                    <span className="text-primary text-sm leading-tight">•</span>
                    <span className="font-body text-xs text-on-surface leading-relaxed">
                      {name}
                    </span>
                  </li>
                ))}
              </ul>
            </Subsection>
          )}

          {data.othersCount === 0 && (
            <>
              <Subsection label="Protege contra">
                <p className="font-body text-xs text-on-surface leading-relaxed">
                  {v.protectsAgainst}
                </p>
              </Subsection>
              <Subsection label="Esquema">
                <p className="font-body text-xs text-on-surface leading-relaxed">
                  {v.doseLabel}
                  {v.totalDoses > 1 ? ` · ${v.totalDoses} doses no total` : ''}
                </p>
              </Subsection>
            </>
          )}

          <div className="mt-3 p-3 rounded-md bg-primary/5 border border-primary/15">
            <p className="font-label text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
              {v.source === 'PNI' ? 'SUS' : 'Particular'}
              {' · '}
              {v.isMandatory ? 'Obrigatória' : 'Opcional'}
            </p>
            <p className="font-body text-xs text-on-surface-variant leading-relaxed">
              {v.source === 'PNI'
                ? 'Disponível gratuitamente nas UBS do SUS.'
                : 'Disponível em clínicas particulares. Consulte seu pediatra.'}
            </p>
          </div>
        </>
      ),
    }
  }

  // ---------- MEDICATION OVERDUE ----------
  if (data.type === 'medication_overdue') {
    const main = data.primary
    const total = 1 + data.othersCount
    const de = contractionDe(babyGender)
    // `main.alert` é union — como estamos no branch overdue, fazemos narrowing
    // defensivo via fallback pra 0 quando a kind não bater (não deveria acontecer).
    const minutesLate =
      main.alert.kind === 'overdue' ? main.alert.minutesLate : 0
    const overdueLabel = formatOverdue(minutesLate)
    return {
      heading:
        total > 1
          ? `${total} remédios atrasados`
          : main.medicationName,
      subheading:
        total > 1
          ? `${main.medicationName} e mais ${data.othersCount}`
          : `Horário das ${main.alert.time} · ${overdueLabel}`,
      seeMoreLabel: 'Ver medicamentos',
      body: (
        <>
          <p className="font-body text-sm text-on-surface-variant leading-relaxed mb-3">
            {total > 1
              ? `${babyName} tem ${total} medicamentos atrasados. Toque em "Ver medicamentos" para registrar as doses.`
              : `A dose das ${main.alert.time} de ${main.medicationName} ainda não foi registrada hoje.`}
          </p>

          {data.othersCount > 0 && (
            <Subsection label="Todos os atrasados">
              <ul className="space-y-1">
                <li className="flex gap-2 items-start">
                  <span className="text-yellow-400 text-sm leading-tight">•</span>
                  <span className="font-body text-xs text-on-surface leading-relaxed">
                    <strong>{main.medicationName}</strong> · {overdueLabel}
                  </span>
                </li>
                {data.otherNames.map((name, i) => (
                  <li key={i} className="flex gap-2 items-start">
                    <span className="text-yellow-400 text-sm leading-tight">•</span>
                    <span className="font-body text-xs text-on-surface leading-relaxed">
                      {name}
                    </span>
                  </li>
                ))}
              </ul>
            </Subsection>
          )}

          <div className="mt-3 p-3 rounded-md bg-yellow-500/5 border border-yellow-500/20">
            <p className="font-label text-[10px] font-bold uppercase tracking-wider text-yellow-400 mb-1">
              Lembrete
            </p>
            <p className="font-body text-xs text-on-surface-variant leading-relaxed">
              Se já tiver dado, registre pra manter a rotina {de} {babyName}{' '}
              em dia. Em dúvida sobre dose, consulte o pediatra.
            </p>
          </div>
        </>
      ),
    }
  }

  // ---------- MEDICATION DUE SOON ----------
  if (data.type === 'medication_due_soon') {
    const main = data.primary
    const total = 1 + data.othersCount
    const minutesUntil =
      main.alert.kind === 'due_soon' ? main.alert.minutesUntil : 0
    const dueLabel = formatDueSoon(minutesUntil)
    return {
      heading:
        total > 1 ? `${total} doses chegando` : main.medicationName,
      subheading:
        total > 1
          ? `${main.medicationName} e mais ${data.othersCount}`
          : `${main.alert.time} · ${dueLabel}`,
      seeMoreLabel: 'Ver medicamentos',
      body: (
        <>
          <p className="font-body text-sm text-on-surface-variant leading-relaxed mb-3">
            {total > 1
              ? `${babyName} tem ${total} doses chegando nos próximos minutos.`
              : `Próxima dose de ${main.medicationName} chega ${dueLabel} (horário ${main.alert.time}).`}
          </p>

          {data.othersCount > 0 && (
            <Subsection label="Todas as doses chegando">
              <ul className="space-y-1">
                <li className="flex gap-2 items-start">
                  <span className="text-primary text-sm leading-tight">•</span>
                  <span className="font-body text-xs text-on-surface leading-relaxed">
                    <strong>{main.medicationName}</strong> · {dueLabel}
                  </span>
                </li>
                {data.otherNames.map((name, i) => (
                  <li key={i} className="flex gap-2 items-start">
                    <span className="text-primary text-sm leading-tight">•</span>
                    <span className="font-body text-xs text-on-surface leading-relaxed">
                      {name}
                    </span>
                  </li>
                ))}
              </ul>
            </Subsection>
          )}
        </>
      ),
    }
  }

  // ---------- MILESTONE ----------
  if (data.type === 'milestone') {
    const m = data.milestone
    const de = contractionDe(babyGender)
    return {
      heading: m.name,
      subheading: 'Próximo marco da fase',
      seeMoreLabel: 'Registrar',
      body: (
        <>
          <p className="font-body text-sm text-on-surface-variant leading-relaxed mb-3">
            {m.description}
          </p>
          <div className="p-3 rounded-md bg-tertiary/5 border border-tertiary/15">
            <p className="font-label text-[10px] font-bold uppercase tracking-wider text-tertiary mb-1">
              Lembre-se
            </p>
            <p className="font-body text-xs text-on-surface leading-relaxed">
              Cada bebê tem seu ritmo. Este marco é uma referência média — o importante é acompanhar a evolução {de} {babyName}.
            </p>
          </div>
        </>
      ),
    }
  }

  return { heading: '', body: null }
}

function Subsection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
        {label}
      </p>
      {children}
    </div>
  )
}
