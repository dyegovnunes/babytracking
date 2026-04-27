// ChapterOpener — capa de uma "Parte" do guia.
// Renderiza a seção tipo `part`: imagem grande, título serif XL, intro, CTA.

import type { GuideSection } from '../../types'
import { renderSectionMarkdown } from '../lib/markdownRenderer'

interface Props {
  section: GuideSection
  onContinue: () => void
}

export default function ChapterOpener({ section, onContinue }: Props) {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {section.cover_image_url && (
        <div style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '21/9',
          maxHeight: '60vh',
          borderRadius: 20,
          overflow: 'hidden',
          marginBottom: 48,
          border: '1px solid var(--r-border)',
        }}>
          <img
            src={section.cover_image_url}
            alt={section.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, transparent 50%, rgba(13,10,39,0.6) 100%)',
          }} />
        </div>
      )}

      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{
          fontSize: 12, color: 'var(--r-accent)',
          letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700,
          marginBottom: 16,
        }}>
          {section.estimated_minutes ? `${section.estimated_minutes} min de leitura` : 'Parte'}
        </div>
        <h1 style={{
          fontFamily: 'Fraunces, serif',
          fontSize: 'clamp(2.4rem, 6vw, 4.2rem)',
          fontWeight: 800,
          fontVariationSettings: '"opsz" 144, "SOFT" 50',
          letterSpacing: '-0.03em',
          lineHeight: 1.05,
          color: 'var(--r-text)',
          margin: 0,
        }}>
          {section.title}
        </h1>
      </div>

      {section.content_md && (
        <div
          className="reader-content"
          style={{ marginBottom: 64 }}
          dangerouslySetInnerHTML={{ __html: renderSectionMarkdown(section.content_md) }}
        />
      )}

      <div style={{ textAlign: 'center', paddingTop: 32, paddingBottom: 32 }}>
        <button
          onClick={onContinue}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '16px 32px',
            borderRadius: 999,
            border: 'none',
            background: 'var(--r-accent)',
            color: '#0d0a27',
            fontFamily: 'inherit',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'transform 0.15s, box-shadow 0.15s',
            boxShadow: '0 6px 24px rgba(183,159,255,0.25)',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
        >
          Comece a ler
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_forward</span>
        </button>
      </div>
    </div>
  )
}
