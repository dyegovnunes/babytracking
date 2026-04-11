import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

const words = ['A rotina do seu bebê,', 'com 1 toque,', 'na palma da sua mão.']

function Particles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 40 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-white/20"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            opacity: [0.1, 0.5, 0.1],
            scale: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 3 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 3,
          }}
        />
      ))}
    </div>
  )
}

function StoreBadges() {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-3">
      <motion.a
        href="https://apps.apple.com/app/yaya-baby"
        target="_blank"
        rel="noopener noreferrer"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.97 }}
        className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-white/10 border border-white/20 hover:bg-white/15 transition-colors"
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
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.97 }}
        className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-white/10 border border-white/20 hover:bg-white/15 transition-colors"
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

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden bg-gradient-to-br from-[#0d0a27] via-[#1a1145] to-[#0d0a27]">
      {/* Header */}
      <motion.header
        className="relative z-20 w-full max-w-6xl mx-auto px-6 py-5 flex items-center justify-between"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <img
          src="./landing/logo-light.png"
          alt="Yaya"
          className="h-8"
        />
        <nav className="hidden sm:flex items-center gap-6">
          <a href="#funcionalidades" className="text-sm text-[#b0adc4] hover:text-white transition-colors">
            Funcionalidades
          </a>
          <a href="#precos" className="text-sm text-[#b0adc4] hover:text-white transition-colors">
            Preços
          </a>
        </nav>
        <a
          href="#baixar"
          className="px-5 py-2 rounded-full bg-gradient-to-r from-[#6b4ec9] to-[#9580e6] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Baixar
        </a>
      </motion.header>

      <Particles />

      <div className="relative z-10 flex-1 flex items-center w-full max-w-6xl mx-auto px-6 py-12 lg:py-20">
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Text */}
          <div className="text-center lg:text-left">
            <motion.img
              src="./landing/logo-light.png"
              alt="Yaya"
              className="h-16 sm:h-20 mb-8 mx-auto lg:mx-0"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            />

            <div className="mb-6">
              {words.map((word, i) => (
                <motion.span
                  key={i}
                  className="block font-extrabold text-3xl sm:text-4xl lg:text-5xl leading-tight text-white"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.2 }}
                >
                  {i === 2 ? (
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#9580e6] to-[#c4b8f0]">
                      {word}
                    </span>
                  ) : (
                    word
                  )}
                </motion.span>
              ))}
            </div>

            <motion.p
              className="text-base sm:text-lg text-[#b0adc4] max-w-md mx-auto lg:mx-0 leading-relaxed mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1 }}
            >
              Acompanhe amamentação, sono, fraldas e mais.
              <br />
              Insights inteligentes que crescem com seu filho.
            </motion.p>

            <motion.div
              id="baixar"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.2 }}
            >
              <StoreBadges />
            </motion.div>

            <motion.p
              className="mt-4 text-xs text-[#7a7890]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
            >
              Grátis para começar. Yaya+ para ir além.
            </motion.p>
          </div>

          {/* Phone Mockup */}
          <motion.div
            className="flex justify-center lg:justify-end"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <motion.div
              className="relative w-64 sm:w-72"
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              {/* Phone frame */}
              <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl shadow-purple-500/20 border-2 border-white/10 bg-[#0d0a27]">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-[#0d0a27] rounded-b-2xl z-10" />
                <img
                  src="./landing/screen-home.png"
                  alt="Yaya - Tela principal"
                  className="w-full"
                />
              </div>
              {/* Glow */}
              <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/10 via-purple-400/5 to-purple-600/10 rounded-[3rem] blur-2xl -z-10" />
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <ChevronDown className="w-6 h-6 text-white/30" />
      </motion.div>
    </section>
  )
}
