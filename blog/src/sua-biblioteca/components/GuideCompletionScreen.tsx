// GuideCompletionScreen — comemoração final ao concluir o guia inteiro.
// Estilo: Spotify Wrapped reduzido + premium-acolhedor. Hero com cover,
// título celebratório, stats de jornada, imagem compartilhável,
// CTAs (continue no app / próximo guia / voltar à leitura).

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Guide, GuideSection } from '../../types'
import { getGuideCompletionCopy } from '../lib/milestoneCopy'
import ShareableImage from './ShareableImage'

interface Props {
  guide: Guide
  allSections: GuideSection[]
  userId: string
  onClose: () => void
  onBackToReading: () => void
}

interface JourneyStats {
  totalSections: number
  totalNotes: number
  totalHighlights: number
  totalChecklistItems: number
  completedChecklistItems: number
  estimatedMinutes: number
  daysSpan: number  // entre primeiro last_seen_at e último
}

export default function GuideCompletionScreen({
  guide, allSections, userId, onClose, onBackToReading,
}: Props) {
  const [visible, setVisible] = useState(false)
  const [stats, setStats] = useState<JourneyStats | null>(null)
  const copy = getGuideCompletionCopy(guide.title)

  useEffect(() => {
    setVisible(false)
    requestAnimationFrame(() => setVisible(true))
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const allSectionIds = allSections.map(s => s.id)
      const readableSections = allSections.filter(s => s.type !== 'part').length

      const [
        { count: notesCount },
        { count: hlCount },
        { data: progressRows },
      ] = await Promise.all([
        supabase.from('guide_notes').select('*', { count: 'exact', head: true })
          .eq('user_id', userId).in('section_id', allSectionIds),
        supabase.from('guide_highlights').select('*', { count: 'exact', head: true })
          .eq('user_id', userId).in('section_id', allSectionIds),
        supabase.from('guide_progress').select('last_seen_at, completed_at')
          .eq('user_id', userId).eq('guide_id', guide.id),
      ])

      // Calcular dias entre primeira e última visita
      let daysSpan = 0
      if (progressRows && progressRows.length > 0) {
        const dates = progressRows
          .map(r => r.last_seen_at ? new Date(r.last_seen_at).getTime() : 0)
          .filter(t => t > 0)
          .sort()
        if (dates.length >= 2) {
          daysSpan = Math.max(1, Math.round((dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24)))
        } else if (dates.length === 1) {
          daysSpan = 1
        }
      }

      const totalMinutes = allSections
        .filter(s => s.type !== 'part')
        .reduce((sum, s) => sum + (s.estimated_minutes ?? 0), 0)

      // Contar itens de checklist completados
      const sectionsWithChecklist = allSections.filter(
        s => s.data && (s.data as { checklist_items?: unknown[] }).checklist_items
      )
      const totalChecklistItems = sectionsWithChecklist.reduce(
        (sum, s) => sum + ((s.data as { checklist_items: unknown[] }).checklist_items.length), 0,
      )
      let completedChecklistItems = 0
      if (sectionsWithChecklist.length > 0) {
        const { count } = await supabase.from('guide_checklist_state')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .in('section_id', sectionsWithChecklist.map(s => s.id))
        completedChecklistItems = count ?? 0
      }

      if (cancelled) return
      setStats({
        totalSections: readableSections,
        totalNotes: notesCount ?? 0,
        totalHighlights: hlCount ?? 0,
        totalChecklistItems,
        completedChecklistItems,
        estimatedMinutes: totalMinutes,
        daysSpan,
      })
    }
    load()
    return () => { cancelled = true }
  }, [guide.id, userId, allSections])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${copy.eyebrow} ${copy.title}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'var(--r-bg)',
        display: 'flex',
        flexDirection: 'column',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.4s ease',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* Hero com cover + gradient */}
      {guide.cover_image_url && (
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '38vh',
            minHeight: 240,
            maxHeight: 420,
            overflow: 'hidden',
            flex: '0 0 auto',
          }}
        >
          <img
            src={guide.cover_image_url}
            alt=""
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              transform: visible ? 'scale(1)' : 'scale(1.04)',
              transition: 'transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, color-mix(in srgb, var(--r-accent) 30%, transparent) 0%, var(--r-bg) 100%)',
          }} />
        </div>
      )}

      {/* Conteúdo */}
      <div
        style={{
          flex: 1,
          padding: 'clamp(24px, 5vw, 48px)',
          maxWidth: 720,
          margin: '0 auto',
          width: '100%',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--r-accent)',
            marginBottom: 16,
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 0.5s ease 0.1s, transform 0.5s ease 0.1s',
          }}
        >
          {copy.eyebrow}
        </div>

        <h1
          style={{
            fontFamily: 'Fraunces, serif',
            fontVariationSettings: '"opsz" 144, "SOFT" 60',
            fontSize: 'clamp(2.4rem, 7vw, 4rem)',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
            color: 'var(--r-text-strong)',
            margin: '0 0 18px',
            textWrap: 'balance' as never,
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'opacity 0.6s ease 0.18s, transform 0.6s ease 0.18s',
          }}
        >
          {copy.title}
        </h1>

        <p
          style={{
            fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
            fontSize: 17,
            lineHeight: 1.55,
            color: 'var(--r-text-muted)',
            margin: '0 0 36px',
            maxWidth: 560,
            marginLeft: 'auto',
            marginRight: 'auto',
            textWrap: 'balance' as never,
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 0.5s ease 0.28s, transform 0.5s ease 0.28s',
          }}
        >
          {copy.subtitle}
        </p>

        {/* Stats grid */}
        {stats && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 12,
              maxWidth: 560,
              margin: '0 auto 40px',
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(8px)',
              transition: 'opacity 0.5s ease 0.38s, transform 0.5s ease 0.38s',
            }}
          >
            <Stat value={String(stats.totalSections)} label="seções lidas" />
            <Stat value={`${stats.estimatedMinutes}`} label="min de leitura" />
            {stats.daysSpan > 0 && (
              <Stat value={String(stats.daysSpan)} label={stats.daysSpan === 1 ? 'dia' : 'dias de jornada'} />
            )}
            {stats.totalHighlights > 0 && (
              <Stat value={String(stats.totalHighlights)} label="trechos destacados" />
            )}
            {stats.totalNotes > 0 && (
              <Stat value={String(stats.totalNotes)} label={stats.totalNotes === 1 ? 'anotação' : 'anotações'} />
            )}
            {stats.totalChecklistItems > 0 && (
              <Stat
                value={`${stats.completedChecklistItems}/${stats.totalChecklistItems}`}
                label="checklist"
              />
            )}
          </div>
        )}

        {/* Imagem compartilhável */}
        <div
          style={{
            margin: '0 auto 44px',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 0.5s ease 0.5s, transform 0.5s ease 0.5s',
          }}
        >
          <ShareableImage guide={guide} caption={copy.shareCaption} />
        </div>

        {/* CTAs */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            maxWidth: 380,
            margin: '0 auto',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 0.5s ease 0.6s, transform 0.5s ease 0.6s',
          }}
        >
          <a
            href="https://yayababy.app"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '14px 22px',
              borderRadius: 999,
              border: 'none',
              background: 'var(--r-accent)',
              color: 'var(--r-on-accent)',
              fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              minHeight: 48,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--r-accent-glow)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--r-accent)' }}
          >
            {copy.ctaPrimary}
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>open_in_new</span>
          </a>
          <a
            href="/sua-biblioteca"
            style={{
              padding: '12px 22px',
              borderRadius: 999,
              border: '1px solid var(--r-border-strong)',
              background: 'transparent',
              color: 'var(--r-text)',
              fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              minHeight: 44,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--r-surface-strong)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            {copy.ctaSecondary}
          </a>
          <button
            onClick={() => { setVisible(false); setTimeout(onBackToReading, 300) }}
            style={{
              padding: '10px 20px',
              borderRadius: 999,
              border: 'none',
              background: 'transparent',
              color: 'var(--r-text-muted)',
              fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              minHeight: 36,
            }}
          >
            {copy.ctaTertiary}
          </button>
        </div>
      </div>
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div
      style={{
        background: 'var(--r-surface)',
        border: '1px solid var(--r-border)',
        borderRadius: 14,
        padding: '14px 12px',
        textAlign: 'center',
      }}
    >
      <div style={{
        fontFamily: 'Fraunces, serif',
        fontVariationSettings: '"opsz" 72, "SOFT" 30',
        fontSize: 28,
        fontWeight: 700,
        letterSpacing: '-0.02em',
        color: 'var(--r-text-strong)',
        lineHeight: 1,
        marginBottom: 4,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </div>
      <div style={{
        fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: 'var(--r-text-muted)',
        textWrap: 'balance' as never,
      }}>
        {label}
      </div>
    </div>
  )
}
