// InteractiveChecklist — itens marcáveis com estado persistido em DB
// (guide_checklist_state). Substitui o ChecklistRenderer que usava
// localStorage.
//
// Funciona em 2 contextos:
//   1. Sections type='checklist' (data.items vem do JSONB)
//   2. Inline dentro de sections type='linear' quando o seed extrai
//      itens `- [ ]` do markdown pra data.checklist_items
//
// Optimistic update: marca/desmarca instantâneo no client; se DB falhar,
// reverte com toast.

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

export interface ChecklistItem {
  id: string
  text: string
  required?: boolean
  group?: string
}

interface Props {
  items: ChecklistItem[]
  sectionId: string
  userId: string
  /** Callback disparado quando 100% dos items são marcados (uma vez). */
  onCompleted?: () => void
  /** Tom mais discreto pra checklists inline; padrão (false) é card destacado. */
  variant?: 'card' | 'inline'
}

export default function InteractiveChecklist({
  items, sectionId, userId, onCompleted, variant = 'card',
}: Props) {
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [completionToast, setCompletionToast] = useState(false)
  const wasCompletedRef = useRef(false)

  // Fetch inicial — quais items o user já marcou
  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data } = await supabase
        .from('guide_checklist_state')
        .select('item_id')
        .eq('user_id', userId)
        .eq('section_id', sectionId)
      if (cancelled) return
      const ids = new Set((data ?? []).map(r => r.item_id as string))
      setChecked(ids)
      // Marca como já completo se 100% dos items existentes estão marcados
      // (pra não disparar toast de "concluído" ao recarregar)
      const allChecked = items.length > 0 && items.every(i => ids.has(i.id))
      wasCompletedRef.current = allChecked
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [sectionId, userId, items])

  // Detecta transição "ainda incompleto → completo" pra disparar callback + toast
  useEffect(() => {
    if (loading) return
    if (items.length === 0) return
    const isCompleteNow = items.every(i => checked.has(i.id))
    if (isCompleteNow && !wasCompletedRef.current) {
      wasCompletedRef.current = true
      setCompletionToast(true)
      setTimeout(() => setCompletionToast(false), 3000)
      onCompleted?.()
    }
    // Se desmarca um item depois de ter completado, "destrava" pra próxima
    // conclusão também acionar toast
    if (!isCompleteNow && wasCompletedRef.current) {
      wasCompletedRef.current = false
    }
  }, [checked, items, loading, onCompleted])

  const toggle = useCallback(async (itemId: string) => {
    const wasChecked = checked.has(itemId)

    // Optimistic update — UI responde instantâneo
    setChecked(prev => {
      const next = new Set(prev)
      if (wasChecked) next.delete(itemId)
      else next.add(itemId)
      return next
    })

    // Haptic feedback sutil (mobile)
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator && !wasChecked) {
      try { navigator.vibrate(8) } catch { /* ignore */ }
    }

    // Persiste em DB
    if (wasChecked) {
      await supabase.from('guide_checklist_state').delete()
        .eq('user_id', userId)
        .eq('section_id', sectionId)
        .eq('item_id', itemId)
    } else {
      const { error } = await supabase.from('guide_checklist_state').insert({
        user_id: userId,
        section_id: sectionId,
        item_id: itemId,
        checked_at: new Date().toISOString(),
      })
      // Conflict (já existe) é OK
      if (error && error.code !== '23505') {
        // Reverte optimistic update se falhou de verdade
        setChecked(prev => {
          const next = new Set(prev)
          next.delete(itemId)
          return next
        })
      }
    }
  }, [checked, sectionId, userId])

  if (items.length === 0) return null

  const total = items.length
  const done = items.filter(i => checked.has(i.id)).length
  const pct = Math.round((done / Math.max(total, 1)) * 100)
  const allRequiredDone = items.filter(i => i.required).every(i => checked.has(i.id))

  const isInline = variant === 'inline'

  return (
    <div
      style={{
        margin: isInline ? '1.5em 0' : '2em 0',
        fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
        position: 'relative',
      }}
    >
      {/* Resumo (anel + status) — só na variant card */}
      {!isInline && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px 16px',
          marginBottom: 14,
          background: 'var(--r-surface)',
          border: '1px solid var(--r-border)',
          borderRadius: 14,
        }}>
          {/* Anel de progresso SVG */}
          <div style={{ position: 'relative', width: 44, height: 44, flex: '0 0 auto' }}>
            <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
              <circle cx="18" cy="18" r="15" fill="none"
                stroke="color-mix(in srgb, var(--r-accent) 14%, transparent)"
                strokeWidth="3" />
              <circle cx="18" cy="18" r="15" fill="none"
                stroke="var(--r-accent)"
                strokeWidth="3"
                strokeDasharray={`${(done / Math.max(total, 1)) * 94.2} 94.2`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.4s ease' }} />
            </svg>
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 800, color: 'var(--r-accent)',
              fontFamily: 'Manrope, system-ui, sans-serif',
              letterSpacing: '-0.02em',
            }}>
              {pct}%
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: 'Manrope, system-ui, sans-serif',
              fontWeight: 800,
              fontSize: 14,
              color: 'var(--r-text-strong)',
              letterSpacing: '-0.01em',
            }}>
              {done} de {total} {total === 1 ? 'item' : 'itens'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--r-text-muted)', marginTop: 2 }}>
              {done === total
                ? 'Tudo resolvido. Pode passar pra próxima.'
                : allRequiredDone
                  ? 'Todo o essencial concluído.'
                  : 'Marque conforme for resolvendo.'}
            </div>
          </div>
        </div>
      )}

      {/* Items — com suporte a grupos quando items têm campo `group` */}
      {renderItems(items, checked, loading, toggle, isInline)}

      {/* Toast efêmero "Checklist completo" */}
      {completionToast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: 'calc(max(20px, env(safe-area-inset-bottom)) + 80px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 60,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 16px',
            background: 'color-mix(in srgb, var(--r-accent) 14%, var(--r-overlay))',
            border: '1px solid color-mix(in srgb, var(--r-accent) 45%, transparent)',
            borderRadius: 999,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 10px 28px color-mix(in srgb, var(--r-accent) 22%, transparent)',
            color: 'var(--r-text-strong)',
            fontFamily: 'Manrope, system-ui, sans-serif',
            fontWeight: 700,
            fontSize: 14,
            animation: 'checklist-toast-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--r-accent)' }}>
            task_alt
          </span>
          Checklist completo 💜
          <style>{`
            @keyframes checklist-toast-in {
              from { opacity: 0; transform: translate(-50%, 12px); }
              to   { opacity: 1; transform: translate(-50%, 0); }
            }
          `}</style>
        </div>
      )}
    </div>
  )
}

