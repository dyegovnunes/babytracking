// AdminGuideEditorPage — edita metadata do guia + lista de seções (parts > sections)
// Reorder via setas (drag-drop é overkill pra ~30 seções)

import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  GUIDE_SECTION_TYPE_LABEL,
  type Guide,
  type GuideSection,
  type GuideSectionType,
} from '../../../types'

const EMPTY_GUIDE: Partial<Guide> = {
  slug: '', title: '', subtitle: '', description: '',
  price_cents: 4700, stripe_price_id: '', cover_image_url: '',
  status: 'draft', courtesy_days: 30, audience: 'gestante',
  target_week_start: null, target_week_end: null,
}

const TYPE_ICON: Record<GuideSectionType, string> = {
  part: 'bookmark', linear: 'article', quiz: 'quiz', checklist: 'checklist', flashcards: 'style',
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export default function AdminGuideEditorPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const isNew = !slug || slug === 'novo'

  const [guide, setGuide] = useState<Partial<Guide>>(EMPTY_GUIDE)
  const [sections, setSections] = useState<GuideSection[]>([])
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  // Carregar guia + seções
  useEffect(() => {
    if (isNew) return
    async function load() {
      const { data: g } = await supabase.from('guides').select('*').eq('slug', slug).single()
      if (!g) { navigate('/biblioteca'); return }
      setGuide(g)
      const { data: secs } = await supabase
        .from('guide_sections')
        .select('*')
        .eq('guide_id', g.id)
        .order('order_index', { ascending: true })
      setSections(secs ?? [])
      setLoading(false)
    }
    load()
  }, [slug])

  const updateField = useCallback(<K extends keyof Guide>(key: K, value: Guide[K] | string) => {
    setGuide(prev => ({ ...prev, [key]: value }))
  }, [])

  async function save() {
    if (!guide.title?.trim()) { alert('Título é obrigatório'); return }
    if (!guide.slug?.trim()) { alert('Slug é obrigatório'); return }
    setSaving(true)

    // Normaliza valores
    const payload = {
      ...guide,
      slug: slugify(guide.slug ?? ''),
      price_cents: Number(guide.price_cents) || 0,
      courtesy_days: Number(guide.courtesy_days) || 30,
      target_week_start: guide.target_week_start ? Number(guide.target_week_start) : null,
      target_week_end: guide.target_week_end ? Number(guide.target_week_end) : null,
    }

    let result
    if (isNew) {
      const { data, error } = await supabase.from('guides').insert(payload).select().single()
      if (error) { alert(`Erro ao criar: ${error.message}`); setSaving(false); return }
      result = data
      navigate(`/biblioteca/${result.slug}`, { replace: true })
    } else {
      const { data, error } = await supabase.from('guides').update(payload).eq('id', guide.id).select().single()
      if (error) { alert(`Erro ao salvar: ${error.message}`); setSaving(false); return }
      result = data
      setGuide(result)
    }

    setSavedMsg('Salvo')
    setTimeout(() => setSavedMsg(''), 2000)
    setSaving(false)
  }

  async function moveSection(section: GuideSection, direction: 'up' | 'down') {
    const sameLevel = sections.filter(s => s.parent_id === section.parent_id)
      .sort((a, b) => a.order_index - b.order_index)
    const idx = sameLevel.findIndex(s => s.id === section.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sameLevel.length) return
    const other = sameLevel[swapIdx]

    // Swap order_index
    await Promise.all([
      supabase.from('guide_sections').update({ order_index: other.order_index }).eq('id', section.id),
      supabase.from('guide_sections').update({ order_index: section.order_index }).eq('id', other.id),
    ])

    // Reload sections
    const { data: secs } = await supabase
      .from('guide_sections')
      .select('*')
      .eq('guide_id', guide.id)
      .order('order_index', { ascending: true })
    setSections(secs ?? [])
  }

  async function deleteSection(section: GuideSection) {
    if (!confirm(`Excluir "${section.title}" e todas as subseções?`)) return
    await supabase.from('guide_sections').delete().eq('id', section.id)
    const { data: secs } = await supabase
      .from('guide_sections')
      .select('*')
      .eq('guide_id', guide.id)
      .order('order_index', { ascending: true })
    setSections(secs ?? [])
  }

  if (loading) {
    return <div className="text-sm" style={{ color: 'rgba(231,226,255,0.5)' }}>Carregando…</div>
  }

  // Constrói árvore: parts no topo, seções aninhadas
  const parts = sections.filter(s => s.parent_id === null)
  const childrenOf = (parentId: string) =>
    sections.filter(s => s.parent_id === parentId).sort((a, b) => a.order_index - b.order_index)

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <button
          onClick={() => navigate('/biblioteca')}
          className="text-sm flex items-center gap-1 cursor-pointer bg-transparent border-none"
          style={{ color: 'rgba(231,226,255,0.5)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
          Voltar
        </button>
      </div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Manrope, sans-serif', color: '#e7e2ff' }}>
          {isNew ? 'Novo guia' : guide.title}
        </h1>
        <div className="flex items-center gap-3">
          {savedMsg && (
            <span className="text-sm" style={{ color: '#70e09a' }}>
              <span className="material-symbols-outlined align-middle" style={{ fontSize: 16 }}>check_circle</span>
              {' '}{savedMsg}
            </span>
          )}
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded-md text-sm font-semibold cursor-pointer border-none"
            style={{ background: '#b79fff', color: '#0d0a27', opacity: saving ? 0.6 : 1 }}
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>

      <div className="grid gap-6" style={{ gridTemplateColumns: '1fr', maxWidth: 900 }}>
        {/* ── Metadata ──────────────────────────────────────────── */}
        <Section title="Identificação">
          <Field label="Título" required>
            <Input
              value={guide.title ?? ''}
              onChange={v => {
                updateField('title', v)
                if (isNew && !guide.slug) updateField('slug', slugify(v))
              }}
              placeholder="Guia das Últimas Semanas"
            />
          </Field>
          <Field label="Subtítulo">
            <Input
              value={guide.subtitle ?? ''}
              onChange={v => updateField('subtitle', v)}
              placeholder="Da semana 28 ao primeiro mês com o bebê em casa"
            />
          </Field>
          <Field label="Slug (URL)" required hint={`/biblioteca-yaya/${guide.slug || 'slug-aqui'}`}>
            <Input
              value={guide.slug ?? ''}
              onChange={v => updateField('slug', v)}
              placeholder="ultimas-semanas"
            />
          </Field>
          <Field label="Descrição (mostra na landing)">
            <Textarea
              value={guide.description ?? ''}
              onChange={v => updateField('description', v)}
              rows={4}
              placeholder="Um guia premium pra gestantes..."
            />
          </Field>
        </Section>

        {/* ── Comercial ─────────────────────────────────────────── */}
        <Section title="Comercial">
          <Field label="Preço (R$)" required hint="Em centavos: 4700 = R$47,00">
            <Input
              type="number"
              value={String(guide.price_cents ?? '')}
              onChange={v => updateField('price_cents', Number(v) as never)}
              placeholder="4700"
            />
          </Field>
          <Field
            label="Stripe Price ID"
            hint="Crie produto no Stripe e cole o price_id (price_xxx). Sem isso o checkout não funciona."
          >
            <Input
              value={guide.stripe_price_id ?? ''}
              onChange={v => updateField('stripe_price_id', v)}
              placeholder="price_1ABC..."
              mono
            />
          </Field>
          <Field label="Dias de Yaya+ cortesia" hint="Quantos dias do Yaya+ a compra concede">
            <Input
              type="number"
              value={String(guide.courtesy_days ?? '')}
              onChange={v => updateField('courtesy_days', Number(v) as never)}
              placeholder="30"
            />
          </Field>
        </Section>

        {/* ── Categorização ─────────────────────────────────────── */}
        <Section title="Categorização">
          <Field label="Status">
            <Select
              value={guide.status ?? 'draft'}
              onChange={v => updateField('status', v as never)}
              options={[
                { value: 'draft', label: 'Rascunho (não aparece no catálogo)' },
                { value: 'published', label: 'Publicado (visível e à venda)' },
                { value: 'archived', label: 'Arquivado (escondido)' },
              ]}
            />
          </Field>
          <Field label="Audiência">
            <Select
              value={guide.audience ?? 'gestante'}
              onChange={v => updateField('audience', v)}
              options={[
                { value: 'gestante', label: 'Gestante' },
                { value: 'parent', label: 'Pais (pós-parto)' },
                { value: 'both', label: 'Ambos' },
              ]}
            />
          </Field>
          <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <Field label="Semana inicial (opcional)">
              <Input
                type="number"
                value={String(guide.target_week_start ?? '')}
                onChange={v => updateField('target_week_start', (v ? Number(v) : null) as never)}
                placeholder="28"
              />
            </Field>
            <Field label="Semana final (opcional)">
              <Input
                type="number"
                value={String(guide.target_week_end ?? '')}
                onChange={v => updateField('target_week_end', (v ? Number(v) : null) as never)}
                placeholder="44"
              />
            </Field>
          </div>
        </Section>

        {/* ── Capa ──────────────────────────────────────────────── */}
        <Section title="Capa">
          <Field label="URL da imagem de capa" hint="Aparece na landing pública e como hero do leitor">
            <Input
              value={guide.cover_image_url ?? ''}
              onChange={v => updateField('cover_image_url', v)}
              placeholder="https://..."
            />
          </Field>
          {guide.cover_image_url && (
            <img
              src={guide.cover_image_url}
              alt="Capa"
              className="rounded-md mt-2 max-w-full"
              style={{ maxHeight: 200, border: '1px solid rgba(183,159,255,0.15)' }}
            />
          )}
        </Section>

        {/* ── Seções ────────────────────────────────────────────── */}
        {!isNew && (
          <Section
            title="Estrutura do conteúdo"
            action={
              <button
                onClick={() => navigate(`/biblioteca/${guide.slug}/secao/nova`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer border-none"
                style={{ background: 'rgba(183,159,255,0.15)', color: '#b79fff' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                Nova parte
              </button>
            }
          >
            {parts.length === 0 ? (
              <div className="text-sm" style={{ color: 'rgba(231,226,255,0.5)' }}>
                Comece adicionando a primeira <strong>Parte</strong> do guia (ex: "Parte 1 — Preparação para o parto").
                Cada parte pode ter seções e subseções dentro.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {parts.map((part, partIdx) => (
                  <PartTreeNode
                    key={part.id}
                    section={part}
                    children={childrenOf(part.id)}
                    sections={sections}
                    isFirst={partIdx === 0}
                    isLast={partIdx === parts.length - 1}
                    guideSlug={guide.slug ?? ''}
                    onMove={moveSection}
                    onDelete={deleteSection}
                    onAddChild={() => navigate(`/biblioteca/${guide.slug}/secao/nova?parent=${part.id}`)}
                    childrenOf={childrenOf}
                  />
                ))}
              </div>
            )}
          </Section>
        )}
      </div>
    </div>
  )
}

// ── Subcomponentes ─────────────────────────────────────────────────────────

function Section({
  title, action, children,
}: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div
      className="rounded-md p-5 border"
      style={{ borderColor: 'rgba(183,159,255,0.15)', background: 'rgba(183,159,255,0.03)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold" style={{ fontFamily: 'Manrope, sans-serif', color: '#e7e2ff' }}>
          {title}
        </h2>
        {action}
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  )
}

function Field({
  label, required, hint, children,
}: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(231,226,255,0.6)' }}>
        {label}{required && <span style={{ color: '#ff7a90' }}> *</span>}
      </span>
      {children}
      {hint && <span className="text-xs" style={{ color: 'rgba(231,226,255,0.4)' }}>{hint}</span>}
    </label>
  )
}

function Input({
  value, onChange, placeholder, type = 'text', mono,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; mono?: boolean
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="rounded-md px-3 py-2 text-sm border outline-none"
      style={{
        background: 'rgba(13,10,39,0.5)',
        borderColor: 'rgba(183,159,255,0.2)',
        color: '#e7e2ff',
        fontFamily: mono ? 'monospace' : undefined,
      }}
    />
  )
}

function Textarea({
  value, onChange, placeholder, rows = 3,
}: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="rounded-md px-3 py-2 text-sm border outline-none resize-y"
      style={{
        background: 'rgba(13,10,39,0.5)',
        borderColor: 'rgba(183,159,255,0.2)',
        color: '#e7e2ff',
        fontFamily: 'inherit',
      }}
    />
  )
}

function Select({
  value, onChange, options,
}: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="rounded-md px-3 py-2 text-sm border outline-none cursor-pointer"
      style={{
        background: 'rgba(13,10,39,0.5)',
        borderColor: 'rgba(183,159,255,0.2)',
        color: '#e7e2ff',
      }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function PartTreeNode({
  section, children, sections, isFirst, isLast, guideSlug,
  onMove, onDelete, onAddChild, childrenOf,
}: {
  section: GuideSection
  children: GuideSection[]
  sections: GuideSection[]
  isFirst: boolean
  isLast: boolean
  guideSlug: string
  onMove: (s: GuideSection, dir: 'up' | 'down') => void
  onDelete: (s: GuideSection) => void
  onAddChild: () => void
  childrenOf: (parentId: string) => GuideSection[]
}) {
  return (
    <div
      className="rounded-md border"
      style={{ borderColor: 'rgba(183,159,255,0.2)', background: 'rgba(13,10,39,0.4)' }}
    >
      <SectionRow
        section={section}
        isFirst={isFirst}
        isLast={isLast}
        guideSlug={guideSlug}
        onMove={onMove}
        onDelete={onDelete}
        depth={0}
      />
      {children.length > 0 && (
        <div style={{ paddingLeft: 24, borderTop: '1px solid rgba(183,159,255,0.1)' }}>
          {children.map((c, idx) => (
            <SectionRow
              key={c.id}
              section={c}
              isFirst={idx === 0}
              isLast={idx === children.length - 1}
              guideSlug={guideSlug}
              onMove={onMove}
              onDelete={onDelete}
              depth={1}
            />
          ))}
        </div>
      )}
      <div style={{ padding: '8px 14px 12px', borderTop: '1px solid rgba(183,159,255,0.08)' }}>
        <button
          onClick={onAddChild}
          className="text-xs flex items-center gap-1 cursor-pointer bg-transparent border-none"
          style={{ color: '#b79fff' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>
          Adicionar seção dentro de "{section.title}"
        </button>
      </div>
    </div>
  )
}

function SectionRow({
  section, isFirst, isLast, guideSlug, onMove, onDelete, depth,
}: {
  section: GuideSection
  isFirst: boolean
  isLast: boolean
  guideSlug: string
  onMove: (s: GuideSection, dir: 'up' | 'down') => void
  onDelete: (s: GuideSection) => void
  depth: number
}) {
  const navigate = useNavigate()
  return (
    <div
      className="flex items-center gap-3"
      style={{ padding: '12px 14px' }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#b79fff', opacity: depth === 0 ? 1 : 0.6 }}>
        {TYPE_ICON[section.type]}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="font-semibold text-sm truncate"
            style={{ color: '#e7e2ff', fontWeight: depth === 0 ? 700 : 500 }}
          >
            {section.title}
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(183,159,255,0.12)', color: 'rgba(183,159,255,0.8)' }}
          >
            {GUIDE_SECTION_TYPE_LABEL[section.type]}
          </span>
          {section.is_preview && (
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(112,224,154,0.12)', color: '#70e09a' }}
            >
              preview
            </span>
          )}
        </div>
        {section.estimated_minutes && (
          <span className="text-xs" style={{ color: 'rgba(231,226,255,0.4)' }}>
            ≈ {section.estimated_minutes} min
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <IconBtn icon="arrow_upward" onClick={() => onMove(section, 'up')} disabled={isFirst} />
        <IconBtn icon="arrow_downward" onClick={() => onMove(section, 'down')} disabled={isLast} />
        <IconBtn icon="edit" onClick={() => navigate(`/biblioteca/${guideSlug}/secao/${section.id}`)} />
        <IconBtn icon="delete" danger onClick={() => onDelete(section)} />
      </div>
    </div>
  )
}

function IconBtn({
  icon, onClick, disabled, danger,
}: { icon: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded cursor-pointer bg-transparent border-none transition-opacity"
      style={{
        padding: 4,
        color: danger ? '#ff7a90' : '#b79fff',
        opacity: disabled ? 0.25 : 0.65,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.opacity = '1' }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.opacity = '0.65' }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{icon}</span>
    </button>
  )
}
