// GuideSidebar — índice hierárquico do guia.
// Desktop: sticky 320px à esquerda. Mobile: drawer slide-in com backdrop.
// Cada seção mostra título + tempo de leitura + indicador de progresso
// (anel preenchido se concluída, ponto se não-iniciada).

import { useMemo } from 'react'
import type { Guide, GuideSection, GuideProgress } from '../../types'

interface Props {
  guide: Guide
  sections: GuideSection[]
  currentSectionId: string | null
  progressMap: Record<string, GuideProgress>
  onSelectSection: (id: string) => void
  open: boolean
  onClose: () => void
}

export default function GuideSidebar({
  guide, sections, currentSectionId, progressMap, onSelectSection, open, onClose,
}: Props) {
  // Agrupa seções por parent (parts no topo, filhas dentro)
  const parts = useMemo(() => sections.filter(s => s.parent_id === null), [sections])
  const childrenOf = (parentId: string) =>
    sections.filter(s => s.parent_id === parentId).sort((a, b) => a.order_index - b.order_index)

  // Calcula progresso geral
  const totalReadable = sections.filter(s => s.type !== 'part').length
  const completed = Object.values(progressMap).filter(p => p.completed).length
  const progressPct = totalReadable > 0 ? Math.round(completed / totalReadable * 100) : 0

  return (
    <>
      {/* Backdrop mobile */}
      {open && (
        <div
          onClick={onClose}
          className="reader-sidebar-backdrop"
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(4px)',
            zIndex: 40,
          }}
        />
      )}

      <aside
        className="reader-sidebar"
        style={{
          position: 'fixed',
          top: 0, bottom: 0, left: 0,
          width: 320,
          maxWidth: '85vw',
          background: 'var(--r-overlay)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid var(--r-border)',
          padding: '76px 0 24px',
          overflowY: 'auto',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease, opacity 0.4s',
          zIndex: 50,
        }}
      >
        {/* Header com info do guia */}
        <div style={{ padding: '0 24px 20px', borderBottom: '1px solid var(--r-border)' }}>
          {guide.cover_image_url && (
            <img
              src={guide.cover_image_url}
              alt={guide.title}
              style={{
                width: '100%',
                aspectRatio: '4/3',
                objectFit: 'cover',
                borderRadius: 8,
                marginBottom: 12,
                border: '1px solid var(--r-border)',
              }}
            />
          )}
          <div style={{
            fontSize: 11, color: 'var(--r-text-subtle)', letterSpacing: '0.08em',
            textTransform: 'uppercase', fontWeight: 600, marginBottom: 4,
          }}>
            Sua Biblioteca
          </div>
          <h2 style={{
            fontFamily: 'Fraunces, serif',
            fontSize: 20,
            fontWeight: 700,
            margin: 0,
            color: 'var(--r-text)',
            letterSpacing: '-0.01em',
            lineHeight: 1.25,
          }}>
            {guide.title}
          </h2>
          {guide.subtitle && (
            <p style={{ fontSize: 13, color: 'var(--r-text-muted)', margin: '6px 0 0', lineHeight: 1.5 }}>
              {guide.subtitle}
            </p>
          )}

          {/* Progresso geral */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--r-text-muted)', marginBottom: 6 }}>
              <span>Seu progresso</span>
              <span style={{ color: 'var(--r-accent)', fontWeight: 600 }}>{progressPct}%</span>
            </div>
            <div style={{ height: 4, background: 'rgba(183,159,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${progressPct}%`,
                background: 'linear-gradient(90deg, var(--r-accent), var(--r-accent-glow))',
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>
        </div>

        {/* Lista de partes/seções */}
        <nav style={{ padding: '12px 12px 0' }}>
          {parts.map((part) => {
            const partChildren = childrenOf(part.id)
            return (
              <div key={part.id} style={{ marginBottom: 18 }}>
                <SectionItem
                  section={part}
                  isPart
                  isCurrent={part.id === currentSectionId}
                  progress={progressMap[part.id]}
                  onSelect={() => onSelectSection(part.id)}
                />
                {partChildren.length > 0 && (
                  <div style={{ marginLeft: 8, marginTop: 4 }}>
                    {partChildren.map(child => (
                      <SectionItem
                        key={child.id}
                        section={child}
                        isCurrent={child.id === currentSectionId}
                        progress={progressMap[child.id]}
                        onSelect={() => onSelectSection(child.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {parts.length === 0 && sections.map(s => (
            <SectionItem
              key={s.id}
              section={s}
              isCurrent={s.id === currentSectionId}
              progress={progressMap[s.id]}
              onSelect={() => onSelectSection(s.id)}
            />
          ))}
        </nav>
      </aside>

      <style>{`
        @media (min-width: 1024px) {
          .reader-sidebar {
            transform: translateX(0) !important;
          }
          .reader-sidebar-backdrop {
            display: none !important;
          }
        }
      `}</style>
    </>
  )
}

function SectionItem({
  section, isPart, isCurrent, progress, onSelect,
}: {
  section: GuideSection
  isPart?: boolean
  isCurrent: boolean
  progress: GuideProgress | undefined
  onSelect: () => void
}) {
  const isCompleted = progress?.completed === true
  const isStarted = !!progress

  return (
    <button
      onClick={onSelect}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: isPart ? '10px 12px' : '8px 12px 8px 24px',
        marginBottom: 2,
        background: isCurrent ? 'rgba(183,159,255,0.12)' : 'transparent',
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
        textAlign: 'left',
        position: 'relative',
        fontFamily: 'inherit',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = 'rgba(183,159,255,0.05)' }}
      onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = 'transparent' }}
    >
      {/* Indicador de progresso à esquerda */}
      <span style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 18 }}>
        {isCompleted ? (
          <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#70e09a' }}>check_circle</span>
        ) : isStarted ? (
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--r-accent)', opacity: 0.7 }} />
        ) : (
          <span style={{ width: 7, height: 7, borderRadius: '50%', border: '1px solid var(--r-border)' }} />
        )}
      </span>

      {/* Title + minutes */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: isPart ? 'Fraunces, serif' : 'inherit',
          fontSize: isPart ? 15 : 13.5,
          fontWeight: isPart ? 700 : isCurrent ? 600 : 500,
          color: isCurrent ? 'var(--r-accent)' : 'var(--r-text)',
          letterSpacing: isPart ? '-0.01em' : 'normal',
          lineHeight: 1.35,
        }}>
          {section.title}
        </div>
        {section.estimated_minutes && (
          <div style={{
            fontSize: 11,
            color: 'var(--r-text-subtle)',
            marginTop: 2,
          }}>
            {section.estimated_minutes} min
          </div>
        )}
      </div>

      {/* Type badge */}
      {section.type === 'quiz' && (
        <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--r-accent)', opacity: 0.7 }}>quiz</span>
      )}
      {section.type === 'checklist' && (
        <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--r-accent)', opacity: 0.7 }}>checklist</span>
      )}

      {/* Barra ativa à esquerda */}
      {isCurrent && (
        <span style={{
          position: 'absolute',
          left: -2, top: 8, bottom: 8,
          width: 3,
          background: 'var(--r-accent)',
          borderRadius: 2,
        }} />
      )}
    </button>
  )
}
