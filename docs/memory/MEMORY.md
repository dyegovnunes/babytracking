## Build atual
- iOS: v1.9.4 / build 67 — TestFlight ativo. App Store Connect: selecionar build 67 e submeter review.
- Android: v1.9.4 / versionCode 67 — AAB em `build/yaya-1.9.4-build67.aab` (16.2MB). Play Console: closed testing, aguardando 14 dias (~12 maio).
- Próximo bump: iOS build 68, Android versionCode 68 (SEMPRE iguais, SEMPRE no mesmo commit).

## Regras de build — OBRIGATÓRIO seguir

### iOS + Android sempre juntos
- Bumpar `codemagic.yaml` (MARKETING_VERSION + CURRENT_PROJECT_VERSION) e `app/android/app/build.gradle` (versionCode + versionName) no **mesmo commit**.
- iOS build number == Android versionCode. Nunca desalinhar.
- `app/android/app/build.gradle` está no `.gitignore` mas é rastreado — usar `git add -f` para commitar.

### Build Android (local)
```bash
cd app
npm run build:native        # build + remove vídeos do dist/ automaticamente
npx cap sync android
cd android && ./gradlew bundleRelease
# Copiar para build/:
cp app/android/app/build/outputs/bundle/release/app-release.aab build/yaya-X.X.X-buildNN.aab
```
- JAVA_HOME: `export JAVA_HOME="/c/Program Files/Android/Android Studio/jbr"`
- Keystore: `app/android/app/yaya-release.keystore` (senha: yayababy2026)

### Build iOS (Codemagic — automático no push)
- Todo push no `main` dispara build iOS automaticamente.
- O Codemagic faz tudo: compila, assina, sobe para TestFlight.
- Se o build number já existe no App Store Connect → erro "attribute already used". Solução: bumpar o build number.

### Assets: public/ vs bundle nativo
- `app/public/` é compartilhado entre web e nativo. Tudo que está lá entra no AAB/IPA.
- Vídeos (`lp/yaia.mp4`, `lp/relatorio.mp4`) ficam em `public/` para o **site web** mas são **removidos do `dist/`** antes do `cap sync`:
  - iOS: passo "Remove web-only assets" no `codemagic.yaml` faz `rm -f app/dist/lp/*.mp4`
  - Android: `npm run build:native` (em vez de `npm run build`) já remove os vídeos do dist/
- NUNCA usar `npm run build` + `cap sync android` diretamente — usar `npm run build:native`.

