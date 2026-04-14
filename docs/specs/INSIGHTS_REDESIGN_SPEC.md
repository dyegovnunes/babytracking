# Insights: Redesign Completo

**Status:** Aprovado para implementação
**Prioridade:** P1
**Tags:** `dev` `ux` `retenção`

---

## O problema da página atual

A página de Insights é uma mistura de três coisas diferentes:

1. **Dashboard** (contadores de hoje: amamentações, fraldas, sonos)
2. **Relatório** (intervalo médio, proporção peito/mamadeira, gráfico de 7 dias)
3. **Insights** (deveria existir, mas não existe)

O resultado: não faz nenhuma dessas três coisas bem. Os dados estão lá, mas sem contexto, sem interpretação e sem valor percebido pelo usuário.

---

## A nova proposta: separar em duas seções claras

A página se divide em duas seções distintas, com propósitos diferentes:

### Seção 1: Resumo do dia (topo, sempre visível, free)

Cards visuais com os **números do período selecionado**. Objetivo: responder "como está sendo o dia/semana do bebê?"

**Seletor de período:** dropdown no topo da página, idêntico ao do Super Relatório do Bebê. Posicionado no canto superior direito do header da página.

```
[ Últimos 7 dias  ˅ ]
  ┌─────────────────┐
  │ Hoje            │ ← desabilitado (cinza) se não há registros hoje
  │ Últimos 7 dias  │ ← default selecionado
  │ Últimos 15 dias │ ← desabilitado se menos de 2 dias com registros
  │ Últimos 30 dias │ ← desabilitado se menos de 5 dias com registros
  │ Mês atual       │ ← desabilitado se nenhum registro no mês
  │ Mês passado     │ ← desabilitado se nenhum registro no mês anterior
  │ Tudo            │ ← sempre habilitado (se tem qualquer registro)
  └─────────────────┘
```

Regras de disponibilidade:
- Cada opção só fica **habilitada** (selecionável) se existem dias com registros válidos naquele período
- Opções sem dados suficientes ficam em cinza claro e não são clicáveis
- Default: "Últimos 7 dias" (ou a maior opção disponível se o usuário tem menos de 7 dias de uso)
- Ao trocar período, resumo e insights recalculam instantaneamente

Quando "Hoje" está selecionado, os contadores mostram valores absolutos do dia. Para qualquer outro período, mostram **médias diárias** e o label muda (ex: "7.6x /dia", "Ref: 6-8x"). Mesmo padrão visual do Super Relatório.

Conteúdo:
- Contadores do período (amamentações, fraldas, sonos) com ícones
- Total de sono no período (número grande, ou média/dia se > 1 dia)
- Total de mamadeira em ml (se houver)

Visual: 3 cards horizontais abaixo do seletor, compactos. Idêntico ao `DaySummaryCard` atual mas com duas melhorias: (1) **horário do último registro** abaixo do contador ("última às 14:30", apenas no modo "Hoje"), (2) label de período ("Média/dia" quando > 1 dia).

### Seção 2: Insights contextuais (abaixo do resumo)

**Esta é a parte nova.** Cards individuais que entregam observações sobre os dados do usuário. Cada card tem:

```
[ Emoji ] [ Título do insight ]
[ Texto do insight com dados reais ]
[ Referência OMS/SBP em tom discreto ]
```

Exemplos reais, renderizados com dados:

```
🌙 Padrão de sono
Total de sono hoje: 13h20. A referência para 3 meses é 14 a 17h por dia.
Fonte: OMS

🤱 Intervalo entre amamentações
Média de intervalo hoje: 2h40. Dentro do esperado para essa faixa (2 a 3h).

🏆 Consistência
5 dias seguidos com 8 ou mais amamentações. Ótima constância!

🌙 Confusão dia e noite
Nos últimos 3 dias, o sono diurno (9h) está maior que o noturno (6h). 
Isso é comum nos primeiros meses. A inversão se resolve naturalmente.
```

---

## Regras de exibição dos insights

**Quantidade:** máximo 5 insights por vez. Prioridade: alertas suaves primeiro, depois padrões, depois celebrações, por último comparações com referência.

**Mínimo de dados:** cada insight tem um número mínimo de registros necessários. Nunca exibir um insight sobre sono se o usuário registrou menos de 3 ciclos de sono. Nunca exibir padrão de 7 dias se tem menos de 4 dias de dados.

**Rotação:** insights já vistos não reaparecem por 48h (flag no localStorage). Exceto alertas suaves, que podem repetir se a condição persistir.

**Free vs Yaya+:**
- Free: resumo do dia + até 2 insights (os mais relevantes)
- Yaya+: resumo do dia + todos os insights + gráfico de 7 dias

