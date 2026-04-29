import { useEffect, useState } from 'react'
import yayaLogo from '../../assets/yaya-logo.png'

function isMobileUA() {
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod|Android/i.test(ua)
}

export default function Nav() {
  const [show, setShow] = useState(false)
  const [mobile, setMobile] = useState(false)

  useEffect(() => {
    setMobile(isMobileUA())
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
          <img src={yayaLogo} alt="Yaya" className="h-7 w-7 object-contain" />
          <span className="font-headline text-base font-bold text-on-surface">Yaya</span>
        </div>
        {mobile ? (
          <a
            href="https://apps.apple.com/app/yaya-baby"
            className="px-5 py-2 rounded-full text-on-primary font-headline font-bold text-sm"
            style={{ background: 'linear-gradient(135deg, #b79fff 0%, #8b5cf6 100%)' }}
          >
            Baixar gratis
          </a>
        ) : (
          <a
            href="#planos"
            className="px-5 py-2 rounded-full border border-primary/30 text-primary font-headline font-bold text-sm hover:bg-primary/10 transition-colors"
          >
            Ver planos
          </a>
        )}
      </div>
    </nav>
  )
}
