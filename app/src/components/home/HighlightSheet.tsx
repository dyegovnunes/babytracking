import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Highlight } from '../../lib/highlights'
import { dismissHighlight } from '../../lib/highlights'
import { hapticLight, hapticMedium } from '../../lib/haptics'
import { contractionDe } from '../../lib/genderUtils'
import { useSheetBackClose } from '../../hooks/useSheetBackClose'

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
    if (highlight.data.type === 'leap_active' || highlight.data.type === 'leap_upcoming') {
      // Até existir uma página dedicada de saltos, abrimos a página de perfil
      // onde a seção de saltos deve viver. Por enquanto, fallback para a própria
      // TrackerPage (o sheet já trouxe o conteúdo completo).
      // TODO: quando criar /saltos, trocar por navigate('/saltos').
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
      seeMoreLabel: 'Fechar',
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
      seeMoreLabel: 'Fechar',
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