## Features implementadas
- **Sua Biblioteca Yaya — infoprodutos (2026-04-27)** — Primeiro infoproduto pago lançado: "Guia das Últimas Semanas" R$47. Stack completa: 7 tabelas Supabase (`guides`, `guide_sections`, `guide_purchases`, `guide_progress`, `guide_highlights`, `guide_notes`, `guide_quiz_responses`) + função `process_guide_purchase` SQL idempotente concedendo 30d Yaya+ cortesia (padrão GREATEST do MGM v1) + bucket público `guide-images` + bucket privado `guide-assets` + edge functions `stripe-create-checkout-session` e `stripe-webhook` (com magic link via Resend). Admin do blog em `/admin/biblioteca` (CRUD de guias e seções, Tiptap por tipo linear/quiz/checklist/part). Leitor SPA premium em `blog.yayababy.app/sua-biblioteca/[slug]/ler` com tipografia editorial Fraunces (corpo + h1/h2/h3 do conteúdo) + Manrope/PJS (UI), drop cap, pull quote, 4 callouts (`:::ciencia/mito/alerta/yaya`), highlights, notas auto-save, quiz fullscreen com 4 perfis, countdown 3s pra próxima seção, light mode espelhando theme.css do blog, modo leitura, resume reading. Pricing R$47 lançamento (Stripe price `price_1TQcxQ2ZxL6z9xaKdR0vjZvJ`). Conteúdo seedado via `scripts/seed-guia-ultimas-semanas.ts` (parse markdown hierárquico, conversão de callouts, upload de imagens PNG→WebP).
- [iOS Submission v1.9.2](project_ios_submission_v192.md) — Preparação completa para Apple Review: 12 fixes (delete account, paywall IAP, RC diagnostic, AdMob ATT+SKAdNetwork+test mode, RewardedAdModal popstate fix, foto bebê free, SharedReports headers+toast+theme, Marcos simplificado, auto-register sem gate, BabySwitcher label, AddBabySheet early paywall, MGM escondido). Build 49 no TestFlight. (2026-04-22)
- [App Store Connect Setup](project_appstore_connect_setup.md) — Paid Apps Agreement + Sicredi banking (COMPE 748) + W-8BEN + U.S. Certificate of Foreign Status → todos Active. Chave RC iOS: `appl_EsyNTUbNiabdxStyPcJgQIXUIKo`. Sandbox Tester criado. (2026-04-22)
- [Super Relatório](project_super_relatorio.md) — NÃO existe mais PDF (só print da página web). Link compartilhável ganhou 3 audiences (pediatrician/caregiver/family), conteúdo novo (vacinas/marcos/saltos/medicamentos), quiet hours persistido em babies, OMS por gênero, bcrypt + rate limit + log de acesso visível pro pai. 3 migrations `20260420a/b/c`. (2026-04-20)
- [Timeline unificada](project_timeline_unificada.md) — /history e "Últimos registros" agregam logs + shifts + vacinas + marcos + medicamentos via features/timeline/. 4 filtros, regra "4h-ou-5" na home, projeção com janela 1h pra scheduled, card de medicamento com check inline, alert de overdue complementa. Commits da91209 + e405b1b (2026-04-17)
- [Saltos feature](project_saltos_feature.md) — página /saltos com timeline dos 10 saltos, régua de emoções diária, dados reais vs logs, intervalos "hora de praticar"
- [Marcos + Vacinas](project_marcos_vacinas.md) — auto-register retroativo na criação do bebê, checkbox UX unificado, modal welcome, categorias coloridas, unlock 10min via rewarded ad em vacinas, Capacitor Camera no APK
- [Multi-baby & Roles](project_multi_baby_roles.md) — 4 papéis (parent/guardian/caregiver/pediatrician), BabySwitcher com pontos de acesso (tap nome/long press perfil/double tap), premium por bebê, realtime removal/promoção, AddBabySheet/JoinWithCodeSheet inline
- [Light mode](project_light_mode.md) — tema claro + iluminação adaptada atrelada a quietHours, toggle no Header global, CSS variables scoped (sem prefixos dark:)
- [Premium v2](project_premium_v2.md) — matriz free/Yaya+ atualizada: limites enforçados (1 bebê/1 cuidador/1 parent no free), liberações com ads em marcos/saltos/vacinas, histórico reduzido pra hoje+ontem, AdBanner migrado pro AppShell (crash fix)

- [Biblioteca — processo completo de novo guia](process_biblioteca_novo_guia.md) — passo a passo do zero: estrutura de conteúdo, SQL de criação (guides + guide_sections por type), callouts, conclusão, Stripe, checklist de publicação, arquivos-chave do código.
- [Biblioteca — flashcards de revisão](project_biblioteca_flashcards_padrao.md) — padrão completo: type='flashcards' + data.cards[{front,back}], FlashcardSection.tsx, constraint SQL, exclusão do cálculo de progresso, botão "Pular" sempre visível. Implementado no Guia das Últimas Semanas (2026-04-28).

## Convenções do projeto (descobertas nesta sessão)
- [Patterns + armadilhas](feedback_patterns.md) — AdMob, PointerEvents, useSheetBackClose, RLS silencioso, auto-register, checkbox toggle, CSS variables, realtime delete, Capacitor Camera, inventário de localStorage keys
- [Commit + push + build ao finalizar](feedback_commit_push_build.md) — sempre fechar o ciclo completo, não parar em "só editei"
- [Checklist pré-push iOS Codemagic](feedback_ios_build_checklist.md) — rodar `npm run build` (não só --noEmit), conferir arquivos stale no git status, catálogo de erros TS típicos
- [Proibido em-dash em copy](feedback_no_em_dash.md) — nunca usar `—` (U+2014) em texto visível ao usuário ou em prompts da IA
- [Layout sob AppShell](feedback_appshell_layout.md) — nada de `h-[100dvh]` em outlet, elementos fixed no bottom precisam offset da BottomNav (4rem+safe+ad), auto-scroll via `<main>`

