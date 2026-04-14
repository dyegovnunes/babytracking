# BebêLog — Coordenadas de Construção

## 1. Visão Geral do Projeto

**Produto:** BebêLog — app de tracking de atividades para recém-nascidos (amamentação, fraldas, sono, banho)
**Público:** Pais no "quarto trimestre", usando o app majoritariamente à noite, com sono privado e precisão motora reduzida
**Design System:** "Nocturnal Sanctuary" — dark theme premium, anti-pastel, editorial de alto contraste

---

## 2. Decisões de Arquitetura

### Frontend
- **Framework:** React 18+ com Vite
- **Styling:** Tailwind CSS 3.x com tokens customizados extraídos do Stitch
- **Fontes:** Manrope (headlines/body) + Plus Jakarta Sans (labels/metadata)
- **Ícones:** Material Symbols Outlined (Google Fonts)
- **Roteamento:** React Router v6 (4 rotas: tracker, histórico, insights placeholder, profile)
- **Estado local:** React Context + useReducer (antes de conectar backend)
- **Linguagem:** TypeScript

### Backend (Recomendação)
- **Supabase** — já conectado via MCP, cobre 100% das necessidades:
  - **Auth:** Login social (Google) + magic link (email)
  - **Database:** PostgreSQL com RLS para multi-usuário
  - **Realtime:** Sync entre dispositivos do casal (ambos pais veem os registros)
  - **Edge Functions:** Lógica de notificações push (futuro)
  - **Storage:** Foto do bebê no perfil
- **Por que Supabase e não Firebase:** Você já tem o MCP configurado, PostgreSQL é mais flexível para queries analíticas (Insights futuros), e o RLS nativo simplifica a segurança

---

## 3. Estrutura de Pastas do Projeto

```
bebelog/
├── public/
│   └── manifest.json          # PWA manifest (futuro)
├── src/
│   ├── assets/
│   │   └── fonts/             # Manrope, Plus Jakarta Sans (self-hosted)
│   ├── components/
│   │   ├── ui/                # Componentes genéricos (Button, Modal, Card, Toast)
│   │   ├── activity/          # ActivityGrid, ActivityButton, BottleModal
│   │   ├── timeline/          # TimelineEntry, TimelinePrediction, TimelineList
│   │   ├── layout/            # AppShell, BottomNav, Header, FAB
│   │   └── profile/           # BabyCard, IntervalSettings, ProfileForm
│   ├── contexts/
│   │   └── AppContext.tsx      # Estado global (logs, intervals, baby info)
│   ├── hooks/
│   │   ├── useTimer.ts        # Clock tick para projeções
│   │   ├── useProjections.ts  # Cálculo de próximos eventos
│   │   └── useLogs.ts         # CRUD de registros
│   ├── lib/
│   │   ├── constants.ts       # DEFAULT_EVENTS, DEFAULT_INTERVALS, categorias
│   │   ├── formatters.ts      # formatTime, formatDate, formatRelative
│   │   └── projections.ts     # getNextProjection, lógica de warn/overdue
│   ├── pages/
│   │   ├── TrackerPage.tsx    # Tela principal (grid + projeções + últimos registros)
│   │   ├── HistoryPage.tsx    # Timeline completa com filtros por categoria
│   │   ├── InsightsPage.tsx   # Placeholder (MVP2)
│   │   └── ProfilePage.tsx    # Dados do bebê + intervalos + configurações
│   ├── styles/
│   │   └── globals.css        # @tailwind base/components/utilities + custom
│   ├── types/
│   │   └── index.ts           # EventType, LogEntry, Interval, Baby, etc.
│   ├── App.tsx
│   └── main.tsx
├── tailwind.config.ts          # Tokens do Design System
├── tsconfig.json
├── vite.config.ts
├── package.json
└── index.html
```

---

## 4. Design Tokens (Tailwind Config)

