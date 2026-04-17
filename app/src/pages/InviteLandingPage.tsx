import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const APP_STORE_URL = 'https://apps.apple.com/app/yaya-baby/id0000000000'
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=app.yayababy'

function detectDevice(): 'ios' | 'android' | 'desktop' {
  if (typeof navigator === 'undefined') return 'desktop'
  const ua = navigator.userAgent.toLowerCase()
  if (/iphone|ipad|ipod/.test(ua)) return 'ios'
  if (/android/.test(ua)) return 'android'
  return 'desktop'
}

/**
 * Página que recebe o convite (/i/:code). Mostra CTA forte pra baixar o
 * Yaya no device correto. Cadastro web existe como fallback discreto —
 * experiência principal é no app nativo.
 *
 * O código já foi salvo em localStorage antes de chegar aqui (no AppRoutes).
 */
export default function InviteLandingPage() {
  const [device, setDevice] = useState<'ios' | 'android' | 'desktop'>('desktop')

  useEffect(() => {
    setDevice(detectDevice())
  }, [])

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="max-w-md w-full">
        <img
          src="./logo-symbol.png"
          alt="Yaya"
          className="w-20 h-20 mx-auto mb-4"
        />
        <h1 className="font-headline text-3xl font-extrabold text-on-surface mb-2">
          Você foi convidado pro <span className="text-primary">Yaya</span>
        </h1>
        <p className="font-label text-sm text-on-surface-variant mb-8 leading-relaxed">
          Organize a rotina do seu bebê com calma e clareza.
          <br />Baixe o app pra começar — seu convite já está pronto.
        </p>

        {device === 'ios' && (
          <a
            href={APP_STORE_URL}
            className="w-full block py-4 rounded-md bg-primary text-on-primary font-headline font-bold text-base active:opacity-90 shadow-[0_8px_24px_rgba(91,61,181,0.3)] mb-3"
          >
            Baixar na App Store
          </a>
        )}

        {device === 'android' && (
          <a
            href={PLAY_STORE_URL}
            className="w-full block py-4 rounded-md bg-primary text-on-primary font-headline font-bold text-base active:opacity-90 shadow-[0_8px_24px_rgba(91,61,181,0.3)] mb-3"
          >
            Baixar no Google Play
          </a>
        )}

        {device === 'desktop' && (
          <div className="space-y-2 mb-3">
            <p className="font-label text-xs text-on-surface-variant mb-3">
              O Yaya é um app mobile. Baixe no seu celular:
            </p>
            <a
              href={APP_STORE_URL}
              className="w-full block py-3 rounded-md bg-primary text-on-primary font-label font-bold text-sm active:opacity-90"
            >
              App Store (iPhone)
            </a>
            <a
              href={PLAY_STORE_URL}
              className="w-full block py-3 rounded-md bg-primary text-on-primary font-label font-bold text-sm active:opacity-90"
            >
              Google Play (Android)
            </a>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-outline-variant/15">
          <p className="font-label text-[11px] text-on-surface-variant/60 mb-2">
            Prefere testar no navegador primeiro?
          </p>
          <Link
            to="/"
            className="font-label text-xs text-primary/80 underline active:text-primary"
          >
            Continuar pelo site
          </Link>
        </div>
      </div>
    </div>
  )
}
