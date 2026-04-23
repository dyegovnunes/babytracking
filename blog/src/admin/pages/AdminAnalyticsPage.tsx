import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface FeedbackRow {
  post_slug: string
  helpful: number
  not_helpful: number
  total: number
}

interface PostStats {
  published: number
  draft: number
  total: number
}

const cardStyle = {
  background: 'rgba(183,159,255,0.06)',
  border: '1px solid rgba(183,159,255,0.15)',
  borderRadius: 10,
  padding: '1.25rem',
}

function SummaryCard({ label, value, icon, sub }: { label: string; value: string; icon: string; sub?: string }) {
  return (
    <div style={cardStyle}>
      <div className="flex items-center gap-2 mb-2">
        <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'rgba(183,159,255,0.6)' }}>{icon}</span>
        <span className="text-xs" style={{ color: 'rgba(231,226,255,0.5)' }}>{label}</span>
      </div>
      <p className="text-3xl font-bold" style={{ fontFamily: 'Manrope, sans-serif', color: '#e7e2ff' }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: 'rgba(231,226,255,0.35)' }}>{sub}</p>}
    </div>
  )
}

export default function AdminAnalyticsPage() {
  const [feedback, setFeedback] = useState<FeedbackRow[]>([])
  const [postStats, setPostStats] = useState<PostStats>({ published: 0, draft: 0, total: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [fbRes, postsRes] = await Promise.all([
        supabase.from('content_feedback').select('post_slug, sentiment'),
        supabase.from('blog_posts').select('status'),
      ])

      // Agrupa feedback por post
      const map: Record<string, FeedbackRow> = {}
      for (const f of (fbRes.data ?? [])) {
        if (!map[f.post_slug]) map[f.post_slug] = { post_slug: f.post_slug, helpful: 0, not_helpful: 0, total: 0 }
        if (f.sentiment === 'helpful') map[f.post_slug].helpful++
        else map[f.post_slug].not_helpful++
        map[f.post_slug].total++
      }
      const feedbackRows = Object.values(map).sort((a, b) => b.total - a.total)
      setFeedback(feedbackRows)

      // Stats de posts
      const posts = postsRes.data ?? []
      const published = posts.filter(p => p.status === 'published').length
      const draft = posts.filter(p => p.status !== 'published').length
      setPostStats({ published, draft, total: posts.length })

      setLoading(false)
    }
    load()
  }, [])

  const totalFeedback = feedback.reduce((s, f) => s + f.total, 0)
  const totalHelpful = feedback.reduce((s, f) => s + f.helpful, 0)
  const helpfulPct = totalFeedback > 0 ? Math.round((totalHelpful / totalFeedback) * 100) : 0
  const maxFeedback = Math.max(...feedback.map(f => f.total), 1)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-t-[#b79fff] border-[#b79fff]/20 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Manrope, sans-serif', color: '#e7e2ff' }}>
          Analytics
        </h1>
        <a
          href={`https://analytics.google.com/analytics/web/#/p534097942/reports/reportinghub`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-opacity hover:opacity-80 no-underline"
          style={{ background: 'rgba(183,159,255,0.15)', color: '#b79fff', border: '1px solid rgba(183,159,255,0.25)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>open_in_new</span>
          Abrir no GA4
        </a>
      </div>

      {/* Cards de resumo (dados do Supabase) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <SummaryCard
          label="Posts publicados"
          value={String(postStats.published)}
          icon="article"
          sub={`${postStats.draft} rascunho${postStats.draft !== 1 ? 's' : ''}`}
        />
        <SummaryCard
          label="Total de posts"
          value={String(postStats.total)}
          icon="library_books"
          sub="no blog"
        />
        <SummaryCard
          label="Feedbacks recebidos"
          value={String(totalFeedback)}
          icon="thumb_up"
          sub={`de ${feedback.length} post${feedback.length !== 1 ? 's' : ''}`}
        />
        <SummaryCard
          label="Taxa de utilidade"
          value={`${helpfulPct}%`}
          icon="sentiment_satisfied"
          sub="posts marcados úteis"
        />
      </div>

      {/* GA4 callout */}
      <div
        className="flex items-center gap-4 rounded-xl p-4 mb-8"
        style={{ background: 'rgba(183,159,255,0.06)', border: '1px solid rgba(183,159,255,0.12)' }}
      >
        <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: 28, color: 'rgba(183,159,255,0.5)' }}>analytics</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold mb-0.5" style={{ color: '#e7e2ff' }}>
            Tráfego, fontes e pageviews no Google Analytics
          </p>
          <p className="text-xs" style={{ color: 'rgba(231,226,255,0.45)', lineHeight: 1.6 }}>
            Visualizações diárias, usuários únicos, canais de aquisição e eventos (cliques em afiliados e CTAs) estão disponíveis direto no GA4.
          </p>
        </div>
        <a
          href={`https://analytics.google.com/analytics/web/#/p534097942/reports/reportinghub`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium no-underline transition-opacity hover:opacity-80"
          style={{ background: 'rgba(183,159,255,0.2)', color: '#b79fff' }}
        >
          Ver relatórios
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
        </a>
      </div>

      {/* Feedback por post */}
      {feedback.length > 0 ? (
        <div className="rounded-xl p-5" style={cardStyle}>
          <p className="text-sm font-semibold mb-5" style={{ color: 'rgba(231,226,255,0.6)' }}>
            Feedback por post
          </p>
          {feedback.map(f => {
            const pct = f.total > 0 ? Math.round((f.helpful / f.total) * 100) : 0
            return (
              <div key={f.post_slug} className="mb-4">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-xs truncate" style={{ color: 'rgba(231,226,255,0.8)', maxWidth: '65%' }}>
                    {f.post_slug}
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs" style={{ color: 'rgba(231,226,255,0.35)' }}>
                      {f.total} voto{f.total !== 1 ? 's' : ''}
                    </span>
                    <span
                      className="text-xs font-semibold"
                      style={{ color: pct >= 70 ? '#b79fff' : pct >= 40 ? 'rgba(231,226,255,0.6)' : '#ff96b9' }}
                    >
                      {pct}% útil
                    </span>
                  </div>
                </div>
                <div className="flex rounded-full overflow-hidden" style={{ height: 4, background: 'rgba(183,159,255,0.08)' }}>
                  <div
                    style={{
                      width: `${(f.helpful / f.total) * 100}%`,
                      background: 'rgba(183,159,255,0.55)',
                      transition: 'width 0.4s ease',
                    }}
                  />
                  <div
                    style={{
                      width: `${(f.not_helpful / f.total) * 100}%`,
                      background: 'rgba(255,150,185,0.35)',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div
          className="rounded-xl p-8 text-center"
          style={{ background: 'rgba(183,159,255,0.04)', border: '1px solid rgba(183,159,255,0.1)' }}
        >
          <span className="material-symbols-outlined mb-3 block" style={{ fontSize: 32, color: 'rgba(183,159,255,0.3)' }}>
            thumb_up
          </span>
          <p className="text-sm" style={{ color: 'rgba(231,226,255,0.4)' }}>
            Nenhum feedback recebido ainda.
          </p>
        </div>
      )}
    </div>
  )
}
