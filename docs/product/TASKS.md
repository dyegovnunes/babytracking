# Tasks — Yaya Baby

---

## Active

### 🔴 P0 — Crítico (Abril)

- [x] ~~**[P0] Apple Auth funcionando iOS** - Configurado e funcionando. Build submetido para review.~~ (2026-04-13)

#### Push Notifications — ✅ Implementado (12/04). Spec: PUSH_NOTIFICATIONS_SPEC.md · Guia: PUSH_IMPLEMENTATION_GUIDE.md

#### Relatório PDF Pediatra — ✅ Implementado (12/04). Spec: PDF_PEDIATRA_SPEC.md · Guia: PDF_IMPLEMENTATION_GUIDE.md

#### MGM — Member-Get-Member

- [ ] **[P0-MGM] Programa de indicação** - Indicador ganha 15 dias Yaya+ quando indicado assina qualquer plano pago. Cumulativo, sem limite. Deep link personalizado. Ref: regras em .auto-memory/project_mgm_rules.md. `growth` `dev` `2026-05-10`

### 🟡 P1 — Importante (Maio)

- [ ] **[P1] Previsão de Sono IA (SweetSpot)** - Algoritmo de wake windows + padrão histórico. "Próxima janela de sono: 14h30". Feature Yaya+. `dev` `ia` `2026-05-15`
- [ ] **[P1] Modo Light** - Tema claro completo. Toggle no perfil + detecção automática por horário. `dev` `design` `2026-05-01`
- [ ] **[P1] Relatório do Turno (Babá)** - Resumo automático do turno. Push para pais quando cuidador registra. Ref: doc canais profissionais, seção 2.3. `dev` `babá` `2026-05-08`
- [ ] **[P1] Marcos do Desenvolvimento** - Milestones por idade (CDC/SBP). Registro com foto, celebração, imagem compartilhável, repositório/galeria. Spec: MARCOS_DESENVOLVIMENTO_SPEC.md. Conectado com saltos (PUSH-8). `dev` `retenção` `2026-05-15`
- [ ] **[P1] Perfil de Cuidador (Modo Cuidador)** - Tipo de acesso (babá, avó, creche). UI simplificada. Permissão limitada. Ref: doc canais profissionais, seção 2.2. `dev` `babá` `2026-04-25`
- [ ] **[P1] Reorganizar UX de Settings** - Dividir em seções: Bebê, Notificações, Cuidadores, Yaya+, Privacidade, Sobre. Cada seção = tela separada. `dev` `ux` `2026-05-01`
- [ ] **[P1] Insights por faixa etária (0-24m)** - Redesign completo da InsightsPage. Resumo do dia + insight cards contextuais. Spec: INSIGHTS_REDESIGN_SPEC.md + INSIGHTS_SPEC.md. Free: 2 insights, Yaya+: todos + gráfico. `dev` `produto` `2026-05-10`
- [ ] **[P1] Caderneta de Vacinas** - Calendário PNI + SBP completo 0-24m. Visualização free, controle + push Yaya+. Spec: CADERNETA_VACINAS_SPEC.md. `dev` `saúde` `2026-05-15`
- [ ] **[P1] Medicamentos** - Controle de medicamentos ativos (nome, dosagem, horários, duração). 1 ativo free, ilimitado Yaya+. Push de lembrete/atraso. Spec: MEDICAMENTOS_SPEC.md. `dev` `saúde` `2026-05-15`

#### Admin Panel (yayababy.app/admin)

#### Admin Panel — ✅ Implementado (13/04). Guia: ADMIN_PANEL_V2_GUIDE.md

### 🟢 P2 — Desejável (Maio-Junho)

- [ ] **[P2] Relatório Semanal Automático** - Push/email todo domingo: resumo semanal, comparação, marcos, alertas. `dev` `retenção` `2026-05-22`
- [ ] **[P2] Widget iOS/Android** - Home screen: último registro, streak, próxima previsão. `dev` `2026-05-30`
- [ ] **[P2] Modo Noturno Automático** - Dark mode 20h-6h. Toggle manual override. `dev` `2026-05-08`
- [ ] **[P2] Permissões Granulares por Cuidador** - Pais controlam o que cada tipo de cuidador vê/edita. `dev` `babá` `2026-05-15`
- [ ] **[P2] Exportação CSV** - Todos os dados em CSV. Compliance LGPD. `dev` `2026-05-30`
- [ ] **[P2] Aba informativa "Desenvolvimento"** - Conteúdo educativo sobre cada fase, saltos, marcos, dicas. Alternativa a push de saltos. `dev` `produto` `2026-05-20`
- [ ] **[P2] Duração de amamentação (timer)** - Cronômetro por mamada. Insight para primeiros meses. Conecta com relatório PDF. `dev` `2026-05-15`

