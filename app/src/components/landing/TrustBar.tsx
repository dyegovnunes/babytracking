import { useReveal } from '../../hooks/useReveal'

const items = [
  'Gratis para comecar',
  'Design pensado na rotina',
  'iOS e Android',
  'Sincroniza com a familia',
]

export default function TrustBar() {
  const ref = useReveal()

  return (
    <div ref={ref} className="reveal py-8 border-y border-outline-variant">
      <div className="max-w-4xl mx-auto px-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-2 font-body text-sm text-on-surface-variant">
            <span className="text-primary">✓</span>
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}
