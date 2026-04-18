# Redesign Visual do Yaya — Spec de Evolução v2

**Status:** Aprovado pra implementação em fases no branch `design-v2`.
**Substitui:** `DESIGN_EVOLUTION_SPEC.md` (v1, tinha direções que decidimos não seguir).
**Tags:** `design` `ux` `branding` `animações` `tipografia`

---

## Contexto

Yaya concorre num mercado de apps funcionais e frios (Huckleberry, Glow Baby, Baby Connect). Parecem planilhas com ícones. Há espaço claro pra um produto que combine eficiência de registro com design emocionalmente conectado — como o público-alvo (pais de primeira viagem, 25-35 anos) espera de produtos premium (Notion, Linear, Headspace).

Uso do app acontece **durante todo o dia**, inclusive madrugada. Não é app só noturno — é companheiro do dia-a-dia. A decisão de design precisa funcionar em luz direta às 15h no sol, em light mode no carrinho às 10h, e em dark mode às 3h com bebê chorando no colo.

Esta spec descreve a evolução visual. Não é mudança estrutural de funcionalidades — é camada de qualidade.

---

## Princípios de decisão

Antes de detalhar: 4 princípios que guiam TODAS as escolhas abaixo.

1. **Família roxa como ancoragem emocional.** Roxo é a cor Yaya. Qualquer acento ou neutro vem dessa mesma família (lilás, lavanda, rosa empoeirado), não de famílias dissonantes (bege, pêssego, âmbar).
2. **Evitar tendências óbvias do segmento wellbeing.** Plus Jakarta Sans / DM Sans / Nunito, gradientes em CTA, ilustrações Notion-style — são padrão em apps do segmento. Adotar torna o Yaya invisível no meio.
3. **Animação como feedback funcional, não decoração.** Cada animação tem um motivo: confirmar toque, indicar estado, celebrar progresso. Nunca "porque fica bonito".
4. **Quando em dúvida, menos.** O app é ferramenta, não cartão de visita. Densidade visual limpa > paleta exuberante.

---

## Paleta

### Dark mode (tema principal — já em uso)

**Manter a base roxa profunda atual.** `#0d0a27` é um roxo quase-preto com alma, não preto puro — está correto. A mudança aqui é apenas **refinar contraste e hierarquia**.

| Token | Valor atual | Valor novo | Uso |
|---|---|---|---|
| `--color-surface` | `#0d0a27` | **`#0d0a27`** (manter) | Fundo principal |
| `--color-surface-container-low` | `#120f2f` | **`#120f30`** (manter) | Cards discretos |
| `--color-surface-container` | `#181538` | **`#181538`** (manter) | Cards padrão |
| `--color-surface-container-high` | `#1e1a41` | **`#1e1a41`** (manter) | Cards elevados |
| `--color-primary` | `#b79fff` | **`#b79fff`** (manter) | Primary roxo |
| `--color-tertiary` | `#ff96b9` | **`#ff96b9`** (manter) | Rosa empoeirado — acento de celebração |

**Novo token a introduzir:**

| Token | Valor | Uso |
|---|---|---|
| `--color-lavender-muted` | `#a8a0c9` | Sono, descanso, elementos noturnos sutis — substitui cinza frio |

**O que NÃO fazer:** trocar pra marrom escuro `#1A1612`. Direção datada (tendência 2024 Notion-style) e incoerente com família roxa.

### Light mode (tema alternativo)

Hoje é branco puro `#ffffff` — funcional mas plano. Direção: **branco lilás suave**, mantendo família.

| Token | Valor atual | Valor novo |
|---|---|---|
| `--color-surface` | `#ffffff` | **`#fafafe`** (branco com 1% lilás) |
| `--color-surface-dim` | `#f5f5f7` | **`#f3f2f8`** |
| `--color-surface-container-low` | `#f5f5f7` | **`#efedf6`** |
| `--color-surface-container` | `#f0f0f4` | **`#e8e5f2`** |
| `--color-surface-container-high` | `#e8e7ee` | **`#ded9ea`** |

**O que NÃO fazer:** bege `#FAF7F4` ou qualquer tom caramelo/creme. Rompe a família roxa.

---

## Tipografia

**Manter Manrope** como família principal. A família já em uso é funcional, com personalidade sutil, e sem sobreposição óbvia com outros apps do segmento.

