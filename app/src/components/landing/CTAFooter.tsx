import { useEffect, useState } from 'react'
import { useReveal } from '../../hooks/useReveal'

function isMobileUA() {
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod|Android/i.test(ua)
}

export default function CTAFooter() {
  const ref = useReveal()
  const [mobile, setMobile] = useState(false)

  useEffect(() => {
    setMobile(isMobileUA())
  }, [])

  return (
    <section ref={ref} className="reveal py-24 px-5 relative">
      <div className="max-w-2xl mx-auto text-center">
        <div
          className="absolute inset-0 -z-10 mx-auto max-w-lg pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, rgba(171,142,254,0.08) 0%, transparent 70%)' }}
        />

        <h2 className="font-headline text-2xl md:text-3xl font-extrabold mb-4 leading-tight">
          Seu bebe merece o melhor{' '}
          <span className="text-primary">acompanhamento.</span>
        </h2>
        <p className="font-body text-on-surface-variant mb-8 max-w-md mx-auto">
          Comece gratis agora. Sem cartao, sem compromisso.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {mobile ? (
            <>
              <a
                href="https://apps.apple.com/app/yaya-baby"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-headline font-bold text-sm text-on-primary"
                style={{
                  background: 'linear-gradient(135deg, #b79fff 0%, #8b5cf6 100%)',
                  boxShadow: '0 4px 20px rgba(171,142,254,0.3)',
                }}
              >
                Baixar gratis
              </a>
              <a
                href="#planos"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-primary/30 text-primary font-headline font-bold text-sm hover:bg-primary/10 transition-colors"
              >
                Ver planos
              </a>
            </>
          ) : (
            <>
              <a
                href="https://apps.apple.com/app/yaya-baby"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3.5 rounded-xl border border-primary/30 text-primary font-headline font-bold text-sm hover:bg-primary/10 transition-colors"
              >
                App Store
              </a>
              <a
                href="https://play.google.com/store/apps/details?id=app.yayababy"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3.5 rounded-xl border border-primary/30 text-primary font-headline font-bold text-sm hover:bg-primary/10 transition-colors"
              >
                Google Play
              </a>
              <a
                href="#planos"
                className="px-8 py-3.5 rounded-xl font-headline font-bold text-sm text-primary hover:bg-primary/20 transition-colors"
                style={{ background: 'rgba(183,159,255,0.1)' }}
              >
                Ver planos Yaya+
              </a>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
