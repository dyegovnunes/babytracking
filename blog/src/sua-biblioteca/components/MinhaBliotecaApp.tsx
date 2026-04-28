// MinhaBliotecaApp — área pessoal do usuário.
// Mostra apenas os guias que o usuário tem acesso (compra ou Yaya+).
// Renderizado client:only pois depende de auth state.

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

interface GuideCard {
  id: string
  slug: string
  title: string
  subtitle: string | null
  cover_image_url: string | null
  audience: string | null
  target_week_start: number | null
  accessVia: 'purchase' | 'premium'
}

type AppState =
  | { status: 'loading' }
  | { status: 'no-session' }
  | { status: 'empty'; email: string; isPremium: boolean }
  | { status: 'ready'; email: string; isPremium: boolean; guides: GuideCard[] }
  | { status: 'error'; msg: string }

export default function MinhaBliotecaApp() {
  const [state, setState] = useState<AppState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (cancelled) return

        if (!session?.user) {
          setState({ status: 'no-session' })
          return
        }

        const userId = session.user.id
        const email = session.user.email ?? ''

        // Busca perfil (is_premium) + guias publicados + compras em paralelo
        const [
          { data: profile },
          { data: allGuides },
          { data: purchases },
        ] = await Promise.all([
          supabase
            .from('profiles')
            .select('is_premium')
            .eq('id', userId)
            .single(),
          supabase
            .from('guides')
            .select('id, slug, title, subtitle, cover_image_url, audience, target_week_start')
            .eq('status', 'published')
            .order('created_at', { ascending: true }),
          supabase
            .from('guide_purchases')
            .select('guide_id')
            .eq('user_id', userId)
            .eq('status', 'completed'),
        ])

        if (cancelled) return

        const isPremium = Boolean(profile?.is_premium)
        const purchasedIds = new Set((purchases ?? []).map((p: { guide_id: string }) => p.guide_id))

        // Filtra guias acessíveis
        const accessible: GuideCard[] = []
        for (const g of allGuides ?? []) {
          if (isPremium) {
            accessible.push({ ...g, accessVia: 'premium' })
          } else if (purchasedIds.has(g.id)) {
            accessible.push({ ...g, accessVia: 'purchase' })
          }
        }

        setState(
          accessible.length === 0
            ? { status: 'empty', email, isPremium }
            : { status: 'ready', email, isPremium, guides: accessible }
        )
      } catch (err) {
        if (cancelled) return
        setState({ status: 'error', msg: (err as Error).message })
      }
    }

    load()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => load())
    return () => { cancelled = true; subscription.unsubscribe() }
  }, [])

  // ── Loading ────────────────────────────────────────────────────────────────
  if (state.status === 'loading') {
    return (
      <div style={s.page}>
        <div style={s.container}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1, 2].map(i => (
              <div key={i} style={{ height: 100, borderRadius: 16, background: 'rgba(183,159,255,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Sem sessão ─────────────────────────────────────────────────────────────
  if (state.status === 'no-session') {
    return (
      <div style={s.page}>
        <div style={{ ...s.container, textAlign: 'center' }}>
          <img src="/symbol.png" alt="Yaya" width={48} height={48} style={s.logo} />
          <h1 style={s.h1}>Minha Biblioteca</h1>
          <p style={{ ...s.body, marginBottom: 28 }}>
            Entre com a conta que você usou na compra para ver seus guias.
          </p>
          <a href="/sua-biblioteca/ultimas-semanas/ler" style={{ ...s.btnPrimary, display: 'inline-block', textDecoration: 'none' }}>
            Entrar na biblioteca
          </a>
          <p style={{ marginTop: 16, fontSize: 12, color: 'rgba(231,226,255,0.35)', fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' }}>
            Ainda não tem nenhum guia?{' '}
            <a href="/sua-biblioteca" style={{ color: '#b79fff', textDecoration: 'underline' }}>Ver catálogo</a>
          </p>
        </div>
      </div>
    )
  }

  // ── Erro ──────────────────────────────────────────────────────────────────
  if (state.status === 'error') {
    return (
      <div style={s.page}>
        <div style={{ ...s.container, textAlign: 'center' }}>
          <p style={{ color: '#ff7a90', fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif', fontSize: 14 }}>
            Não conseguimos carregar seus guias. Tenta atualizar a página.
          </p>
        </div>
      </div>
    )
  }

  // ── Sem guias acessíveis ───────────────────────────────────────────────────
  if (state.status === 'empty') {
    return (
      <div style={s.page}>
        <div style={s.container}>
          <Header email={state.email} isPremium={state.isPremium} />
          <div style={{ textAlign: 'center', paddingTop: 40, paddingBottom: 40 }}>
            <img src="/symbol.png" alt="" width={40} height={40} style={{ ...s.logo, opacity: 0.25, marginBottom: 16 }} />
            <p style={{ ...s.body, marginBottom: 24 }}>
              Você ainda não tem nenhum guia na biblioteca.
            </p>
            <a href="/sua-biblioteca" style={{ ...s.btnPrimary, display: 'inline-block', textDecoration: 'none' }}>
              Ver catálogo de guias
            </a>
          </div>
        </div>
      </div>
    )
  }

  // ── Guias acessíveis ──────────────────────────────────────────────────────
  const { email, isPremium, guides } = state

  return (
    <div style={s.page}>
      <div style={s.container}>
        <Header email={email} isPremium={isPremium} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {guides.map((guide) => (
            <GuideRow key={guide.id} guide={guide} />
          ))}
        </div>

        {/* Catálogo link — só quando tem compras individuais (não premium) */}
        {!isPremium && (
          <p style={{ marginTop: 28, fontSize: 12, color: 'rgba(231,226,255,0.35)', textAlign: 'center', fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' }}>
            Quer mais guias?{' '}
            <a href="/sua-biblioteca" style={{ color: '#b79fff', textDecoration: 'underline' }}>Ver catálogo</a>
          </p>
        )}
      </div>
    </div>
  )
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function Header({ email, isPremium }: { email: string; isPremium: boolean }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' as const, marginBottom: 4 }}>
        <h1 style={s.h1}>Minha Biblioteca</h1>
        {isPremium && (
          <span style={s.premiumBadge}>💜 Yaya+</span>
        )}
      </div>
      <p style={{ ...s.body, fontSize: 12, margin: 0 }}>
        {isPremium
          ? 'Você tem acesso a toda a biblioteca com o Yaya+.'
          : `Guias adquiridos por ${email}.`}
      </p>
    </div>
  )
}

function GuideRow({ guide }: { guide: GuideCard }) {
  const badgeText = guide.accessVia === 'premium' ? 'Yaya+' : 'Adquirido'

  return (
    <div style={s.card}>
      {/* Cover thumb */}
      <div style={s.thumb}>
        {guide.cover_image_url
          ? <img src={guide.cover_image_url} alt={guide.title} style={{ width: '100%', height: '100%', objectFit: 'cover' as const }} />
          : <img src="/symbol.png" alt="" style={{ width: 28, height: 28, opacity: 0.25 }} />
        }
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={guide.accessVia === 'premium' ? s.badgePremium : s.badgePurchase}>
            {badgeText}
          </span>
        </div>
        <p style={s.cardTitle}>{guide.title}</p>
        {guide.subtitle && (
          <p style={s.cardSubtitle}>{guide.subtitle}</p>
        )}
      </div>

      {/* CTA */}
      <a
        href={`/sua-biblioteca/${guide.slug}/ler`}
        style={s.btnRead}
      >
        Ler →
      </a>
    </div>
  )
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '70vh',
    padding: '48px 16px 80px',
    fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
  },
  container: {
    maxWidth: 560,
    margin: '0 auto',
  },
  logo: {
    filter: 'brightness(0) saturate(100%) invert(72%) sepia(40%) saturate(1500%) hue-rotate(220deg) brightness(105%) contrast(95%)',
    display: 'block',
    margin: '0 auto 20px',
  },
  h1: {
    fontFamily: 'Fraunces, Georgia, serif',
    fontSize: 28,
    fontWeight: 700,
    color: 'rgba(231,226,255,0.95)',
    margin: 0,
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
  },
  body: {
    color: 'rgba(231,226,255,0.55)',
    fontSize: 14,
    lineHeight: 1.65,
    margin: 0,
  },
  premiumBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 12px',
    borderRadius: 20,
    background: 'rgba(183,159,255,0.12)',
    border: '1px solid rgba(183,159,255,0.22)',
    color: '#b79fff',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.04em',
    fontFamily: 'Manrope, system-ui, sans-serif',
    whiteSpace: 'nowrap' as const,
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '14px 16px',
    borderRadius: 14,
    border: '1px solid rgba(231,226,255,0.07)',
    background: 'rgba(183,159,255,0.03)',
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
    overflow: 'hidden',
    flexShrink: 0,
    background: 'rgba(183,159,255,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: 'Fraunces, Georgia, serif',
    fontWeight: 700,
    fontSize: 15,
    color: 'rgba(231,226,255,0.9)',
    margin: 0,
    lineHeight: 1.3,
  },
  cardSubtitle: {
    fontSize: 11,
    color: 'rgba(231,226,255,0.45)',
    margin: '3px 0 0',
    lineHeight: 1.4,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as const,
    overflow: 'hidden',
  },
  badgePremium: {
    fontSize: 10,
    fontWeight: 700,
    color: '#b79fff',
    background: 'rgba(183,159,255,0.1)',
    border: '1px solid rgba(183,159,255,0.18)',
    borderRadius: 4,
    padding: '2px 7px',
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
  },
  badgePurchase: {
    fontSize: 10,
    fontWeight: 700,
    color: 'rgba(231,226,255,0.5)',
    background: 'rgba(231,226,255,0.05)',
    border: '1px solid rgba(231,226,255,0.1)',
    borderRadius: 4,
    padding: '2px 7px',
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
  },
  btnRead: {
    flexShrink: 0,
    padding: '9px 16px',
    borderRadius: 9,
    background: 'linear-gradient(135deg, #b79fff 0%, #8b6df0 100%)',
    color: '#0d0a27',
    fontSize: 12,
    fontWeight: 700,
    fontFamily: 'Manrope, system-ui, sans-serif',
    textDecoration: 'none',
    whiteSpace: 'nowrap' as const,
  },
  btnPrimary: {
    padding: '13px 28px',
    borderRadius: 12,
    background: 'linear-gradient(135deg, #b79fff 0%, #8b6df0 100%)',
    color: '#0d0a27',
    fontSize: 14,
    fontWeight: 700,
    fontFamily: 'Manrope, system-ui, sans-serif',
    cursor: 'pointer',
  },
}
