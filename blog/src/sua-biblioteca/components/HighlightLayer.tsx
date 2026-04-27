// HighlightLayer — selecionar texto abre um popover de anotação.
// Salva em guide_highlights (anchor_text + note_md opcional).
// Ao montar, re-aplica marcações visuais dos highlights salvos.
//
// Novo fluxo (substituindo color picker):
//   1. Usuária seleciona texto
//   2. Popover flutuante aparece com trecho + textarea "Adicionar anotação"
//   3. Clica "Salvar" → INSERT em guide_highlights (cor padrão: purple)
//   4. Marca visual <mark> aplicada no texto
//   5. Ao recarregar: busca highlights do DB e re-aplica as marcas

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { GuideHighlight } from '../../types'

interface Props {
  sectionId: string
  userId: string
  contentRef: React.RefObject<HTMLDivElement | null>
  onHighlightSaved?: () => void
}

interface PendingHighlight {
  x: number
  y: number
  text: string
  rangeRect: DOMRect
}

export default function HighlightLayer({ sectionId, userId, contentRef, onHighlightSaved }: Props) {
  const [pending, setPending] = useState<PendingHighlight | null>(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [highlights, setHighlights] = useState<GuideHighlight[]>([])
  const popoverRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Carrega highlights salvos
  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data } = await supabase
        .from('guide_highlights')
        .select('*')
        .eq('user_id', userId)
        .eq('section_id', sectionId)
        .order('created_at', { ascending: true })
      if (cancelled || !data) return
      setHighlights(data)
    }
    load()
    return () => { cancelled = true }
  }, [sectionId, userId])

  // Re-aplica marcações visuais quando highlights mudam
  useEffect(() => {
    if (!contentRef.current) return
    // Remove marks anteriores
    const existing = contentRef.current.querySelectorAll('mark[data-highlight-id]')
    existing.forEach(el => {
      const parent = el.parentNode
      if (parent) {
        while (el.firstChild) parent.insertBefore(el.firstChild, el)
        parent.removeChild(el)
        parent.normalize()
      }
    })
    // Aplica novos
    for (const h of highlights) {
      try { wrapTextInElement(contentRef.current, h.anchor_text, h.id) } catch { /* ignore */ }
    }
  }, [highlights, contentRef])

  // Listener de seleção de texto
  useEffect(() => {
    function onSelectionChange() {
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
        // Não fecha popover se foco está dentro dele
        if (!popoverRef.current?.contains(document.activeElement)) {
          setPending(null)
          setNote('')
        }
        return
      }
      const range = sel.getRangeAt(0)
      const text = sel.toString().trim()
      if (text.length < 3 || text.length > 500) return
      if (!contentRef.current?.contains(range.commonAncestorContainer)) return

      const rect = range.getBoundingClientRect()
      const popoverHalfWidth = 160
      const x = Math.max(
        popoverHalfWidth,
        Math.min(window.innerWidth - popoverHalfWidth, rect.left + rect.width / 2),
      )
      setPending({ x, y: rect.top + window.scrollY - 12, text, rangeRect: rect })
    }

    document.addEventListener('selectionchange', onSelectionChange)
    return () => document.removeEventListener('selectionchange', onSelectionChange)
  }, [contentRef])

  // Foca no textarea quando popover abre
  useEffect(() => {
    if (pending) {
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }, [pending?.text])

  // ESC fecha
  useEffect(() => {
    if (!pending) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setPending(null); setNote('') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pending])

  const handleSave = useCallback(async () => {
    if (!pending) return
    setSaving(true)
    const { data, error } = await supabase.from('guide_highlights').insert({
      user_id: userId,
      section_id: sectionId,
      anchor_text: pending.text,
      color: 'purple',
      note_md: note.trim() || null,
    }).select().single()

    setSaving(false)
    if (!error && data) {
      setHighlights(prev => [...prev, data])
      onHighlightSaved?.()
    }
    setPending(null)
    setNote('')
    window.getSelection()?.removeAllRanges()
  }, [pending, note, userId, sectionId, onHighlightSaved])

  function handleCancel() {
    setPending(null)
    setNote('')
    window.getSelection()?.removeAllRanges()
  }

  if (!pending) return null

  // Posição do popover: aparece acima da seleção, centrado
  const popoverStyle: React.CSSProperties = {
    position: 'absolute',
    left: pending.x,
    top: pending.y,
    transform: 'translate(-50%, -100%)',
    zIndex: 70,
    width: 'min(320px, calc(100vw - 24px))',
    background: 'var(--r-overlay)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid var(--r-border-strong)',
    borderRadius: 14,
    boxShadow: '0 16px 40px var(--r-shadow), 0 0 0 1px color-mix(in srgb, var(--r-accent) 15%, transparent) inset',
    padding: '12px 14px',
    fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
    animation: 'highlight-popover-in 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) both',
  }

  const preview = pending.text.length > 60 ? pending.text.slice(0, 57) + '…' : pending.text

  return (
    <div ref={popoverRef} style={popoverStyle}>
      {/* Trecho selecionado */}
      <div style={{
        fontSize: 12,
        fontStyle: 'italic',
        color: 'var(--r-accent)',
        background: 'color-mix(in srgb, var(--r-accent) 10%, transparent)',
        borderRadius: 8,
        padding: '6px 10px',
        marginBottom: 10,
        lineHeight: 1.4,
        wordBreak: 'break-word',
      }}>
        "{preview}"
      </div>

      {/* Input da anotação */}
      <textarea
        ref={textareaRef}
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Adicionar anotação... (opcional)"
        rows={2}
        style={{
          width: '100%',
          padding: '8px 10px',
          background: 'var(--r-surface)',
          border: '1px solid var(--r-border)',
          borderRadius: 8,
          color: 'var(--r-text)',
          fontFamily: 'inherit',
          fontSize: 13,
          lineHeight: 1.5,
          resize: 'none',
          outline: 'none',
          boxSizing: 'border-box',
          marginBottom: 10,
          transition: 'border-color 0.15s',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = 'var(--r-accent)' }}
        onBlur={e => { e.currentTarget.style.borderColor = 'var(--r-border)' }}
        onKeyDown={e => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSave() }
        }}
      />

      {/* Ações */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button
          onClick={handleCancel}
          style={{
            padding: '7px 14px', borderRadius: 8,
            border: '1px solid var(--r-border)', background: 'transparent',
            color: 'var(--r-text-muted)', fontFamily: 'inherit',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            minHeight: 36, transition: 'background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--r-surface-strong)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '7px 16px', borderRadius: 8,
            border: 'none', background: 'var(--r-accent)',
            color: 'var(--r-on-accent)', fontFamily: 'inherit',
            fontSize: 13, fontWeight: 700, cursor: saving ? 'wait' : 'pointer',
            minHeight: 36, display: 'flex', alignItems: 'center', gap: 6,
            opacity: saving ? 0.7 : 1, transition: 'background 0.15s, opacity 0.15s',
          }}
          onMouseEnter={e => { if (!saving) e.currentTarget.style.background = 'var(--r-accent-glow)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--r-accent)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>bookmark_add</span>
          {saving ? 'Salvando…' : 'Salvar trecho'}
        </button>
      </div>

      <style>{`
        @keyframes highlight-popover-in {
          from { opacity: 0; transform: translate(-50%, -88%); }
          to   { opacity: 1; transform: translate(-50%, -100%); }
        }
        mark[data-highlight-id] {
          background: color-mix(in srgb, var(--r-accent) 28%, transparent);
          border-radius: 3px;
          padding: 1px 0;
          color: inherit;
        }
      `}</style>
    </div>
  )
}

function wrapTextInElement(root: HTMLElement, text: string, id: string) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null)
  let node: Text | null
  while ((node = walker.nextNode() as Text | null)) {
    const idx = node.textContent?.indexOf(text) ?? -1
    if (idx >= 0) {
      const range = document.createRange()
      range.setStart(node, idx)
      range.setEnd(node, idx + text.length)
      const mark = document.createElement('mark')
      mark.dataset.highlightId = id
      try { range.surroundContents(mark) } catch { /* range cruza nodes — ignora */ }
      return
    }
  }
}