**O ganho vem de hierarquia, não de trocar fonte.**

### Escala de peso recomendada

| Contexto | Peso Manrope | Exemplo |
|---|---|---|
| Eyebrow label uppercase | 600 | `SEU CÓDIGO`, `PRÓXIMO MARCO` |
| Metadata / subtítulos | 400 | `por Papai`, `há 2h4min` |
| Texto corpo | 500 | descrições, explicações |
| Botão primário | 700 | `Enviar código`, `Dei a dose` |
| Título de página | 800 | `Histórico`, `Insights` |
| **Número de destaque** | **800 + letter-spacing -0.03em** | `14h38`, `5/10`, `21:11` |
| Headline hero (quando houver) | 800 + letter-spacing -0.04em | `Ya` `ya` do logo, título do marco |

### O que NÃO fazer

- Trocar Manrope por Plus Jakarta Sans / DM Sans / Nunito. Saturação do segmento wellbeing.
- Usar 3+ famílias tipográficas. Máximo 2 (Manrope principal + Material Symbols pros ícones, que já usamos).
- Números de destaque em peso 500/600. Tem que ser 800 com tracking negativo.

### Opção ousada (se quisermos ir além no futuro)

Se em algum momento decidirmos que Manrope ficou "saturada", duas alternativas **realmente diferenciadoras** (não genéricas):

- **General Sans** — personalidade sutil, muito usada em produtos "curados" (Vercel, Supabase).
- **Instrument Serif** (opcional, só pra números) — dá toque editorial premium. Ex: "14h38" em Instrument Serif e o label em Manrope.

Fica no backlog, não é pra agora.

---

## Micro-animações

### Princípio

**Spring physics em vez de easing CSS** para qualquer animação significativa. CSS keyframes parecem programadas; springs parecem físicas. Instalar uma das libs:

- **Framer Motion** (mais robusta, API `<motion.div>`, bundle ~40kB gzipped)
- **React Spring** (mais leve, imperativo, bundle ~13kB gzipped)

Recomendação: **Framer Motion**. A API declarativa combina com React e nosso estilo de código. Bundle cost aceitável pro ganho de qualidade.

### Os 3 níveis de celebração

Configurar 3 presets de spring e aplicar por contexto:

| Preset | Uso | Config Framer Motion |
|---|---|---|
| `subtle` | Tap em botão, click em log row | `{ stiffness: 400, damping: 25, mass: 0.8 }` |
| `delight` | Dismiss de card (swipe), abertura de sheet, checkbox toggle | `{ stiffness: 260, damping: 20 }` |
| `milestone` | Registro de marco, 10º indicação ativada, streak completo | `{ stiffness: 150, damping: 14 }` — mais bouncy |

### Haptic sincronizado

Cada animação significativa dispara haptic no **mesmo frame**. Já temos `@capacitor/haptics` instalado via `src/lib/haptics.ts`.

| Evento | Animação | Haptic |
|---|---|---|
| Tap em Activity button | `subtle` scale 0.95→1.0 | `hapticLight()` |
| Swipe-dismiss em card de projeção | `delight` translateX | `hapticMedium()` ao cross threshold |
| Check em medicamento (dose dada) | `subtle` + ícone pulse | `hapticSuccess()` |
| Registro de marco | `milestone` + confetti discreto | `hapticHeavy()` |
| Streak completado | `milestone` + brilho dourado radial | `hapticSuccess()` |

### Lista de animações a implementar

**Prioritárias (Fase 1):**
- Transição de páginas (já existe `animate-page-enter` 0.25s — **manter**)
- Tap em ActivityButton: scale `{from: 1, to: 0.95, then back}`, 120ms
- Abertura de Sheet: migrar de CSS keyframe pra spring `delight`
- Abertura/fechamento de modal: spring scale + fade
- Swipe-dismiss de card de projeção (já tem base, melhorar com spring)

**Secundárias (Fase 2):**
- Breathing em timer ativo (ex: mamada em andamento): opacity 1.0 → 0.7 → 1.0, 2000ms linear
- Celebração de marco: spring `milestone` + efeito de estrelas/confetti saindo do ícone (~500ms total)
- Streak 7/14/30 dias: brilho radial sutil na chama, 400ms
- Transição entre abas: slide horizontal de 200ms com curva ease-out

