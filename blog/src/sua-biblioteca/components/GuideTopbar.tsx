// GuideTopbar — barra superior fixa, fina, com:
//   - botão voltar (esquerda) + hambúrguer (sidebar)
//   - título do guia (esquerda, só desktop) + título da seção (centro)
//   - ícones diretos: tema, modo leitura, imprimir (direita)
//   - barra de progresso de scroll na seção atual (bottom)

import { useState, useEffect } from 'react'
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
  const [scrollProgress, setScrollProgress] = useState(0)

  useEffect(() => {
    setScrollProgress(0)
    const calc = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      if (docHeight <= 4) { setScrollProgress(1); return }
      setScrollProgress(Math.max(0, Math.min(1, window.scrollY / docHeight)))
    }
    window.addEventListener('scroll', calc, { passive: true })
    window.addEventListener('resize', calc)
    const t1 = window.setTimeout(calc, 100)
    const t2 = window.setTimeout(calc, 800)
    return () => {
      window.removeEventListener('scroll', calc)
      window.removeEventListener('resize', calc)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [currentSection?.id])

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
        maxWidth: '100vw',
        width: '100%',
      }}
    >
      {/* Esquerda: voltar + hambúrguer */}
      <button
        onClick={handleBackToLibrary}
        aria-label="Voltar à biblioteca"
        title="Voltar à biblioteca"
        style={iconBtn}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 24 }}>arrow_back</span>
      </button>

      <button
        onClick={onToggleSidebar}
        aria-label="Abrir índice"
        title="Índice"
        style={iconBtn}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 24 }}>menu</span>
      </button>

      {/* Título do guia — só desktop */}
      <div style={{ minWidth: 0, flex: '0 0 auto', marginLeft: 4 }} className="topbar-guide-title">
        <div style={{ fontSize: 10, color: 'var(--r-text-subtle)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, lineHeight: 1.2 }}>
          Sua Biblioteca
        </div>
        <div style={{
          fontFamily: 'Manrope, system-ui, sans-serif',
          fontSize: 14, fontWeight: 800,
          letterSpacing: '-0.015em',
          color: 'var(--r-text-strong)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          maxWidth: 220, lineHeight: 1.2,
        }}>
          {guide.title}
        </div>
      </div>

      {/* Título da seção atual (centro) */}
      <div
        className="topbar-section-title"
        style={{ flex: 1, textAlign: 'center', minWidth: 0, padding: '0 8px' }}
      >
        {currentSection && (
          <div style={{
            fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
            fontSize: 13, fontWeight: 600,
            color: 'var(--r-text)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            lineHeight: 1.3,
          }}>
            {currentSection.title}
          </div>
        )}
      </div>

      {/* Direita: ícones de ação diretos */}
      <button
        onClick={onToggleTheme}
        aria-label={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
        title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
        style={iconBtn}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
          {theme === 'dark' ? 'light_mode' : 'dark_mode'}
        </span>
      </button>

      <button
        onClick={onToggleReadingMode}
        aria-label={readingMode ? 'Sair do modo leitura' : 'Modo leitura'}
        title={readingMode ? 'Sair do modo leitura (F)' : 'Modo leitura (F)'}
        style={{
          ...iconBtn,
          color: readingMode ? 'var(--r-accent)' : 'var(--r-text-muted)',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 22, fontVariationSettings: readingMode ? '"FILL" 1' : '"FILL" 0' }}>
          {readingMode ? 'fullscreen_exit' : 'chrome_reader_mode'}
        </span>
      </button>

      <button
        onClick={() => window.print()}
        aria-label="Imprimir esta seção"
        title="Imprimir esta seção"
        style={iconBtn}
        className="topbar-print-btn"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 22 }}>print</span>
      </button>

      {/* Print oculto em mobile — Ctrl+P sempre disponível */}
      <style>{`
        @media (max-width: 640px) { .topbar-print-btn { display: none !important; } }
      `}</style>

      {/* Barra de progresso de scroll */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: 2,
        background: 'color-mix(in srgb, var(--r-accent) 12%, transparent)',
      }}>
        <div style={{
          height: '100%',
          width: `${scrollProgress * 100}%`,
          background: 'linear-gradient(90deg, var(--r-accent) 0%, var(--r-accent-glow) 100%)',
          transition: 'width 0.12s ease-out',
        }} />
      </div>
    </header>
  )
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
  minWidth: 44,
  minHeight: 44,
}
