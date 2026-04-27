// HighlightLayer — listener pra seleção de texto que abre popover de cor.
// Salva highlight no DB; ao remontar, aplica visualmente os salvos via wrap span.
//
// Implementação simples: usa innerHTML wrap com mark elements quando o
// componente monta + queries CSS-based. Texto exato deve ser único na seção
// (limitação aceitável pro MVP).

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import type { GuideHighlight, HighlightColor } from '../../types'

interface Props {
  sectionId: string
  userId: string
  contentRef: React.RefObject<HTMLDivElement | null>
}

const COLORS: { value: HighlightColor; bg: string; label: string }[] = [
  { value: 'yellow', bg: 'rgba(255, 200, 87, 0.6)', label: 'Amarelo' },
  { value: 'pink',   bg: 'rgba(255, 122, 144, 0.6)', label: 'Rosa' },
  { value: 'purple', bg: 'rgba(183, 159, 255, 0.6)', label: 'Roxo' },
]

export default function HighlightLayer({ sectionId, userId, contentRef }: Props) {
  const [popoverPos, setPopoverPos] = useState<{ x: number; y: number; text: string } | null>(null)
  const [highlights, setHighlights] = useState<GuideHighlight[]>([])
  const popoverRef = useRef<HTMLDivElement>(null)

  // Carrega highlights existentes
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

  // Aplica highlights visuais ao conteúdo
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
      try {
        wrapTextInElement(contentRef.current, h.anchor_text, h.color, h.id)
      } catch { /* ignore — texto pode ter mudado */ }
    }
  }, [highlights, contentRef])

  // Listener de seleção
  useEffect(() => {
    function onSelectionChange() {
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
        // Não fecha popover se o foco está dentro dele
        if (!popoverRef.current?.contains(document.activeElement)) {
          setPopoverPos(null)
        }
        return
      }
      const range = sel.getRangeAt(0)
      const text = sel.toString().trim()
      if (text.length < 3 || text.length > 500) return
      // Só ativa se a seleção está dentro do conteúdo
      if (!contentRef.current?.contains(range.commonAncestorContainer)) return

      const rect = range.getBoundingClientRect()
      // Clamp horizontal: deixa pelo menos 60px de margem pros bordos da
      // viewport, evita que o popover seja cortado em mobile.
      const popoverHalfWidth = 70
      const x = Math.max(
        popoverHalfWidth,
        Math.min(window.innerWidth - popoverHalfWidth, rect.left + rect.width / 2),
      )
      setPopoverPos({
        x,
        y: rect.top + window.scrollY - 12,
        text,
      })
    }

    document.addEventListener('selectionchange', onSelectionChange)
    return () => document.removeEventListener('selectionchange', onSelectionChange)
  }, [contentRef])

  async function addHighlight(color: HighlightColor) {
    if (!popoverPos) return
    const { data } = await supabase.from('guide_highlights').insert({
      user_id: userId,
      section_id: sectionId,
      anchor_text: popoverPos.text,
      color,
    }).select().single()
    if (data) {
      setHighlights(prev => [...prev, data])
    }
    setPopoverPos(null)
    window.getSelection()?.removeAllRanges()
  }

  if (!popoverPos) return null

  return (
    <div
      ref={popoverRef}
      style={{
        position: 'absolute',
        left: popoverPos.x,
        top: popoverPos.y,
        transform: 'translate(-50%, -100%)',
        background: 'var(--r-overlay)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--r-border)',
        borderRadius: 999,
        padding: '6px 8px',
        display: 'flex',
        gap: 4,
        zIndex: 60,
        boxShadow: '0 10px 30px var(--r-shadow)',
        animation: 'highlight-popover-in 0.18s ease',
      }}
    >
      {COLORS.map(c => (
        <button
          key={c.value}
          onClick={() => addHighlight(c.value)}
          aria-label={`Destacar em ${c.label}`}
          style={{
            width: 28, height: 28,
            borderRadius: '50%',
            border: '2px solid var(--r-border)',
            background: c.bg,
            cursor: 'pointer',
            transition: 'transform 0.15s',
            padding: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.15)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
        />
      ))}
      <style>{`
        @keyframes highlight-popover-in {
          from { opacity: 0; transform: translate(-50%, -90%); }
          to { opacity: 1; transform: translate(-50%, -100%); }
        }
      `}</style>
    </div>
  )
}

// Helper: wrap o primeiro match exato de `text` dentro de element com mark colorido
function wrapTextInElement(root: HTMLElement, text: string, color: HighlightColor, id: string) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null)
  let node: Text | null
  while ((node = walker.nextNode() as Text | null)) {
    const idx = node.textContent?.indexOf(text) ?? -1
    if (idx >= 0) {
      const range = document.createRange()
      range.setStart(node, idx)
      range.setEnd(node, idx + text.length)
      const mark = document.createElement('mark')
      mark.className = `highlight-${color}`
      mark.dataset.highlightId = id
      try {
        range.surroundContents(mark)
      } catch {
        // surroundContents falha quando range cruza nodes — ignora
      }
      return
    }
  }
}
