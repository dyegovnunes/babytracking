// GuideTopbar — barra superior fixa, fina, com:
//   - botão menu (mobile) / colapsa-sidebar (desktop)
//   - título do guia (esquerda, pequeno) + título da seção atual (centro)
//   - menu (sair, baixar PDF, modo leitura)
//   - barra de progresso geral animada conforme scroll

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import type { Guide, GuideSection } from '../../types'

interface Props {
  guide: Guide
  currentSection: GuideSection | undefined
  overallProgress: number
  onToggleSidebar: () => void
  onToggleReadingMode: () => void
  readingMode: boolean
}

export default function GuideTopbar({
  guide, currentSection, overallProgress,
  onToggleSidebar, onToggleReadingMode, readingMode,
}: Props) {
  const [scrollProgress, setScrollProgress] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Combina progresso da seção atual (% de scroll) + completedRatio
  useEffect(() => {
    function onScroll() {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const ratio = docHeight > 0 ? Math.min(1, window.scrollY / docHeight) : 0
      setScrollProgress(ratio)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [currentSection?.id])

  // Fecha menu ao clicar fora
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    window.addEventListener('mousedown', onClick)
    return () => window.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <header
      className="reader-topbar"
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        height: 60,
        background: 'rgba(13, 10, 39, 0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--r-border)',
        zIndex: 30,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 12,
        transition: 'opacity 0.4s',
      }}
    >
      {/* Menu button */}
      <button
        onClick={onToggleSidebar}
        aria-label="Abrir índice"
        style={iconBtn}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 24 }}>menu</span>
      </button>

      {/* Título do guia (esquerda) */}
      <div style={{ minWidth: 0, flex: '0 0 auto' }} className="topbar-guide-title">
        <div style={{ fontSize: 11, color: 'var(--r-text-subtle)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>
          Sua Biblioteca
        </div>
        <div
          style={{
            fontFamily: 'Fraunces, serif',
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--r-text)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: 220,
          }}
        >
          {guide.title}
        </div>
      </div>

      {/* Título da seção atual (centro) */}
      <div
        className="topbar-section-title"
        style={{
          flex: 1,
          textAlign: 'center',
          minWidth: 0,
          padding: '0 12px',
        }}
      >
        {currentSection && (
          <div
            style={{
              fontSize: 13,
              color: 'var(--r-text-muted)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontWeight: 500,
            }}
          >
            {currentSection.title}
          </div>
        )}
      </div>

      {/* Menu de ações */}
      <div ref={menuRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Menu"
          style={iconBtn}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 22 }}>more_vert</span>
        </button>
        {menuOpen && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 8,
              minWidth: 220,
              background: 'rgba(20, 16, 50, 0.98)',
              backdropFilter: 'blur(20px)',
              border: '1px solid var(--r-border)',
              borderRadius: 10,
              padding: 6,
              boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
            }}
          >
            <MenuItem
              icon={readingMode ? 'fullscreen_exit' : 'visibility'}
              label={readingMode ? 'Sair do modo leitura' : 'Modo leitura (F)'}
              onClick={() => { onToggleReadingMode(); setMenuOpen(false) }}
            />
            <MenuItem
              icon="print"
              label="Imprimir esta seção"
              onClick={() => { window.print(); setMenuOpen(false) }}
            />
            <MenuDivider />
            <MenuItem
              icon="logout"
              label="Sair"
              onClick={handleSignOut}
            />
          </div>
        )}
      </div>

      {/* Barra de progresso na base */}
      <div
        style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: 2,
          background: 'rgba(183,159,255,0.08)',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.max(overallProgress * 0.7 + scrollProgress * 0.3, 0) * 100}%`,
            background: 'linear-gradient(90deg, var(--r-accent) 0%, var(--r-accent-glow) 100%)',
            transition: 'width 0.15s ease-out',
          }}
        />
      </div>
    </header>
  )
}

function MenuItem({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        width: '100%',
        padding: '10px 12px',
        background: 'transparent',
        border: 'none',
        color: 'var(--r-text)',
        fontFamily: 'inherit',
        fontSize: 14,
        cursor: 'pointer',
        borderRadius: 6,
        textAlign: 'left',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(183,159,255,0.08)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--r-accent)' }}>{icon}</span>
      {label}
    </button>
  )
}

function MenuDivider() {
  return <div style={{ height: 1, background: 'var(--r-border)', margin: '4px 6px' }} />
}

const iconBtn: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'var(--r-text-muted)',
  cursor: 'pointer',
  padding: 8,
  borderRadius: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: '0 0 auto',
  fontFamily: 'inherit',
}
