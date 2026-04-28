// GuideTopbar — barra superior fixa, fina, com:
//   - botão menu (mobile) / colapsa-sidebar (desktop)
//   - título do guia (esquerda, pequeno) + título da seção atual (centro)
//   - menu (sair, baixar PDF, modo leitura)
//   - barra de progresso geral animada conforme scroll

import { useState, useEffect, useRef } from 'react'
import type { Guide, GuideSection } from '../../types'

interface Props {
  guide: Guide
  currentSection: GuideSection | undefined
  overallProgress: number  // mantido na prop pra compatibilidade — não usado na barra
  onToggleSidebar: () => void
  onToggleReadingMode: () => void
  readingMode: boolean
  onToggleTheme: () => void
  theme: 'light' | 'dark'
}

export default function GuideTopbar({
  guide, currentSection,
  onToggleSidebar, onToggleReadingMode, readingMode,
  onToggleTheme, theme,
}: Props) {
  // Barra mostra apenas o progresso de scroll na seção atual.
  // Ao trocar de seção, reseta pra 0. Quando a seção é toda visível
  // (docHeight ≤ 0), assume 100% — leitora já viu tudo.
  const [scrollProgress, setScrollProgress] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Reset ao mudar seção (evita "começar preenchida" ao navegar)
    setScrollProgress(0)
    // Calcula progresso inicial após layout settle
    const calc = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      if (docHeight <= 4) {
        // Conteúdo cabe inteiro na viewport — 100%
        setScrollProgress(1)
        return
      }
      const ratio = Math.max(0, Math.min(1, window.scrollY / docHeight))
      setScrollProgress(ratio)
    }
    function onScroll() { calc() }
    // Recalcula em scroll, resize e resize observer
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', calc)
    // Após layout (resume reading scroll, imagens carregando, etc)
    const t1 = window.setTimeout(calc, 100)
    const t2 = window.setTimeout(calc, 800)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', calc)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
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

  function handleBackToLibrary() {
    window.location.href = 'https://blog.yayababy.app/sua-biblioteca/'
  }

  return (
    <header
      className="reader-topbar"
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        height: 56,
        background: 'var(--r-overlay)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--r-border)',
        zIndex: 30,
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        gap: 4,
        transition: 'opacity 0.4s',
        // overflow: visible (não 'hidden') pra dropdown do menu poder
        // sair do header. A contenção horizontal é feita no body/reader-root.
        maxWidth: '100vw',
        width: '100%',
      }}
    >
      {/* Voltar à biblioteca */}
      <button
        onClick={handleBackToLibrary}
        aria-label="Voltar à biblioteca"
        title="Voltar à biblioteca"
        style={iconBtn}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 24 }}>arrow_back</span>
      </button>

      {/* Menu button */}
      <button
        onClick={onToggleSidebar}
        aria-label="Abrir índice"
        style={iconBtn}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 24 }}>menu</span>
      </button>

      {/* Título do guia (esquerda) — só desktop */}
      <div style={{ minWidth: 0, flex: '0 0 auto', marginLeft: 4 }} className="topbar-guide-title">
        <div style={{ fontSize: 10, color: 'var(--r-text-subtle)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, lineHeight: 1.2 }}>
          Sua Biblioteca
        </div>
        <div
          style={{
            fontFamily: 'Manrope, system-ui, sans-serif',
            fontSize: 14,
            fontWeight: 800,
            letterSpacing: '-0.015em',
            color: 'var(--r-text-strong)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: 220,
            lineHeight: 1.2,
          }}
        >
          {guide.title}
        </div>
      </div>

      {/* Título da seção atual (centro) — única identificação no mobile */}
      <div
        className="topbar-section-title"
        style={{
          flex: 1,
          textAlign: 'center',
          minWidth: 0,
          padding: '0 8px',
        }}
      >
        {currentSection && (
          <div
            style={{
              fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
              fontSize: 13,
              color: 'var(--r-text)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontWeight: 600,
              lineHeight: 1.3,
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
              background: 'var(--r-overlay)',
              backdropFilter: 'blur(20px)',
              border: '1px solid var(--r-border)',
              borderRadius: 10,
              padding: 6,
              boxShadow: '0 10px 40px var(--r-shadow)',
            }}
          >
            <MenuItem
              icon={theme === 'dark' ? 'light_mode' : 'dark_mode'}
              label={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
              onClick={() => { onToggleTheme(); setMenuOpen(false) }}
            />
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
              icon="arrow_back"
              label="Voltar à biblioteca"
              onClick={handleBackToLibrary}
            />
          </div>
        )}
      </div>

      {/* Barra de progresso de leitura da seção atual */}
      <div
        style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: 2,
          background: 'color-mix(in srgb, var(--r-accent) 12%, transparent)',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${scrollProgress * 100}%`,
            background: 'linear-gradient(90deg, var(--r-accent) 0%, var(--r-accent-glow) 100%)',
            transition: 'width 0.12s ease-out',
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
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--r-surface-strong)' }}
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
  padding: 10,
  borderRadius: 10,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: '0 0 auto',
  fontFamily: 'inherit',
  // Touch target de 44px (min Apple HIG / Material) garantido pelo padding
  minWidth: 44,
  minHeight: 44,
}
