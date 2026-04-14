# Onboarding Personalizado por Idade: Spec Final

**Status:** Aprovado para implementação (mockup v3 validado em 2026-04-13)
**Prioridade:** P1
**Deadline:** 2026-05-01
**Tags:** `dev` `ux` `retenção`
**Mockup de referência:** ONBOARDING_MOCKUP.html

---

## Visão geral

Usar a data de nascimento coletada no cadastro para personalizar a primeira experiência do usuário. Dois momentos distintos de entrega:

1. **Tela de boas-vindas** (nova): aparece uma única vez, entre o cadastro e a home. Entrega contexto personalizado de forma bonita e acolhedora.
2. **Home**: limpa como sempre. Apenas destaque visual sutil em botões prioritários para a faixa etária. Sem cards extras, sem poluição.

---

## O que NÃO muda

- O fluxo do `OnboardingPage.tsx` permanece igual (nome, bebê, data de nascimento, gênero)
- A ordem dos botões na `ActivityGrid` permanece igual
- Os botões disponíveis permanecem os mesmos
- A lógica de registros, projeções e histórico permanece igual
- O `LeapCard` existente permanece como está, sem cadeado, sem alteração de comportamento

---

## Parte 1: Tela de boas-vindas (WelcomePage)

### Quando aparece
- Exatamente uma vez, logo após `onComplete()` no `OnboardingPage`
- Controlado por flag `yaya_welcome_shown` no `localStorage`
- Se a flag já existir, pula direto para a home

### Fluxo
```
OnboardingPage (cadastro) → WelcomePage (nova) → TrackerPage (home)
```

### Estrutura visual (fiel ao mockup)

```
[ Glow de fundo animado ]
[ Emoji do salto atual, em anel com pulse animation ]
[ Label: "Yaya Baby" em uppercase, cor primary ]
[ Título: "Bem-vindo/a ao Yaya!" — gênero do bebê ]
[ Pill: "Nome · Xm/semanas" ]
[ Parágrafo contextual da faixa etária ]
[ 3 feature rows ]
[ Botão CTA "Vamos lá" ]
```

### Feature rows: regra da primeira linha

A primeira feature row é **sempre** a mesma para todas as faixas:

```
icon: 📋
title: "Controle a rotina"
desc: "Controle todo o dia do [nome] com apenas 1 clique"
     (ou "da [nome]" conforme gênero — masculino: do, feminino: da)
```

A segunda e terceira features variam por faixa (ver tabela abaixo).

### Concordância de gênero

O texto deve adaptar automaticamente baseado em `baby.gender`:
- `girl`: "Bem-vinda", "da [nome]", "agitada"
- `boy`: "Bem-vindo", "do [nome]", "agitado"

---

## Parte 2: Faixas etárias

### Função utilitária: `getAgeBand(birthDate: string): AgeBand`

Criar em `app/src/lib/ageUtils.ts`:

```typescript
export type AgeBand =
  | 'newborn'       // 0 a 4 semanas (0 a 27 dias)
  | 'early'         // 1 a 3 meses (28 a 90 dias)
  | 'growing'       // 3 a 6 meses (91 a 181 dias)
  | 'weaning'       // 6 a 9 meses (182 a 273 dias)
  | 'active'        // 9 a 12 meses (274 a 364 dias)
  | 'toddler_early' // 12 a 18 meses (365 a 547 dias)
  | 'toddler'       // 18 a 24 meses (548 a 729 dias)
  | 'beyond'        // 24m+

export function getAgeBand(birthDate: string): AgeBand {
  const days = Math.floor((Date.now() - new Date(birthDate).getTime()) / 86400000)
  if (days < 28)  return 'newborn'
  if (days < 91)  return 'early'
  if (days < 182) return 'growing'
  if (days < 274) return 'weaning'
  if (days < 365) return 'active'
  if (days < 548) return 'toddler_early'
  if (days < 730) return 'toddler'
  return 'beyond'
}
```

---

### Tabela de faixas: conteúdo completo

