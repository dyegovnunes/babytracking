// HeaderAuthButton — detecta sessão e renderiza:
//   - "Entrar" link quando deslogado
//   - ícone de usuário + dropdown (email + Minha biblioteca + Sair) quando logado
// client:only="react" pois depende de auth state no client.

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

type AuthState = 'loading' | 'out' | 'in'

export default function HeaderAuthButton() {
  const [auth, setAuth] = useState<AuthState>('loading')
  const [email, setEmail] = useState('')
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Leitura rápida do cache local — não aguarda validação de rede
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setEmail(session.user.email ?? '')
        setAuth('in')
      } else {
        setAuth('out')
      }
    }).catch(() => setAuth('out'))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setEmail(session.user.email ?? '')
        setAuth('in')
      } else {
        setAuth('out')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutsideClick)
    return () => document.removeEventListener('mousedown', onOutsideClick)
  }, [])

  async function signOut() {
    setOpen(false)
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  // Durante hidratação: placeholder invisível do mesmo tamanho de "Entrar"
  if (auth === 'loading') {
    return <span style={{ display: 'inline-block', width: 36, height: 18, opacity: 0 }} />
  }

  // Deslogado: link simples
  if (auth === 'out') {
    return (
      <a
        href="/minha-biblioteca"
        style={{
          fontSize: 12,
          fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
          color: 'rgba(231,226,255,0.55)',
          textDecoration: 'none',
          padding: '6px 10px',
          borderRadius: 6,
          transition: 'color 0.15s',
          whiteSpace: 'nowrap' as const,
        }}
        onMouseEnter={e => (e.currentTarget.style.color = '#b79fff')}
        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(231,226,255,0.55)')}
      >
        Entrar
      </a>
    )
  }

  // Logado: avatar com inicial + dropdown
  const initial = email.charAt(0).toUpperCase() || '?'

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Menu do usuário"
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: open ? 'rgba(183,159,255,0.25)' : 'rgba(183,159,255,0.14)',
          border: '1.5px solid rgba(183,159,255,0.3)',
          color: '#b79fff',
          fontFamily: 'Manrope, system-ui, sans-serif',
          fontSize: 11,
          fontWeight: 800,
          cursor: 'pointer',
          transition: 'background 0.15s, border-color 0.15s',
          letterSpacing: '0.02em',
        }}
        onMouseEnter={e => { if (!open) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(183,159,255,0.22)' }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(183,159,255,0.14)' }}
      >
        {initial}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            minWidth: 200,
            background: 'rgba(10,8,30,0.98)',
            border: '1px solid rgba(183,159,255,0.15)',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.55), 0 0 0 1px rgba(183,159,255,0.06)',
            backdropFilter: 'blur(16px)',
            overflow: 'hidden',
            zIndex: 50,
          }}
        >
          {/* Email do usuário */}
          <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid rgba(183,159,255,0.08)' }}>
            <p style={{ margin: 0, fontSize: 11, color: 'rgba(231,226,255,0.4)', fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
              {email}
            </p>
          </div>

          {/* Links */}
          <div style={{ padding: '6px 0' }}>
            <a
              href="/minha-biblioteca"
              onClick={() => setOpen(false)}
              style={dropdownItem}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(183,159,255,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6, flexShrink: 0 }}>
                <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
              </svg>
              Minha biblioteca
            </a>

            <div style={{ margin: '4px 12px', height: 1, background: 'rgba(183,159,255,0.06)' }} />

            <button
              onClick={signOut}
              style={{ ...dropdownItem, width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,122,144,0.8)', textAlign: 'left' as const }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,122,144,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7, flexShrink: 0 }}>
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Sair
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const dropdownItem: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 9,
  padding: '9px 16px',
  fontSize: 12,
  fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
  fontWeight: 500,
  color: 'rgba(231,226,255,0.75)',
  textDecoration: 'none',
  transition: 'background 0.12s',
  background: 'transparent',
}