### 🔵 P3 — Futuro (Junho+)

#### Canal Pediatra — Caderneta Digital (ref: Yaya_Baby_Estrategia_Canais_Profissionais.docx)

- [ ] **[P3-PED-1] Pesquisa com 5-10 pediatras** - Conversa de descoberta (20min). Escuta sobre como recebem info dos pais, frustrações. Não oferecer produto ainda. `produto` `pediatra` `2026-05-01`
- [ ] **[P3-PED-2] Landing page yayababy.app/pediatra** - Página para o pediatra entender o produto e se cadastrar. CTA: "Quero acompanhar meus pacientes". `growth` `pediatra` `2026-05-15`
- [ ] **[P3-PED-3] Painel web do pediatra (MVP)** - Login web. Ver pacientes vinculados. Registrar peso/altura/PC com curva OMS automática. Campo de observação. `dev` `pediatra` `2026-06-01`
- [ ] **[P3-PED-4] Caderneta de vacinas pelo pediatra** - Pediatra registra vacinas aplicadas. Calendário SBP integrado. Pais recebem notificação. `dev` `pediatra` `2026-06-08`
- [ ] **[P3-PED-5] Vinculação pediatra ↔ paciente** - Convite via app. Consentimento LGPD explícito dos pais. Pai pode revogar a qualquer momento. `dev` `lgpd` `2026-06-08`
- [ ] **[P3-PED-6] Prescrição de função (30 dias)** - Pediatra prescreve acompanhamento específico. Função fica liberada no app dos pais por 30 dias. Upsell no dia 25. `dev` `monetização` `2026-06-15`
- [ ] **[P3-PED-7] PDF bidirecional v2** - Relatório com dados dos pais + dados do pediatra + observações clínicas. Evolução do PDF v1. `dev` `pediatra` `2026-06-30`

#### Canal Babá (ref: doc canais profissionais, seção 2)

- [ ] **[P3-BABA-1] Mecânica de indicação por babá** - Após primeiro registro, CTA "Indicar Yaya para outra família". Link rastreável. `growth` `babá` `2026-05-20`
- [ ] **[P3-BABA-2] Passagem de plantão via WhatsApp** - Resumo automático do turno. Botão "Enviar para os pais" com 1 toque. `dev` `babá` `2026-05-25`

#### Canal Escolas/Creches (ref: doc canais profissionais, seção 3)

- [ ] **[P3-ESCOLA-1] Waitlist + pesquisa de interesse** - Formulário simples. Meta: 50 escolas antes de construir qualquer coisa. `growth` `b2b`
- [ ] **[P3-ESCOLA-2] Diário digital de turma** - Educadora registra, pais recebem notificação em tempo real. `dev` `b2b`
- [ ] **[P3-ESCOLA-3] Plano B2B Creches** - Plano profissional até 15 bebês. Per-child fee. Dashboard coordenação. `dev` `b2b`

#### Outros P3

- [ ] **[P3] Integração Dispositivos** - Balanças inteligentes, monitores de sono. `dev`
- [ ] **[P3] Dashboard Pediatra Web (completo)** - Portal web avançado. Múltiplos pacientes, relatórios comparativos. `dev` `pediatra`

### UX Fixes — Pendentes

#### Batch 3 — ✅ Implementado (13/04). Guia: UX_ADJUSTMENTS_GUIDE.md (19 itens)

#### Outros UX

- [ ] **[UX] Insights — refatorar para sistema por faixa etária** - Implementar INSIGHTS_SPEC.md. Conectado com P1 Insights. `dev` `produto` `2026-04-20`

### Growth — Marketing e Aquisição

