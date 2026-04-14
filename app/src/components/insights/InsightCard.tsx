import type { InsightResult } from '../../lib/insightRules'

const TYPE_STYLES: Record<string, string> = {
  reference: 'border-white/5 bg-surface-container',
  pattern: 'border-primary/20 bg-primary/[0.04]',
  celebration: 'border-tertiary/20 bg-tertiary/[0.04]',
  alert: 'border-amber-500/25 bg-amber-500/[0.05]',
}

export default function InsightCard({
  emoji,
  title,
  body,
  source,
  type,
}: InsightResult) {
  return (
    <div
      className={`rounded-md p-4 border ${TYPE_STYLES[type] || TYPE_STYLES.reference}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl mt-0.5 leading-none">{emoji}</span>
        <div className="flex-1 min-w-0">
          <h4 className="font-headline text-sm font-bold text-on-surface mb-1">
            {title}
          </h4>
          <p className="font-label text-sm text-on-surface-variant leading-relaxed">
            {body}
          </p>
          {source && (
            <p className="font-label text-[10px] text-on-surface-variant/50 mt-2 uppercase tracking-wide">
              Fonte: {source}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
