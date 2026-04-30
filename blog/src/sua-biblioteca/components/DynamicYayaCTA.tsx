// DynamicYayaCTA — CTA renderizado ao fim da Conclusão.
// Varia conforme estado de assinatura/compra do usuário.
//
// 4 variantes:
//   1. Comprou avulso (sem Yaya+)         → ativar 30 dias de cortesia
//   2. Yaya+ mensal                        → upgrade pra anual/vitalício + outros guides
//   3. Yaya+ anual ou vitalício            → cross-sell de outros guides da biblioteca
//   4. Sem assinatura nem compra (preview) → comprar avulso ou assinar Yaya+

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

interface Props {
  guideId: string
  guideSlug: string
  userId: string
}

interface UserState {
  subscriptionPlan: 'monthly' | 'annual' | 'lifetime' | null
  isPremium: boolean
  courtesyExpiresAt: string | null
  hasPurchased: boolean
}

interface OtherGuide {
  slug: string
  title: string
  cover_image_url: string | null
}

export default function DynamicYayaCTA({ guideId, guideSlug, userId }: Props) {
  const [state, setState] = useState<UserState | null>(null)
  const [otherGuides, setOtherGuides] = useState<OtherGuide[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      // Estado do usuário
      const profileQ = supabase
        .from('profiles')
        .select('subscription_plan, is_premium, courtesy_expires_at')
        .eq('id', userId)
        .maybeSingle()

      const purchaseQ = supabase
        .from('guide_purchases')
        .select('id')
        .eq('user_id', userId)
        .eq('guide_id', guideId)
        .eq('status', 'completed')
        .limit(1)

      // Outros guides published que ele ainda não comprou (limit 3)
      const otherGuidesQ = supabase
        .from('guides')
        .select('slug, title, cover_image_url')
        .eq('status', 'published')
        .neq('id', guideId)
        .order('created_at', { ascending: false })
        .limit(3)

      const [{ data: profile }, { data: purchases }, { data: others }] = await Promise.all([
        profileQ, purchaseQ, otherGuidesQ,
      ])

      if (cancelled) return

      setState({
        subscriptionPlan: (profile?.subscription_plan as UserState['subscriptionPlan']) ?? null,
        isPremium: profile?.is_premium === true,
        courtesyExpiresAt: profile?.courtesy_expires_at ?? null,
        hasPurchased: (purchases?.length ?? 0) > 0,
      })
      setOtherGuides(others ?? [])
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [userId, guideId])

  if (loading || !state) return null

  // ── Variante 3: Yaya+ Anual ou Vitalício ─────────────────────────────────
  if (state.subscriptionPlan === 'annual' || state.subscriptionPlan === 'lifetime') {
    return (
      <div style={s.box}>
        <div style={s.icon}>💜</div>
        <div style={{ flex: 1 }}>
          <div style={s.title}>Continue sua jornada na biblioteca</div>
          <p style={s.body}>
            Você tem acesso ilimitado com Yaya+ {state.subscriptionPlan === 'lifetime' ? 'Vitalício' : 'Anual'}.
            Veja outros guias pra você:
          </p>
          <OtherGuidesGrid guides={otherGuides} currentSlug={guideSlug} />
        </div>
      </div>
    )
  }

  // ── Variante 2: Yaya+ Mensal ─────────────────────────────────────────────
  if (state.subscriptionPlan === 'monthly') {
    return (
      <div style={s.box}>
        <div style={s.icon}>💎</div>
        <div style={{ flex: 1 }}>
          <div style={s.title}>Desbloqueie a biblioteca toda</div>
          <p style={s.body}>
            Com o Yaya+ Anual ou Vitalício você acessa todos os guias da biblioteca, sem pagar por cada um.
          </p>
          <a href="https://yayababy.app" target="_blank" rel="noopener noreferrer" style={s.btnPrimary}>
            Fazer upgrade do plano
          </a>
          {otherGuides.length > 0 && (
            <>
              <p style={{ ...s.body, marginTop: 18, fontSize: 13 }}>
                Outros guias que podem te interessar:
              </p>
              <OtherGuidesGrid guides={otherGuides} currentSlug={guideSlug} />
            </>
          )}
        </div>
      </div>
    )
  }

  // ── Variante 1: Comprou avulso, sem Yaya+ ────────────────────────────────
  if (state.hasPurchased) {
    const courtesyActive = state.courtesyExpiresAt
      && new Date(state.courtesyExpiresAt) > new Date()
    return (
      <div style={s.box}>
        <div style={s.icon}>📱</div>
        <div style={{ flex: 1 }}>
          <div style={s.title}>
            {courtesyActive ? 'Sua Yaya+ gratuita está ativa' : 'Aproveite os 30 dias de Yaya+ que vieram com o guia'}
          </div>
          <p style={s.body}>
            {courtesyActive
              ? 'Use o app Yaya pra registrar sono, mamadas e fraldas. Os primeiros dias passam rápido.'
              : 'Baixe o app Yaya e ative sua cortesia de 30 dias usando o mesmo email da compra.'}
          </p>
          <a href="https://yayababy.app" target="_blank" rel="noopener noreferrer" style={s.btnPrimary}>
            Abrir o app
          </a>
        </div>
      </div>
    )
  }

  // ── Variante 4: Sem nada (preview / amostra) ─────────────────────────────
  return (
    <div style={s.box}>
      <div style={s.icon}>✨</div>
      <div style={{ flex: 1 }}>
        <div style={s.title}>Continue lendo o guia completo</div>
        <p style={s.body}>
          Compre este guia avulso ou assine o Yaya+ pra acessar a biblioteca toda.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a href={`/biblioteca-yaya/${guideSlug}`} style={s.btnPrimary}>
            Ver opções
          </a>
        </div>
      </div>
    </div>
  )
}

