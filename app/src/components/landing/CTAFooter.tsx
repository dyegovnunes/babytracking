import { motion } from 'framer-motion'
import { Heart } from 'lucide-react'

export default function CTAFooter() {
  return (
    <>
      {/* CTA Final */}
      <section className="relative bg-gradient-to-b from-[#1a1145] to-[#0d0a27] py-24 sm:py-32 overflow-hidden">
        {/* Subtle glow */}
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

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
              <motion.a
                href="https://apps.apple.com/app/yaya-baby"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
              >
                <svg width="160" height="52" viewBox="0 0 160 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="0.5" y="0.5" width="159" height="51" rx="10" fill="#fff" fillOpacity="0.1" stroke="#fff" strokeOpacity="0.3"/>
                  <text x="80" y="21" textAnchor="middle" fill="#fff" fontSize="9" fontFamily="system-ui" opacity="0.8">Disponível na</text>
                  <text x="80" y="38" textAnchor="middle" fill="#fff" fontSize="17" fontWeight="600" fontFamily="system-ui">App Store</text>
                </svg>
              </motion.a>
              <motion.a
                href="https://play.google.com/store/apps/details?id=app.yayababy"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
              >
                <svg width="160" height="52" viewBox="0 0 160 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="0.5" y="0.5" width="159" height="51" rx="10" fill="#fff" fillOpacity="0.1" stroke="#fff" strokeOpacity="0.3"/>
                  <text x="80" y="21" textAnchor="middle" fill="#fff" fontSize="9" fontFamily="system-ui" opacity="0.8">Disponível no</text>
                  <text x="80" y="38" textAnchor="middle" fill="#fff" fontSize="17" fontWeight="600" fontFamily="system-ui">Google Play</text>
                </svg>
              </motion.a>
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
            <div className="flex items-center gap-3">
              <img
                src="./landing/logo-light.png"
                alt="Yaya"
                className="h-6"
              />
            </div>

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
