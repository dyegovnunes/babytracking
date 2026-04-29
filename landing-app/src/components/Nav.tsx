import { useEffect, useState } from 'react'
import { useDevice } from '../hooks/useDevice'

export default function Nav() {
  const [show, setShow] = useState(false)
  const { isMobile, isIOS } = useDevice()

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > window.innerHeight * 0.5)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        show ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}
      style={{ background: 'rgba(13,10,39,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
    >
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-headline text-xl font-extrabold text-cloud">
            Ya<span className="text-purple">ya</span>
          </span>
        </div>
        {isMobile ? (
          <a
            href={isIOS
              ? 'https://apps.apple.com/app/yaya-baby'
              : 'https://play.google.com/store/apps/details?id=app.yayababy'}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2 rounded-full bg-gradient-to-r from-purple to-glow text-night font-headline font-bold text-sm"
          >
            Baixar gratis
          </a>
        ) : (
          <a
            href="#planos"
            className="px-5 py-2 rounded-full border border-purple/30 text-purple font-headline font-bold text-sm hover:bg-purple/10 transition-colors"
          >
            Ver planos
          </a>
        )}
      </div>
    </nav>
  )
}
