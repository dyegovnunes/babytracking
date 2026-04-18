import type { ReactNode } from 'react'

interface Props {
  /** Emoji do empty state. Templates básicos — ainda sem ilustração IA curada. */
  emoji: string
  /** Título curto, 1 linha. Ex: "Ainda sem registros". */
  title: string
  /** Texto conversacional em 1-2 frases. Fala do usuário, não do sistema. */
  description?: string
  /** Ação primária opcional — botão ou link ao final do empty. */
  action?: ReactNode
  /** Tamanho vertical — compact pra dentro de listas, regular pra telas inteiras. */
  size?: 'compact' | 'regular'
  className?: string
}

/**
 * Template padrão de empty state — emoji + copy conversacional + CTA opcional.
 *
 * Design decisão da Fase 3: em vez de texto solto no meio de uma tela vazia,
 * apresenta um elemento visual + fala direta pro usuário. Prepara o terreno
 * pra substituição gradual do emoji por ilustrações geradas via IA curada
 * (paleta lilás + rosa empoeirado, linha editorial). Enquanto isso, emoji
 * mantém o tom sem parecer "erro" ou "nada aqui".
 *
 * Uso:
 *   <EmptyState
 *     emoji="📝"
 *     title="Ainda sem registros"
 *     description="Comece registrando a primeira mamada ou troca."
 *   />
 */
export default function EmptyState({
  emoji,
  title,
  description,
  action,
  size = 'regular',
  className = '',
}: Props) {
  const padding = size === 'compact' ? 'py-8' : 'py-12'
  const emojiSize = size === 'compact' ? 'text-4xl' : 'text-5xl'

  return (
    <div
      className={`flex flex-col items-center justify-center text-center px-6 ${padding} ${className}`}
    >
      <span className={`${emojiSize} mb-3`} aria-hidden>
        {emoji}
      </span>
      <h3 className="font-headline text-base font-bold text-on-surface mb-1">
        {title}
      </h3>
      {description && (
        <p className="font-label text-sm text-on-surface-variant max-w-xs leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