#### Faixa 1: Recém-nascido (0 a 4 semanas)

**Botões em destaque:** `breast_left`, `breast_right`, `breast_both`, `sleep`, `wake`

**Parágrafo da boas-vindas:**
> "Recém-nascidos precisam comer a cada 2 ou 3 horas, dia e noite. Registre por alguns dias e o Yaya identifica o padrão. Mais rápido do que parece."

**Feature 2:** icon `🌙` | title "Padrões de sono" | desc "O Yaya aprende o ritmo do seu bebê"
**Feature 3:** icon `🌱` | title "Salto em andamento" | desc "Acompanhe essa fase de desenvolvimento"

**Intervalos padrão:**
```
feed: 120 min / warn: 90 min
diaper: 90 min / warn: 60 min
sleep_nap: 45 min / warn: 30 min
sleep_awake: 60 min / warn: 45 min
```

---

#### Faixa 2: Primeiros meses (1 a 3 meses)

**Botões em destaque:** `breast_left`, `breast_right`, `breast_both`, `sleep`, `wake`

**Parágrafo da boas-vindas:**
> "Entre 1 e 3 meses, os padrões de sono começam a surgir. Registre por alguns dias e o Yaya te mostra quando [nome] está pronto/a para dormir."

**Feature 2:** icon `🌙` | title "Previsão de sono" | desc "Descubra quando ele/ela está pronto/a para dormir"
**Feature 3:** icon `🌊` | title "Salto chegando" | desc "Fique por dentro do desenvolvimento"

**Intervalos padrão:**
```
feed: 150 min / warn: 120 min
diaper: 100 min / warn: 75 min
sleep_nap: 60 min / warn: 45 min
sleep_awake: 90 min / warn: 70 min
```

---

#### Faixa 3: Bebê crescendo (3 a 6 meses)

**Botões em destaque:** `sleep`, `wake`, `breast_left`, `breast_right`

**Parágrafo da boas-vindas:**
> "Nessa fase, a maioria dos bebês começa a dormir períodos mais longos. Registre o sono por uma semana e o Yaya identifica o horário ideal."

**Feature 2:** icon `🌙` | title "Sono em evolução" | desc "Veja como o padrão muda semana a semana"
**Feature 3:** icon `🎭` | title "Salto ativo" | desc "Entenda o que está acontecendo agora"

**Intervalos padrão:**
```
feed: 180 min / warn: 150 min
diaper: 120 min / warn: 90 min
sleep_nap: 90 min / warn: 70 min
sleep_awake: 120 min / warn: 90 min
```

---

#### Faixa 4: Introdução alimentar (6 a 9 meses)

**Botões em destaque:** `sleep`, `wake`, `bottle`

**Parágrafo da boas-vindas:**
> "6 meses é o início da introdução alimentar. O padrão de sono e alimentação vão mudar bastante. O Yaya acompanha essa transição com você."

**Feature 2:** icon `🌙` | title "Sono em transição" | desc "Acompanhe as mudanças dessa fase"
**Feature 3:** icon `🌍` | title "Salto chegando" | desc "Prepare-se para mais descobertas"

**Intervalos padrão:**
```
feed: 210 min / warn: 180 min
sleep_nap: 90 min / warn: 75 min
sleep_awake: 150 min / warn: 120 min
```

---

#### Faixa 5: Bebê ativo (9 a 12 meses)

**Botões em destaque:** `sleep`, `wake`, `bottle`

**Parágrafo da boas-vindas:**
> "Entre 9 e 12 meses, muitos bebês migram para 2 sonecas por dia. Registre o sono e o Yaya identifica quando essa transição está acontecendo."

**Feature 2:** icon `🌙` | title "Transição de sonecas" | desc "De 3 para 2 sonecas: o Yaya detecta"
**Feature 3:** icon `🔄` | title "Salto ativo" | desc "Entenda o comportamento atual"

**Intervalos padrão:**
```
feed: 210 min / warn: 180 min
sleep_nap: 90 min / warn: 75 min
sleep_awake: 180 min / warn: 150 min
```

---

