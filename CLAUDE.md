# CLAUDE.md

Guia de trabalho para o Claude Code neste repositório. Leia antes de mexer.
Mantenha este arquivo curto: se crescer além de ~200 linhas, é sinal de que
vai documentação demais pra cá e de menos para `docs/` ou READMEs por feature.

---

## Projeto

**Yaya** — app de acompanhamento de bebê (alimentação, sono, fraldas,
marcos, insights, relatório pediatra, streak). Web + Android via Capacitor.
iOS preparado mas ainda não publicado.

- **App**: `app/` — React 19 + Vite + TypeScript + Tailwind v4 + Capacitor 8
- **Backend**: Supabase (auth, Postgres com RLS, Edge Functions, Storage)
- **Monetização**: RevenueCat (assinatura) + AdMob (banner + rewarded)
- **Roteamento**: React Router v7 (BrowserRouter)
- **Estado global**: `AppContext` (useReducer) + `AuthContext` + `PurchaseContext`

---

## Comandos essenciais

Sempre rodar a partir de `app/`:

```bash
npm run dev          # Vite dev server
npm run build        # tsc -b && vite build — SEMPRE rode antes de commitar
npm run lint         # ESLint
npx tsc --noEmit     # Só typecheck, mais rápido que o build
```

Supabase CLI (raiz do repo):
```bash
supabase db push
supabase functions deploy <name>
```

---

## Estrutura

```
app/src/
├── App.tsx                  # BrowserRouter + providers + roteamento
├── main.tsx
├── contexts/                # AppContext, AuthContext, PurchaseContext
├── features/                # Features encapsuladas (padrão atual)
│   ├── tracker/             # Tela inicial: registros, projeções, highlights
│   ├── history/             # Linha do tempo de registros
│   ├── insights/            # Padrões, tendências, insights engine
│   ├── milestones/          # Marcos de desenvolvimento + saltos
│   └── profile/             # Perfil, bebê, crescimento, relatórios
├── pages/                   # Páginas soltas que ainda não viraram feature
│                            # (LandingPage, LoginPage, OnboardingPage,
│                            #  SettingsPage, SharedReportPage, PrivacyPage,
│                            #  WelcomePage)
├── components/
│   ├── ui/                  # Primitivos reutilizáveis (Modal, Toast, ...)
│   └── layout/              # AppShell (navegação, safe area)
├── hooks/                   # Hooks compartilhados entre features
│                            # (useTimer, usePremium, useSheetBackClose, ...)
├── lib/                     # Lógica pura compartilhada (formatters, haptics, ...)
├── types/index.ts           # Tipos compartilhados
├── admin/                   # Painel admin (rota /paineladmin, lazy-loaded)
└── styles/                  # Tailwind base

supabase/
├── functions/               # Edge Functions (push-scheduler, streak-checker, ...)
└── migrations/              # Schema em SQL
```

### Padrão `features/<nome>/` (atual)

As principais features do app já estão encapsuladas em `features/`, com
tudo junto: página, hooks, lib, componentes. Cada feature expõe sua
"API pública" por um `index.ts`:

```
features/milestones/
├── index.ts              # Único ponto de entrada — define o que é público
├── MilestonesPage.tsx    # Página da rota
├── useMilestones.ts      # Hook principal
├── milestoneData.ts      # Dados + tipos + helpers puros
├── developmentLeaps.ts   # Mais dados + helpers
└── components/           # Componentes privados da feature
    ├── MilestoneRegister.tsx
    ├── MilestoneCelebration.tsx
    └── MilestoneShareImage.tsx
```

**Regra de ouro:** consumidores fora de `features/milestones/` importam
**só** de `features/milestones` (via `index.ts`), nunca de arquivos internos.
Isso protege o encapsulamento — se você renomear um componente interno, só
mexe em 1 feature. O único ponto onde isso quebra é o `lazy(() => import(...))`
no `App.tsx`, que precisa apontar pro arquivo da página diretamente porque
`React.lazy` exige default export.

**Features migradas:** tracker, history, insights, milestones, profile.
Use qualquer uma delas como referência quando precisar criar uma nova
(ex: vacinas, remédios, crescimento avançado).

**Páginas soltas que ainda podem virar feature no futuro:** Settings,
SharedReport. Nada disso é crítico — migrar só se/quando elas crescerem.

Arquivo grande (>400 linhas) = sinal pra quebrar em sections/hooks.
`SharedReportPage.tsx` é o próximo alvo de quebra interna.

### Criando uma nova feature

1. Crie `app/src/features/<nome>/` com subpasta `components/`.
2. Coloque tudo dentro (página, hooks, dados, componentes privados).
3. Crie `index.ts` exportando **só** o que outras features precisam ver.
4. Em `App.tsx`, adicione `lazy(() => import('./features/<nome>/<Page>'))`
   — note que `lazy` importa direto do arquivo da página, não do `index.ts`.
5. Consumidores externos importam de `'../features/<nome>'` (barrel),
   nunca de um arquivo interno.

Regra mental: se um arquivo só é usado dentro de uma feature, ele mora
**dentro** da feature. Só sobe pra `lib/`, `hooks/` ou `components/ui/`
quando houver 2+ features consumindo.

---

## Convenções que você DEVE seguir

