import { useNavigate } from 'react-router-dom'

export default function PrivacyPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-surface pb-8 page-enter">
      <section className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-xl">
              arrow_back
            </span>
          </button>
          <h1 className="font-headline text-2xl font-bold text-on-surface">
            Politica de Privacidade
          </h1>
        </div>
      </section>

      <div className="px-5 space-y-4">
        {/* Intro */}
        <div className="bg-surface-container rounded-lg p-4">
          <p className="font-body text-sm text-on-surface leading-relaxed">
            Esta politica descreve como o <strong>Yaya (Baby Tracker)</strong> coleta,
            usa e protege suas informacoes pessoais. Nos levamos sua privacidade
            a serio e seguimos a Lei Geral de Protecao de Dados (LGPD - Lei 13.709/2018).
          </p>
          <p className="font-label text-xs text-on-surface-variant mt-3">
            Ultima atualizacao: 06 de abril de 2026
          </p>
        </div>

        {/* 1. Dados coletados */}
        <div className="bg-surface-container rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="material-symbols-outlined text-primary text-xl">
              database
            </span>
            <h2 className="text-on-surface font-headline text-sm font-bold">
              1. Quais dados coletamos
            </h2>
          </div>
          <div className="space-y-3">
            <div>
              <p className="font-body text-sm text-on-surface font-medium">Dados da conta</p>
              <ul className="mt-1 space-y-1">
                <li className="font-body text-sm text-on-surface-variant">
                  - Email (para login via Google ou codigo OTP)
                </li>
                <li className="font-body text-sm text-on-surface-variant">
                  - Nome de exibicao do responsavel
                </li>
              </ul>
            </div>
            <div>
              <p className="font-body text-sm text-on-surface font-medium">Dados do bebe</p>
              <ul className="mt-1 space-y-1">
                <li className="font-body text-sm text-on-surface-variant">
                  - Nome do bebe
                </li>
                <li className="font-body text-sm text-on-surface-variant">
                  - Data de nascimento
                </li>
                <li className="font-body text-sm text-on-surface-variant">
                  - Foto do bebe (opcional)
                </li>
              </ul>
            </div>
            <div>
              <p className="font-body text-sm text-on-surface font-medium">Registros de atividades</p>
              <ul className="mt-1 space-y-1">
                <li className="font-body text-sm text-on-surface-variant">
                  - Horarios e detalhes de amamentacao/mamadeira
                </li>
                <li className="font-body text-sm text-on-surface-variant">
                  - Trocas de fralda
                </li>
                <li className="font-body text-sm text-on-surface-variant">
                  - Periodos de sono
                </li>
                <li className="font-body text-sm text-on-surface-variant">
                  - Banhos
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* 2. Como usamos */}
        <div className="bg-surface-container rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="material-symbols-outlined text-primary text-xl">
              info
            </span>
            <h2 className="text-on-surface font-headline text-sm font-bold">
              2. Como usamos seus dados
            </h2>
          </div>
          <ul className="space-y-2">
            <li className="font-body text-sm text-on-surface-variant">
              - <strong className="text-on-surface">Autenticacao:</strong> seu email e usado
              exclusivamente para login seguro na plataforma.
            </li>
            <li className="font-body text-sm text-on-surface-variant">
              - <strong className="text-on-surface">Funcionamento do app:</strong> os registros
              de atividades sao usados para exibir historico, calcular projecoes e
              gerar relatorios em PDF.
            </li>
            <li className="font-body text-sm text-on-surface-variant">
              - <strong className="text-on-surface">Compartilhamento familiar:</strong> atraves
              de codigos de convite, outro responsavel pode acessar os dados do mesmo bebe.
            </li>
          </ul>
          <p className="font-body text-sm text-on-surface-variant mt-3">
            Nos <strong className="text-on-surface">nao</strong> usamos seus dados para
            publicidade, analytics de terceiros ou qualquer outra finalidade alem
            do funcionamento do app.
          </p>
        </div>

        {/* 3. Armazenamento e seguranca */}
        <div className="bg-surface-container rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="material-symbols-outlined text-primary text-xl">
              shield
            </span>
            <h2 className="text-on-surface font-headline text-sm font-bold">
              3. Armazenamento e seguranca
            </h2>
          </div>
          <ul className="space-y-2">
            <li className="font-body text-sm text-on-surface-variant">
              - Seus dados sao armazenados no <strong className="text-on-surface">Supabase</strong> (banco
              de dados PostgreSQL com infraestrutura na nuvem).
            </li>
            <li className="font-body text-sm text-on-surface-variant">
              - Fotos sao armazenadas no <strong className="text-on-surface">Supabase Storage</strong> com
              acesso restrito.
            </li>
            <li className="font-body text-sm text-on-surface-variant">
              - Utilizamos <strong className="text-on-surface">Row Level Security (RLS)</strong> para
              garantir que cada usuario so acesse seus proprios dados.
            </li>
            <li className="font-body text-sm text-on-surface-variant">
              - Toda comunicacao e feita via HTTPS com criptografia em transito.
            </li>
            <li className="font-body text-sm text-on-surface-variant">
              - Notificacoes sao processadas localmente no dispositivo, sem envio
              de dados a servidores externos.
            </li>
          </ul>
        </div>

        {/* 4. Compartilhamento de dados */}
        <div className="bg-surface-container rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="material-symbols-outlined text-primary text-xl">
              share
            </span>
            <h2 className="text-on-surface font-headline text-sm font-bold">
              4. Compartilhamento de dados
            </h2>
          </div>
          <p className="font-body text-sm text-on-surface-variant">
            <strong className="text-on-surface">Nao vendemos, alugamos ou compartilhamos
            seus dados com terceiros.</strong>
          </p>
          <p className="font-body text-sm text-on-surface-variant mt-2">
            Os unicos servicos que tem acesso aos dados sao:
          </p>
          <ul className="mt-2 space-y-1">
            <li className="font-body text-sm text-on-surface-variant">
              - <strong className="text-on-surface">Supabase:</strong> provedor de banco de dados
              e autenticacao (processador de dados).
            </li>
            <li className="font-body text-sm text-on-surface-variant">
              - <strong className="text-on-surface">Google:</strong> apenas se voce optar por login
              com Google OAuth (dados minimos de autenticacao).
            </li>
          </ul>
          <p className="font-body text-sm text-on-surface-variant mt-2">
            Nao utilizamos ferramentas de analytics, rastreamento ou publicidade.
          </p>
        </div>

        {/* 5. Seus direitos */}
        <div className="bg-surface-container rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="material-symbols-outlined text-primary text-xl">
              gavel
            </span>
            <h2 className="text-on-surface font-headline text-sm font-bold">
              5. Seus direitos (LGPD)
            </h2>
          </div>
          <p className="font-body text-sm text-on-surface-variant mb-2">
            De acordo com a LGPD, voce tem direito a:
          </p>
          <ul className="space-y-2">
            <li className="font-body text-sm text-on-surface-variant">
              - <strong className="text-on-surface">Acessar</strong> todos os seus dados pessoais
              armazenados.
            </li>
            <li className="font-body text-sm text-on-surface-variant">
              - <strong className="text-on-surface">Exportar</strong> seus dados (disponivel via
              exportacao em PDF no app).
            </li>
            <li className="font-body text-sm text-on-surface-variant">
              - <strong className="text-on-surface">Corrigir</strong> dados incorretos ou
              desatualizados.
            </li>
            <li className="font-body text-sm text-on-surface-variant">
              - <strong className="text-on-surface">Excluir</strong> seus dados (voce pode limpar
              o historico diretamente no app ou solicitar exclusao completa da conta).
            </li>
            <li className="font-body text-sm text-on-surface-variant">
              - <strong className="text-on-surface">Revogar consentimento</strong> a qualquer momento.
            </li>
          </ul>
          <p className="font-body text-sm text-on-surface-variant mt-3">
            Para exercer qualquer um desses direitos, entre em contato pelo email
            abaixo.
          </p>
        </div>

        {/* 6. Privacidade de criancas */}
        <div className="bg-surface-container rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="material-symbols-outlined text-primary text-xl">
              child_care
            </span>
            <h2 className="text-on-surface font-headline text-sm font-bold">
              6. Privacidade de criancas
            </h2>
          </div>
          <p className="font-body text-sm text-on-surface-variant">
            O Yaya e um app destinado a pais e responsaveis. Nao coletamos dados
            diretamente de criancas. Os dados sobre bebes (nome, data de nascimento,
            foto e registros de atividades) sao inseridos e gerenciados exclusivamente
            pelos pais ou responsaveis legais.
          </p>
        </div>

        {/* 7. Alteracoes */}
        <div className="bg-surface-container rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="material-symbols-outlined text-primary text-xl">
              edit_document
            </span>
            <h2 className="text-on-surface font-headline text-sm font-bold">
              7. Alteracoes nesta politica
            </h2>
          </div>
          <p className="font-body text-sm text-on-surface-variant">
            Podemos atualizar esta politica periodicamente. Alteracoes significativas
            serao comunicadas pelo app. Recomendamos que voce revise esta pagina
            ocasionalmente.
          </p>
        </div>

        {/* 8. Contato */}
        <div className="bg-surface-container rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="material-symbols-outlined text-primary text-xl">
              mail
            </span>
            <h2 className="text-on-surface font-headline text-sm font-bold">
              8. Contato
            </h2>
          </div>
          <p className="font-body text-sm text-on-surface-variant">
            Se voce tiver duvidas sobre esta politica ou quiser exercer seus
            direitos, entre em contato:
          </p>
          <div className="mt-3 space-y-1">
            <p className="font-body text-sm text-on-surface">
              Dyego Nunes (Desenvolvedor responsavel)
            </p>
            <p className="font-body text-sm text-primary">
              dyegovnunes@gmail.com
            </p>
            <p className="font-body text-sm text-on-surface-variant">
              yayababy.app
            </p>
          </div>
        </div>

        <div className="pt-2 text-center">
          <p className="font-label text-[10px] text-on-surface-variant/50">
            Yaya v1.0.0
          </p>
        </div>
      </div>
    </div>
  )
}