Extraídos diretamente do Stitch prototype. Estes são os tokens que vão no `tailwind.config.ts`:

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Surfaces
        surface:                   '#0d0a27',
        'surface-dim':             '#0d0a27',
        'surface-container-lowest':'#000000',
        'surface-container-low':   '#120f2f',
        'surface-container':       '#181538',
        'surface-container-high':  '#1e1a41',
        'surface-container-highest':'#24204a',
        'surface-bright':          '#2a2653',
        'surface-variant':         '#24204a',

        // Primary
        primary:                   '#b79fff',
        'primary-dim':             '#a88cfb',
        'primary-container':       '#ab8ffe',
        'primary-fixed':           '#ab8ffe',
        'primary-fixed-dim':       '#9d81f0',

        // Secondary
        secondary:                 '#d0c5fb',
        'secondary-dim':           '#c2b7ec',
        'secondary-container':     '#49406d',

        // Tertiary (health alerts, feeding)
        tertiary:                  '#ff96b9',
        'tertiary-dim':            '#ef77a1',
        'tertiary-container':      '#fc81ac',

        // Error
        error:                     '#ff6e84',
        'error-dim':               '#d73357',
        'error-container':         '#a70138',

        // On-colors (text/icons)
        'on-surface':              '#e7e2ff',
        'on-surface-variant':      '#aca7cc',
        'on-background':           '#e7e2ff',
        'on-primary':              '#361083',
        'on-secondary':            '#463d6a',
        'on-error':                '#490013',

        // Utility
        outline:                   '#757294',
        'outline-variant':         '#474464',
      },
      fontFamily: {
        headline: ['Manrope', 'sans-serif'],
        body:     ['Manrope', 'sans-serif'],
        label:    ['Plus Jakarta Sans', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '1rem',
        lg:      '2rem',
        xl:      '3rem',
      },
    },
  },
  plugins: [],
} satisfies Config
```

---

## 5. Mapa de Componentes (Stitch → React)

### 5.1 Layout Shell

| Componente | Descrição | Referência Stitch |
|---|---|---|
| `AppShell` | Wrapper com bg gradient, padding-top para header fixo, padding-bottom para nav | `<body>` + `<main>` |
| `Header` | Logo "BebêLog" + avatar do bebê + ícone settings | `<header>` fixo no topo |
| `BottomNav` | 4 tabs: Tracker, Insights, Community, Profile | `<nav>` fixo no bottom com glassmorphism |
| `FAB` | Botão flutuante "+" (registro manual rápido) | `<button>` fixed bottom-right |

### 5.2 Tracker Page

| Componente | Descrição | Fonte da Lógica |
|---|---|---|
| `HeroIdentity` | Nome do bebê, idade, relógio grande, data | Stitch section 1 |
| `ActivityGrid` | Grid 3x3 com os 9 botões de registro | JSX `DEFAULT_EVENTS` + Stitch grid |
| `ActivityButton` | Botão individual com ícone Material, label, "Há Xmin" | Stitch tile pattern |
| `PredictionCard` | Card de previsão (próxima mamada, etc.) com status warn/overdue | JSX `getNextProjection` |
| `RecentLogs` | Lista dos últimos 5 registros com link "ver tudo" | JSX `sorted.slice(0, 5)` |

### 5.3 History Page

| Componente | Descrição | Fonte da Lógica |
|---|---|---|
| `CategoryFilter` | Chips horizontais (Tudo, Mamadas, Sono, Fralda, Cuidados) | JSX `cats` array |
| `TimelineList` | Container com linha vertical decorativa | Stitch timeline |
| `TimelineEntry` | Entrada com dot colorido, horário à esquerda, evento à direita | Stitch log entries |
| `TimelinePrediction` | Card especial de previsão no topo da timeline | Stitch prediction item |

### 5.4 Profile Page (novo)

| Componente | Descrição |
|---|---|
| `BabyCard` | Avatar + nome + idade do bebê (editável) |
| `IntervalSettings` | Configuração de intervalos por categoria (migrado do `IntervalsModal` do JSX) |
| `DataManagement` | Exportar dados / limpar histórico |
| `AppSettings` | Tema, notificações, idioma (placeholders) |

### 5.5 Modais

| Componente | Já existe no JSX? | Notas |
|---|---|---|
| `BottleModal` | Sim | Migrar visual para design system |
| `EditModal` | Sim | Migrar visual + adicionar duração para amamentação |
| `ConfirmDialog` | Parcial | Extrair do padrão de confirmação de delete |

---

## 6. Regras do Design System (Do/Don't)

Estas regras vêm do DESIGN.md e devem ser seguidas rigorosamente:

### FAZER
- Touch targets mínimo 48x48dp (pais cansados, precisão reduzida)
- Usar `on-background (#e7e2ff)` como cor de texto — nunca `#ffffff`
- Separar seções por mudança de `background` (surface tiers), não por bordas
- Sombras sempre com tint de `primary`: `rgba(167, 139, 250, 0.08)`
- Ícones interativos com halo glow: `box-shadow: 0 0 20px rgba(167,139,250,0.15)`
- Spacing generoso entre elementos — "breathing room" reduz fadiga visual

### NÃO FAZER
- Bordas 1px solid para separar seções (proibido pelo "No-Line Rule")
- Branco puro (#fff) — muito agressivo no escuro
- Bordas 100% opacas — se precisar de stroke, usar `outline-variant` a 15% opacidade
- Ícones "de bebê" (chupeta, chocalho) — manter premium e limpo
- Drop shadows tradicionais — usar tonal layering

---

## 7. Mapeamento de Ícones (Emoji → Material Symbols)

O JSX usa emojis; o Stitch usa Material Symbols. Mapeamento para a migração:

| Evento | Emoji (JSX) | Material Symbol (Produção) |
|---|---|---|
| Peito Esq. | ◑ | `breastfeeding` |
| Peito Dir. | ◐ | `breastfeeding` |
| Ambos | ● | `nutrition` |
| Mamadeira | 🍼 | `baby_changing_station` |
| Fralda Xixi | 💧 | `water_drop` |
| Fralda Cocô | 🟤 | `rebase_edit` |
| Banho | 🛁 | `bathtub` |
| Dormiu | 🌙 | `bedtime` |
| Acordou | ☀️ | `sunny` |

---

## 8. Modelo de Dados (TypeScript)

```typescript
// types/index.ts

export type EventCategory = 'feed' | 'diaper' | 'sleep' | 'care'

export interface EventType {
  id: string
  label: string
  icon: string           // Material Symbol name
  color: string          // Token reference (ex: 'tertiary')
  category: EventCategory
  hasAmount?: boolean    // true para mamadeira
  hasDuration?: boolean  // true para amamentação (futuro)
}

export interface LogEntry {
  id: string
  eventId: string
  timestamp: number      // Unix ms
  ml?: number            // Volume mamadeira
  duration?: number      // Duração em minutos (futuro)
  notes?: string         // Observações livres (futuro)
  createdBy?: string     // ID do pai/mãe que registrou
}

export interface IntervalConfig {
  label: string
  minutes: number        // Intervalo esperado
  warn: number           // Minutos para alerta amarelo
}

export interface Baby {
  id: string
  name: string
  birthDate: string      // ISO date
  photoUrl?: string
}

export interface Projection {
  label: string
  time: Date
  isOverdue: boolean
  isWarning: boolean
  lastEvent: string
  lastTime: Date
}
```

---

## 9. Plano de Execução — Frontend

### Fase 1: Setup + Design System (Sprint 1)
1. Scaffold com `npm create vite@latest bebelog -- --template react-ts`
2. Instalar deps: `tailwindcss`, `react-router-dom`, `postcss`, `autoprefixer`
3. Configurar `tailwind.config.ts` com todos os tokens
4. Configurar fontes (Google Fonts ou self-hosted)
5. Criar `AppShell`, `Header`, `BottomNav` — navegação funcionando
6. Validar: app roda, navega entre tabs, visual batendo com Stitch

### Fase 2: Tracker Page (Sprint 2)
1. `HeroIdentity` — relógio, data, info do bebê
2. `ActivityGrid` + `ActivityButton` — grid 3x3 funcional
3. `BottleModal` — migrar do JSX, aplicar design system
4. `PredictionCard` — lógica de projeções do JSX + visual Stitch
5. `RecentLogs` — lista resumida com link para histórico
6. Toast de confirmação

### Fase 3: History Page (Sprint 3)
1. `CategoryFilter` — chips com estado
2. `TimelineList` + `TimelineEntry` — timeline vertical estilo Stitch
3. `TimelinePrediction` — card de previsão no topo
4. `EditModal` — migrar do JSX, aplicar design system
5. Scroll infinito ou paginação (quando houver backend)

### Fase 4: Profile Page (Sprint 4)
1. `BabyCard` — dados do bebê editáveis
2. `IntervalSettings` — migrar do `IntervalsModal`, transformar em seção
3. `DataManagement` — exportar JSON, limpar histórico
4. Placeholders para settings futuras

### Fase 5: Polish + Preparação para Backend (Sprint 5)
1. Animações de transição (Framer Motion ou CSS transitions)
2. Haptic feedback em mobile (vibração ao registrar)
3. Empty states para todas as telas
4. Loading states / skeletons
5. Responsividade verificada (320px a 430px)
6. Abstrair camada de dados para facilitar swap para Supabase

---

## 10. Plano de Execução — Backend (Supabase)

### Fase 6: Schema + Auth
1. Criar projeto no Supabase (ou usar existente)
2. Schema:
   - `babies` (id, name, birth_date, photo_url, created_by, created_at)
   - `baby_members` (baby_id, user_id, role) — permite compartilhar com parceiro(a)
   - `logs` (id, baby_id, event_id, timestamp, ml, duration, notes, created_by, created_at)
   - `interval_configs` (baby_id, category, minutes, warn)
3. RLS policies: usuário só vê logs de bebês onde é member
4. Auth: Google OAuth + magic link

### Fase 7: Integração Frontend ↔ Supabase
1. Instalar `@supabase/supabase-js`
2. Substituir Context local por queries Supabase (ou usar `@tanstack/react-query`)
3. Realtime subscriptions para sync entre dispositivos
4. Otimistic updates para UX responsiva

### Fase 8: Features Avançadas
1. Push notifications (Edge Function + web push ou Expo notifications se migrar para RN)
2. Tela de Insights (agregações SQL: mamadas/dia, padrão de sono, etc.)
3. Exportação de dados (CSV/PDF)
4. Onboarding flow para primeiro acesso

---

## 11. Coordenadas para Claude Code

Quando for levar para o Claude Code, use este prompt como ponto de partida:

```
Estou construindo o BebêLog, um app React + TypeScript + Tailwind + Vite
para tracking de atividades de recém-nascidos.

Contexto:
- O arquivo COORDENADAS_CONSTRUCAO.md tem toda a arquitetura
- O arquivo DESIGN.md tem o design system completo
- O arquivo baby-tracker-v2-fixed.jsx tem toda a lógica funcional
- O arquivo code.html (Stitch) tem o visual de referência

Comece pela Fase 1: scaffold do projeto + setup do Tailwind com os tokens
do design system + AppShell com navegação funcionando.
```

Progresso pode ser rastreado fase a fase, referenciando sempre os arquivos de contexto.

---

## 12. Riscos e Trade-offs

| Decisão | Trade-off | Mitigação |
|---|---|---|
| React web vs React Native | Perde notificações push nativas e acesso offline robusto | PWA resolve parcialmente; migração para RN é viável depois |
| Tailwind vs CSS-in-JS | Tailwind tem classes verbosas; custom tokens precisam de config cuidadosa | Design tokens bem definidos no config compensam |
| Supabase vs custom backend | Vendor lock-in parcial | PostgreSQL standard permite migração; abstrair camada de dados |
| TypeScript desde o início | Mais setup inicial | Evita bugs de tipo que custariam mais tempo depois |
| Context API vs Zustand/Redux | Context pode re-renderizar demais | Para MVP é suficiente; migrar para Zustand se performance for issue |
