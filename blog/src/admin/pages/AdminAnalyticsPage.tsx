import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface AnalyticsData {
  configured: boolean
  error?: string
  summary: { totalViews: number; totalUsers: number; affiliateClicks: number; ctaClicks: number }
  topPages: { path: string; title: string; views: number; users: number }[]
  sources: { channel: string; sessions: number; newUsers: number }[]
  dailyViews: { date: string; views: number; users: number }[]
  events: { name: string; count: number }[]
}

interface FeedbackRow {
  post_slug: string
  helpful: number
  not_helpful: number
  total: number
}

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL as string

// Formata data YYYYMMDD → "12/abr"
function formatDate(d: string): string {
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
  const month = parseInt(d.substring(4, 6)) - 1
  const day = parseInt(d.substring(6, 8))
  return `${day}/${months[month]}`
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

const CHANNEL_LABELS: Record<string, string> = {
  'Organic Search': 'Busca orgânica',
  'Direct': 'Direto',
  'Referral': 'Referência',
  'Organic Social': 'Redes sociais',
  'Email': 'E-mail',
  'Paid Search': 'Links patrocinados',
  'Unassigned': 'Não atribuído',
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

// Gráfico de barras simples em CSS
function BarChart({ data }: { data: { date: string; views: number }[] }) {
  if (!data.length) return null
  const max = Math.max(...data.map(d => d.views), 1)
  // Mostra só ~15 labels para não poluir
  const step = Math.ceil(data.length / 15)

  return (
    <div>
      <div className="flex items-end gap-0.5" style={{ height: 80 }}>
        {data.map((d, i) => (
          <div
            key={d.date}
            className="flex-1 rounded-sm transition-opacity hover:opacity-100"
            style={{
              height: `${Math.max(4, (d.views / max) * 100)}%`,
              background: 'rgba(183,159,255,0.5)',
              opacity: 0.7,
              cursor: 'default',
            }}
            title={`${formatDate(d.date)}: ${d.views.toLocaleString()} views`}
          />
        ))}
      </div>
      {/* Labels do eixo X */}
      <div className="flex items-center" style={{ marginTop: 4 }}>
        {data.map((d, i) => (
          <div key={d.date} className="flex-1 text-center" style={{ fontSize: 9, color: 'rgba(231,226,255,0.3)' }}>
            {i % step === 0 ? formatDate(d.date) : ''}
          </div>
        ))}
      </div>
    </div>
  )
}

// Barra de progresso horizontal
function HBar({ value, max, label, sub }: { value: number; max: number; label: string; sub?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="mb-3">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-xs truncate" style={{ color: 'rgba(231,226,255,0.8)', maxWidth: '70%' }}>{label}</span>
        <span className="text-xs font-semibold" style={{ color: '#b79fff' }}>{formatNumber(value)}</span>
      </div>
      {sub && <p className="text-xs mb-1" style={{ color: 'rgba(231,226,255,0.35)', fontSize: 10 }}>{sub}</p>}
      <div className="rounded-full overflow-hidden" style={{ height: 4, background: 'rgba(183,159,255,0.1)' }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: 'rgba(183,159,255,0.5)', transition: 'width 0.4s ease' }}
        />
      </div>
    </div>
  )
}

export default function AdminAnalyticsPage() {
  const [ga4, setGa4] = useState<AnalyticsData | null>(null)
  const [feedback, setFeedback] = useState<FeedbackRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [ga4Res, fbRes] = await Promise.all([
        // Edge Function de analytics
        fetch(`${SUPABASE_URL}/functions/v1/blog-analytics`, {
          headers: {
            apikey: import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string,
            Authorization: `Bearer ${import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string}`,
          },
        }).then(r => r.json()).catch(() => ({ configured: false, error: 'Falha ao conectar' })),

        // Feedback do Supabase
        supabase
          .from('content_feedback')
          .select('post_slug, sentiment')
          .then(({ data }) => {
            const map: Record<string, FeedbackRow> = {}
            for (const f of (data ?? [])) {
              if (!map[f.post_slug]) map[f.post_slug] = { post_slug: f.post_slug, helpful: 0, not_helpful: 0, total: 0 }
              if (f.sentiment === 'helpful') map[f.post_slug].helpful++
              else map[f.post_slug].not_helpful++
              map[f.post_slug].total++
            }
            return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 15)
          }),
      ])

      setGa4(ga4Res)
      setFeedback(fbRes)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-t-[#b79fff] border-[#b79fff]/20 rounded-full animate-spin" />
      </div>
    )
  }

  // GA4 não configurado — exibe guia de setup
  if (!ga4?.configured) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Manrope, sans-serif', color: '#e7e2ff' }}>Analytics</h1>

        <div className="rounded-xl border p-6 mb-8" style={{ borderColor: 'rgba(183,159,255,0.2)', background: 'rgba(183,159,255,0.04)' }}>
          <div className="flex items-center gap-3 mb-4">
            <span className="material-symbols-outlined" style={{ color: '#b79fff', fontSize: 24 }}>analytics</span>
            <h2 className="font-bold text-lg" style={{ color: '#e7e2ff', fontFamily: 'Manrope, sans-serif' }}>
              Configurar Google Analytics
            </h2>
          </div>
          <p className="text-sm mb-5" style={{ color: 'rgba(231,226,255,0.6)', lineHeight: 1.7 }}>
            Para ver pageviews, fontes de tráfego e dados de afiliados, é necessário conectar uma
            Service Account do Google ao Supabase. São 3 passos:
          </p>
          {[
            {
              n: '1',
              title: 'Criar Service Account',
              desc: 'Google Cloud Console → IAM & Admin → Service Accounts → Create → criar chave JSON → baixar.',
              link: 'https://console.cloud.google.com/iam-admin/serviceaccounts',
              linkLabel: 'Abrir Cloud Console',
            },
            {
              n: '2',
              title: 'Dar acesso ao GA4',
              desc: 'GA4 → Admin → Property Access Management → Add User → cole o e-mail da service account → Viewer.',
              link: 'https://analytics.google.com/',
              linkLabel: 'Abrir GA4',
            },
            {
              n: '3',
              title: 'Configurar secret no Supabase',
              desc: 'Supabase Dashboard → Edge Functions → Secrets → adicionar GA4_SERVICE_ACCOUNT com o conteúdo do JSON.',
              link: 'https://supabase.com/dashboard/project/kgfjfdizxziacblgvplh/settings/functions',
              linkLabel: 'Abrir Supabase',
            },
          ].map(step => (
            <div key={step.n} className="flex gap-4 mb-4">
              <div
                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: 'rgba(183,159,255,0.2)', color: '#b79fff' }}
              >
                {step.n}
              </div>
              <div>
                <p className="text-sm font-semibold mb-0.5" style={{ color: '#e7e2ff' }}>{step.title}</p>
                <p className="text-xs mb-1.5" style={{ color: 'rgba(231,226,255,0.5)', lineHeight: 1.6 }}>{step.desc}</p>
                <a href={step.link} target="_blank" rel="noopener noreferrer"
                  className="text-xs" style={{ color: '#b79fff' }}>
                  {step.linkLabel} →
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Mostra feedback mesmo sem GA4 */}
        <FeedbackSection feedback={feedback} />
      </div>
    )
  }

  if (ga4.error) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Manrope, sans-serif', color: '#e7e2ff' }}>Analytics</h1>
        <p className="text-sm" style={{ color: '#ff96b9' }}>Erro ao carregar dados do GA4: {ga4.error}</p>
      </div>
    )
  }

  const maxViews = Math.max(...(ga4.topPages?.map(p => p.views) ?? [1]))
  const maxSessions = Math.max(...(ga4.sources?.map(s => s.sessions) ?? [1]))
  const maxFeedback = Math.max(...(feedback.map(f => f.total) ?? [1]))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Manrope, sans-serif', color: '#e7e2ff' }}>Analytics</h1>
        <span className="text-xs px-3 py-1 rounded-full" style={{ background: 'rgba(183,159,255,0.12)', color: 'rgba(231,226,255,0.5)' }}>
          Últimos 30 dias
        </span>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard label="Visualizações" value={formatNumber(ga4.summary.totalViews)} icon="visibility" sub="páginas vistas" />
        <SummaryCard label="Usuários ativos" value={formatNumber(ga4.summary.totalUsers)} icon="person" sub="únicos" />
        <SummaryCard label="Cliques afiliados" value={formatNumber(ga4.summary.affiliateClicks)} icon="shopping_bag" sub="produtos Amazon" />
        <SummaryCard label="Cliques no CTA" value={formatNumber(ga4.summary.ctaClicks)} icon="download" sub="downloads Yaya" />
      </div>

      {/* Gráfico de visualizações diárias */}
      {ga4.dailyViews?.length > 0 && (
        <div className="mb-6 rounded-xl p-5" style={{ ...cardStyle }}>
          <p className="text-sm font-semibold mb-4" style={{ color: 'rgba(231,226,255,0.6)' }}>Visualizações diárias</p>
          <BarChart data={ga4.dailyViews} />
        </div>
      )}

      {/* Dois painéis: top páginas + fontes */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Top páginas */}
        <div className="rounded-xl p-5" style={cardStyle}>
          <p className="text-sm font-semibold mb-4" style={{ color: 'rgba(231,226,255,0.6)' }}>
            Páginas mais visitadas
          </p>
          {(ga4.topPages ?? []).slice(0, 12).map(p => {
            // Remove o leading slash e usa como label
            const label = p.path === '/' ? 'Home' : p.path.replace(/^\//, '').replace(/\/$/, '')
            return (
              <HBar
                key={p.path}
                value={p.views}
                max={maxViews}
                label={label}
                sub={p.users > 0 ? `${p.users.toLocaleString()} usuários` : undefined}
              />
            )
          })}
        </div>

        {/* Fontes de tráfego */}
        <div className="rounded-xl p-5" style={cardStyle}>
          <p className="text-sm font-semibold mb-4" style={{ color: 'rgba(231,226,255,0.6)' }}>
            Fontes de tráfego
          </p>
          {(ga4.sources ?? []).map(s => (
            <HBar
              key={s.channel}
              value={s.sessions}
              max={maxSessions}
              label={CHANNEL_LABELS[s.channel] ?? s.channel}
              sub={`${s.newUsers.toLocaleString()} novos usuários`}
            />
          ))}

          {/* Eventos rastreados */}
          {ga4.events && ga4.events.length > 0 && (
            <>
              <p className="text-sm font-semibold mt-6 mb-4" style={{ color: 'rgba(231,226,255,0.6)' }}>
                Eventos rastreados
              </p>
              {ga4.events.map(e => (
                <div key={e.name} className="flex justify-between items-center mb-2">
                  <span className="text-xs font-mono" style={{ color: 'rgba(231,226,255,0.6)' }}>{e.name}</span>
                  <span className="text-sm font-bold" style={{ color: '#b79fff' }}>{e.count.toLocaleString()}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Feedback section */}
      <FeedbackSection feedback={feedback} maxFeedback={maxFeedback} />
    </div>
  )
}

function FeedbackSection({ feedback, maxFeedback }: { feedback: FeedbackRow[]; maxFeedback?: number }) {
  if (!feedback.length) return null
  const max = maxFeedback ?? Math.max(...feedback.map(f => f.total), 1)

  return (
    <div className="rounded-xl p-5" style={{
      background: 'rgba(183,159,255,0.06)',
      border: '1px solid rgba(183,159,255,0.15)',
      borderRadius: 10,
      padding: '1.25rem',
    }}>
      <p className="text-sm font-semibold mb-4" style={{ color: 'rgba(231,226,255,0.6)' }}>
        Feedback por post (👍 / 👎)
      </p>
      {feedback.map(f => {
        const pct = f.total > 0 ? Math.round((f.helpful / f.total) * 100) : 0
        return (
          <div key={f.post_slug} className="mb-3">
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-xs truncate" style={{ color: 'rgba(231,226,255,0.8)', maxWidth: '65%' }}>
                {f.post_slug}
              </span>
              <span className="text-xs" style={{ color: pct >= 70 ? '#b79fff' : pct >= 40 ? 'rgba(231,226,255,0.5)' : '#ff96b9' }}>
                {pct}% útil · {f.total} votos
              </span>
            </div>
            <div className="flex gap-1 rounded-full overflow-hidden" style={{ height: 4 }}>
              <div
                style={{
                  width: `${(f.helpful / f.total) * 100}%`,
                  background: 'rgba(183,159,255,0.6)',
                  transition: 'width 0.4s ease',
                }}
              />
              <div
                style={{
                  width: `${(f.not_helpful / f.total) * 100}%`,
                  background: 'rgba(255,150,185,0.4)',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
