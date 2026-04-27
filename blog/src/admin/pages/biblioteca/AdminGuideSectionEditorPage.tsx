// AdminGuideSectionEditorPage — edita uma seção do guia
// Tipos: linear (markdown), part (capa + intro), quiz (JSON estruturado),
// checklist (JSON com items)

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import TiptapEditor from '../../components/PostEditor/TiptapEditor'
import {
  GUIDE_SECTION_TYPE_LABEL,
  type Guide,
  type GuideSection,
  type GuideSectionType,
} from '../../../types'

const EMPTY_SECTION: Partial<GuideSection> = {
  slug: '', title: '', content_md: '', type: 'linear',
  estimated_minutes: null, cover_image_url: '', is_preview: false, data: null,
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

const QUIZ_TEMPLATE = {
  questions: [
    {
      id: 'q1',
      text: 'Como você se sente sobre a chegada do bebê?',
      options: [
        { value: 'a', label: 'Confiante, já preparei tudo' },
        { value: 'b', label: 'Animada, mas com algumas dúvidas' },
        { value: 'c', label: 'Ansiosa, com muitas dúvidas' },
        { value: 'd', label: 'Tranquila, vou aprendendo no caminho' },
      ],
    },
  ],
  results: {
    a: {
      title: 'Pragmática',
      description: 'Você gosta de ter tudo organizado e planejado.',
      recommended_sections: ['parte-1-checklist', 'parte-2-plano-de-parto'],
    },
    b: {
      title: 'Analítica',
      description: 'Você quer entender o porquê das coisas.',
      recommended_sections: ['parte-1-fisiologia', 'parte-3-amamentacao-ciencia'],
    },
    c: {
      title: 'Ansiosa',
      description: 'Vamos passar por cada dúvida com calma.',
      recommended_sections: ['parte-1-medos-comuns', 'parte-3-primeiras-semanas'],
    },
    d: {
      title: 'Intuitiva',
      description: 'Você confia no processo e na sua intuição.',
      recommended_sections: ['parte-2-conexao', 'parte-4-vinculo'],
    },
  },
}

const CHECKLIST_TEMPLATE = {
  items: [
    { id: '1', text: 'Item de exemplo', required: true },
    { id: '2', text: 'Outro item', required: false },
  ],
}

export default function AdminGuideSectionEditorPage() {
  const { slug, sectionId } = useParams<{ slug: string; sectionId: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const parentId = searchParams.get('parent')
  const isNew = !sectionId || sectionId === 'nova'

  const [guide, setGuide] = useState<Guide | null>(null)
  const [parent, setParent] = useState<GuideSection | null>(null)
  const [section, setSection] = useState<Partial<GuideSection>>(EMPTY_SECTION)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [dataJson, setDataJson] = useState('')
  const [jsonError, setJsonError] = useState('')

  // Carrega guia + (se editando) seção
  useEffect(() => {
    async function load() {
      const { data: g } = await supabase.from('guides').select('*').eq('slug', slug).single()
      if (!g) { navigate('/biblioteca'); return }
      setGuide(g)

      if (parentId) {
        const { data: p } = await supabase.from('guide_sections').select('*').eq('id', parentId).single()
        setParent(p)
      }

      if (!isNew) {
        const { data: s } = await supabase.from('guide_sections').select('*').eq('id', sectionId).single()
        if (s) {
          setSection(s)
          setDataJson(s.data ? JSON.stringify(s.data, null, 2) : '')
          if (s.parent_id) {
            const { data: p } = await supabase.from('guide_sections').select('*').eq('id', s.parent_id).single()
            setParent(p)
          }
        }
      } else {
        // Define type default baseado no contexto: top-level = part, dentro de part = linear
        setSection(prev => ({ ...prev, type: parentId ? 'linear' : 'part' }))
      }
      setLoading(false)
    }
    load()
  }, [slug, sectionId, parentId])

  const updateField = useCallback(<K extends keyof GuideSection>(key: K, value: GuideSection[K] | string | boolean | null) => {
    setSection(prev => ({ ...prev, [key]: value }))
  }, [])

  // Quando muda o type, popula data com template adequado se vazio
  useEffect(() => {
    if (section.type === 'quiz' && !dataJson) {
      setDataJson(JSON.stringify(QUIZ_TEMPLATE, null, 2))
    } else if (section.type === 'checklist' && !dataJson) {
      setDataJson(JSON.stringify(CHECKLIST_TEMPLATE, null, 2))
    }
    // não limpa dataJson em outros types — mantém conteúdo se o user voltar
  }, [section.type])

  // Valida JSON em tempo real
  useEffect(() => {
    if (!dataJson.trim()) { setJsonError(''); return }
    try {
      JSON.parse(dataJson)
      setJsonError('')
    } catch (e) {
      setJsonError(`JSON inválido: ${(e as Error).message}`)
    }
  }, [dataJson])

  async function save() {
    if (!section.title?.trim()) { alert('Título é obrigatório'); return }
    if (!section.slug?.trim()) { alert('Slug é obrigatório'); return }
    if (!guide) return

    let parsedData = null
    if (dataJson.trim() && (section.type === 'quiz' || section.type === 'checklist')) {
      try { parsedData = JSON.parse(dataJson) }
      catch { alert('JSON da estrutura está inválido — corrija antes de salvar'); return }
    }

    setSaving(true)

    // Pra novo: pega próximo order_index dentro do mesmo nível
    let orderIndex = section.order_index
    if (isNew) {
      const { data: siblings } = await supabase
        .from('guide_sections')
        .select('order_index')
        .eq('guide_id', guide.id)
        .is('parent_id', parentId ?? null)
        .order('order_index', { ascending: false })
        .limit(1)
      orderIndex = (siblings?.[0]?.order_index ?? -1) + 1
    }

    const payload = {
      guide_id: guide.id,
      parent_id: parentId ?? section.parent_id ?? null,
      order_index: orderIndex,
      slug: slugify(section.slug ?? ''),
      title: section.title,
      cover_image_url: section.cover_image_url || null,
      estimated_minutes: section.estimated_minutes ? Number(section.estimated_minutes) : null,
      content_md: section.content_md || null,
      type: section.type,
      data: parsedData,
      is_preview: !!section.is_preview,
    }

    if (isNew) {
      const { data, error } = await supabase.from('guide_sections').insert(payload).select().single()
      if (error) { alert(`Erro ao criar: ${error.message}`); setSaving(false); return }
      navigate(`/biblioteca/${guide.slug}/secao/${data.id}`, { replace: true })
    } else {
      const { error } = await supabase.from('guide_sections').update(payload).eq('id', sectionId)
      if (error) { alert(`Erro ao salvar: ${error.message}`); setSaving(false); return }
    }

    setSavedMsg('Salvo')
    setTimeout(() => setSavedMsg(''), 2000)
    setSaving(false)
  }

  if (loading) {
    return <div className="text-sm" style={{ color: 'rgba(231,226,255,0.5)' }}>Carregando…</div>
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <button
          onClick={() => navigate(`/biblioteca/${slug}`)}
          className="text-sm flex items-center gap-1 cursor-pointer bg-transparent border-none"
          style={{ color: 'rgba(231,226,255,0.5)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
          {guide?.title}
        </button>
      </div>

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Manrope, sans-serif', color: '#e7e2ff' }}>
            {isNew ? 'Nova seção' : section.title}
          </h1>
          {parent && (
            <div className="text-sm mt-1" style={{ color: 'rgba(231,226,255,0.5)' }}>
              dentro de: <strong style={{ color: '#b79fff' }}>{parent.title}</strong>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {savedMsg && (
            <span className="text-sm" style={{ color: '#70e09a' }}>
              <span className="material-symbols-outlined align-middle" style={{ fontSize: 16 }}>check_circle</span>
              {' '}{savedMsg}
            </span>
          )}
          <button
            onClick={save}
            disabled={saving || !!jsonError}
            className="px-4 py-2 rounded-md text-sm font-semibold cursor-pointer border-none"
            style={{ background: '#b79fff', color: '#0d0a27', opacity: saving || jsonError ? 0.5 : 1 }}
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>

      <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 320px', maxWidth: 1200 }}>
        {/* ── Coluna 1: Conteúdo ──────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <Field label="Título" required>
            <Input
              value={section.title ?? ''}
              onChange={v => {
                updateField('title', v)
                if (isNew && !section.slug) updateField('slug', slugify(v))
              }}
              placeholder="Ex: Sinais de trabalho de parto"
            />
          </Field>

          <Field label="Slug" required>
            <Input
              value={section.slug ?? ''}
              onChange={v => updateField('slug', v)}
              placeholder="sinais-trabalho-parto"
            />
          </Field>

          {/* Editor de markdown — sempre presente, exceto pode ser opcional pra quiz puro */}
          <Field
            label="Conteúdo (markdown)"
            hint={
              section.type === 'quiz'
                ? 'Texto introdutório do quiz. As perguntas vão na estrutura JSON ao lado.'
                : section.type === 'checklist'
                ? 'Texto introdutório. Os itens vão na estrutura JSON ao lado.'
                : 'Caixas de destaque: :::ciencia, :::mito, :::alerta, :::yaya'
            }
          >
            <TiptapEditor
              initialContent={section.content_md ?? ''}
              onChange={v => updateField('content_md', v)}
            />
          </Field>

          {/* JSON editor pra quiz/checklist */}
          {(section.type === 'quiz' || section.type === 'checklist') && (
            <Field
              label={section.type === 'quiz' ? 'Estrutura do quiz (JSON)' : 'Itens do checklist (JSON)'}
              hint={
                section.type === 'quiz'
                  ? 'Formato: {questions:[{id,text,options:[{value,label}]}], results:{a:{title,description,recommended_sections}}}'
                  : 'Formato: {items:[{id,text,required}]}'
              }
            >
              <textarea
                value={dataJson}
                onChange={e => setDataJson(e.target.value)}
                rows={16}
                className="rounded-md p-3 text-xs border outline-none resize-y"
                style={{
                  background: 'rgba(13,10,39,0.7)',
                  borderColor: jsonError ? '#ff7a90' : 'rgba(183,159,255,0.2)',
                  color: '#e7e2ff',
                  fontFamily: 'monospace',
                  lineHeight: 1.5,
                }}
              />
              {jsonError && (
                <span className="text-xs" style={{ color: '#ff7a90' }}>{jsonError}</span>
              )}
            </Field>
          )}
        </div>

        {/* ── Coluna 2: Sidebar de configuração ──────────────── */}
        <div className="flex flex-col gap-4">
          <Sidebar title="Tipo">
            <Select
              value={section.type ?? 'linear'}
              onChange={v => updateField('type', v as GuideSectionType)}
              options={[
                { value: 'part',      label: 'Parte (chapter opener)' },
                { value: 'linear',    label: 'Leitura' },
                { value: 'quiz',      label: 'Quiz' },
                { value: 'checklist', label: 'Checklist' },
              ]}
            />
            <p className="text-xs mt-2" style={{ color: 'rgba(231,226,255,0.5)' }}>
              {section.type === 'part' && 'Abre uma parte do guia com capa grande e título destacado.'}
              {section.type === 'linear' && 'Conteúdo de leitura padrão (markdown rico com caixas).'}
              {section.type === 'quiz' && 'Quiz interativo fullscreen — perguntas + resultados na estrutura JSON.'}
              {section.type === 'checklist' && 'Lista marcável pelo leitor com itens obrigatórios e opcionais.'}
            </p>
          </Sidebar>

          {section.type === 'part' && (
            <Sidebar title="Capa da parte">
              <Input
                value={section.cover_image_url ?? ''}
                onChange={v => updateField('cover_image_url', v)}
                placeholder="https://..."
              />
              {section.cover_image_url && (
                <img
                  src={section.cover_image_url}
                  alt="Capa"
                  className="rounded-md mt-2 max-w-full"
                  style={{ maxHeight: 120, border: '1px solid rgba(183,159,255,0.15)' }}
                />
              )}
            </Sidebar>
          )}

          <Sidebar title="Tempo de leitura">
            <Input
              type="number"
              value={String(section.estimated_minutes ?? '')}
              onChange={v => updateField('estimated_minutes', v ? Number(v) : null)}
              placeholder="ex: 5"
            />
            <p className="text-xs mt-1" style={{ color: 'rgba(231,226,255,0.5)' }}>
              Em minutos. Aparece na sidebar do leitor.
            </p>
          </Sidebar>

          <Sidebar title="Visibilidade">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!section.is_preview}
                onChange={e => updateField('is_preview', e.target.checked)}
                style={{ accentColor: '#b79fff' }}
              />
              <span className="text-sm" style={{ color: '#e7e2ff' }}>
                Aparece como amostra grátis na landing
              </span>
            </label>
          </Sidebar>

          <Sidebar title={GUIDE_SECTION_TYPE_LABEL[section.type ?? 'linear']}>
            <p className="text-xs" style={{ color: 'rgba(231,226,255,0.5)', lineHeight: 1.6 }}>
              {section.type === 'part' && 'Esta seção será renderizada como capa de capítulo no leitor — imagem grande, título serif XL, navegação "Comece a ler".'}
              {section.type === 'linear' && 'Markdown completo com suporte a caixas de destaque (:::ciencia, :::mito, :::alerta, :::yaya), pull quotes (> >), drop cap automático no primeiro parágrafo.'}
              {section.type === 'quiz' && 'O leitor vê um botão "Iniciar quiz" e a experiência abre fullscreen com 1 pergunta por tela.'}
              {section.type === 'checklist' && 'Itens marcáveis com auto-save de progresso. "required" marca itens essenciais.'}
            </p>
          </Sidebar>
        </div>
      </div>
    </div>
  )
}

// ── Subcomponentes ─────────────────────────────────────────────────────────

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
  value, onChange, placeholder, type = 'text',
}: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
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
      className="rounded-md px-3 py-2 text-sm border outline-none cursor-pointer w-full"
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

function Sidebar({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-md p-4 border"
      style={{ borderColor: 'rgba(183,159,255,0.15)', background: 'rgba(183,159,255,0.03)' }}
    >
      <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'rgba(231,226,255,0.7)' }}>
        {title}
      </h3>
      {children}
    </div>
  )
}
