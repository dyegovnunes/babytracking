import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import TiptapEditor from '../components/PostEditor/TiptapEditor'

interface AffiliateProduct {
  tipo: string
  nome: string
  asin: string
  url: string
}

interface PostData {
  slug: string
  title: string
  meta_description: string
  content_md: string
  category: string
  audience: string
  status: string
  pillar: string
  role: string
  target_week_start: number | string
  target_week_end: number | string
  image_url: string
  mid_image_url: string
  published_at: string | null
  post_number: number | string
  affiliate_products: AffiliateProduct[]
}

const EMPTY_POST: PostData = {
  slug: '', title: '', meta_description: '', content_md: '', category: 'alimentacao',
  audience: 'parent', status: 'draft', pillar: '', role: 'cluster',
  target_week_start: '', target_week_end: '', image_url: '', mid_image_url: '',
  published_at: null, post_number: '', affiliate_products: [],
}

const CATEGORIES = [
  'alimentacao', 'amamentacao', 'sono', 'desenvolvimento',
  'saude', 'rotina', 'marcos', 'gestacao', 'seguranca',
]
const CATEGORY_LABEL: Record<string, string> = {
  alimentacao: 'Alimentação', amamentacao: 'Amamentação', sono: 'Sono',
  desenvolvimento: 'Desenvolvimento', saude: 'Saúde', rotina: 'Rotina',
  marcos: 'Marcos', gestacao: 'Gestação', seguranca: 'Segurança',
}
const AFFILIATE_TIPOS = ['amamentação', 'sono', 'saúde', 'transporte', 'alimentação', 'higiene', 'brinquedo', 'outro']

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export default function AdminPostEditorPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const isNew = !slug || slug === 'new'

  const [post, setPost] = useState<PostData>(EMPTY_POST)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [showAffiliateModal, setShowAffiliateModal] = useState(false)
  const [editingAffiliate, setEditingAffiliate] = useState<AffiliateProduct | null>(null)
  const [editingAffiliateIdx, setEditingAffiliateIdx] = useState<number | null>(null)

  useEffect(() => {
    if (isNew) return
    supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .single()
      .then(({ data }) => {
        if (data) {
          setPost({
            ...EMPTY_POST,
            ...data,
            affiliate_products: data.affiliate_products ?? [],
            target_week_start: data.target_week_start ?? '',
            target_week_end: data.target_week_end ?? '',
            post_number: data.post_number ?? '',
            image_url: data.image_url ?? '',
            mid_image_url: data.mid_image_url ?? '',
            meta_description: data.meta_description ?? '',
            pillar: data.pillar ?? '',
            role: data.role ?? 'cluster',
          })
        }
        setLoading(false)
      })
  }, [slug])

  const handleContentChange = useCallback((md: string) => {
    setPost(p => ({ ...p, content_md: md }))
  }, [])

  function set(field: keyof PostData, value: unknown) {
    setPost(p => ({ ...p, [field]: value }))
    if (field === 'title' && isNew) {
      setPost(p => ({ ...p, title: value as string, slug: slugify(value as string) }))
    }
  }

  async function save(publish?: boolean) {
    setSaving(true)
    setSavedMsg('')

    const payload: Record<string, unknown> = {
      title: post.title,
      slug: post.slug,
      meta_description: post.meta_description || null,
      content_md: post.content_md,
      category: post.category,
      audience: post.audience,
      status: publish ? 'published' : post.status,
      pillar: post.pillar || null,
      role: post.role,
      target_week_start: post.target_week_start !== '' ? Number(post.target_week_start) : null,
      target_week_end: post.target_week_end !== '' ? Number(post.target_week_end) : null,
      image_url: post.image_url || null,
      mid_image_url: post.mid_image_url || null,
      post_number: post.post_number !== '' ? Number(post.post_number) : null,
      affiliate_products: post.affiliate_products,
    }

    if (publish && !post.published_at) {
      payload.published_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('blog_posts')
      .upsert(payload, { onConflict: 'slug' })

    if (!error) {
      setSavedMsg(publish ? 'Publicado!' : 'Salvo!')
      if (publish) setPost(p => ({ ...p, status: 'published', published_at: payload.published_at as string ?? p.published_at }))
      if (isNew) navigate(`/posts/${post.slug}`, { replace: true })
      setTimeout(() => setSavedMsg(''), 3000)
    } else {
      setSavedMsg('Erro ao salvar: ' + error.message)
    }
    setSaving(false)
  }

  // Afiliados
  function openAddAffiliate() {
    setEditingAffiliate({ tipo: 'amamentação', nome: '', asin: '', url: '' })
    setEditingAffiliateIdx(null)
    setShowAffiliateModal(true)
  }

  function openEditAffiliate(idx: number) {
    setEditingAffiliate({ ...post.affiliate_products[idx] })
    setEditingAffiliateIdx(idx)
    setShowAffiliateModal(true)
  }

  function saveAffiliate() {
    if (!editingAffiliate) return
    const a = { ...editingAffiliate }
    if (!a.url && a.asin) a.url = `https://www.amazon.com.br/dp/${a.asin}?tag=yaya090-20`
    setPost(p => {
      const products = [...p.affiliate_products]
      if (editingAffiliateIdx !== null) products[editingAffiliateIdx] = a
      else products.push(a)
      return { ...p, affiliate_products: products }
    })
    setShowAffiliateModal(false)
  }

  function removeAffiliate(idx: number) {
    setPost(p => ({ ...p, affiliate_products: p.affiliate_products.filter((_, i) => i !== idx) }))
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-t-[#b79fff] border-[#b79fff]/20 rounded-full animate-spin" />
      </div>
    )
  }

  const inputStyle = {
    background: 'rgba(183,159,255,0.06)',
    border: '1px solid rgba(183,159,255,0.18)',
    color: '#e7e2ff',
    borderRadius: 6,
    padding: '8px 12px',
    fontSize: 14,
    outline: 'none',
    width: '100%',
  }
  const labelStyle = { color: 'rgba(231,226,255,0.5)', fontSize: 12, marginBottom: 4, display: 'block' }
  const sectionStyle = {
    background: 'rgba(183,159,255,0.04)',
    border: '1px solid rgba(183,159,255,0.12)',
    borderRadius: 10,
    padding: '1rem',
    marginBottom: '1rem',
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button
          onClick={() => navigate('/posts')}
          className="flex items-center gap-1 text-sm cursor-pointer bg-transparent border-none opacity-50 hover:opacity-100 transition-opacity"
          style={{ color: '#e7e2ff' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
          Posts
        </button>
        <h1
          className="text-xl font-bold flex-1"
          style={{ fontFamily: 'Manrope, sans-serif', color: '#e7e2ff' }}
        >
          {isNew ? 'Novo post' : post.title || 'Editar post'}
        </h1>

        {savedMsg && (
          <span
            className="text-sm px-3 py-1 rounded-full"
            style={{ background: 'rgba(183,159,255,0.15)', color: '#b79fff' }}
          >
            {savedMsg}
          </span>
        )}

        <button
          onClick={() => save(false)}
          disabled={saving}
          className="px-4 py-2 rounded-md text-sm cursor-pointer border transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: 'transparent', borderColor: 'rgba(183,159,255,0.3)', color: '#b79fff' }}
        >
          {saving ? '…' : 'Salvar rascunho'}
        </button>
        <button
          onClick={() => save(true)}
          disabled={saving}
          className="px-4 py-2 rounded-md text-sm font-semibold cursor-pointer border-none transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: '#b79fff', color: '#0d0a27' }}
        >
          {saving ? '…' : post.status === 'published' ? 'Salvar publicado' : 'Publicar'}
        </button>
      </div>

      {/* Layout: editor + sidebar */}
      <div className="flex gap-6 items-start flex-col lg:flex-row">
        {/* Editor (esquerda) */}
        <div className="flex-1 min-w-0">
          <div className="mb-4">
            <input
              type="text"
              value={post.title}
              onChange={e => set('title', e.target.value)}
              placeholder="Título do post"
              className="text-2xl font-bold w-full bg-transparent border-none outline-none"
              style={{ color: '#e7e2ff', fontFamily: 'Manrope, sans-serif' }}
            />
          </div>
          <TiptapEditor
            initialContent={post.content_md}
            onChange={handleContentChange}
          />
        </div>

        {/* Sidebar (direita) */}
        <div style={{ width: '100%', maxWidth: 300, flexShrink: 0 }}>
          {/* Publicação */}
          <div style={sectionStyle}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold" style={{ color: 'rgba(231,226,255,0.6)' }}>Publicação</span>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: post.status === 'published' ? 'rgba(183,159,255,0.15)' : 'rgba(231,226,255,0.07)',
                  color: post.status === 'published' ? '#b79fff' : 'rgba(231,226,255,0.4)',
                }}
              >
                {post.status === 'published' ? '✓ Publicado' : '✎ Rascunho'}
              </span>
            </div>
            <div className="mb-3">
              <label style={labelStyle}>Slug (URL)</label>
              <input
                type="text"
                value={post.slug}
                onChange={e => set('slug', slugify(e.target.value))}
                style={inputStyle}
                placeholder="meu-post"
              />
            </div>
            <div>
              <label style={labelStyle}>Número do post</label>
              <input
                type="number"
                value={post.post_number}
                onChange={e => set('post_number', e.target.value)}
                style={inputStyle}
                placeholder="1"
              />
            </div>
          </div>

          {/* Meta description */}
          <div style={sectionStyle}>
            <label style={labelStyle}>
              Meta description ({post.meta_description.length}/160)
            </label>
            <textarea
              value={post.meta_description}
              onChange={e => set('meta_description', e.target.value)}
              maxLength={160}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
              placeholder="Descrição para SEO…"
            />
          </div>

          {/* Categorização */}
          <div style={sectionStyle}>
            <p className="text-xs font-semibold mb-3" style={{ color: 'rgba(231,226,255,0.6)' }}>Categorização</p>

            <div className="mb-3">
              <label style={labelStyle}>Categoria</label>
              <select
                value={post.category}
                onChange={e => set('category', e.target.value)}
                style={{ ...inputStyle, appearance: 'none' }}
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c} style={{ background: '#0d0a27' }}>{CATEGORY_LABEL[c]}</option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label style={labelStyle}>Audiência</label>
              <select
                value={post.audience}
                onChange={e => set('audience', e.target.value)}
                style={{ ...inputStyle, appearance: 'none' }}
              >
                <option value="parent" style={{ background: '#0d0a27' }}>Pais</option>
                <option value="gestante" style={{ background: '#0d0a27' }}>Gestante</option>
                <option value="both" style={{ background: '#0d0a27' }}>Ambos</option>
              </select>
            </div>

            <div className="mb-3">
              <label style={labelStyle}>Role</label>
              <select
                value={post.role}
                onChange={e => set('role', e.target.value)}
                style={{ ...inputStyle, appearance: 'none' }}
              >
                <option value="cluster" style={{ background: '#0d0a27' }}>Cluster</option>
                <option value="pilar" style={{ background: '#0d0a27' }}>Pilar</option>
              </select>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label style={labelStyle}>Semana início</label>
                <input
                  type="number"
                  value={post.target_week_start}
                  onChange={e => set('target_week_start', e.target.value)}
                  style={inputStyle}
                  placeholder="0"
                />
              </div>
              <div className="flex-1">
                <label style={labelStyle}>Semana fim</label>
                <input
                  type="number"
                  value={post.target_week_end}
                  onChange={e => set('target_week_end', e.target.value)}
                  style={inputStyle}
                  placeholder="40"
                />
              </div>
            </div>
          </div>

          {/* Imagens */}
          <div style={sectionStyle}>
            <p className="text-xs font-semibold mb-3" style={{ color: 'rgba(231,226,255,0.6)' }}>Imagens</p>
            <div className="mb-3">
              <label style={labelStyle}>Hero (URL)</label>
              <input type="url" value={post.image_url} onChange={e => set('image_url', e.target.value)} style={inputStyle} placeholder="https://…" />
              {post.image_url && (
                <img src={post.image_url} alt="" className="mt-2 rounded-md w-full object-cover" style={{ maxHeight: 100 }} onError={e => (e.currentTarget.style.display = 'none')} />
              )}
            </div>
            <div>
              <label style={labelStyle}>Mid (URL)</label>
              <input type="url" value={post.mid_image_url} onChange={e => set('mid_image_url', e.target.value)} style={inputStyle} placeholder="https://…" />
            </div>
          </div>

          {/* Produtos afiliados */}
          <div style={sectionStyle}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold" style={{ color: 'rgba(231,226,255,0.6)' }}>
                Afiliados ({post.affiliate_products.length})
              </p>
              <button
                onClick={openAddAffiliate}
                className="text-xs flex items-center gap-1 cursor-pointer bg-transparent border-none"
                style={{ color: '#b79fff' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>
                Adicionar
              </button>
            </div>

            {post.affiliate_products.length === 0 && (
              <p className="text-xs" style={{ color: 'rgba(231,226,255,0.25)' }}>Nenhum produto ainda.</p>
            )}

            <div className="flex flex-col gap-2">
              {post.affiliate_products.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-2 rounded-md"
                  style={{ background: 'rgba(183,159,255,0.06)', border: '1px solid rgba(183,159,255,0.1)' }}
                >
                  <img
                    src={`https://m.media-amazon.com/images/P/${p.asin}.01._SX60_QL70_.jpg`}
                    alt=""
                    className="rounded flex-shrink-0"
                    style={{ width: 36, height: 36, objectFit: 'contain', background: '#fff' }}
                    onError={e => (e.currentTarget.style.opacity = '0.2')}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate" style={{ color: '#e7e2ff' }}>{p.nome || p.asin}</p>
                    <p className="text-xs" style={{ color: 'rgba(231,226,255,0.35)' }}>{p.tipo}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditAffiliate(i)}
                      className="cursor-pointer bg-transparent border-none opacity-50 hover:opacity-100"
                      title="Editar"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#e7e2ff' }}>edit</span>
                    </button>
                    <button
                      onClick={() => removeAffiliate(i)}
                      className="cursor-pointer bg-transparent border-none opacity-50 hover:opacity-100"
                      title="Remover"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#ff96b9' }}>delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de afiliado */}
      {showAffiliateModal && editingAffiliate && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 z-50"
          style={{ background: 'rgba(13,10,39,0.8)', backdropFilter: 'blur(8px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowAffiliateModal(false) }}
        >
          <div
            className="w-full max-w-sm rounded-xl p-6"
            style={{ background: '#13102e', border: '1px solid rgba(183,159,255,0.2)' }}
          >
            <h3 className="text-base font-bold mb-4" style={{ color: '#e7e2ff', fontFamily: 'Manrope, sans-serif' }}>
              {editingAffiliateIdx !== null ? 'Editar produto' : 'Adicionar produto'}
            </h3>

            {/* Preview do ASIN */}
            {editingAffiliate.asin && (
              <div className="flex justify-center mb-4">
                <img
                  src={`https://m.media-amazon.com/images/P/${editingAffiliate.asin}.01._SX120_QL70_.jpg`}
                  alt=""
                  style={{ height: 80, objectFit: 'contain', background: '#fff', borderRadius: 6, padding: 4 }}
                  onError={e => (e.currentTarget.style.display = 'none')}
                />
              </div>
            )}

            <div className="flex flex-col gap-3">
              <div>
                <label style={labelStyle}>ASIN</label>
                <input
                  type="text"
                  value={editingAffiliate.asin}
                  onChange={e => setEditingAffiliate(a => ({ ...a!, asin: e.target.value.trim() }))}
                  style={inputStyle}
                  placeholder="B0XXXXXXXX"
                />
              </div>
              <div>
                <label style={labelStyle}>Nome do produto</label>
                <input
                  type="text"
                  value={editingAffiliate.nome}
                  onChange={e => setEditingAffiliate(a => ({ ...a!, nome: e.target.value }))}
                  style={inputStyle}
                  placeholder="Nome do produto"
                />
              </div>
              <div>
                <label style={labelStyle}>Tipo</label>
                <select
                  value={editingAffiliate.tipo}
                  onChange={e => setEditingAffiliate(a => ({ ...a!, tipo: e.target.value }))}
                  style={{ ...inputStyle, appearance: 'none' }}
                >
                  {AFFILIATE_TIPOS.map(t => (
                    <option key={t} value={t} style={{ background: '#0d0a27' }}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>URL (gerada automaticamente se vazia)</label>
                <input
                  type="url"
                  value={editingAffiliate.url}
                  onChange={e => setEditingAffiliate(a => ({ ...a!, url: e.target.value }))}
                  style={inputStyle}
                  placeholder="https://amazon.com.br/dp/…"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowAffiliateModal(false)}
                className="flex-1 py-2 rounded-md text-sm cursor-pointer border"
                style={{ background: 'transparent', borderColor: 'rgba(183,159,255,0.2)', color: 'rgba(231,226,255,0.6)' }}
              >
                Cancelar
              </button>
              <button
                onClick={saveAffiliate}
                disabled={!editingAffiliate.asin || !editingAffiliate.nome}
                className="flex-1 py-2 rounded-md text-sm font-semibold cursor-pointer border-none disabled:opacity-50"
                style={{ background: '#b79fff', color: '#0d0a27' }}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
