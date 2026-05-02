import { supabase } from '../lib/supabase'

export default function AguardandoPage() {
  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: '#0d0a27' }}>
      <div className="w-full max-w-[420px] text-center">

        {/* Logo */}
        <div className="mb-10">
          <span
            className="text-[30px] font-[800] tracking-[-0.03em] lowercase"
            style={{ fontFamily: 'Manrope, sans-serif', color: '#e7e2ff' }}
          >
            ya<span style={{ color: '#b79fff' }}>ya</span>
          </span>
          <p className="text-[11px] font-[600] tracking-[0.14em] uppercase mt-1" style={{ color: 'rgba(231,226,255,0.4)' }}>
            portal pediatra
          </p>
        </div>

        <div className="text-[52px] mb-6 leading-none select-none">⏳</div>

        <h1 className="text-[22px] font-[800] tracking-[-0.02em] mb-3" style={{ color: '#e7e2ff' }}>
          Cadastro recebido!
        </h1>
        <p className="text-[14px] leading-[1.65] mb-8" style={{ color: 'rgba(231,226,255,0.5)' }}>
          Estamos verificando seu CRM. Assim que aprovado,<br />
          você receberá um email para acessar o portal.
        </p>

        {/* Card informativo */}
        <div
          className="rounded-xl border p-5 mb-8 text-left"
          style={{
            background: 'rgba(183,159,255,0.04)',
            borderColor: 'rgba(183,159,255,0.15)',
          }}
        >
          <p
            className="text-[11px] font-[600] tracking-[0.1em] uppercase mb-3"
            style={{ color: 'rgba(231,226,255,0.35)' }}
          >
            O que acontece agora
          </p>
          <ul className="flex flex-col gap-3">
            {[
              { icon: 'mark_email_read', text: 'Você receberá um email de confirmação em breve' },
              { icon: 'verified',        text: 'Nossa equipe valida seu CRM manualmente' },
              { icon: 'lock_open',       text: 'Acesso liberado com email de boas-vindas' },
            ].map(({ icon, text }) => (
              <li key={icon} className="flex items-start gap-3">
                <span className="material-symbols-outlined text-[17px] mt-0.5 shrink-0" style={{ color: '#b79fff' }}>
                  {icon}
                </span>
                <span className="text-[13px] leading-[1.5]" style={{ color: 'rgba(231,226,255,0.55)' }}>
                  {text}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={handleLogout}
          className="text-[13px] font-[600] cursor-pointer transition-opacity hover:opacity-70"
          style={{ color: 'rgba(231,226,255,0.4)' }}
        >
          Sair
        </button>

      </div>
    </div>
  )
}