### Regra obrigatória

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Framer Motion respeita `prefers-reduced-motion` nativamente — já traz a lógica. Não precisa configurar por animação.

---

## Elevation e componentes

### Sombras em 2 camadas (não gradientes)

Gradientes em CTA são sinais de app antigo em 2026 (voltou a ser tendência em 2010-2015, Windows Aero). Substituir por **elevation com 2 camadas de sombra**:

```css
/* CTA primário — dark mode */
box-shadow:
  0 1px 2px rgba(91,61,181,0.30),   /* sombra próxima — cria a sensação de apoio */
  0 8px 24px rgba(91,61,181,0.20);  /* sombra difusa — cria a sensação de flutuar */

/* CTA primário — light mode */
box-shadow:
  0 1px 2px rgba(91,61,181,0.15),
  0 8px 24px rgba(91,61,181,0.10);
```

Aplicar em: botões `Assinar Yaya+`, `Dei a dose`, `Salvar`, e qualquer CTA primário.

### Radius padronizado

**Manter o padrão atual** (documentado em `CLAUDE.md`): `rounded-md` (6px) pra tudo no app, exceto:

- **Toast/chip**: `rounded-full` (pill shape)
- **Avatar/ícone circular**: `rounded-full`
- **Landing page (marketing)**: pode usar `rounded-2xl`

Não mudar esse padrão. Já tá consistente.

### ActivityButton: sombra sutil

Adicionar sombra nos cards do grid de atividades (hoje são flat). Subtle, não pesada:

```css
/* Dark mode */
box-shadow: 0 2px 12px rgba(0,0,0,0.15);

/* Light mode */
box-shadow: 0 2px 12px rgba(120,100,190,0.08);
```

No hover/active: sombra mais próxima (elevation visual reduzida = "pressed").

---

## Loading states

### Skeleton em vez de spinner

Substituir **todos** os spinners (`progress_activity` rotativo) por skeleton screens. Já temos `animate-shimmer` definido em `globals.css` — só aplicar.

Priorizar nesta ordem:

1. `HistoryPage` (já tem `HistorySkeleton` aparentemente — verificar uso)
2. `TrackerPage` (já tem `TrackerSkeleton` — verificar)
3. `InsightsPage`
4. Listas de medicamentos/vacinas/marcos

**Regra**: skeleton deve ter a **mesma forma** do conteúdo real (mesma altura, mesmo layout de blocos). Skeleton genérico retangular é preguiça e não engana ninguém.

---

## Empty states

### Emoji + conversa, não ilustração

Ilustração custom amadora destrói percepção de premium. Não temos ilustrador contratado. Direção segura:

**Template de empty state:**
```
[emoji grande centrado]          (text-6xl, por ex 🫧 pra banho)
[headline conversacional]         (font-headline text-base)
[copy curto acionável]            (font-label text-sm on-surface-variant)
[CTA opcional]                    (só se fizer sentido)
```

### Exemplos

**História vazia:**
```
🕰️
Ainda não tem histórico.
Registre a primeira atividade do dia pra começar.
```

**Marcos sem registro:**
```
🎉
Nenhum marco ainda.
Vou avisar quando o [nome] atingir algum típico da idade dele.
```

**Insights sem dados suficientes:**
```
📊
Precisa de mais alguns dias de registro.
Vamos te mostrar padrões depois da primeira semana.
```

**Indicações sem entrada (MGM):**
```
👥
Você ainda não convidou ninguém.
Compartilhe seu link pra começar.
```

### O que NÃO fazer

- Ilustrações custom tipo Headspace/Calm. Sem ilustrador contratado vira amador.
- Stock illustration (Undraw, Storyset). Vira "mais um app com a mesma ilustração".
- Empty state sem nenhuma arte nem texto — deserto visual comunica que algo quebrou.

---

## Acessibilidade

Obrigatórios — não bypass:

- **Contraste WCAG AA** em todos os textos (verificar com DevTools ou Stark)
- **`prefers-reduced-motion`** respeitado globalmente (vide seção de micro-animações)
- **Touch targets mínimos 44×44pt** (iOS) / 48×48dp (Android) em qualquer elemento interativo
- **Focus states** visíveis em todos os elementos focáveis (hoje sumindo em alguns botões)
- **`aria-label`** em botões só-ícone (ex: chevron de navegação, close de modal)