// ── OtherGuidesGrid ──────────────────────────────────────────────────────────
function OtherGuidesGrid({ guides, currentSlug }: { guides: OtherGuide[]; currentSlug: string }) {
  if (guides.length === 0) return null
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
      gap: 12,
      marginTop: 10,
    }}>
      {guides.filter(g => g.slug !== currentSlug).map(g => (
        <a
          key={g.slug}
          href={`/biblioteca-yaya/${g.slug}`}
          style={{
            display: 'block',
            textDecoration: 'none',
            border: '1px solid var(--r-border)',
            borderRadius: 12,
            overflow: 'hidden',
            background: 'var(--r-surface)',
            transition: 'transform 0.18s, border-color 0.18s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.borderColor = 'var(--r-accent)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.borderColor = 'var(--r-border)'
          }}
        >
          {g.cover_image_url && (
            <div style={{
              width: '100%',
              aspectRatio: '16 / 9',
              backgroundImage: `url(${g.cover_image_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }} />
          )}
          <div style={{ padding: '10px 12px' }}>
            <div style={{
              fontFamily: 'Manrope, system-ui, sans-serif',
              fontWeight: 700, fontSize: 13,
              color: 'var(--r-text-strong)',
              lineHeight: 1.3,
            }}>{g.title}</div>
          </div>
        </a>
      ))}
    </div>
  )
}

// ── Estilos ──────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  box: {
    marginTop: '2.5em',
    padding: '20px 22px',
    background: 'color-mix(in srgb, var(--r-accent) 7%, var(--r-surface))',
    border: '1px solid color-mix(in srgb, var(--r-accent) 25%, transparent)',
    borderRadius: 14,
    display: 'flex',
    alignItems: 'flex-start',
    gap: 16,
    fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
  },
  icon: {
    fontSize: 28,
    flex: '0 0 auto',
    marginTop: 2,
  },
  title: {
    fontFamily: 'Manrope, system-ui, sans-serif',
    fontWeight: 800,
    fontSize: 15,
    color: 'var(--r-text-strong)',
    letterSpacing: '-0.01em',
    marginBottom: 6,
  },
  body: {
    fontSize: 13,
    color: 'var(--r-text-muted)',
    lineHeight: 1.55,
    margin: '0 0 12px',
  },
  btnPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 20px',
    borderRadius: 999,
    background: 'var(--r-accent)',
    color: 'var(--r-on-accent, #fff)',
    fontWeight: 700,
    fontSize: 13,
    textDecoration: 'none',
  },
}
