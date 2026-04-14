# Marcos do Desenvolvimento: Spec Completa

**Status:** Aprovado para implementação
**Prioridade:** P1
**Deadline:** 2026-05-15
**Tags:** `dev` `retenção` `ux`
**Conectado com:** INSIGHTS_SPEC.md (lembretes de marcos), PUSH_NOTIFICATIONS_SPEC.md (PUSH-8)

---

## Visão geral

Marcos do desenvolvimento (milestones) são conquistas físicas, cognitivas e sociais esperadas por faixa etária. O Yaya apresenta esses marcos de forma proativa, permite que os pais registrem quando acontecem (com foto opcional), celebra cada conquista e organiza tudo em um repositório visual que funciona como álbum de memórias.

Diferença entre marcos e saltos:
- **Saltos** (LeapCard): fases mentais de desenvolvimento (Wonder Weeks). Temporários, com impacto na rotina. Já implementados.
- **Marcos**: conquistas observáveis (sentou, andou, primeira palavra). Permanentes, registrados pelo usuário. Este spec.

---

## Experiência do usuário: 3 momentos

### Momento 1: Lembrete (proativo)

O Yaya avisa quando um marco está se aproximando, baseado na idade do bebê. O lembrete aparece de duas formas:

**A. Card na home (abaixo do LeapCard)**

```
[ 🎯 ] Marcos desta fase
[ "Com X meses, muitos bebês começam a [marco]." ]
[ "O [nome] já fez isso?"  ]
[ Botão: "Sim, registrar!" ] [ Link: "Ainda não" ]
```

Regras:
- Máximo 1 card de marco visível por vez na home
- Prioridade: o marco mais próximo da idade atual que ainda não foi registrado
- "Ainda não" dispensa o card por 14 dias + exibe toast: "Você pode acessar os marcos no perfil do(a) [nome]"
- Card some automaticamente quando o marco é registrado
- **Coexistência com LeapCard:** ambos podem aparecer simultaneamente. LeapCard fica acima, MilestoneHomeCard abaixo. Visual diferenciado (LeapCard = borda roxa, MilestoneHomeCard = borda rosa/tertiary)

**B. Insight na página de Insights**

Tipo "lembrete de marco" (já previsto no INSIGHTS_SPEC.md). Aparece como card de insight com emoji e texto contextual.

**C. Push notification**

Já previsto no PUSH_NOTIFICATIONS_SPEC.md (PUSH-8). Dispara no dia em que o bebê atinge a idade do marco.

### Momento 2: Registro + Celebração

Quando o pai toca em "Sim, registrar!", abre o fluxo:

```
Tela 1: Registro
[ Título: "Primeiro sorriso social! 😊" ]
[ Campo: Data (default: hoje, pode alterar para o passado) ]
[ Área de foto: ícone de câmera grande ]
[ "Tire uma foto desse momento" ]
[ Botão: "Tirar foto" ] [ Link: "Pular" ]
[ Campo opcional: nota curta (max 140 chars) ]
[ Botão: "Salvar" ]

Tela 2: Celebração (após salvar)
[ Animação: confetti ou estrelas ]
[ Emoji grande do marco ]
[ "Parabéns! [Nome] alcançou:" ]
[ Nome do marco em destaque ]
[ Idade: "com X meses e Y dias" ]
[ Foto (se tirada) em moldura bonita ]
[ Botão: "Compartilhar" ] [ Botão: "Fechar" ]
```

O botão "Compartilhar" gera uma imagem pronta para redes sociais (ver seção Imagem Compartilhável).

### Momento 3: Repositório (galeria de marcos)

Acessível via:
- **Botão no perfil do bebê** (ProfilePage): `[ 🎯 Marcos do Desenvolvimento → ]`
- Link no card de marcos na home (ao dispensar com "Ainda não")

```
Página: Marcos de [Nome]
[ Filtro: Todos | Registrados | Pendentes ]

[ Timeline visual vertical ]
  |
  ○ Primeiro sorriso social (6 semanas) ✅ Registrado em 15/03
  |  [ Foto miniatura ] [ "Sorriu pro papai!" ]
  |
  ○ Sustenta a cabeça (2-3 meses) ✅ Registrado em 02/04
  |  [ Sem foto ]
  |
  ● Rola de barriga (4-5 meses) ← PRÓXIMO
  |  [ "Muitos bebês começam a rolar nessa fase" ]
  |
  ○ Senta com apoio (5-6 meses) 🔒 Futuro
  |
  ○ Senta sem apoio (6-7 meses) 🔒 Futuro
  |
```