- [ ] **ASO — Atualizar listings nas stores** - Textos prontos em ASO_STRATEGY.md. Colar título, descrição curta, descrição longa, keywords. `growth` `aso` `2026-04-14`
- [ ] **Presença em Grupos de Mães** - 20+ grupos Facebook/WhatsApp. Conteúdo útil + menção orgânica. `growth` `2026-04-18`
- [ ] **Instagram @yayababyapp** - 3 posts/semana. Reels mostrando funcionalidades. `growth` `social` `2026-04-20`
- [ ] **Deep Analytics — Retenção e Conversão** - Eventos: signup, first_log, paywall_view, purchase, churn. `growth` `dados` `2026-04-20`
- [ ] **Material para Consultório Pediátrico** - Folder A5, QR code, display recepção. `growth` `pediatra` `2026-04-25`
- [ ] **Landing Page Blog SEO** - Artigos SEO sobre amamentação, sono, rotina. Integrar com LP existente. `growth` `seo` `2026-04-30`
- [ ] **Abordar 10 Pediatras (pesquisa + demo)** - Conversa de descoberta + demo pessoal. Meta: 5 indicando. Conectado com P3-PED-1. `growth` `pediatra` `2026-05-01`
- [ ] **Onboarding Personalizado por Idade** - 0-3m foco amamentação/sono, 3-6m sólidos, 6-12m marcos. `dev` `retenção` `2026-05-01`
- [ ] **Parcerias Micro-influencers Mães** - 10 mães IG 5k-50k. Permuta Yaya+ vitalício. `growth` `2026-05-15`
- [ ] **Meta Ads — Campanha "Mamãe Cansada"** - Vídeo 15s. Budget R$1.500/mês. CPA < R$5. `growth` `paid` `2026-05-20`

---

## Waiting On

- [ ] **App Store — Nova build submetida para review** - Build com Apple Auth + UX batch 3. Aguardando aprovação. since 2026-04-13

---

## Someday

- [ ] **Parcerias Maternidades** - 3-5 maternidades. Material pós-alta. `growth`
- [ ] **Parcerias Planos de Saúde** - Yaya como benefício materno-infantil. `growth` `b2b`
- [ ] **App para Apple Watch** - Registro rápido pelo pulso. `dev`
- [ ] **Modo Gêmeos** - Perfis separados com UI comparativa. `dev`
- [ ] **Integração com prontuário eletrônico** - HL7/FHIR. Para fase B2B saúde. `dev` `b2b`

---

## Done

- [x] ~~Monetização v2 — 3 planos de assinatura~~ (2026-04-09)
- [x] ~~Play Store — Listing completo~~ (2026-04-09)
- [x] ~~App Store Connect — Produtos IAP + RevenueCat~~ (2026-04-09)
- [x] ~~RevenueCat — Offering completo Android + iOS~~ (2026-04-09)
- [x] ~~Apple S2S Notifications~~ (2026-04-09)
- [x] ~~Webhook RevenueCat → Supabase~~ (2026-04-09)
- [x] ~~Pesquisa de mercado e concorrentes~~ (2026-04-09)
- [x] ~~Plano de Growth v1 (GROWTH_PLAN.md)~~ (2026-04-09)
- [x] ~~Configurar domínio www.yayababy.app~~ (2026-04-09)
- [x] ~~Credencial Android Google Console (SHA-1)~~ (2026-04-09)
- [x] ~~Google Auth funcionando Android/iOS~~ (2026-04-11)
- [x] ~~UX: Double-tap no primeiro evento~~ (2026-04-11)
- [x] ~~UX: Texto vazando loading Auth~~ (2026-04-11)
- [x] ~~UX: Logo splash pequena e escura~~ (2026-04-11)
- [x] ~~UX: Badge sem horário previsto~~ (2026-04-11)
- [x] ~~UX: "Há X h Y min" poluindo tela~~ (2026-04-11)
- [x] ~~UX: Histórico sem data~~ (2026-04-11)
- [x] ~~Spec: Push Notifications v2~~ (2026-04-11)
- [x] ~~Spec: PDF Pediatra v2~~ (2026-04-11)
- [x] ~~Spec: Insights por faixa etária 0-24m~~ (2026-04-11)
- [x] ~~Spec: ASO Strategy~~ (2026-04-11)
- [x] ~~Spec: Landing Page~~ (2026-04-11)
- [x] ~~Doc: Estratégia Canais Profissionais~~ (2026-04-11)
- [x] ~~Push Notifications (PUSH-1 a PUSH-11) — implementação completa~~ (2026-04-12)
- [x] ~~PDF Pediatra (PDF-1 a PDF-10) — implementação completa~~ (2026-04-12)
- [x] ~~Google Play — RevenueCat conectado~~ (2026-04-12)
- [x] ~~Landing Page — build e deploy~~ (2026-04-12)
- [x] ~~UX Fixes batch 2 (6 fixes)~~ (2026-04-12)
- [x] ~~UX: Header do histórico sticky~~ (2026-04-12)
- [x] ~~Guia: PUSH_IMPLEMENTATION_GUIDE.md~~ (2026-04-12)
- [x] ~~Guia: PDF_IMPLEMENTATION_GUIDE.md~~ (2026-04-12)
- [x] ~~Guia: ADMIN_IMPLEMENTATION_GUIDE.md~~ (2026-04-12)
- [x] ~~UX Fixes batch 3 (19 itens: saltos, projeções, registros, perfil, config)~~ (2026-04-13)
- [x] ~~Guia: UX_ADJUSTMENTS_GUIDE.md~~ (2026-04-13)
- [x] ~~Apple Auth iOS — configurado e build submetido~~ (2026-04-13)
- [x] ~~Admin Panel (yayababy.app/paineladmin) — mobile-only, acesso restrito, dashboard + usuários + push + monetização + config~~ (2026-04-13)
- [x] ~~App Store — listing completo (privacy, categoria, preços, screenshots, nutrition label)~~ (2026-04-13)
- [x] ~~ASO_STRATEGY.md — revisado (Super Relatório, preços v2, 2 cuidadores free)~~ (2026-04-13)

