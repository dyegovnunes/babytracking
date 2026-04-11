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
        className="inline-block"
      >
        <svg width="150" height="50" viewBox="0 0 150 50" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="150" height="50" rx="10" fill="#fff" fillOpacity="0.1" stroke="#fff" strokeOpacity="0.3" strokeWidth="1"/>
          <text x="75" y="20" textAnchor="middle" fill="#fff" fontSize="9" fontFamily="system-ui" opacity="0.8">Disponível na</text>
          <text x="75" y="36" textAnchor="middle" fill="#fff" fontSize="16" fontWeight="600" fontFamily="system-ui">App Store</text>
        </svg>
      </motion.a>
      <motion.a
        href="https://play.google.com/store/apps/details?id=app.yayababy"
        target="_blank"
        rel="noopener noreferrer"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.97 }}
        className="inline-block"
      >
        <svg width="150" height="50" viewBox="0 0 150 50" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="150" height="50" rx="10" fill="#fff" fillOpacity="0.1" stroke="#fff" strokeOpacity="0.3" strokeWidth="1"/>
          <text x="75" y="20" textAnchor="middle" fill="#fff" fontSize="9" fontFamily="system-ui" opacity="0.8">Disponível no</text>
          <text x="75" y="36" textAnchor="middle" fill="#fff" fontSize="16" fontWeight="600" fontFamily="system-ui">Google Play</text>
        </svg>
      </motion.a>
    </div>
  )
}

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-[#0d0a27] via-[#1a1145] to-[#0d0a27]">
      <Particles />

      <div className="relative z-10 w-full max-w-6xl mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Text */}
        <div className="text-center lg:text-left">
          <motion.img
            src="./landing/logo-light.png"
            alt="Yaya"
            className="h-10 mb-8 mx-auto lg:mx-0"
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
            Registre amamentação, sono, fraldas e mais.
            <br />
            Insights inteligentes que crescem com seu filho.
          </motion.p>

          <motion.div
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