Regras:
- Marcos registrados: foto (se houver), data, nota, check verde
- Próximo marco: destaque visual, botão "Registrar"
- Marcos futuros: visíveis mas em tom discreto (preview da jornada)
- Marcos passados não registrados: sem julgamento, apenas "não registrado" em tom neutro
- Tap em qualquer marco registrado abre o detalhe com foto em tela cheia

---

## Tabela de marcos por faixa etária

Fonte: CDC Developmental Milestones + SBP Manual de Acompanhamento.

### 0 a 2 meses

| Marco | Idade típica | Categoria |
|---|---|---|
| Fixa o olhar em rostos | 1 mês | Cognitivo |
| Primeiro sorriso social | 6 semanas | Social |
| Segue objetos com os olhos | 2 meses | Cognitivo |
| Levanta a cabeça brevemente na barriga | 1 mês | Motor |

### 2 a 4 meses

| Marco | Idade típica | Categoria |
|---|---|---|
| Sustenta a cabeça firme | 2-3 meses | Motor |
| Ri alto (gargalhada) | 3-4 meses | Social |
| Agarra objetos com a mão | 3-4 meses | Motor |
| Empurra o corpo para cima com os braços (barriga) | 3-4 meses | Motor |

### 4 a 6 meses

| Marco | Idade típica | Categoria |
|---|---|---|
| Rola de barriga para cima ou vice-versa | 4-5 meses | Motor |
| Leva objetos à boca | 4-5 meses | Motor |
| Balbucia sons (ba-ba, da-da) | 5-6 meses | Linguagem |
| Senta com apoio | 5-6 meses | Motor |
| Reconhece o próprio nome | 5-6 meses | Cognitivo |

### 6 a 9 meses

| Marco | Idade típica | Categoria |
|---|---|---|
| Senta sem apoio | 6-7 meses | Motor |
| Transfere objetos entre as mãos | 7 meses | Motor |
| Estranha pessoas desconhecidas | 7-8 meses | Social |
| Engatinha (ou se arrasta) | 8-9 meses | Motor |
| Usa pinça (polegar + indicador) | 8-9 meses | Motor |
| Primeiros alimentos sólidos | 6 meses | Alimentação |

### 9 a 12 meses

| Marco | Idade típica | Categoria |
|---|---|---|
| Fica em pé com apoio | 9-10 meses | Motor |
| Fala "mamã" ou "papá" com intenção | 10-11 meses | Linguagem |
| Bate palmas / dá tchau | 9-10 meses | Social |
| Anda com apoio (cruzeiro) | 11-12 meses | Motor |
| Primeiros passos sozinho | 12 meses | Motor |
| Bebe no copo com ajuda | 10-12 meses | Motor |

### 12 a 18 meses

| Marco | Idade típica | Categoria |
|---|---|---|
| Anda sozinho com firmeza | 13-15 meses | Motor |
| Fala 5 a 10 palavras | 12-15 meses | Linguagem |
| Empilha 2 blocos | 14-16 meses | Motor fino |
| Aponta para o que quer | 12-14 meses | Comunicação |
| Come sozinho com as mãos | 12-14 meses | Alimentação |
| Rabisca com giz | 15-18 meses | Motor fino |

### 18 a 24 meses

| Marco | Idade típica | Categoria |
|---|---|---|
| Corre (instável) | 18-20 meses | Motor |
| Combina 2 palavras | 18-20 meses | Linguagem |
| Empilha 4+ blocos | 20-22 meses | Motor fino |
| Imita atividades domésticas | 18-24 meses | Social |
| Sobe escadas com apoio | 20-24 meses | Motor |
| Desfralde: demonstra interesse | 22-24 meses | Autonomia |

---

## Imagem compartilhável

Quando o pai toca "Compartilhar" na tela de celebração, o app gera uma imagem 1080x1080 (formato Instagram) com:

```
[ Fundo: gradiente Yaya (dark purple → deep navy) ]
[ Logo Yaya Baby pequeno no topo ]
[ Foto do marco (se houver) em círculo grande centralizado ]
[ Se sem foto: emoji do marco grande ]
[ Nome do marco em Manrope bold ]
[ "[Nome] alcançou com [X meses e Y dias]" ]
[ Data: "13 de abril de 2026" ]
[ Nota do pai (se houver), em itálico ]
[ Rodapé discreto: "yayababy.app" ]
```