---

## Documentos de Referência

| Documento | Conteúdo | Status |
|---|---|---|
| PUSH_NOTIFICATIONS_SPEC.md | Spec completa de push v2 — janelas, streaks, saltos, inteligência | ✅ Pronto |
| PUSH_IMPLEMENTATION_GUIDE.md | Guia de implementação step-by-step para Claude Code (11 steps) | ✅ Pronto |
| ADMIN_IMPLEMENTATION_GUIDE.md | Guia de implementação do Admin Panel (14 steps, inclui cortesia e broadcast) | ✅ Pronto |
| PDF_IMPLEMENTATION_GUIDE.md | Guia de implementação do PDF Pediatra (10 steps, inclui measurements, OMS, jsPDF) | ✅ Pronto |
| PDF_PEDIATRA_SPEC.md | Spec do relatório PDF v2 — layout, dados, linguagem, ponte p/ caderneta | ✅ Pronto |
| INSIGHTS_SPEC.md | 60+ insights mapeados por faixa etária 0-24m | ✅ Pronto |
| ASO_STRATEGY.md | Keywords, títulos, descrições, metadados para Play Store e App Store | ✅ Pronto |
| LANDING_PAGE_SPEC.md | Spec da LP — 9 seções, componentes, animações, copy | ✅ Pronto |
| GROWTH_PLAN.md | Plano de growth 3 fases, concorrentes, canais, metas | ✅ Pronto |
| UX_ADJUSTMENTS_GUIDE.md | Guia de ajustes UX batch 3 (20 itens: saltos, projeções, registros, perfil, config) | ✅ Pronto |
| ADMIN_PANEL_V2_GUIDE.md | Guia admin v2 — rota /paineladmin na landing-app, mobile-only, acesso só dyego.vnunes@gmail.com (14 steps) | ✅ Pronto |
| ONBOARDING_PERSONALIZADO_SPEC.md | Onboarding por idade: 7 faixas, WelcomePage, destaques, intervalos | ✅ Pronto |
| INSIGHTS_REDESIGN_SPEC.md | Redesign InsightsPage: resumo do dia + insight cards contextuais, 4 tipos, paywall | ✅ Pronto |
| MARCOS_DESENVOLVIMENTO_SPEC.md | Marcos: ~35 milestones CDC/SBP, registro com foto, celebração, repositório, imagem compartilhável | ✅ Pronto |
| MARCOS_IMPLEMENTATION_GUIDE.md | Guia de implementação Marcos (12 steps: migration, hook, componentes, integração TrackerPage + ProfilePage) | ✅ Pronto |
| INSIGHTS_IMPLEMENTATION_GUIDE.md | Guia de implementação Insights Redesign (10 steps: referenceData, insightRules, engine, dropdown, cards, rewrite InsightsPage) | ✅ Pronto |
| CADERNETA_VACINAS_SPEC.md | Caderneta de vacinas: PNI + SBP, ~40 entradas, status visual, paywall | ✅ Pronto |
| CADERNETA_VACINAS_IMPLEMENTATION_GUIDE.md | Guide vacinas: migration + seed, hook, página, ProfilePage, push (6 steps) | ✅ Pronto |
| MEDICAMENTOS_SPEC.md | Medicamentos: cadastro, horários, administração, push, auto-encerramento | ✅ Pronto |
| MEDICAMENTOS_IMPLEMENTATION_GUIDE.md | Guide medicamentos: migration, hook, card home, página, ProfilePage, push (6 steps) | ✅ Pronto |
| Yaya_Baby_Estrategia_Canais_Profissionais.docx | Estratégia de canais: pediatras, babás, escolas | ✅ Pronto |