---

## O que NÃO fazer (resumo)

- ❌ Trocar dark mode pra marrom (`#1A1612`) — datado, incoerente com família roxa
- ❌ Adotar Plus Jakarta Sans / DM Sans / Nunito — tríade genérica do segmento wellbeing
- ❌ Usar bege, caramelo, pêssego ou âmbar em qualquer lugar — famílias dissonantes
- ❌ Gradientes em CTAs — tendência datada (2010-2015)
- ❌ Ilustrações custom sem ilustrador contratado — amadorismo detectável
- ❌ Mais de 2 famílias tipográficas — complexidade sem ganho
- ❌ Empty states decorativos sem conteúdo útil
- ❌ Animações que decoram sem função (pulses infinitos sem motivo)

---

## Fases de implementação

### Fase 1 — Impacto alto, risco baixo

1. **Skeleton screens** em home, history, insights (usar `animate-shimmer` já existente).
2. **Hierarquia tipográfica ousada** com Manrope (sem trocar fonte). Peso 800 em números de destaque + tracking negativo. Peso 200-400 em metadata.
3. **Sombras em 2 camadas** nos CTAs e ActivityButton (substitui qualquer intenção de gradiente).
4. **Framer Motion instalado** + migração das 3 animações prioritárias (tap em ActivityButton, sheet open, modal open) pra spring.
5. **Haptic sincronizado** com as animações implementadas.

### Fase 2 — Diferenciação visual

6. **Refinar família de cor**: introduzir `--color-lavender-muted` (`#a8a0c9`), revisar uso de cinza em favor dele.
7. **Light mode humanizado**: swap de tokens `#ffffff` → `#fafafe` e demais surface containers pra tons lilás-suave.
8. **3 níveis de celebração** configurados (`subtle`, `delight`, `milestone`) aplicados em pontos chave.
9. **Breathing animation** em timer ativo.
10. **Transições entre abas** com slide horizontal suave.

### Fase 3 — Polish final

11. **Empty states** revisados em todas as telas vazias conforme template.
12. **Celebração de marco aprimorada**: spring milestone + confetti discreto saindo do ícone.
13. **Streak com brilho radial** ao completar ciclos.
14. **Focus states + aria-labels** auditados e corrigidos onde faltam.

### Fora de escopo desta spec

- **Marcos do app / conquistas secundárias** ("100º banho", "1 ano de Yaya"): será tratado em papo separado sobre jornada.
- **Cards de resumo compartilháveis**: idem, papo de jornada.
- **Som em celebrações**: não agora.
- **Onboarding redesenhado**: vai quando tivermos fluxo de onboarding estabilizado.

---

## Verificação

Cada fase tem um critério de pronto:

### Fase 1
- Abrir history com conexão lenta → vê skeleton com forma, não spinner
- Abrir home → números (tempo do último registro, streak) em peso 800 com tracking negativo
- Tocar em qualquer CTA → sensação de elevação (sombra 2 camadas, sem gradiente)
- Tocar em ActivityButton → animação spring natural + vibração light sincronizada

### Fase 2
- Cinza frio substituído por lavender-muted em Insights, metadata, legends
- Alternar light mode → surface é `#fafafe` lilás-suave, não `#ffffff`
- Registrar marco → animação spring milestone bouncy + haptic heavy

### Fase 3
- Navegar em todas as telas com histórico/insights/medicamentos vazios → empty state conversacional + emoji, nunca deserto
- Completar streak 7 dias → brilho radial discreto na chama
- Testar com reduced-motion ativo → sem animações, layout funcional

---

## Referências e benchmarks

- **Linear** (desktop): referência de coesão visual em produto premium. Sombras 2 camadas, hierarquia tipográfica ousada, sem gradientes.
- **Vercel Dashboard**: CTA sólidos com elevation, paleta monocromática refinada.
- **Peanut app**: segmento materno, usa família rosa/roxo coesa, não cede a "bege acolhedor".
- **Headspace**: referência de polish emocional — mas seu estilo de ilustração custom é inatingível sem budget similar.

---

*Spec consolidada em 2026-04-18 após avaliação crítica da v1. Decisões discutidas e aprovadas. Implementação em fases no branch `design-v2` — só merge no `main` após validação visual completa.*
