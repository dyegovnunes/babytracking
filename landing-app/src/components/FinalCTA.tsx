import { useReveal } from '../hooks/useReveal'
import { useDevice } from '../hooks/useDevice'

export default function FinalCTA() {
  const ref = useReveal()
  const { isMobile, isIOS } = useDevice()

  return (
    <section ref={ref} className="reveal py-24 px-5">
      <div className="max-w-2xl mx-auto text-center">
        <div
          className="absolute inset-0 -z-10 mx-auto max-w-lg"
          style={{ background: 'radial-gradient(ellipse at center, rgba(171,142,254,0.08) 0%, transparent 70%)' }}
        />

        <h2 className="font-headline text-2xl md:text-3xl font-extrabold mb-4 leading-tight">
          Seu bebe merece o melhor{' '}
          <span className="text-purple">acompanhamento.</span>
        </h2>
        <p className="font-body text-muted mb-8 max-w-md mx-auto">
          Comece gratis agora. Sem cartao, sem compromisso.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {isMobile ? (
            <>
              <a
                href={isIOS
                  ? 'https://apps.apple.com/app/yaya-baby'
                  : 'https://play.google.com/store/apps/details?id=app.yayababy'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-purple to-glow text-night font-headline font-bold text-sm shadow-[0_4px_20px_rgba(171,142,254,0.3)]"
              >
                Baixar gratis
              </a>
              <a
                href="#planos"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-purple/30 text-purple font-headline font-bold text-sm hover:bg-purple/10 transition-colors"
              >
                Ver planos
              </a>
            </>
          ) : (
            <>
              <span className="px-8 py-3.5 rounded-xl bg-purple/15 text-purple font-headline font-bold text-sm">
                Disponivel no celular
              </span>
              <a
                href="#pricing"
                className="px-8 py-3.5 rounded-xl border border-purple/30 text-purple font-headline font-bold text-sm hover:bg-purple/10 transition-colors"
              >
                Ver planos
              </a>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