Se não houver foto, a imagem usa o emoji do marco em tamanho grande com o fundo gradiente. Deve ficar bonita mesmo sem foto.

A geração usa Canvas API (html2canvas ou similar) no client-side. Sem necessidade de backend.

---

## Estrutura de dados

### Tabela: `milestones` (referência, read-only)

```sql
CREATE TABLE milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,          -- ex: "first_smile", "sits_unsupported"
  name TEXT NOT NULL,                  -- ex: "Primeiro sorriso social"
  description TEXT,                    -- texto contextual curto
  emoji TEXT NOT NULL,                 -- ex: "😊"
  category TEXT NOT NULL,              -- motor, cognitivo, social, linguagem, alimentacao, autonomia
  typical_age_days_min INT NOT NULL,   -- idade mínima típica em dias
  typical_age_days_max INT NOT NULL,   -- idade máxima típica em dias
  age_band TEXT NOT NULL,              -- newborn, early, growing, weaning, active, toddler_early, toddler
  sort_order INT NOT NULL,             -- ordem de exibição dentro da faixa
  source TEXT DEFAULT 'CDC/SBP'        -- referência científica
);
```

### Tabela: `baby_milestones` (registros do usuário)

```sql
CREATE TABLE baby_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  milestone_id UUID NOT NULL REFERENCES milestones(id),
  achieved_at DATE NOT NULL,           -- data em que o marco foi alcançado
  photo_url TEXT,                      -- URL da foto no Supabase Storage
  note TEXT,                           -- nota curta (max 140 chars)
  recorded_by UUID REFERENCES auth.users(id),  -- quem registrou
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(baby_id, milestone_id)        -- cada marco só pode ser registrado uma vez por bebê
);

-- RLS: mesmo padrão de baby_members
ALTER TABLE baby_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view milestones"
  ON baby_milestones FOR SELECT
  USING (baby_id IN (SELECT baby_id FROM baby_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can insert milestones"
  ON baby_milestones FOR INSERT
  WITH CHECK (baby_id IN (SELECT baby_id FROM baby_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can update milestones"
  ON baby_milestones FOR UPDATE
  USING (baby_id IN (SELECT baby_id FROM baby_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can delete milestones"
  ON baby_milestones FOR DELETE
  USING (baby_id IN (SELECT baby_id FROM baby_members WHERE user_id = auth.uid()));
```

### Storage bucket: `milestone-photos`

```sql
-- Bucket para fotos de marcos
INSERT INTO storage.buckets (id, name, public)
VALUES ('milestone-photos', 'milestone-photos', true);

-- Policy: membros do bebê podem fazer upload
CREATE POLICY "Members can upload milestone photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'milestone-photos'
    AND (storage.foldername(name))[1] IN (
      SELECT baby_id::text FROM baby_members WHERE user_id = auth.uid()
    )
  );
```

Estrutura de pastas: `milestone-photos/{baby_id}/{milestone_code}.jpg`

---

## Componentes

```
MilestonesPage.tsx            (novo: repositório/galeria)
├── MilestoneTimeline.tsx     (novo: timeline vertical com marcos)
├── MilestoneCard.tsx         (novo: card individual na timeline)
├── MilestoneDetail.tsx       (novo: modal com foto full + detalhes)
├── MilestoneRegister.tsx     (novo: tela de registro com foto + nota)
├── MilestoneCelebration.tsx  (novo: tela de celebração com confetti)
└── MilestoneShareImage.tsx   (novo: gerador de imagem compartilhável)

MilestoneHomeCard.tsx         (novo: card na home com próximo marco)
```

### MilestoneHomeCard: card na home

```typescript
interface MilestoneHomeCardProps {
  milestone: Milestone
  babyName: string
  babyGender: 'boy' | 'girl'
  onRegister: () => void
  onDismiss: () => void
}
```

Visual: similar ao LeapCard, mas com emoji do marco, fundo levemente diferente (usar tertiary como accent). Posição: abaixo do LeapCard na home.

### MilestoneTimeline: props

```typescript
interface MilestoneTimelineProps {
  milestones: Milestone[]
  achieved: BabyMilestone[]
  currentAgeDays: number
  filter: 'all' | 'achieved' | 'pending'
}
```

### MilestoneRegister: props

```typescript
interface MilestoneRegisterProps {
  milestone: Milestone
  babyName: string
  onSave: (data: { achievedAt: Date; photoUri?: string; note?: string }) => void
  onCancel: () => void
}
```

A captura de foto usa a Camera API do Capacitor (`@capacitor/camera`). Fallback para input file no web.

