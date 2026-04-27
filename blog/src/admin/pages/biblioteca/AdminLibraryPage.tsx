// AdminLibraryPage — lista produtos da Sua Biblioteca Yaya com vendas + receita
// Padrão visual segue AdminPostsPage.tsx

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { GUIDE_STATUS_LABEL, type Guide, type GuideStatus } from '../../../types'

interface GuideRow extends Guide {
  total_purchases: number
  total_revenue_cents: number
}

const STATUS_COLOR: Record<GuideStatus, { bg: string; fg: string }> = {
  draft:     { bg: 'rgba(255,200,87,0.15)', fg: '#ffc857' },
  published: { bg: 'rgba(112,224,154,0.15)', fg: '#70e09a' },
  archived:  { bg: 'rgba(231,226,255,0.1)',  fg: 'rgba(231,226,255,0.5)' },
}

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function AdminLibraryPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<GuideRow[]>([])
  const [loading, setLoading] = useState(true)
  const [actionSlug, setActionSlug] = useState<string | null>(null)

  async function load() {
    setLoading(true)

    const { data: guides } = await supabase
      .from('guides')
      .select('*')
      .order('created_at', { ascending: false })

    // Conta vendas + receita por guide (uma query agregada via RPC seria mais
    // performático, mas com 1-10 produtos N+1 não é problema)
    const enriched: GuideRow[] = []
    for (const g of (guides ?? [])) {
      const { data: purchases } = await supabase
        .from('guide_purchases')
        .select('amount_cents')
        .eq('guide_id', g.id)
        .eq('status', 'completed')
      enriched.push({
        ...g,
        total_purchases: purchases?.length ?? 0,
        total_revenue_cents: (purchases ?? []).reduce((sum, p) => sum + (p.amount_cents ?? 0), 0),
      })
    }

    setRows(enriched)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function toggleStatus(g: GuideRow) {
    setActionSlug(g.slug)
    const newStatus: GuideStatus = g.status === 'published' ? 'draft' : 'published'
    await supabase.from('guides').update({ status: newStatus }).eq('id', g.id)
    await load()
    setActionSlug(null)
  }

  async function deleteGuide(g: GuideRow) {
    if (g.total_purchases > 0) {
      alert(`Não dá pra excluir "${g.title}" — já tem ${g.total_purchases} compra(s) registrada(s). Arquive ao invés de excluir.`)
      return
    }
    if (!confirm(`Excluir "${g.title}"? Vai apagar todas as seções junto. Sem volta.`)) return
    setActionSlug(g.slug)
    await supabase.from('guides').delete().eq('id', g.id)
    await load()
    setActionSlug(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'Manrope, sans-serif', color: '#e7e2ff' }}>
            Sua Biblioteca
          </h1>
          <p className="text-sm" style={{ color: 'rgba(231,226,255,0.5)' }}>
            Catálogo de infoprodutos do Yaya — guias premium pagos via Stripe.
          </p>
        </div>
        <button
          onClick={() => navigate('/biblioteca/novo')}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold cursor-pointer border-none transition-opacity hover:opacity-90"
          style={{ background: '#b79fff', color: '#0d0a27' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
          Novo guia
        </button>
      </div>

      {/* KPIs gerais */}
      {!loading && rows.length > 0 && (
        <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
          <KpiCard label="Total de produtos" value={String(rows.length)} />
          <KpiCard label="Publicados" value={String(rows.filter(r => r.status === 'published').length)} />
          <KpiCard
            label="Vendas totais"
            value={String(rows.reduce((s, r) => s + r.total_purchases, 0))}
          />
          <KpiCard
            label="Receita acumulada"
            value={formatBRL(rows.reduce((s, r) => s + r.total_revenue_cents, 0))}
          />
        </div>
      )}

      {/* Tabela */}
      {loading ? (
        <div className="text-sm" style={{ color: 'rgba(231,226,255,0.5)' }}>Carregando…</div>
      ) : rows.length === 0 ? (
        <EmptyState onCreate={() => navigate('/biblioteca/novo')} />
      ) : (
        <div className="rounded-md overflow-hidden border" style={{ borderColor: 'rgba(183,159,255,0.15)' }}>
          <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: 'rgba(183,159,255,0.08)', color: 'rgba(231,226,255,0.7)' }}>
                <Th>Produto</Th>
                <Th>Status</Th>
                <Th align="right">Preço</Th>
                <Th align="right">Vendas</Th>
                <Th align="right">Receita</Th>
                <Th align="right">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map(g => (
                <tr key={g.id} style={{ borderTop: '1px solid rgba(183,159,255,0.1)' }}>
                  <Td>
                    <div className="font-semibold" style={{ color: '#e7e2ff' }}>{g.title}</div>
                    {g.subtitle && (
                      <div className="text-xs mt-0.5" style={{ color: 'rgba(231,226,255,0.5)' }}>{g.subtitle}</div>
                    )}
                    <div className="text-xs mt-1" style={{ color: 'rgba(231,226,255,0.35)', fontFamily: 'monospace' }}>
                      /{g.slug}
                    </div>
                  </Td>
                  <Td>
                    <span
                      className="inline-block px-2 py-0.5 rounded text-xs font-semibold"
                      style={{
                        background: STATUS_COLOR[g.status].bg,
                        color: STATUS_COLOR[g.status].fg,
                      }}
                    >
                      {GUIDE_STATUS_LABEL[g.status]}
                    </span>
                  </Td>
                  <Td align="right">
                    <span style={{ color: '#e7e2ff' }}>{formatBRL(g.price_cents)}</span>
                  </Td>
                  <Td align="right">
                    <span style={{ color: g.total_purchases > 0 ? '#70e09a' : 'rgba(231,226,255,0.4)' }}>
                      {g.total_purchases}
                    </span>
                  </Td>
                  <Td align="right">
                    <span style={{ color: g.total_revenue_cents > 0 ? '#70e09a' : 'rgba(231,226,255,0.4)' }}>
                      {formatBRL(g.total_revenue_cents)}
                    </span>
                  </Td>
                  <Td align="right">
                    <div className="flex items-center justify-end gap-1.5">
                      <ActionBtn
                        label="Editar"
                        icon="edit"
                        onClick={() => navigate(`/biblioteca/${g.slug}`)}
                      />
                      <ActionBtn
                        label={g.status === 'published' ? 'Despublicar' : 'Publicar'}
                        icon={g.status === 'published' ? 'visibility_off' : 'visibility'}
                        loading={actionSlug === g.slug}
                        onClick={() => toggleStatus(g)}
                      />
                      <ActionBtn
                        label="Excluir"
                        icon="delete"
                        loading={actionSlug === g.slug}
                        danger
                        onClick={() => deleteGuide(g)}
                      />
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Subcomponentes ─────────────────────────────────────────────────────────

function Th({ children, align }: { children: React.ReactNode; align?: 'right' }) {
  return (
    <th
      className="text-xs font-semibold uppercase tracking-wider"
      style={{ padding: '10px 14px', textAlign: align ?? 'left' }}
    >
      {children}
    </th>
  )
}

function Td({ children, align }: { children: React.ReactNode; align?: 'right' }) {
  return <td style={{ padding: '14px', textAlign: align ?? 'left', verticalAlign: 'top' }}>{children}</td>
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-md p-4 border"
      style={{ borderColor: 'rgba(183,159,255,0.15)', background: 'rgba(183,159,255,0.04)' }}
    >
      <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'rgba(231,226,255,0.5)' }}>
        {label}
      </div>
      <div className="text-xl font-bold" style={{ color: '#e7e2ff', fontFamily: 'Manrope, sans-serif' }}>
        {value}
      </div>
    </div>
  )
}

function ActionBtn({
  label, icon, onClick, loading, danger,
}: {
  label: string; icon: string; onClick: () => void; loading?: boolean; danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      title={label}
      className="flex items-center justify-center rounded cursor-pointer bg-transparent border-none transition-all hover:opacity-100"
      style={{
        padding: 6,
        opacity: loading ? 0.4 : 0.6,
        color: danger ? '#ff7a90' : '#b79fff',
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{icon}</span>
    </button>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div
      className="rounded-md p-8 text-center border"
      style={{ borderColor: 'rgba(183,159,255,0.15)', background: 'rgba(183,159,255,0.03)' }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#b79fff', opacity: 0.5 }}>menu_book</span>
      <h3 className="text-lg font-bold mt-3 mb-1" style={{ color: '#e7e2ff', fontFamily: 'Manrope, sans-serif' }}>
        Sua biblioteca está vazia
      </h3>
      <p className="text-sm mb-4" style={{ color: 'rgba(231,226,255,0.6)' }}>
        Crie o primeiro guia premium pra começar a vender.
      </p>
      <button
        onClick={onCreate}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold cursor-pointer border-none"
        style={{ background: '#b79fff', color: '#0d0a27' }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
        Criar primeiro guia
      </button>
    </div>
  )
}