## Contexto anterior
- [Apple Review v1.7.0](project_apple_review_v1_7_0.md) — v1.7.0/build 34 submitted 2026-04-15 fixing 4 rejections (Sign in with Apple native, delete-account, photo crash, IAP). Product IDs, prices, demo account Sofia on teste@yayababy.app
- [Testing premium](project_testing_premium.md) — All users premium for testing; reset + deploy group logic on official launch
- [Push Notifications](../../Documents/Claude/Agencia%20de%20desenvolvimento/BabyTracking/docs/PUSH_NOTIFICATIONS.md) — Documento padrao de push notifications: arquitetura, edge functions, anti-spam, configuracao FCM, tabelas, cron jobs
- [RLS admin policies](feedback_rls_admin.md) — Never inline profiles subquery in RLS policies; use is_admin() SECURITY DEFINER function
- [iOS Build Signing](project_ios_build_signing.md) — RESOLVIDO via Codemagic managed signing com RSA key persistida em secret `CERTIFICATE_PRIVATE_KEY` do grupo `yaya_ios`. Cert reusado entre builds sem revocação.

## Pending / próximos passos
- **[Biblioteca — engajamento + jornada](todo_biblioteca_engajamento_jornada.md)** — checklist interativo (substitui markdown `- [ ]` por estado persistido em DB), comemoração a cada bloco completo (parte do guia) + comemoração maior ao concluir o guia inteiro com imagem compartilhável. Conexão estratégica com retenção Yaya+ ao final dos 30d de cortesia. Schema candidato: `guide_checklist_state` + `guide_milestones`. Anotado pelo usuário em 2026-04-27 — retomar quando ele falar de "engajamento", "retenção", "comemoração" ou "checklist interativo".
- **Biblioteca — landing pública** ainda não construída (`/sua-biblioteca` catálogo + `/sua-biblioteca/[slug]` LP de venda). Foi explicitamente despriorizada pelo usuário ("vamos deixar ela por último"). Specs em `content/infoprodutos/guia-ultimas-semanas/lp-quente.md` e `lp-fria.md`.
- **Biblioteca — admin de compras + analytics**: `/admin/biblioteca/purchases` e `/admin/biblioteca/analytics` planejados, ainda não construídos. Lista de compradores com filtros, refunds, % conclusão por seção, drop-off, distribuição de perfis do quiz.
- **Biblioteca — dupla compra (backlog)**: usuário deslogado na LP não sabe que já tem acesso (compra ou Yaya+) e pode comprar de novo. Solução planejada: pedir email antes de redirecionar pro Stripe (campo inline na LP, igual ao yayababy.app waitlist), edge function verifica `guide_purchases.status='completed'` ou `subscription_plan IN (annual,lifetime)` para aquele email antes de criar sessão. Se já tem acesso, retorna `already_owned: true` e GuideCTA exibe link de acesso direto.
- **Yaya+ via web (Stripe) — backlog**: vender assinatura Yaya+ fora das lojas (Apple/Google) para reduzir custos de comissão (30%). Stripe já está integrado para guias; ampliar para planos recorrentes. Requer: produtos Stripe de assinatura (mensal/anual), webhook atualiza `is_premium + subscription_plan` no profiles (mesmo padrão do RC webhook), rota de gerenciamento de assinatura web. Considerar implicações com Apple Review (não pode mencionar alternativa web dentro do app iOS).
- **Mockups do app no Guia das Últimas Semanas**: 5 imagens (`mockup-app-introducao/amamentacao/grafico-sono/yaia/relatorio-pediatra`) já estão upadas no bucket `guide-images/ultimas-semanas/img/` mas com TELA BRANCA — overlay de screenshots ainda pendente do Dyego no Photoshop. Quando substituir, fazer upsert no mesmo path (URLs preservadas).
- IAP iOS: validar sandbox (compra mensal/anual/vitalício com Sandbox Tester) → se OK, submeter Apple App Review
- AdMob iOS: real ads ficam bloqueados até publicação na App Store. Test ads OK via debug panel.
- Conta demo `teste@yayababy.app`: dados desatualizados (últimos logs de 2026-04-20). Popular antes de submeter.
- Review Information no App Store Connect: atualizar notas para as novas features (Multi-baby, Shared Report, Marcos, Medicamentos, Light mode).
