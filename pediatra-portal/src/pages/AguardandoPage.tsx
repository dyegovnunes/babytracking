import { supabase } from '../lib/supabase'

function YayaLogo() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 4 }}>
      <img
        src="/symbol.png"
        alt="Yaya"
        width={48}
        height={48}
        style={{
          filter: 'brightness(0) saturate(100%) invert(45%) sepia(60%) saturate(1200%) hue-rotate(230deg) brightness(100%) contrast(95%)',
          display: 'block',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 26, fontWeight: 800, color: '#1c1b2b', letterSpacing: '-0.03em', lineHeight: 1 }}>
          Ya<span style={{ color: '#7056e0' }}>ya</span>
        </span>
        <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 10, fontWeight: 700, color: '#7056e0', letterSpacing: '0.1em', textTransform: 'uppercase' as const, background: 'rgba(112,86,224,0.08)', padding: '3px 8px', borderRadius: 20, border: '1px solid rgba(112,86,224,0.15)', lineHeight: 1.8 }}>
          Portal Pediatra
        </span>
      </div>
    </div>
  )
}

export default function AguardandoPage() {
  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', padding: 24,
      background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(183,159,255,0.14) 0%, transparent 70%)',
      backgroundColor: '#f8f7ff',
    }}>
      <div style={{
        maxWidth: 420, width: '100%', padding: '40px 36px',
        background: 'rgba(255,255,255,0.85)',
        border: '1px solid rgba(183,159,255,0.18)',
        borderRadius: 20, textAlign: 'center',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 32px rgba(112,86,224,0.08), 0 1px 0 rgba(183,159,255,0.12)',
      }}>
        <YayaLogo />

        <div style={{ fontSize: 48, marginTop: 24, marginBottom: 8, lineHeight: 1 }}>⏳</div>

        <h1 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 22, fontWeight: 800, color: '#1c1b2b', letterSpacing: '-0.03em', margin: '16px 0 8px' }}>
          Cadastro recebido!
        </h1>
        <p style={{ fontFamily: 'Manrope, sans-serif', color: '#6f6896', fontSize: 14, lineHeight: 1.65, margin: '0 0 24px' }}>
          Estamos verificando seu CRM. Assim que aprovado, você receberá um email para acessar o portal.
        </p>

        <div style={{
          background: 'rgba(112,86,224,0.04)', border: '1px solid rgba(112,86,224,0.12)',
          borderRadius: 12, padding: '16px 20px', textAlign: 'left', marginBottom: 24,
        }}>
          <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: 11, fontWeight: 700, color: '#9e9cb0', textTransform: 'uppercase', letterSpacing: '0.09em', margin: '0 0 12px' }}>
            O que acontece agora
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { icon: 'mark_email_read', text: 'Você receberá um email de confirmação em breve' },
              { icon: 'verified',        text: 'Nossa equipe valida seu CRM manualmente' },
              { icon: 'lock_open',       text: 'Acesso liberado com email de boas-vindas' },
            ].map(({ icon, text }) => (
              <li key={icon} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 17, color: '#7056e0', marginTop: 1, flexShrink: 0 }}>{icon}</span>
                <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 13, color: '#6f6896', lineHeight: 1.5 }}>{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={handleLogout}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Manrope, sans-serif', fontSize: 13, color: '#9e9cb0', fontWeight: 600 }}
        >
          Sair
        </button>
      </div>
    </div>
  )
}