### Sheets e modais
**Toda** sheet/modal nova deve usar `useSheetBackClose(isOpen, onClose)` do
`app/src/hooks/useSheetBackClose.ts`. Isso garante que o botão "voltar"
do Android/navegador fecha a sheet em vez de sair da página.

```tsx
// Ajuste o path relativo de acordo com a localização do seu arquivo.
// Dentro de features/<nome>/components/, use '../../../hooks/useSheetBackClose'.
import { useSheetBackClose } from '../../../hooks/useSheetBackClose'

export default function MyModal({ isOpen, onClose }: Props) {
  useSheetBackClose(isOpen, onClose)
  if (!isOpen) return null
  return (/* ... */)
}
```

### Radius
Padrão do app é `rounded-md` (6px). Não use `rounded-2xl`/`3xl` fora do
Landing Page.

### Haptics
Use `hapticLight()` / `hapticMedium()` / `hapticSuccess()` de `lib/haptics`
em interações importantes (botões primários, confirmações, toggles).

### Supabase + RLS
- **Nunca** inline uma subquery em `profiles` dentro de uma policy.
  Use a função `SECURITY DEFINER` `is_admin()` — já criada em migrations.
- Após um `UPDATE`/`DELETE`, faça `.select()` pra confirmar que pelo menos
  uma linha foi afetada (RLS pode silenciar o erro). Ver
  `handleDeactivateCode` em `features/profile/ProfilePage.tsx` como referência.

### Quiet hours e horário noturno
`AppContext.quietHours` é a fonte de verdade para o conceito
"diurno vs noturno". Hooks como `useInsightsEngine` recebem isso via
parâmetro. Nunca hardcode 7-22.

### Gênero
Use `contractionDe(baby.gender)` e utilitários de `lib/genderUtils.ts`
para textos que dependem de gênero ("do Guto" vs "da Júlia").

### Formatação de data
`lib/formatters.ts` tem `getLocalDateString`, `formatAge`, `formatBirthDate`.
**Nunca** use `toISOString().split('T')[0]` — ele ignora timezone e dá bug
de 1 dia. Sempre use `getLocalDateString`.

### Testing premium
Atualmente **todos os usuários são premium** pra teste. Ao lançamento
oficial, ver nota em `memory/project_testing_premium.md`. Features gratuitas
passam por `usePremium()` mas hoje retornam sempre `true`.

---

## Fluxos críticos (não quebre)

1. **Cold start**: `App.tsx` → `PushNavigationHandler` força rota inicial `/`
   pra evitar Capacitor WebView reabrir na última página.
2. **Onboarding**: `needsOnboarding` → `OnboardingPage` → reload.
3. **Welcome**: `needsWelcome` → `WelcomePage` (uma vez por pai).
4. **Invite code**: `ProfilePage` — ao gerar novo, desativa os antigos.
5. **Sleep pairs**: `features/insights/insightRules.ts` usa state machine
   linear — não use `slice(i+1).find(wake)` (causa double-counting).
6. **Streak**: `lib/streak.ts` + `streak-checker` edge function — timezone
   sensitive, teste com timezone local.
7. **Super Relatório**: link compartilhável em `/r/:token` + senha, servido
   por `SharedReportPage.tsx` + edge function `report-view`. Tem 3 públicos
   (`audience`: pediatrician/caregiver/family) escolhidos na criação,
   imutáveis — mudam seções e CTA. Senha em bcrypt com rate limit (5
   falhas → 15min lock); links antigos SHA-256 migram transparentemente no
   primeiro acesso. `babies.quiet_hours_start/end` é a fonte única pro
   conceito noturno/diurno nessa página. **NÃO existe PDF** — pra PDF é
   `window.print()`.

---

## Como pedir para o Claude (dicas pro humano)

- **Aponte arquivos diretamente**: "bug em `useInsightsEngine.ts`" é muito
  melhor que "bug nos insights".
- **Um assunto por sessão**: quando terminar, use `/clear` e abra nova sessão
  pro próximo.
- **Delegue exploração**: "usa o Explore pra listar X" em vez de deixar eu
  ler arquivo por arquivo.
- **Peça plano antes de execução ampla**: "faz um plano primeiro, sem editar".
- **Commit frequente**: commits pequenos permitem `/clear` sem medo.

---

## O que NÃO fazer

- ❌ Editar `app/src/lib/generatePDF.ts` — é **legado**, não faz mais parte
  do produto. O "relatório pro pediatra" virou o link web em
  `SharedReportPage.tsx` (PDF agora é `window.print()` da própria página).
  Candidato a deletar numa task futura.
- ❌ Mexer em `AppContext.tsx` sem rodar `npm run build` — o reducer é
  longo e fácil de quebrar cast de tipo.
- ❌ Commit com `git add -A` ou `git add .` (há PDFs e specs soltos na
  raiz que não devem entrar).
- ❌ Gerar builds (AAB/APK/IPA) em qualquer lugar fora de `build/` na raiz.
  Convenção: `cp <src>/app-release.aab build/yaya-<versao>-build<N>.aab`.
  A pasta `build/` é gitignored.
- ❌ Hardcode de horário, timezone, ou texto de gênero.
- ❌ Criar nova sheet sem `useSheetBackClose`.
- ❌ `console.log` em código commitado (ok em debug, remova antes).
