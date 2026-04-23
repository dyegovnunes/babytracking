import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface Stats {
  total: number
  published: number
  drafts: number
  categories: Record<string, number>
  recentFeedback: { post_slug: string; sentiment: string; created_at: string }[]
  helpfulCount: number
  notHelpfulCount: number
}

const CATEGORY_LABEL: Record<string, string> = {
  alimentacao: 'Alimentação',
  amamentacao: 'Amamentação',
  sono: 'Sono',
  desenvolvimento: 'Desenvolvimento',
  saude: 'Saúde',
  rotina: 'Rotina',
  marcos: 'Marcos',
  gestacao: 'Gestação',
  seguranca: 'Segurança',
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [postsRes, feedbackRes] = await Promise.all([
        supabase.from('blog_posts').select('category, status'),
        supabase
          .from('content_feedback')
          .select('post_slug, sentiment, created_at')
          .order('created_at', { ascending: false })
          .limit(10),
      ])

      const posts = postsRes.data ?? []
      const feedback = feedbackRes.data ?? []

      const categories: Record<string, number> = {}
      let published = 0, drafts = 0
      for (const p of posts) {
        if (p.status === 'published') published++
        else drafts++
        categories[p.category] = (categories[p.category] ?? 0) + 1
      }

      const helpfulCount = feedback.filter(f => f.sentiment === 'helpful').length
      const notHelpfulCount = feedback.filter(f => f.sentiment === 'not_helpful').length

      setStats({ total: posts.length, published, drafts, categories, recentFeedback: feedback, helpfulCount, notHelpfulCount })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <Loader />

  const s = stats!

  const cardStyle = {
    background: 'rgba(183,159,255,0.06)',
    border: '1px solid rgba(183,159,255,0.15)',
    borderRadius: 10,
    padding: '1.25rem',
  }

  return (
    <div>
      <h1
        className="text-2xl font-bold mb-6"
        style={{ fontFamily: 'Manrope, sans-serif', color: '#e7e2ff' }}
      >
        Dashboard
      </h1>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total de posts', value: s.total, icon: 'article' },
          { label: 'Publicados', value: s.published, icon: 'check_circle', color: '#b79fff' },
          { label: 'Rascunhos', value: s.drafts, icon: 'edit_note', color: 'rgba(231,226,255,0.4)' },
          { label: 'Feedbacks úteis', value: s.helpfulCount, icon: 'thumb_up', color: '#b79fff' },
        ].map(card => (
          <div key={card.label} style={cardStyle}>
            <div className="flex items-center gap-2 mb-2">
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 18, color: card.color ?? 'rgba(231,226,255,0.5)' }}
              >
                {card.icon}
              </span>
              <span className="text-xs" style={{ color: 'rgba(231,226,255,0.5)' }}>{card.label}</span>
            </div>
            <p
              className="text-3xl font-bold"
              style={{ fontFamily: 'Manrope, sans-serif', color: card.color ?? '#e7e2ff' }}
            >
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Posts por categoria */}
        <div style={cardStyle}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'rgba(231,226,255,0.6)' }}>
            Posts por categoria
          </h2>
          <div className="flex flex-col gap-2">
            {Object.entries(s.categories)
              .sort(([, a], [, b]) => b - a)
              .map(([cat, count]) => (
                <div key={cat} className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'rgba(231,226,255,0.7)' }}>
                    {CATEGORY_LABEL[cat] ?? cat}
                  </span>
                  <span
                    className="text-sm font-semibold px-2 py-0.5 rounded"
                    style={{ background: 'rgba(183,159,255,0.15)', color: '#b79fff' }}
                  >
                    {count}
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Feedback recente */}
        <div style={cardStyle}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'rgba(231,226,255,0.6)' }}>
            Feedbacks recentes
          </h2>
          {s.recentFeedback.length === 0 ? (
            <p className="text-sm" style={{ color: 'rgba(231,226,255,0.3)' }}>Nenhum feedback ainda.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {s.recentFeedback.map((f, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <span className="text-xs truncate" style={{ color: 'rgba(231,226,255,0.6)', maxWidth: 200 }}>
                    {f.post_slug}
                  </span>
                  <span style={{ color: f.sentiment === 'helpful' ? '#b79fff' : '#ff96b9', fontSize: 16 }}>
                    {f.sentiment === 'helpful' ? '👍' : '👎'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Loader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-t-[#b79fff] border-[#b79fff]/20 rounded-full animate-spin" />
    </div>
  )
}