// ── Helpers de renderização ────────────────────────────────────────────────

function ChecklistItemRow({
  item, isChecked, loading, onToggle, isInline,
}: {
  item: ChecklistItem
  isChecked: boolean
  loading: boolean
  onToggle: () => void
  isInline: boolean
}) {
  return (
    <li style={{ marginBottom: isInline ? 6 : 8 }}>
      <button
        onClick={onToggle}
        disabled={loading}
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          width: '100%', padding: isInline ? '10px 12px' : '12px 16px',
          background: isChecked ? 'color-mix(in srgb, var(--r-accent) 8%, transparent)' : 'var(--r-surface)',
          border: `1px solid ${isChecked ? 'color-mix(in srgb, var(--r-accent) 35%, transparent)' : 'var(--r-border)'}`,
          borderRadius: 10, cursor: loading ? 'wait' : 'pointer',
          textAlign: 'left', fontFamily: 'inherit',
          transition: 'all 0.2s', minHeight: 44, opacity: loading ? 0.5 : 1,
        }}
        onMouseEnter={e => { if (!isChecked && !loading) e.currentTarget.style.background = 'var(--r-surface-strong)' }}
        onMouseLeave={e => { if (!isChecked) e.currentTarget.style.background = 'var(--r-surface)' }}
      >
        <span className="material-symbols-outlined" style={{
          fontSize: 22, color: isChecked ? 'var(--r-accent)' : 'var(--r-text-subtle)',
          flex: '0 0 auto', transition: 'color 0.2s, transform 0.15s',
          transform: isChecked ? 'scale(1.05)' : 'scale(1)',
          fontVariationSettings: isChecked ? '"FILL" 1' : '"FILL" 0',
        }}>
          {isChecked ? 'check_circle' : 'radio_button_unchecked'}
        </span>
        <span style={{
          flex: 1, fontSize: isInline ? 14 : 15,
          color: isChecked ? 'var(--r-text-muted)' : 'var(--r-text)',
          textDecoration: isChecked ? 'line-through' : 'none',
          textDecorationColor: isChecked ? 'var(--r-text-subtle)' : 'transparent',
          lineHeight: 1.5, transition: 'color 0.2s, text-decoration-color 0.2s',
        }}>
          {item.text}
        </span>
        {item.required && (
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--r-accent)',
            background: 'color-mix(in srgb, var(--r-accent) 12%, transparent)',
            padding: '3px 8px', borderRadius: 999, textTransform: 'uppercase',
            flex: '0 0 auto', alignSelf: 'center', fontFamily: 'Manrope, system-ui, sans-serif',
          }}>Essencial</span>
        )}
      </button>
    </li>
  )
}

function renderItems(
  items: ChecklistItem[],
  checked: Set<string>,
  loading: boolean,
  toggle: (id: string) => void,
  isInline: boolean,
): React.ReactNode {
  const hasGroups = items.some(i => i.group)

  if (!hasGroups) {
    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {items.map(item => (
          <ChecklistItemRow
            key={item.id} item={item}
            isChecked={checked.has(item.id)} loading={loading}
            onToggle={() => toggle(item.id)} isInline={isInline}
          />
        ))}
      </ul>
    )
  }

  // Agrupa mantendo ordem de inserção
  const groups: Array<{ name: string; items: ChecklistItem[] }> = []
  const groupMap = new Map<string, ChecklistItem[]>()
  for (const item of items) {
    const g = item.group ?? ''
    if (!groupMap.has(g)) {
      groupMap.set(g, [])
      groups.push({ name: g, items: groupMap.get(g)! })
    }
    groupMap.get(g)!.push(item)
  }

  return (
    <>
      {groups.map((group, gi) => {
        const groupDone = group.items.filter(i => checked.has(i.id)).length
        const groupTotal = group.items.length
        return (
          <div key={group.name} style={{ marginBottom: gi < groups.length - 1 ? 24 : 0 }}>
            {/* Cabeçalho do grupo */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 4px', marginBottom: 8,
              borderBottom: '1px solid var(--r-border)',
            }}>
              <span style={{
                fontFamily: 'Manrope, system-ui, sans-serif',
                fontSize: 11, fontWeight: 800,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                color: 'var(--r-accent)',
              }}>
                {group.name}
              </span>
              <span style={{ fontSize: 11, color: 'var(--r-text-muted)', fontWeight: 600 }}>
                {groupDone}/{groupTotal}
              </span>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {group.items.map(item => (
                <ChecklistItemRow
                  key={item.id} item={item}
                  isChecked={checked.has(item.id)} loading={loading}
                  onToggle={() => toggle(item.id)} isInline={isInline}
                />
              ))}
            </ul>
          </div>
        )
      })}
    </>
  )
}
