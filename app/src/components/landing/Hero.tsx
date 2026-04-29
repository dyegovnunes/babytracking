import { useEffect, useState } from 'react'
import yayaLogo from '../../assets/yaya-logo.png'
import yayaMockup from '../../assets/yaya-mockup.png'

function isMobileUA() {
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod|Android/i.test(ua)
}

export default function Hero() {
  const [mobile, setMobile] = useState(false)

  useEffect(() => {
    setMobile(isMobileUA())
  }, [])

  return (
    <section className="relative min-h-dvh flex items-start lg:items-center overflow-hidden pt-16 lg:pt-0">
      {/* Ambient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(171,142,254,0.12) 0%, transparent 60%)' }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-5 py-20 w-full">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left — copy */}
          <div className="flex-1 text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/[0.08] mb-8">
              <img src={yayaLogo} alt="" className="h-4 w-4 object-contain" aria-hidden />
              <span className="font-body text-sm text-primary font-medium">
                App Store · Google Play
              </span>
            </div>

            {/* H1 */}
            <h1 className="font-headline text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.1] mb-6">
              O companheiro que{' '}
              <br className="hidden sm:block" />
              voce precisa as{' '}
              <br className="hidden sm:block" />
              <span className="text-primary">3 da manha.</span>
            </h1>

            <p className="font-body text-on-surface-variant text-base md:text-lg mb-10 max-w-lg mx-auto lg:mx-0">
              Registre mamadas, fraldas, sono e mais com um toque.
              Sem acender a luz. Sem acordar o bebe. Sem esquecer nada.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center lg:items-start gap-3 justify-center lg:justify-start">
              {mobile ? (
                <>
                  <a
                    href="https://apps.apple.com/app/yaya-baby"
                    className="w-full sm:w-auto inline-flex items-center gap-3 px-5 py-3 rounded-xl glass hover:bg-white/[0.08] transition-colors"
                  >
                    <AppleIcon />
                    <div>
                      <div className="text-[9px] text-white/50 leading-none">Disponivel na</div>
                      <div className="text-sm font-semibold text-white leading-tight">App Store</div>
                    </div>
                  </a>
                  <a
                    href="https://play.google.com/store/apps/details?id=app.yayababy"
                    className="w-full sm:w-auto inline-flex items-center gap-3 px-5 py-3 rounded-xl glass hover:bg-white/[0.08] transition-colors"
                  >
                    <PlayIcon />
                    <div>
                      <div className="text-[9px] text-white/50 leading-none">Disponivel no</div>
                      <div className="text-sm font-semibold text-white leading-tight">Google Play</div>
                    </div>
                  </a>
                </>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href="https://apps.apple.com/app/yaya-baby"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 px-5 py-3 rounded-xl glass hover:bg-white/[0.08] transition-colors"
                  >
                    <AppleIcon />
                    <div>
                      <div className="text-[9px] text-white/50 leading-none">Disponivel na</div>
                      <div className="text-sm font-semibold text-white leading-tight">App Store</div>
                    </div>
                  </a>
                  <a
                    href="https://play.google.com/store/apps/details?id=app.yayababy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 px-5 py-3 rounded-xl glass hover:bg-white/[0.08] transition-colors"
                  >
                    <PlayIcon />
                    <div>
                      <div className="text-[9px] text-white/50 leading-none">Disponivel no</div>
                      <div className="text-sm font-semibold text-white leading-tight">Google Play</div>
                    </div>
                  </a>
                  <a
                    href="#planos"
                    className="self-center text-sm text-primary/70 hover:text-primary transition-colors underline underline-offset-4"
                  >
                    Ver planos Yaya+ →
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Right — mockup */}
          <div className="flex-1 flex items-center justify-center lg:justify-end relative">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10 rounded-full blur-3xl opacity-25"
              style={{ background: 'radial-gradient(circle at center, hsl(268 85% 60% / 0.55) 0%, transparent 70%)' }}
            />
            <img
              src={yayaMockup}
              alt="App Yaya mostrando rotina do bebe"
              className="w-full max-w-xs lg:max-w-sm xl:max-w-md object-contain drop-shadow-2xl"
              loading="eager"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function AppleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="white" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92z" fill="#4285F4"/>
      <path d="M17.556 8.235l-3.764 3.764 3.764 3.765 4.247-2.39a1 1 0 000-1.748l-4.247-2.39z" fill="#FBBC04"/>
      <path d="M3.609 1.814L13.792 12l3.764-3.765-9.72-5.473a1.003 1.003 0 00-4.227-.948z" fill="#34A853"/>
      <path d="M13.792 12L3.61 22.186a1.003 1.003 0 004.227-.948l9.72-5.473L13.791 12z" fill="#EA4335"/>
    </svg>
  )
}
