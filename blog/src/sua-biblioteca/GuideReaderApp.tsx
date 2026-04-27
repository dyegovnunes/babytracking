// GuideReaderApp — root da SPA do leitor.
// Recebe o slug do guia via prop (Astro injeta no client:only).
// Não usa BrowserRouter porque a navegação entre seções é gerenciada por
// state interno (cada seção é uma "página" virtual) — o histórico do
// browser é controlado via history.pushState pra permitir back/forward.

import './styles/reader.css'
import { useState, useEffect } from 'react'
import { useGuideAccess } from './lib/useGuideAccess'
import { supabase } from '../lib/supabase'
import GuideAuthGuard from './components/GuideAuthGuard'
import GuideLayout from './components/GuideLayout'
import type { GuideSection } from '../types'

interface Props {
  guideSlug: string
}

export default function GuideReaderApp({ guideSlug }: Props) {
  const access = useGuideAccess(guideSlug)
  const [sections, setSections] = useState<GuideSection[]>([])
  const [loading, setLoading] = useState(true)

  // Carrega seções quando autorizado
  useEffect(() => {
    if (access.status !== 'authorized' || !access.guide) return
    let cancelled = false
    async function load() {
      const { data } = await supabase
        .from('guide_sections')
        .select('*')
        .eq('guide_id', access.guide!.id)
        .order('order_index', { ascending: true })
      if (cancelled) return
      setSections(data ?? [])
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [access.status, access.guide])

  // Estados não-autorizados — auth guard cuida
  if (access.status !== 'authorized') {
    return (
      <div className="reader-root">
        <GuideAuthGuard access={access} guideSlug={guideSlug} />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="reader-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--r-text-muted)' }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 24, marginBottom: 8 }}>Preparando sua leitura…</div>
          <div style={{ fontSize: 14 }}>Carregando seu guia</div>
        </div>
      </div>
    )
  }

  if (!access.guide || sections.length === 0) {
    return (
      <div className="reader-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--r-text-muted)', maxWidth: 400, padding: 24 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--r-accent)', opacity: 0.5 }}>menu_book</span>
          <h2 style={{ fontFamily: 'Fraunces, serif', color: 'var(--r-text)', marginTop: 12 }}>
            Esse guia ainda está sendo preparado
          </h2>
          <p style={{ marginTop: 8 }}>
            O conteúdo será disponibilizado em breve. Você tem acesso garantido — vamos te avisar por email quando estiver pronto.
          </p>
        </div>
      </div>
    )
  }

  return (
    <GuideLayout
      guide={access.guide}
      sections={sections}
      userId={access.userId!}
    />
  )
}
