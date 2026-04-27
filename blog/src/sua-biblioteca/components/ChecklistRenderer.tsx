// ChecklistRenderer — itens marcáveis com persistência local (localStorage).
// Estrutura JSON: { items: [{ id, text, required }] }
// Estado salvo por (userId, sectionId) → simples e suficiente.

import { useState, useEffect } from 'react'
import type { GuideSection } from '../../types'

interface ChecklistItem {
  id: string
  text: string
  required?: boolean
}

interface Props {
  section: GuideSection
  userId: string
}

export default function ChecklistRenderer({ section, userId }: Props) {
  const items: ChecklistItem[] = (section.data as { items?: ChecklistItem[] })?.items ?? []
  const storageKey = `yaya_checklist_${userId}_${section.id}`

  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {}
    try {
      return JSON.parse(localStorage.getItem(storageKey) ?? '{}')
    } catch { return {} }
  })

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(checked))
  }, [checked, storageKey])

  function toggle(id: string) {
    setChecked(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const total = items.length
  const done = items.filter(i => checked[i.id]).length
  const allRequired = items.filter(i => i.required).every(i => checked[i.id])

  if (items.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--r-text-muted)' }}>
        Checklist sem itens. Edite no admin pra adicionar.
      </div>
    )
  }

  return (
    <div style={{ marginTop: 32 }}>
      {/* Resumo */}
      <div style={{
        background: 'var(--r-surface)',
        border: '1px solid var(--r-border)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{ position: 'relative', width: 44, height: 44 }}>
          <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
            <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(183,159,255,0.15)" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15" fill="none"
              stroke="var(--r-accent)"
              strokeWidth="3"
              strokeDasharray={`${(done / Math.max(total, 1)) * 94.2} 94.2`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.4s ease' }}
            />
          </svg>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: 'var(--r-accent)',
          }}>
            {Math.round((done / Math.max(total, 1)) * 100)}%
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: 'var(--r-text)' }}>
            {done} de {total} {total === 1 ? 'item' : 'itens'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--r-text-muted)' }}>
            {allRequired ? 'Todo essencial concluído 💜' : 'Marque conforme for resolvendo'}
          </div>
        </div>
      </div>

      {/* Itens */}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {items.map(item => {
          const isChecked = !!checked[item.id]
          return (
            <li key={item.id} style={{ marginBottom: 8 }}>
              <button
                onClick={() => toggle(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  padding: '14px 16px',
                  background: isChecked ? 'rgba(112,224,154,0.06)' : 'var(--r-surface)',
                  border: `1px solid ${isChecked ? 'rgba(112,224,154,0.3)' : 'var(--r-border)'}`,
                  borderRadius: 10,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s',
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: 24,
                    color: isChecked ? '#70e09a' : 'var(--r-text-subtle)',
                  }}
                >
                  {isChecked ? 'check_circle' : 'radio_button_unchecked'}
                </span>
                <span style={{
                  flex: 1,
                  fontSize: 15,
                  color: isChecked ? 'var(--r-text-muted)' : 'var(--r-text)',
                  textDecoration: isChecked ? 'line-through' : 'none',
                  lineHeight: 1.5,
                }}>
                  {item.text}
                </span>
                {item.required && (
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: 'var(--r-accent)',
                    background: 'rgba(183,159,255,0.12)',
                    padding: '2px 8px',
                    borderRadius: 999,
                    textTransform: 'uppercase',
                  }}>
                    Essencial
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