---

## Hook: `useMilestones`

```typescript
function useMilestones(babyId: string, birthDate: string) {
  // Retorna:
  return {
    allMilestones: Milestone[],       // todos os marcos da referência
    achieved: BabyMilestone[],         // marcos já registrados
    nextMilestone: Milestone | null,   // próximo marco esperado (não registrado, dentro da faixa)
    upcomingMilestones: Milestone[],   // marcos dos próximos 2 meses
    achievedCount: number,
    totalForAge: number,               // marcos até a idade atual
    registerMilestone: (data) => Promise<void>,
    deleteMilestone: (id) => Promise<void>,
    uploadPhoto: (milestoneCode, file) => Promise<string>,  // retorna URL
  }
}
```

---

## Free vs Yaya+

| Funcionalidade | Free | Yaya+ |
|---|---|---|
| Ver marcos da faixa atual | Sim | Sim |
| Registrar marcos (data + nota) | Sim | Sim |
| Foto no registro | Sim | Sim |
| Tela de celebração | Sim | Sim |
| Imagem compartilhável | Sim | Sim |
| Repositório completo (todas as faixas) | Apenas faixa atual | Todas as faixas |
| Push de lembrete de marco | Sim | Sim |
| Insight de marco na página de insights | Sim (dentro do limite free) | Sim |

**Decisão:** marcos é feature de retenção e engajamento. Limitar demais prejudica a experiência. O paywall aparece apenas no repositório: usuários free veem a faixa atual, Yaya+ veem a timeline completa. Registro e celebração são sempre free.

---

## Conexão com saltos (LeapCard)

Marcos e saltos são features separadas, mas complementares. Na timeline de marcos, se um salto estava ativo quando o marco foi alcançado, exibir uma nota discreta:

```
○ Senta sem apoio (6 meses) ✅ 15/04
  "Durante o salto 5: Relações"
```

Isso cria uma narrativa de desenvolvimento mais rica. A conexão é calculada comparando `achieved_at` com os intervalos de `DEVELOPMENT_LEAPS`.

---

## Seed data: milestones

O array de marcos deve ser inserido via migration. Exemplo parcial:

```typescript
const MILESTONES_SEED = [
  {
    code: 'fixes_gaze',
    name: 'Fixa o olhar em rostos',
    description: 'O bebê olha diretamente para o rosto de quem está perto.',
    emoji: '👀',
    category: 'cognitivo',
    typical_age_days_min: 15,
    typical_age_days_max: 45,
    age_band: 'newborn',
    sort_order: 1,
  },
  {
    code: 'first_smile',
    name: 'Primeiro sorriso social',
    description: 'O primeiro sorriso intencional, em resposta a um rosto ou voz.',
    emoji: '😊',
    category: 'social',
    typical_age_days_min: 35,
    typical_age_days_max: 56,
    age_band: 'newborn',
    sort_order: 2,
  },
  {
    code: 'tracks_objects',
    name: 'Segue objetos com os olhos',
    description: 'Acompanha um objeto em movimento com o olhar.',
    emoji: '👁️',
    category: 'cognitivo',
    typical_age_days_min: 45,
    typical_age_days_max: 75,
    age_band: 'early',
    sort_order: 3,
  },
  // ... todos os marcos da tabela acima
]
```

Total estimado: ~35 marcos cobrindo 0 a 24 meses.

---

## Lógica de exibição do card na home

```typescript
function getNextMilestoneForHome(
  milestones: Milestone[],
  achieved: BabyMilestone[],
  ageDays: number
): Milestone | null {
  const achievedCodes = new Set(achieved.map(a => a.milestone.code))
  
  // Marcos dentro de uma janela: idade atual - 30 dias até idade atual + 60 dias
  const candidates = milestones.filter(m =>
    !achievedCodes.has(m.code) &&
    m.typical_age_days_min <= ageDays + 60 &&
    m.typical_age_days_max >= ageDays - 30
  )
  
  // Ordenar por proximidade com a idade atual
  candidates.sort((a, b) => {
    const midA = (a.typical_age_days_min + a.typical_age_days_max) / 2
    const midB = (b.typical_age_days_min + b.typical_age_days_max) / 2
    return Math.abs(midA - ageDays) - Math.abs(midB - ageDays)
  })
  
  return candidates[0] || null
}
```

**Regras completas do card na home:**

