import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-surface text-on-surface overflow-x-hidden">
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between max-w-4xl mx-auto">
        <div className="flex items-center gap-2">
          <img
            src="./logo-symbol.png"
            alt="Yaya"
            className="w-8 h-8"
            style={{ filter: 'brightness(0) saturate(100%) invert(72%) sepia(40%) saturate(1500%) hue-rotate(220deg) brightness(105%) contrast(95%)' }}
          />
          <span className="font-headline text-xl font-extrabold tracking-tight">
            Ya<span className="text-primary">ya</span>
          </span>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="px-5 py-2 rounded-full bg-primary/10 text-primary font-label font-semibold text-sm hover:bg-primary/20 transition-colors"
        >
          Entrar
        </button>
      </header>

      {/* Hero */}
      <section className="px-6 pt-8 pb-12 max-w-4xl mx-auto text-center">
        <div className="mb-6">
          <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary font-label text-xs font-semibold mb-4">
            Gratuito para comecar
          </span>
          <h1 className="font-headline text-4xl md:text-5xl font-extrabold leading-tight mb-4">
            A rotina do seu bebe,<br />
            <span className="text-primary">com calma e clareza.</span>
          </h1>
          <p className="font-body text-base md:text-lg text-on-surface-variant max-w-md mx-auto leading-relaxed">
            Registre amamentacao, fraldas, sono e banho em segundos.
            Receba lembretes inteligentes e compartilhe com quem cuida junto.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
          <button
            onClick={() => navigate('/login')}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary font-label font-bold text-base transition-opacity hover:opacity-90"
          >
            Comecar agora
          </button>
          <a
            href="#funcionalidades"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-surface-container-low text-on-surface font-label font-semibold text-base hover:bg-surface-container-high transition-colors text-center"
          >
            Conhecer o app
          </a>
        </div>

        {/* App Preview */}
        <div className="relative max-w-xs mx-auto">
          <div className="rounded-[2rem] overflow-hidden shadow-2xl shadow-primary/10 border border-outline-variant/10">
            <img
              src="./prints/inicio.png"
              alt="Tela principal do Yaya"
              className="w-full"
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="funcionalidades" className="px-6 py-16 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-headline text-2xl md:text-3xl font-extrabold mb-3">
            Tudo que voce precisa,<br />nada que voce nao precisa.
          </h2>
          <p className="font-body text-sm text-on-surface-variant max-w-md mx-auto">
            Simples de usar, mesmo com uma mao so e o bebe no colo.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Feature 1 */}
          <div className="bg-surface-container rounded-2xl p-5">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-primary text-2xl">restaurant</span>
            </div>
            <h3 className="font-headline text-base font-bold mb-1">Amamentacao e mamadeira</h3>
            <p className="font-body text-sm text-on-surface-variant leading-relaxed">
              Registre peito esquerdo, direito ou ambos. Acompanhe o tempo desde a ultima mamada.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-surface-container rounded-2xl p-5">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-primary text-2xl">baby_changing_station</span>
            </div>
            <h3 className="font-headline text-base font-bold mb-1">Fraldas</h3>
            <p className="font-body text-sm text-on-surface-variant leading-relaxed">
              Xixi ou coco — registre em um toque e saiba quando foi a ultima troca.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-surface-container rounded-2xl p-5">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-primary text-2xl">bedtime</span>
            </div>
            <h3 className="font-headline text-base font-bold mb-1">Sono</h3>
            <p className="font-body text-sm text-on-surface-variant leading-relaxed">
              Marque quando dormiu e acordou. O app calcula o tempo e projeta a proxima soneca.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-surface-container rounded-2xl p-5">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-primary text-2xl">notifications_active</span>
            </div>
            <h3 className="font-headline text-base font-bold mb-1">Lembretes inteligentes</h3>
            <p className="font-body text-sm text-on-surface-variant leading-relaxed">
              Projecoes baseadas no historico real do seu bebe. Sem alarmes genericos.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-surface-container rounded-2xl p-5">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-primary text-2xl">group</span>
            </div>
            <h3 className="font-headline text-base font-bold mb-1">Compartilhe com a familia</h3>
            <p className="font-body text-sm text-on-surface-variant leading-relaxed">
              Convide o pai, a avo ou a baba. Todos veem e registram no mesmo perfil do bebe.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="bg-surface-container rounded-2xl p-5">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-primary text-2xl">picture_as_pdf</span>
            </div>
            <h3 className="font-headline text-base font-bold mb-1">Relatorio em PDF</h3>
            <p className="font-body text-sm text-on-surface-variant leading-relaxed">
              Exporte o historico completo para levar na consulta com o pediatra.
            </p>
          </div>
        </div>
      </section>

      {/* App Screenshots */}
      <section className="px-6 py-16 max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="font-headline text-2xl md:text-3xl font-extrabold mb-3">
            Veja o Yaya em acao
          </h2>
          <p className="font-body text-sm text-on-surface-variant">
            Feito para ser simples, bonito e rapido.
          </p>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory -mx-6 px-6 scrollbar-hide">
          {[
            { src: './prints/inicio.png', label: 'Tela inicial' },
            { src: './prints/historico.png', label: 'Historico' },
            { src: './prints/perfil.png', label: 'Perfil' },
            { src: './prints/config.png', label: 'Configuracoes' },
          ].map((screen) => (
            <div key={screen.label} className="flex-none w-52 snap-center">
              <div className="rounded-2xl overflow-hidden shadow-lg shadow-primary/5 border border-outline-variant/10">
                <img src={screen.src} alt={screen.label} className="w-full" />
              </div>
              <p className="font-label text-xs text-on-surface-variant text-center mt-2">{screen.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Social Proof / Trust */}
      <section className="px-6 py-16 max-w-4xl mx-auto">
        <div className="bg-surface-container rounded-2xl p-8 text-center">
          <span className="material-symbols-outlined text-primary text-4xl mb-4 block">favorite</span>
          <h2 className="font-headline text-2xl font-extrabold mb-3">
            Feito por pais, para pais.
          </h2>
          <p className="font-body text-base text-on-surface-variant max-w-md mx-auto leading-relaxed mb-6">
            Sabemos como e estar cansado e ainda precisar lembrar de tudo.
            O Yaya cuida dos detalhes para voce cuidar do que importa.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="px-8 py-3.5 rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary font-label font-bold text-base transition-opacity hover:opacity-90"
          >
            Comecar gratuitamente
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-outline-variant/10 max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img
              src="./logo-symbol.png"
              alt="Yaya"
              className="w-6 h-6"
              style={{ filter: 'brightness(0) saturate(100%) invert(72%) sepia(40%) saturate(1500%) hue-rotate(220deg) brightness(105%) contrast(95%)' }}
            />
            <span className="font-headline text-sm font-bold">
              Ya<span className="text-primary">ya</span>
            </span>
            <span className="font-label text-xs text-on-surface-variant">
              — Cada momento conta.
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/privacy"
              className="font-label text-xs text-on-surface-variant hover:text-on-surface transition-colors"
            >
              Politica de Privacidade
            </a>
            <a
              href="mailto:contato@yayababy.app"
              className="font-label text-xs text-on-surface-variant hover:text-on-surface transition-colors"
            >
              contato@yayababy.app
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
