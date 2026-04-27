// NoteDrawer — popover estilo "chat" no canto inferior direito.
// Antes era drawer fullscreen (ocupava tela inteira mobile, exagerado pra
// uma anotação rápida). Agora é card compacto que respeita a leitura
// embaixo, com auto-save em background.

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'

interface Props {
  sectionId: string
  userId: string
  open: boolean
  onClose: () => void
}

const SAVE_DEBOUNCE_MS = 800

export default function NoteDrawer({ sectionId, userId, open, onClose }: Props) {
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const saveTimer = useRef<number | null>(null)
  const lastSaved = useRef<string>('')

  // Carrega nota ao abrir (ou trocar de seção)
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    async function load() {
      const { data } = await supabase
        .from('guide_notes')
        .select('note_md')
        .eq('user_id', userId)
        .eq('section_id', sectionId)
        .single()
      if (cancelled) return
      const value = data?.note_md ?? ''
      setNote(value)
      lastSaved.current = value
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [sectionId, userId, open])

  // ESC fecha
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Auto-save com debounce
  useEffect(() => {
    if (loading) return
    if (note === lastSaved.current) return
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    setSaveStatus('saving')
    saveTimer.current = window.setTimeout(async () => {
      await supabase.from('guide_notes').upsert({
        user_id: userId,
        section_id: sectionId,
        note_md: note,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,section_id' })
      lastSaved.current = note
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 1500)
    }, SAVE_DEBOUNCE_MS)
    return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current) }
  }, [note, loading, sectionId, userId])

  if (!open) return null

  return (
    <aside
      role="dialog"
      aria-label="Suas notas desta seção"
      className="reader-note-popover"
      style={{
        position: 'fixed',
        bottom: 'calc(max(20px, env(safe-area-inset-bottom)) + 4px)',
        right: 16,
        width: 'min(380px, calc(100vw - 32px))',
        height: 'min(440px, 60vh)',
        maxHeight: 'calc(100vh - 88px)',
        background: 'var(--r-overlay)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--r-border-strong)',
        borderRadius: 16,
        boxShadow: '0 18px 48px var(--r-shadow), 0 0 0 1px color-mix(in srgb, var(--r-accent) 12%, transparent) inset',
        zIndex: 90,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'note-popover-in 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
        fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
      }}
    >
      <header style={{
        padding: '12px 14px',
        borderBottom: '1px solid var(--r-border)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flex: '0 0 auto',
      }}>
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: 20,
            color: 'var(--r-accent)',
            background: 'color-mix(in srgb, var(--r-accent) 15%, transparent)',
            padding: 6,
            borderRadius: 8,
          }}
        >
          edit_note
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'Manrope, system-ui, sans-serif',
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: '-0.01em',
            color: 'var(--r-text-strong)',
            lineHeight: 1.2,
          }}>
            Suas notas
          </div>
          <div style={{
            fontSize: 11,
            color: saveStatus === 'saved' ? '#70e09a' : 'var(--r-text-muted)',
            marginTop: 1,
            transition: 'color 0.2s',
          }}>
            {saveStatus === 'saving' && 'Salvando…'}
            {saveStatus === 'saved' && '✓ Salvo'}
            {saveStatus === 'idle' && 'Anotação privada desta seção'}
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Fechar"
          style={{
            background: 'transparent', border: 'none',
            color: 'var(--r-text-muted)', cursor: 'pointer',
            padding: 6, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minWidth: 32, minHeight: 32,
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--r-surface-strong)'
            e.currentTarget.style.color = 'var(--r-text)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--r-text-muted)'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
        </button>
      </header>

      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Anote aqui o que importa pra você nessa seção…"
        style={{
          flex: 1,
          padding: '14px 16px',
          background: 'transparent',
          border: 'none',
          color: 'var(--r-text)',
          fontFamily: 'inherit',
          fontSize: 14,
          lineHeight: 1.55,
          resize: 'none',
          outline: 'none',
          width: '100%',
        }}
        autoFocus
      />

      <style>{`
        @keyframes note-popover-in {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        /* Em telas muito pequenas o card vira full-width com pequeno respiro */
        @media (max-width: 380px) {
          .reader-note-popover {
            right: 12px !important;
            left: 12px !important;
            width: auto !important;
          }
        }
        /* Placeholder com cor sutil */
        .reader-note-popover textarea::placeholder {
          color: var(--r-text-subtle);
        }
      `}</style>
    </aside>
  )
}
