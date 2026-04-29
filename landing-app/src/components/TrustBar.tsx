import { useReveal } from '../hooks/useReveal'

const items = [
  'Gratuito para comecar',
  'Design pensado na rotina',
  'Sem assinatura',
  'iOS e Android',
]

export default function TrustBar() {
  const ref = useReveal()

  return (
    <div ref={ref} className="reveal py-8 border-y border-border">
      <div className="max-w-4xl mx-auto px-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-2 font-body text-sm text-muted">
            <span className="text-purple">✓</span>
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}