#### Faixa 6: Primeiro aniversário (12 a 18 meses)

**Botões em destaque:** `sleep`, `wake`

**Parágrafo da boas-vindas:**
> "No primeiro aninho, muitos bebês transitam para uma soneca só. O Yaya acompanha essa mudança e te avisa quando o padrão se estabilizar."

**Feature 2:** icon `🌙` | title "Transição para 1 soneca" | desc "O Yaya detecta quando chega a hora"
**Feature 3:** icon `🎯` | title "Salto chegando" | desc "A autonomia vai explodir em breve"

**Intervalos padrão:**
```
feed: 240 min / warn: 210 min
sleep_nap: 120 min / warn: 90 min
sleep_awake: 240 min / warn: 210 min
```

---

#### Faixa 7: Toddler (18 a 24 meses)

**Botões em destaque:** `sleep`, `wake`

**Parágrafo da boas-vindas:**
> "Entre 18 e 24 meses, o sono noturno fica mais estável, mas a hora de dormir pode virar uma batalha. Registre para encontrar o horário ideal."

**Feature 2:** icon `🌙` | title "Hora de dormir" | desc "Descubra o horário ideal para [nome]"
**Feature 3:** icon `🌟` | title "Salto ativo" | desc "O maior salto da infância. Saiba o que esperar"

**Intervalos padrão:**
```
feed: 0 min (desativado)
sleep_nap: 120 min / warn: 90 min
sleep_awake: 300 min / warn: 270 min
```

---

#### Faixa 8: Beyond (24m+)

Sem tela de boas-vindas personalizada. Usa conteúdo genérico. Intervalos padrão atuais. Nenhum botão em destaque.

---

## Parte 3: Destaque visual na ActivityGrid

### Regra
Botões na lista `highlightedEventIds` recebem:
- `border: 1.5px solid rgba(183,159,255,0.38)` (borda sutil primary)
- `background: rgba(183,159,255,0.08)` (fundo levemente mais intenso)

Botões fora da lista permanecem com estilo padrão `bg-surface-container-high`. A **ordem não muda**.

### Implementação

**1. `getHighlightedEvents(band: AgeBand): string[]`** em `ageUtils.ts`:

```typescript
export function getHighlightedEvents(band: AgeBand): string[] {
  const map: Record<AgeBand, string[]> = {
    newborn:       ['breast_left', 'breast_right', 'breast_both', 'sleep', 'wake'],
    early:         ['breast_left', 'breast_right', 'breast_both', 'sleep', 'wake'],
    growing:       ['sleep', 'wake', 'breast_left', 'breast_right'],
    weaning:       ['sleep', 'wake', 'bottle'],
    active:        ['sleep', 'wake', 'bottle'],
    toddler_early: ['sleep', 'wake'],
    toddler:       ['sleep', 'wake'],
    beyond:        [],
  }
  return map[band] ?? []
}
```

**2. `ActivityButton.tsx`:** adicionar prop `highlighted?: boolean`. Quando true, aplicar as classes acima.

**3. `ActivityGrid.tsx`:** receber prop `highlightedEventIds: string[]` e passar `highlighted={highlightedEventIds.includes(event.id)}` para cada `ActivityButton`.

**4. `TrackerPage.tsx`:**
```tsx
const band = baby?.birthDate ? getAgeBand(baby.birthDate) : 'beyond'
const highlightedEventIds = getHighlightedEvents(band)

<ActivityGrid
  events={DEFAULT_EVENTS}
  logs={logs}
  onLog={handleLog}
  highlightedEventIds={highlightedEventIds}
/>
```

O destaque se **atualiza automaticamente** conforme o bebê cresce. Nenhuma ação do usuário é necessária.

---

## Parte 4: LeapCard na home (sem alteração de comportamento)

O `LeapCard` existente permanece **exatamente como está**. Não adicionar cadeado, não alterar o componente. A decisão de produto é:

- Descrição básica visível para todos (já implementado)
- "Saiba mais" abre o `LeapDetail` modal (já implementado)
- Para usuários free sem Yaya+: o `LeapDetail` pode mostrar paywall no futuro (fora do escopo deste spec)

