// GuideAuthGuard — renderiza a UI correta pra cada estado de acesso.
//   no-session  → "Entre com seu email" (magic link)
//   no-access   → "Você precisa do guia" (CTA pra landing)
//   error       → mensagem amigável
//   loading     → skeleton sutil

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { AccessState } from '../lib/useGuideAccess'

interface Props {
  access: AccessState
  guideSlug: string
}

export default function GuideAuthGuard({ access, guideSlug }: Props) {
  if (access.status === 'loading') {
    return (
      <div style={center}>
        <div style={{ textAlign: 'center', color: 'var(--r-text-muted)' }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22 }}>Carregando…</div>
        </div>
      </div>
    )
  }

  if (access.status === 'error') {
    return (
      <div style={center}>
        <div style={card}>
          <span className="material-symbols-outlined" style={{ fontSize: 36, color: '#ff7a90' }}>error</span>
          <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 26, margin: '12px 0 8px', color: 'var(--r-text)' }}>
            Algo deu errado
          </h1>
          <p style={{ color: 'var(--r-text-muted)', fontSize: 15 }}>
            {access.errorMsg || 'Não conseguimos carregar o guia. Tenta atualizar a página.'}
          </p>
        </div>
      </div>
    )
  }

  if (access.status === 'no-session') {
    return <MagicLinkPrompt guideSlug={guideSlug} guideTitle={access.guide?.title ?? 'sua leitura'} />
  }

  if (access.status === 'no-access') {
    return <NoAccessCTA guideSlug={guideSlug} guideTitle={access.guide?.title ?? 'esse guia'} email={access.email} />
  }

  return null
}

// ── Magic link prompt ──────────────────────────────────────────────────────
function MagicLinkPrompt({ guideSlug, guideTitle }: { guideSlug: string; guideTitle: string }) {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function send() {
    if (!email.trim()) return
    setSending(true)
    setError('')
    const redirectTo = `${window.location.origin}/sua-biblioteca/${guideSlug}/ler`
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    })
    if (err) {
      setError('Não conseguimos enviar o link. Confere o email e tenta de novo?')
    } else {
      setSent(true)
    }
    setSending(false)
  }

  if (sent) {
    return (
      <div style={center}>
        <div style={card}>
          <span className="material-symbols-outlined" style={{ fontSize: 36, color: '#70e09a' }}>mark_email_read</span>
          <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 28, margin: '14px 0 10px', color: 'var(--r-text)' }}>
            Link enviado pro seu email
          </h1>
          <p style={{ color: 'var(--r-text-muted)', fontSize: 15, lineHeight: 1.6 }}>
            Abre seu email e clica no link de acesso pra entrar direto no <em>{guideTitle}</em>.
            <br /><br />
            Não vê o email? Confere a pasta de promoções/spam ou tenta enviar de novo.
          </p>
          <button
            onClick={() => { setSent(false); setEmail('') }}
            style={btnSecondary}
          >
            Reenviar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={center}>
      <div style={card}>
        <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--r-accent)' }}>menu_book</span>
        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 28, margin: '14px 0 8px', color: 'var(--r-text)', letterSpacing: '-0.01em' }}>
          Entre na sua biblioteca
        </h1>
        <p style={{ color: 'var(--r-text-muted)', fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
          Use o email da compra. A gente envia um link mágico — sem senha pra criar.
        </p>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="seu@email.com"
          autoFocus
          disabled={sending}
          style={input}
        />
        {error && (
          <p style={{ color: '#ff7a90', fontSize: 13, marginTop: 8 }}>{error}</p>
        )}
        <button
          onClick={send}
          disabled={sending || !email.trim()}
          style={{ ...btnPrimary, opacity: (sending || !email.trim()) ? 0.5 : 1 }}
        >
          {sending ? 'Enviando…' : 'Receber link de acesso'}
        </button>
      </div>
    </div>
  )
}

// ── Sem acesso ─────────────────────────────────────────────────────────────
function NoAccessCTA({ guideSlug, guideTitle, email }: { guideSlug: string; guideTitle: string; email: string | null }) {
  async function signOut() {
    await supabase.auth.signOut()
    window.location.reload()
  }

  return (
    <div style={center}>
      <div style={card}>
        <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--r-accent)' }}>lock</span>
        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 28, margin: '14px 0 8px', color: 'var(--r-text)', letterSpacing: '-0.01em' }}>
          Você ainda não tem acesso a esse guia
        </h1>
        <p style={{ color: 'var(--r-text-muted)', fontSize: 15, lineHeight: 1.6, marginBottom: 20 }}>
          {email ? <>Logada como <strong style={{ color: 'var(--r-text)' }}>{email}</strong>. </> : null}
          O <em>{guideTitle}</em> está disponível na nossa biblioteca premium.
        </p>
        <a
          href={`/sua-biblioteca/${guideSlug}`}
          style={{ ...btnPrimary, display: 'inline-block', textDecoration: 'none' }}
        >
          Ver detalhes e comprar
        </a>
        {email && (
          <button onClick={signOut} style={btnSecondary}>
            Entrar com outro email
          </button>
        )}
      </div>
    </div>
  )
}

// ── Estilos compartilhados (inline pra não vazar fora do leitor) ───────────
const center: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  padding: 24,
}

const card: React.CSSProperties = {
  maxWidth: 440,
  width: '100%',
  padding: '40px 32px',
  background: 'var(--r-surface)',
  border: '1px solid var(--r-border)',
  borderRadius: 16,
  textAlign: 'center',
}

const input: React.CSSProperties = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: 10,
  border: '1px solid var(--r-border)',
  background: 'var(--r-surface-strong)',
  color: 'var(--r-text)',
  fontSize: 16,
  fontFamily: 'inherit',
  outline: 'none',
}

const btnPrimary: React.CSSProperties = {
  width: '100%',
  marginTop: 14,
  padding: '14px 20px',
  borderRadius: 10,
  border: 'none',
  background: 'var(--r-accent)',
  color: 'var(--r-on-accent)',
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const btnSecondary: React.CSSProperties = {
  width: '100%',
  marginTop: 12,
  padding: '12px 20px',
  borderRadius: 10,
  border: '1px solid var(--r-border)',
  background: 'transparent',
  color: 'var(--r-text-muted)',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
}