| Ação do usuário | Comportamento |
|---|---|
| Toca "Sim, registrar!" | Abre MilestoneRegister. Card some definitivamente após salvar |
| Toca "Ainda não" | Card some por 14 dias + toast "Acesse marcos no perfil do(a) [nome]". Volta se ainda não registrado |
| Ignora (não toca) | Card permanece visível até sair da janela de idade (típico max + 60 dias) |
| Bebê passa da idade máxima + 60d | Card some. Marco aparece como "não registrado" no repositório (sem julgamento) |
| Outro marco se torna mais relevante | Troca para o novo. Apenas 1 card de marco por vez |
| LeapCard ativo ao mesmo tempo | Ambos coexistem. LeapCard acima, MilestoneHomeCard abaixo |

Flag no localStorage: `milestone_dismissed_{code}_{timestamp}`. Após 14 dias, flag expira e card volta se aplicável.

---

## Animações

- **Celebração:** confetti (usar biblioteca `canvas-confetti` ou equivalente). Duração: 2 segundos. Fade out suave.
- **Timeline:** entrada suave dos cards (stagger animation, 50ms entre cada).
- **Card na home:** mesmo estilo de animação do LeapCard (page-enter).
- **Foto:** ao tirar, flash breve na tela + som de câmera (se permitido pelo SO).

---

## Navegação

```
Home (TrackerPage)
├── LeapCard (se ativo/próximo)
├── MilestoneHomeCard (abaixo do LeapCard, podem coexistir)
│   ├── tap "Sim, registrar!" → MilestoneRegister → MilestoneCelebration
│   │                           → tap foto → Camera API
│   └── tap "Ainda não" → card some 14 dias + toast "Acesse marcos no perfil do(a) [nome]"
│
ProfilePage
├── Botão "🎯 Marcos do Desenvolvimento →"
│   └── MilestonesPage (repositório)
│       ├── Barra de progresso (X/Y marcos)
│       ├── Filtro: Todos | Registrados | Pendentes
│       ├── MilestoneTimeline
│       │   └── MilestoneCard → tap → MilestoneDetail (foto full + detalhes)
│       │                      → tap "Registrar" (se pendente) → MilestoneRegister
│       └── Paywall banner (se free e tentou ver faixa futura)
```

---

## Textos por faixa (card na home)

Cada faixa tem um texto de abertura para o card na home:

| Faixa | Texto |
|---|---|
| newborn | "Nas primeiras semanas, cada olhar do [nome] é uma conquista." |
| early | "Entre 1 e 3 meses, as respostas sociais começam a aparecer." |
| growing | "O [nome] está descobrindo o próprio corpo. Muita coisa nova!" |
| weaning | "Com 6 a 9 meses, a mobilidade muda tudo." |
| active | "Quase andando! Os próximos marcos são inesquecíveis." |
| toddler_early | "Palavras, passos firmes e muita personalidade." |
| toddler | "De 18 a 24 meses: a autonomia explode." |

Concordância de gênero aplica-se ao nome (do/da conforme `baby.gender`).

---

## Checklist de implementação

- [ ] Criar migration: tabela `milestones` + seed com ~35 marcos
- [ ] Criar migration: tabela `baby_milestones` + RLS policies
- [ ] Criar storage bucket `milestone-photos` + policies
- [ ] Criar `app/src/lib/milestoneData.ts` com array de marcos (client-side fallback)
- [ ] Criar hook `useMilestones.ts`
- [ ] Criar componente `MilestoneHomeCard.tsx`
- [ ] Criar componente `MilestoneRegister.tsx` (com Camera API)
- [ ] Criar componente `MilestoneCelebration.tsx` (com confetti)
- [ ] Criar componente `MilestoneShareImage.tsx` (Canvas API, 1080x1080)
- [ ] Criar página `MilestonesPage.tsx` (repositório/galeria)
- [ ] Criar componente `MilestoneTimeline.tsx`
- [ ] Criar componente `MilestoneCard.tsx`
- [ ] Criar componente `MilestoneDetail.tsx` (modal foto full)
- [ ] Integrar `MilestoneHomeCard` no `TrackerPage.tsx` (abaixo do LeapCard)
- [ ] Adicionar botão "🎯 Marcos do Desenvolvimento" no `ProfilePage.tsx`
- [ ] Adicionar toast "Acesse marcos no perfil do(a) [nome]" no dismiss do card na home
- [ ] Implementar paywall: free vê faixa atual, Yaya+ vê todas
- [ ] Testar captura de foto (Capacitor Camera + fallback web)
- [ ] Testar geração de imagem compartilhável
- [ ] Testar com dados de diferentes faixas etárias