---

## Parte 5: Intervalos padrão por faixa

No `OnboardingPage.tsx`, função `handleCreate`, substituir o array `defaultIntervals` fixo por:

```typescript
import { getAgeBand, getDefaultIntervals } from '../lib/ageUtils'

// dentro de handleCreate, após criar o baby:
const defaultIntervals = getDefaultIntervals(baby.id, birthDate)
await supabase.from('interval_configs').insert(defaultIntervals)
```

**`getDefaultIntervals(babyId, birthDate)`** retorna o array correto para a faixa, conforme tabela acima.

---

## Parte 6: WelcomePage: implementação

### Arquivo: `app/src/pages/WelcomePage.tsx`

Props recebidas:
```typescript
interface Props {
  onComplete: () => void
  baby: { name: string; gender: 'boy' | 'girl'; birthDate: string }
}
```

### Lógica de exibição no `App.tsx`

```typescript
const [showWelcome, setShowWelcome] = useState(() => {
  return !localStorage.getItem('yaya_welcome_shown')
})

// No fluxo de roteamento, após onboarding:
if (showWelcome && baby) {
  return (
    <WelcomePage
      baby={baby}
      onComplete={() => {
        localStorage.setItem('yaya_welcome_shown', '1')
        setShowWelcome(false)
      }}
    />
  )
}
```

### Onde a flag é setada: apenas no handleCreate

A `WelcomePage` só é exibida para quem **criou** o perfil do bebê. Quem entra via código de convite (`handleJoin`) chama `onComplete()` direto, sem passar pela WelcomePage.

No `OnboardingPage.tsx`:
- `handleCreate`: ao final, antes de chamar `onComplete()`, **não** seta a flag. Deixa o `App.tsx` exibir a WelcomePage e a flag é setada lá ao clicar em "Vamos lá".
- `handleJoin`: chama `onComplete()` diretamente. A flag permanece sem ser setada. O `App.tsx` vai verificar, mas como o usuário tem `role === 'caregiver'` (não é criador), deve pular a welcome.

**Regra definitiva:** a WelcomePage só aparece se `!localStorage.getItem('yaya_welcome_shown')` E o membro atual tiver `role === 'parent'` no `baby_members`. Isso garante que cuidadores que entram via convite nunca vejam a tela, mesmo que o localStorage esteja limpo (reinstalação do app).

**Cuidadores (role === 'caregiver'):** caem direto na home, sem nenhuma tela intermediária. Decisão de produto: o cuidador foi convidado por alguém que já usa o app e não precisa de onboarding personalizado.
```

### Animações

- Anel do emoji: `animation: pulse` suave (escala de sombra, não de tamanho)
- Entrada da tela: `page-enter` (já existe no globals.css: fade-in + translateY)
- Botão CTA: gradiente `from-[#5b3db5] to-[#b79fff]`, `box-shadow: 0 8px 28px rgba(91,61,181,0.45)`

### Texto do CTA
`"Vamos lá"` (sem seta, sem emoji)

---

## Checklist de implementação

- [ ] Criar `app/src/lib/ageUtils.ts` com `getAgeBand`, `getHighlightedEvents`, `getWelcomeContent`, `getDefaultIntervals`
- [ ] Atualizar `ActivityButton.tsx`: prop `highlighted`
- [ ] Atualizar `ActivityGrid.tsx`: prop `highlightedEventIds`
- [ ] Atualizar `TrackerPage.tsx`: calcular band + passar highlightedEventIds
- [ ] Criar `app/src/pages/WelcomePage.tsx`
- [ ] Atualizar `OnboardingPage.tsx`: usar `getDefaultIntervals` por faixa
- [ ] Atualizar `App.tsx`: inserir WelcomePage no fluxo pós-onboarding
- [ ] Testar nas 7 faixas: conteúdo correto, gênero concordando, botões certos destacados
- [ ] Verificar localStorage: welcome não aparece duas vezes
