import { motion } from 'framer-motion'
import { Heart } from 'lucide-react'

function StoreBadges() {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
      <motion.a
        href="https://apps.apple.com/app/yaya-baby"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-white/10 border border-white/20 hover:bg-white/15 transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.97 }}
      >
        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="white">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
        </svg>
        <div className="text-left">
          <div className="text-[10px] text-white/70 leading-none">Disponível na</div>
          <div className="text-base font-semibold text-white leading-tight">App Store</div>
        </div>
      </motion.a>
      <motion.a
        href="https://play.google.com/store/apps/details?id=app.yayababy"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-white/10 border border-white/20 hover:bg-white/15 transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.97 }}
      >
        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none">
          <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92z" fill="#4285F4"/>
          <path d="M17.556 8.235l-3.764 3.764 3.764 3.765 4.247-2.39a1 1 0 000-1.748l-4.247-2.39z" fill="#FBBC04"/>
          <path d="M3.609 1.814L13.792 12l3.764-3.765-9.72-5.473a1.003 1.003 0 00-4.227-.948z" fill="#34A853"/>
          <path d="M13.792 12L3.61 22.186a1.003 1.003 0 004.227-.948l9.72-5.473L13.791 12z" fill="#EA4335"/>
        </svg>
        <div className="text-left">
          <div className="text-[10px] text-white/70 leading-none">Disponível no</div>
          <div className="text-base font-semibold text-white leading-tight">Google Play</div>
        </div>
      </motion.a>
    </div>
  )
}

export default function CTAFooter() {
  return (
    <>
      {/* CTA Final */}
      <section id="baixar" className="relative bg-gradient-to-b from-[#1a1145] to-[#0d0a27] py-24 sm:py-32 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-purple-500/5 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-6 leading-tight">
              Pronto para simplificar
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#9580e6] to-[#c4b8f0]">
                a rotina?
              </span>
            </h2>

            <div className="mb-6">
              <StoreBadges />
            </div>

            <p className="text-sm text-[#7a7890]">
              Grátis. Sem cartão. Começa em 30 segundos.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0d0a27] border-t border-white/5 py-8">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <img
              src="./landing/logo-light.png"
              alt="Yaya"
              className="h-10"
            />

            <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              <a href="#funcionalidades" className="text-xs text-[#7a7890] hover:text-white transition-colors">
                Produto
              </a>
              <a href="#precos" className="text-xs text-[#7a7890] hover:text-white transition-colors">
                Preços
              </a>
              <a href="mailto:contato@yayababy.app" className="text-xs text-[#7a7890] hover:text-white transition-colors">
                Suporte
              </a>
              <a href="/privacy" className="text-xs text-[#7a7890] hover:text-white transition-colors">
                Privacidade
              </a>
            </nav>
          </div>

          <div className="mt-6 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-[#5a5678] flex items-center gap-1">
              © 2026 Yaya Baby. Feito com <Heart className="w-3 h-3 text-[#9580e6] fill-[#9580e6]" /> no Brasil.
            </p>
            <div className="flex items-center gap-4">
              <a href="https://instagram.com/yayababyapp" target="_blank" rel="noopener noreferrer" className="text-[#5a5678] hover:text-[#9580e6] transition-colors text-xs">
                Instagram
              </a>
              <a href="https://tiktok.com/@yayababyapp" target="_blank" rel="noopener noreferrer" className="text-[#5a5678] hover:text-[#9580e6] transition-colors text-xs">
                TikTok
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}