O paywall aparece **depois** do segundo insight, como uma faixa sutil: "Mais X insights disponíveis com Yaya+". Sem blur, sem cadeado gigante. O free já entregou valor, o upgrade é para quem quer mais.

---

## O que sai da página atual

| Componente atual | Decisão |
|---|---|
| `DaySummaryCard` | Mantém (com melhoria do horário do último registro) |
| `FeedingInsights` | Removido como componente autônomo. Dados migram para cards de insight individuais |
| `SleepInsights` | Removido como componente autônomo. Dados migram para cards de insight individuais |
| `WeekChart` | Mantém, mas move para abaixo dos insights. Exclusivo Yaya+ |

---

## Tipos de insight e lógica de cada um

### Tipo 1: Comparação com referência

Compara um dado calculado com a tabela OMS/AAP/SBP para a faixa etária.

| Insight | Gatilho | Faixa |
|---|---|---|
| Total de sono vs referência | Soma sono 24h vs tabela OMS por faixa | Todas |
| Contagem de amamentações vs referência | Contagem/dia vs 8 a 12 (0 a 3m), 6 a 8 (3 a 6m) | 0 a 6m |
| Janela de vigília vs referência | Intervalo entre fim de sono e início do próximo | Todas |
| Fraldas molhadas vs referência | Contagem/dia vs mínimo 6 após dia 5 | 0 a 3m |

### Tipo 2: Padrão detectado

Identifica algo nos dados que o usuário não perceberia sozinho.

| Insight | Gatilho | Faixa |
|---|---|---|
| Confusão dia/noite | Sono diurno > noturno por 3 dias | 0 a 3m |
| Horário de dormir instável | Desvio padrão do horário de início do sono noturno > 60min | 3m+ |
| Horário de dormir estável | Desvio padrão < 30min por 5 dias consecutivos | 3m+ |
| Maior bloco de sono noturno crescendo | Semana atual > semana anterior | Todas |
| Intervalo entre amamentações aumentando | Média semanal crescendo | 1 a 6m |
| Regressão de sono | Sono noturno caiu 1h+ vs semana anterior, após estabilidade | 3m+ |
| Transição para 2 sonecas | 3ª soneca < 30min ou recusada por 3+ dias | 6 a 9m |

### Tipo 3: Celebração

Reforço positivo para manter o engajamento.

| Insight | Gatilho | Faixa |
|---|---|---|
| Streak de registro | X dias consecutivos com 1+ registro | Todas |
| Semana recorde | Mais registros que qualquer outra semana | Todas |
| Dias de aleitamento exclusivo | Contador crescente | 0 a 6m |
| Sono noturno > diurno | Ritmo circadiano se formando | 1 a 3m |

### Tipo 4: Alerta suave

Informação que merece atenção, sem ser alarmista.

| Insight | Gatilho | Faixa |
|---|---|---|
| Intervalo longo sem amamentar | Mais de 6h diurnas sem registro de feed | 0 a 3m |
| Poucas fraldas molhadas | Menos de 4 no dia | 0 a 3m |
| Sono total muito abaixo | Mais de 3h abaixo da referência OMS por 3 dias | Todas |

---

## Estrutura de componentes (nova)

```
InsightsPage.tsx
├── PeriodDropdown.tsx       (novo: dropdown com opções de período, mesmo do Super Relatório. Opções desabilitadas quando sem dados)
├── DaySummaryCard.tsx       (mantém, com horário do último + label de período)
├── InsightCard.tsx           (novo: card individual de insight)
├── InsightList.tsx           (novo: orquestra quais insights exibir)
├── WeekChart.tsx             (mantém, movido para baixo)
└── InsightPaywallBanner.tsx  (novo: faixa sutil entre free e premium)
```

### InsightCard: props

```typescript
interface InsightCardProps {
  emoji: string
  title: string
  body: string          // texto principal com dados interpolados
  source?: string       // "OMS", "AAP", "SBP" — exibido em tom discreto
  type: 'reference' | 'pattern' | 'celebration' | 'alert'
}
```

Visual por tipo:
- `reference`: borda padrão, sem destaque
- `pattern`: ícone de lâmpada no canto, fundo levemente diferente
- `celebration`: emoji festivo, borda com gradiente sutil
- `alert`: borda laranja sutil (nunca vermelho), ícone de atenção discreto

---

## Engine de insights: `useInsightsEngine`

Novo hook que substitui o `useInsights` atual. Recebe `logs`, `baby` (para faixa etária) e retorna:

