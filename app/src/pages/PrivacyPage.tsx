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
            Política de Privacidade
          </h1>
        </div>
      </section>

      <div className="px-5 space-y-4">
        {/* Intro */}
        <div className="bg-surface-container rounded-md p-4">
          <p className="font-body text-sm text-on-surface leading-relaxed">
            Esta política descreve como o <strong>Yaya (Baby Tracker)</strong> coleta,
            usa e protege suas informações pessoais. Nós levamos sua privacidade
            a sério e seguimos a Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018).
          </p>
          <p className="font-label text-xs text-on-surface-variant mt-3">
            Última atualização: 24 de abril de 2026
          </p>
        </div>

        {/* 1. Dados coletados */}
        <div className="bg-surface-container rounded-md p-4">
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
                  - Email (para login via Google ou código OTP)
                </li>
                <li className="font-body text-sm text-on-surface-variant">
                  - Nome de exibição do responsável
                </li>
              </ul>
            </div>
            <div>
              <p className="font-body text-sm text-on-surface font-medium">Dados do bebê</p>
              <ul className="mt-1 space-y-1">
                <li className="font-body text-sm text-on-surface-variant">
                  - Nome do bebê
                </li>
                <li className="font-body text-sm text-on-surface-variant">
                  - Data de nascimento
                </li>
                <li className="font-body text-sm text-on-surface-variant">
                  - Foto do bebê (opcional)
                </li>
              </ul>
            </div>
            <div>
              <p className="font-body text-sm text-on-surface font-medium">Registros de atividades</p>
              <ul className="mt-1 space-y-1">
                <li className="font-body text-sm text-on-surface-variant">
                  - Horários e detalhes de amamentação/mamadeira
                </li>
                <li className="font-body text-sm text-on-surface-variant">
                  - Trocas de fralda
                </li>
                <li className="font-body text-sm text-on-surface-variant">
                  - Períodos de sono
                </li>
                <li className="font-body text-sm text-on-surface-variant">
                  - Banhos
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* 2. Como usamos */}
        <div className="bg-surface-container rounded-md p-4">
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
              - <strong className="text-on-surface">Autenticação:</strong> seu email é usado
              exclusivamente para login seguro na plataforma.
            </li>
            <li className="font-body text-sm text-on-surface-variant">
              - <strong className="text-on-surface">Funcionamento do app:</strong> os registros
              de atividades são usados para exibir histórico, calcular projeções e
              gerar relatórios em PDF.
            </li>
            <li className="font-body text-sm text-on-surface-variant">
              - <strong className="text-on-surface">Compartilhamento familiar:</strong> através
              de códigos de convite, outro responsável pode acessar os dados do mesmo bebê.
            </li>
          </ul>
          <p className="font-body text-sm text-on-surface-variant mt-3">
            Nós <strong className="text-on-surface">não</strong> usamos seus dados para
            publicidade, analytics de terceiros ou qualquer outra finalidade além
            do funcionamento do app.
          </p>
        </div>

        {/* 3. Armazenamento e segurança */}
        <div className="bg-surface-container rounded-md p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="material-symbols-outlined text-primary text-xl">
              shield
            </span>
            <h2 className="text-on-surface font-headline text-sm font-bold">
              3. Armazenamento e segurança
            </h2>
          </div>
          <ul className="space-y-2">
            <li className="font-body text-sm text-on-surface-variant">
              - Seus dados são armazenados no <strong className="text-on-surface">Supabase</strong> (banco
              de dados PostgreSQL com infraestrutura na nuvem).
            </li>
            <li className="font-body text-sm text-on-surface-variant">
              - Fotos são armazenadas no <strong className="text-on-surface">Supabase Storage</strong> com
              acesso restrito.
            </li>
            <li className="font-body text-sm text-on-surface-variant">
              - Utilizamos <strong className="text-on-surface">Row Level Security (RLS)</strong> para
              garantir que cada usuário só acesse seus próprios dados.
            </li>
            <li className="font-body text-sm text-on-surface-variant">
              - Toda comunicação é feita via HTTPS com criptografia em trânsito.
            </li>
            <li className="font-body text-sm text-on-surface-variant">
              - Notificações são processadas localmente no dispositivo, sem envio
              de dados a servidores externos.
            </li>
          </ul>
        </div>

        {/* 4. Compartilhamento de dados */}
        <div className="bg-surface-container rounded-md p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="material-symbols-outlined text-primary text-xl">
              share
            </span>
            <h2 className="text-on-surface font-headline text-sm font-bold">
              4. Compartilhamento de dados
            </h2>
          </div>
          <p className="font-body text-sm text-on-surface-variant">
            <strong className="text-on-surface">Não vendemos nem alugamos seus dados.</strong>{' '}
            Os serviços terceiros que podem ter acesso aos dados são:
          </p>
          <ul className="mt-2 space-y-2">
            <li className="font-body text-sm text-on-surface-variant">
              - <strong className="text-on-surface">Supabase:</strong> banco de dados e autenticação (processador de dados).
            </li>
            <li className="font-body text-sm text-on-surface-variant">
              - <strong className="text-on-surface">Google:</strong> apenas se você optar por login com Google OAuth.
            </li>
            <li className="font-body text-sm text-on-surface-variant">
              - <strong className="text-on-surface">Serviço de IA (yaIA):</strong> quando você usa o assistente yaIA,
              dados contextuais do bebê (rotina resumida, idade, registros recentes) são enviados a um
              serviço de inteligência artificial para gerar a resposta. Esses dados são usados exclusivamente
              para processar sua pergunta e não são armazenados pelo provedor de IA nem usados para treinar modelos.
            </li>
            <li className="font-body text-sm text-on-surface-variant">
              - <strong className="text-on-surface">AdMob (Google):</strong> exibição de anúncios para usuários
              do plano gratuito. Coleta identificador de publicidade do dispositivo conforme a política do Google.
            </li>
            <li className="font-body text-sm text-on-surface-variant">
              - <strong className="text-on-surface">RevenueCat:</strong> gerenciamento de assinaturas e compras.
            </li>
          </ul>
        </div>

        {/* 4b. Assistente yaIA */}
        <div className="bg-surface-container rounded-md p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="material-symbols-outlined text-primary text-xl">
              auto_awesome
            </span>
            <h2 className="text-on-surface font-headline text-sm font-bold">
              4a. Assistente yaIA
            </h2>
          </div>
          <p className="font-body text-sm text-on-surface-variant">
            O yaIA é um assistente de inteligência artificial que responde perguntas sobre a
            rotina do seu bebê com base nos registros do app. Ao enviar uma mensagem:
          </p>
          <ul className="mt-2 space-y-1">
            <li className="font-body text-sm text-on-surface-variant">
              - Um resumo da rotina recente do bebê (registros, idade, nome) é enviado junto com
              sua pergunta ao serviço de IA para contextualizar a resposta.
            </li>
            <li className="font-body text-sm text-on-surface-variant">
              - Nenhum dado identificável do responsável (email, nome completo) é enviado ao serviço de IA.
            </li>
            <li className="font-body text-sm text-on-surface-variant">
              - O histórico de conversa fica armazenado no nosso banco de dados (Supabase) e
              pode ser apagado a qualquer momento nas configurações.
            </li>
            <li className="font-body text-sm text-on-surface-variant">
              - Usuários do plano gratuito têm limite de 10 mensagens por mês.
            </li>
          </ul>
        </div>

        {/* 5. Seus direitos */}
        <div className="bg-surface-container rounded-md p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="material-symbols-outlined text-primary text-xl">
              gavel
            </span>
            <h2 className="text-on-surface font-headline text-sm font-bold">
              5. Seus direitos (LGPD)
            </h2>
          </div>
          <p className="font-body text-sm text-on-surface-variant mb-2">
            De acordo com a LGPD, você tem direito a:
          </p>
          <ul className="space-y-2">
            <li className="font-body text-sm text-on-surface-variant">
              - <strong className="text-on-surface">Acessar</strong> todos os seus dados pessoais
              armazenados.
            </li>
            <li className="font-body text-sm text-on-surface-variant">
              - <strong className="text-on-surface">Exportar</strong> seus dados (disponível via
              exportação em PDF no app).
            </li>
            <li className="font-body text-sm text-on-surface-variant">
              - <strong className="text-on-surface">Corrigir</strong> dados incorretos ou
              desatualizados.
            </li>
            <li className="font-body text-sm text-on-surface-variant">
              - <strong className="text-on-surface">Excluir</strong> seus dados (você pode limpar
              o histórico diretamente no app ou solicitar exclusão completa da conta).
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

        {/* 6. Privacidade de crianças */}
        <div className="bg-surface-container rounded-md p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="material-symbols-outlined text-primary text-xl">
              child_care
            </span>
            <h2 className="text-on-surface font-headline text-sm font-bold">
              6. Privacidade de crianças
            </h2>
          </div>
          <p className="font-body text-sm text-on-surface-variant">
            O Yaya é um app destinado a pais e responsáveis. Não coletamos dados
            diretamente de crianças. Os dados sobre bebês (nome, data de nascimento,
            foto e registros de atividades) são inseridos e gerenciados exclusivamente
            pelos pais ou responsáveis legais.
          </p>
        </div>

        {/* 7. Alterações */}
        <div className="bg-surface-container rounded-md p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="material-symbols-outlined text-primary text-xl">
              edit_document
            </span>
            <h2 className="text-on-surface font-headline text-sm font-bold">
              7. Alterações nesta política
            </h2>
          </div>
          <p className="font-body text-sm text-on-surface-variant">
            Podemos atualizar esta política periodicamente. Alterações significativas
            serão comunicadas pelo app. Recomendamos que você revise esta página
            ocasionalmente.
          </p>
        </div>

        {/* 8. Contato */}
        <div className="bg-surface-container rounded-md p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="material-symbols-outlined text-primary text-xl">
              mail
            </span>
            <h2 className="text-on-surface font-headline text-sm font-bold">
              8. Contato
            </h2>
          </div>
          <p className="font-body text-sm text-on-surface-variant">
            Se você tiver dúvidas sobre esta política ou quiser exercer seus
            direitos, entre em contato:
          </p>
          <div className="mt-3 space-y-1">
            <p className="font-body text-sm text-on-surface">
              Dyego Nunes (Desenvolvedor responsável)
            </p>
            <p className="font-body text-sm text-primary">
              contato@yayababy.app
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
