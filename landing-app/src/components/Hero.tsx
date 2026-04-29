import PhoneMockup from './PhoneMockup'

export default function Hero() {
  return (
    <section className="relative min-h-dvh flex items-start lg:items-center overflow-hidden pt-16 lg:pt-0">
      {/* Ambient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(171,142,254,0.12) 0%, transparent 60%)' }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-5 py-20 w-full">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left */}
          <div className="flex-1 text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-purple/20 bg-purple/8 mb-8 animate-fade-in">
              <span className="font-body text-sm text-purple font-medium">
                App Store · Google Play
              </span>
            </div>

            {/* H1 */}
            <h1 className="font-headline text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.1] mb-6">
              O companheiro que{' '}
              <br className="hidden sm:block" />
              voce precisa as{' '}
              <br className="hidden sm:block" />
              <span className="text-purple">3 da manha.</span>
            </h1>

            {/* Subtitle */}
            <p className="font-body text-lg text-muted max-w-md mx-auto lg:mx-0 mb-10 leading-relaxed">
              Registre mamadas, fraldas, sono e mais com um toque.
              Sem acender a luz. Sem acordar o bebe.
              Sem esquecer nada.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center lg:items-start gap-3 justify-center lg:justify-start">
              <a
                href="https://apps.apple.com/app/yaya-baby"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-purple to-glow text-night font-headline font-bold text-base w-full sm:w-auto justify-center"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                App Store
              </a>
              <a
                href="https://play.google.com/store/apps/details?id=app.yayababy"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-6 py-3.5 rounded-2xl border border-purple/30 text-purple font-headline font-bold text-base hover:bg-purple/10 transition-colors w-full sm:w-auto justify-center"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92z" fill="#4285F4"/>
                  <path d="M17.556 8.235l-3.764 3.764 3.764 3.765 4.247-2.39a1 1 0 000-1.748l-4.247-2.39z" fill="#FBBC04"/>
                  <path d="M3.609 1.814L13.792 12l3.764-3.765-9.72-5.473a1.003 1.003 0 00-4.227-.948z" fill="#34A853"/>
                  <path d="M13.792 12L3.61 22.186a1.003 1.003 0 004.227-.948l9.72-5.473L13.791 12z" fill="#EA4335"/>
                </svg>
                Google Play
              </a>
              <a
                href="#planos"
                className="font-body text-sm text-purple/70 hover:text-purple transition-colors underline underline-offset-4 sm:self-center"
              >
                Ver planos →
              </a>
            </div>

            <p className="font-body text-xs text-muted/50 mt-5 text-center lg:text-left">
              Gratis para comecar · Cancele quando quiser
            </p>
          </div>

          {/* Right — Phone */}
          <div className="flex-shrink-0 animate-float">
            <div className="relative">
              <div
                className="absolute inset-0 -m-8 rounded-[60px] animate-glow-pulse"
                style={{ background: 'radial-gradient(circle, rgba(171,142,254,0.15) 0%, transparent 70%)' }}
              />
              <PhoneMockup />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