```typescript
interface InsightResult {
  id: string             // ex: "sleep_vs_reference_2026-04-13"
  emoji: string
  title: string
  body: string
  source?: string
  type: 'reference' | 'pattern' | 'celebration' | 'alert'
  priority: number       // 1 = mais urgente
  minDataDays: number    // mínimo de dias com dados para exibir
}

type PeriodOption = 'today' | 'last_7' | 'last_15' | 'last_30' | 'current_month' | 'last_month' | 'all'

function useInsightsEngine(
  logs: LogEntry[],
  baby: Baby,
  period: PeriodOption  // default: 'last_7'
): {
  periodSummary: PeriodSummary      // contadores do período (absolutos se today, médias/dia se outro)
  insights: InsightResult[]         // insights filtrados e priorizados
  weekTrends: DayTrend[]            // gráfico de 7 dias (Yaya+ only)
  availablePeriods: PeriodOption[]   // períodos com dados suficientes (para habilitar/desabilitar no dropdown)
}
```

A engine calcula todos os insights possíveis, filtra os que não têm dados suficientes, remove os já vistos em 48h, ordena por prioridade e retorna o máximo de 5.

---

## Referências por faixa para cálculos

```typescript
const SLEEP_REFERENCE: Record<AgeBand, { min: number; max: number }> = {
  newborn:       { min: 840, max: 1020 }, // 14 a 17h
  early:         { min: 840, max: 1020 }, // 14 a 17h
  growing:       { min: 720, max: 900 },  // 12 a 15h
  weaning:       { min: 720, max: 900 },  // 12 a 15h
  active:        { min: 720, max: 840 },  // 12 a 14h
  toddler_early: { min: 660, max: 840 },  // 11 a 14h
  toddler:       { min: 660, max: 840 },  // 11 a 14h
  beyond:        { min: 600, max: 780 },  // 10 a 13h
}

const WAKE_WINDOW: Record<AgeBand, { min: number; max: number }> = {
  newborn:       { min: 30,  max: 60 },   // 30 a 60min
  early:         { min: 45,  max: 90 },   // 45 a 90min
  growing:       { min: 90,  max: 150 },  // 1h30 a 2h30
  weaning:       { min: 150, max: 180 },  // 2h30 a 3h
  active:        { min: 180, max: 240 },  // 3 a 4h
  toddler_early: { min: 240, max: 300 },  // 4 a 5h
  toddler:       { min: 300, max: 360 },  // 5 a 6h
  beyond:        { min: 300, max: 420 },  // 5 a 7h
}

const FEEDS_REFERENCE: Record<AgeBand, { min: number; max: number }> = {
  newborn:       { min: 8,  max: 12 },
  early:         { min: 8,  max: 12 },
  growing:       { min: 6,  max: 8 },
  weaning:       { min: 5,  max: 7 },
  active:        { min: 4,  max: 6 },
  toddler_early: { min: 3,  max: 5 },
  toddler:       { min: 3,  max: 4 },
  beyond:        { min: 3,  max: 4 },
}
```

---

## Fase 2: Insights inteligentes (IA, futuro)

Fora do escopo desta implementação. Documentado aqui para referência.

O que a IA fará que regras não fazem:
- Correlações individuais: "seu bebê especificamente dorme melhor quando mama antes das 19h"
- Detecção de anomalias: "hoje o padrão de sono mudou significativamente vs as últimas 2 semanas"
- Previsão: "baseado no histórico de 30 dias, a próxima soneca deve começar por volta das 14h20"
- Linguagem natural: tom mais conversacional, menos tabular

Pré-requisito: mínimo 30 dias de dados históricos consistentes para treinar o modelo por bebê.

---

## Checklist de implementação

- [ ] Criar componente `PeriodDropdown.tsx` (dropdown com 7 opções de período, opções desabilitadas quando sem dados, mesmo padrão do Super Relatório)
- [ ] Criar `app/src/lib/insightRules.ts` com todas as regras de insights por tipo
- [ ] Criar `app/src/lib/referenceData.ts` com tabelas OMS/AAP por faixa
- [ ] Criar hook `useInsightsEngine.ts` substituindo `useInsights.ts`
- [ ] Criar componente `InsightCard.tsx`
- [ ] Criar componente `InsightList.tsx`
- [ ] Criar componente `InsightPaywallBanner.tsx`
- [ ] Atualizar `DaySummaryCard.tsx` com horário do último registro
- [ ] Reescrever `InsightsPage.tsx` com nova estrutura
- [ ] Mover `WeekChart` para abaixo dos insights (Yaya+ only)
- [ ] Implementar rotação de 48h no localStorage
- [ ] Testar com dados de diferentes faixas etárias
