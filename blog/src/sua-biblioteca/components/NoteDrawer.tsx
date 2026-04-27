// NoteDrawer — drawer lateral com nota da seção. Auto-save com debounce.

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
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 80,
        }}
      />
      <aside
        style={{
          position: 'fixed',
          top: 0, bottom: 0, right: 0,
          width: 'min(440px, 100%)',
          background: 'rgba(13, 10, 39, 0.98)',
          backdropFilter: 'blur(20px)',
          borderLeft: '1px solid var(--r-border)',
          zIndex: 90,
          display: 'flex',
          flexDirection: 'column',
          animation: 'note-drawer-in 0.25s ease',
        }}
      >
        <header style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--r-border)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 22, color: 'var(--r-accent)' }}>edit_note</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: 'var(--r-text)' }}>Suas notas</div>
            <div style={{ fontSize: 12, color: 'var(--r-text-muted)' }}>
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
              padding: 6, borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
          </button>
        </header>

        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Anote aqui o que importa pra você nessa seção…"
          style={{
            flex: 1,
            padding: 20,
            background: 'transparent',
            border: 'none',
            color: 'var(--r-text)',
            fontFamily: 'inherit',
            fontSize: 15,
            lineHeight: 1.6,
            resize: 'none',
            outline: 'none',
          }}
          autoFocus
        />
      </aside>
      <style>{`
        @keyframes note-drawer-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
  )
}
