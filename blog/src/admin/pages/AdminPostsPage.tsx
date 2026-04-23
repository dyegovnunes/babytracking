import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

interface PostRow {
  slug: string
  title: string
  category: string
  audience: string
  status: string
  published_at: string | null
  post_number: number | null
}

const CATEGORY_LABEL: Record<string, string> = {
  alimentacao: 'Alimentação', amamentacao: 'Amamentação', sono: 'Sono',
  desenvolvimento: 'Desenvolvimento', saude: 'Saúde', rotina: 'Rotina',
  marcos: 'Marcos', gestacao: 'Gestação', seguranca: 'Segurança',
}

const AUDIENCE_LABEL: Record<string, string> = {
  gestante: 'Gestante', parent: 'Pais', both: 'Ambos',
}

export default function AdminPostsPage() {
  const navigate = useNavigate()
  const [posts, setPosts] = useState<PostRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  async function loadPosts() {
    setLoading(true)
    const { data } = await supabase
      .from('blog_posts')
      .select('slug, title, category, audience, status, published_at, post_number')
      .order('post_number', { ascending: true })
    setPosts(data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadPosts() }, [])

  async function toggleStatus(post: PostRow) {
    setActionLoading(post.slug)
    const newStatus = post.status === 'published' ? 'draft' : 'published'
    const update: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'published' && !post.published_at) update.published_at = new Date().toISOString()
    await supabase.from('blog_posts').update(update).eq('slug', post.slug)
    await loadPosts()
    setActionLoading(null)
  }

  async function deletePost(post: PostRow) {
    if (!confirm(`Excluir "${post.title}"? Esta ação não pode ser desfeita.`)) return
    setActionLoading(post.slug)
    await supabase.from('blog_posts').delete().eq('slug', post.slug)
    await loadPosts()
    setActionLoading(null)
  }

  const filtered = posts.filter(p => {
    if (filter === 'published' && p.status !== 'published') return false
    if (filter === 'draft' && p.status === 'published') return false
    if (categoryFilter && p.category !== categoryFilter) return false
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const categories = [...new Set(posts.map(p => p.category))].sort()

  const btnStyle = (active: boolean) => ({
    padding: '6px 14px',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    border: 'none',
    background: active ? 'rgba(183,159,255,0.2)' : 'transparent',
    color: active ? '#b79fff' : 'rgba(231,226,255,0.5)',
    transition: 'all 0.15s',
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Manrope, sans-serif', color: '#e7e2ff' }}>
          Posts
        </h1>
        <button
          onClick={() => navigate('/posts/new')}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold cursor-pointer border-none transition-opacity hover:opacity-90"
          style={{ background: '#b79fff', color: '#0d0a27' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
          Novo post
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex rounded-md overflow-hidden border" style={{ borderColor: 'rgba(183,159,255,0.15)' }}>
          {(['all', 'published', 'draft'] as const).map(f => (
            <button key={f} style={btnStyle(filter === f)} onClick={() => setFilter(f)}>
              {f === 'all' ? 'Todos' : f === 'published' ? 'Publicados' : 'Rascunhos'}
            </button>
          ))}
        </div>

        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="px-3 py-1.5 rounded-md text-sm border outline-none"
          style={{
            background: 'rgba(183,159,255,0.06)',
            borderColor: 'rgba(183,159,255,0.15)',
            color: 'rgba(231,226,255,0.8)',
          }}
        >
          <option value="">Todas as categorias</option>
          {categories.map(c => (
            <option key={c} value={c}>{CATEGORY_LABEL[c] ?? c}</option>
          ))}
        </select>

        <input
          type="search"
          placeholder="Buscar por título…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-1.5 rounded-md text-sm border outline-none flex-1 min-w-[180px]"
          style={{
            background: 'rgba(183,159,255,0.06)',
            borderColor: 'rgba(183,159,255,0.15)',
            color: '#e7e2ff',
          }}
        />
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-t-[#b79fff] border-[#b79fff]/20 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(183,159,255,0.15)' }}>
          {/* Cabeçalho da tabela */}
          <div
            className="hidden md:grid text-xs font-semibold px-4 py-3"
            style={{
              gridTemplateColumns: '40px 1fr 130px 90px 110px 130px',
              background: 'rgba(183,159,255,0.06)',
              color: 'rgba(231,226,255,0.4)',
              borderBottom: '1px solid rgba(183,159,255,0.1)',
            }}
          >
            <span>#</span>
            <span>Título</span>
            <span>Categoria</span>
            <span>Audiência</span>
            <span>Status</span>
            <span className="text-right">Ações</span>
          </div>

          {filtered.length === 0 && (
            <div className="px-4 py-10 text-center text-sm" style={{ color: 'rgba(231,226,255,0.3)' }}>
              Nenhum post encontrado.
            </div>
          )}

          {filtered.map((post, i) => {
            const isLoading = actionLoading === post.slug
            const isPublished = post.status === 'published'
            return (
              <div
                key={post.slug}
                className="flex md:grid items-start md:items-center gap-3 px-4 py-3 flex-col md:flex-row"
                style={{
                  gridTemplateColumns: '40px 1fr 130px 90px 110px 130px',
                  borderBottom: i < filtered.length - 1 ? '1px solid rgba(183,159,255,0.07)' : 'none',
                  background: 'transparent',
                }}
              >
                {/* # */}
                <span className="text-sm hidden md:block" style={{ color: 'rgba(231,226,255,0.3)' }}>
                  {post.post_number != null ? String(post.post_number).padStart(2, '0') : '—'}
                </span>

                {/* Título */}
                <button
                  onClick={() => navigate(`/posts/${post.slug}`)}
                  className="text-left bg-transparent border-none cursor-pointer p-0 hover:underline decoration-[#b79fff]"
                  style={{ color: '#e7e2ff', fontWeight: 500, fontSize: 14 }}
                >
                  {post.title}
                </button>

                {/* Categoria */}
                <span className="text-xs" style={{ color: 'rgba(231,226,255,0.5)' }}>
                  {CATEGORY_LABEL[post.category] ?? post.category}
                </span>

                {/* Audiência */}
                <span className="text-xs" style={{ color: 'rgba(231,226,255,0.5)' }}>
                  {AUDIENCE_LABEL[post.audience] ?? post.audience}
                </span>

                {/* Status */}
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    background: isPublished ? 'rgba(183,159,255,0.15)' : 'rgba(231,226,255,0.08)',
                    color: isPublished ? '#b79fff' : 'rgba(231,226,255,0.4)',
                  }}
                >
                  {isPublished ? '✓ Publicado' : '✎ Rascunho'}
                </span>

                {/* Ações */}
                <div className="flex items-center gap-2 md:justify-end">
                  <button
                    onClick={() => navigate(`/posts/${post.slug}`)}
                    className="text-xs px-2.5 py-1 rounded cursor-pointer border transition-all hover:opacity-80"
                    style={{
                      background: 'transparent',
                      borderColor: 'rgba(183,159,255,0.25)',
                      color: '#b79fff',
                    }}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => toggleStatus(post)}
                    disabled={isLoading}
                    className="text-xs px-2.5 py-1 rounded cursor-pointer border transition-all hover:opacity-80 disabled:opacity-40"
                    style={{
                      background: 'transparent',
                      borderColor: 'rgba(231,226,255,0.15)',
                      color: 'rgba(231,226,255,0.5)',
                    }}
                  >
                    {isLoading ? '…' : isPublished ? 'Despublicar' : 'Publicar'}
                  </button>
                  <button
                    onClick={() => deletePost(post)}
                    disabled={isLoading}
                    className="text-xs px-2 py-1 rounded cursor-pointer border transition-all hover:opacity-80 disabled:opacity-40"
                    style={{
                      background: 'transparent',
                      borderColor: 'rgba(255,150,185,0.2)',
                      color: 'rgba(255,150,185,0.6)',
                    }}
                    title="Excluir post"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14, lineHeight: 1 }}>delete</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-xs mt-3" style={{ color: 'rgba(231,226,255,0.25)' }}>
        {filtered.length} de {posts.length} posts
      </p>
    </div>
  )
}
