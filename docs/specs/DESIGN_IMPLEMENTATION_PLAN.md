# Plano de Implementação — Design Evolution v2

**Branch:** `design-v2` · **Status:** Em validação item a item · **Spec base:** `DESIGN_EVOLUTION_SPEC_V2.md`

Documento de trabalho. Cada decisão e item de implementação tem um **estado** que vai sendo atualizado conforme você aprova/ajusta. Ordem de leitura: decisões → fases.

**Legenda de estados:**
- ⏳ **Pendente** — aguarda sua validação
- ✅ **Aprovado** — pode implementar
- 🔧 **Ajustar** — aprovado com modificação (comentário descreve o quê)
- ❌ **Rejeitado** — não implementar, fica no histórico como decisão consciente
- 🏗️ **Em implementação** — codando agora
- ✔️ **Feito** — commitado no branch

---

## Parte A — Decisões a validar ANTES de codar

Essas são definições fechadas. Precisam seu OK antes da primeira linha de código.

### A1. Paleta dark mode — manter ou ajustar valores?

**Estado:** ⏳ Pendente

**Proposta:** manter 100% dos tokens atuais do dark. `#0d0a27` surface, `#181538` container, `#b79fff` primary, `#ff96b9` tertiary.

**Único ajuste:** introduzir novo token `--color-lavender-muted: #a8a0c9` pra substituir cinza frio em metadata, legends, separators.

**Seu feedback:**
> _(preencher — OK / ajustar / rejeitar)_

---

### A2. Paleta light mode — migrar de branco puro pra branco lilás

**Estado:** ⏳ Pendente

**Proposta:** swap de tokens:

| Atual | Novo |
|---|---|
| `#ffffff` (surface) | `#fafafe` |
| `#f5f5f7` (surface-dim) | `#f3f2f8` |
| `#f5f5f7` (surface-container-low) | `#efedf6` |
| `#f0f0f4` (surface-container) | `#e8e5f2` |
| `#e8e7ee` (surface-container-high) | `#ded9ea` |

Primary, tertiary, error — sem mudança.

**Seu feedback:**
> _(preencher)_

---

### A3. Tipografia — ficar com Manrope

**Estado:** ⏳ Pendente

**Proposta:** manter Manrope como família única principal. Plus Jakarta Sans sai (está definido pra `--font-label` hoje — trocar pra Manrope).

Hierarquia de peso: 200/400/500/600/700/800 aplicados conforme mapa na spec v2.

**Seu feedback:**
> _(preencher — prefere explorar General Sans / Instrument agora, ou concorda em manter Manrope?)_

---

### A4. Biblioteca de animação — Framer Motion

**Estado:** ⏳ Pendente

**Proposta:** instalar `framer-motion` (~40kB gzipped). Motivação: 3 presets de spring (`subtle`/`delight`/`milestone`) ficam muito mais naturais que CSS keyframes. API declarativa.

Alternativa: `react-spring` (13kB) — mais leve, mas API imperativa, mais verbosa.

**Trade-off:** +40kB no bundle (hoje index-*.js = 316kB gzipped = 90kB). Vai pra ~100kB. Aceitável pra ganho de percepção.

**Seu feedback:**
> _(preencher — OK pra Framer Motion? prefere react-spring? quer evitar lib nova?)_

---

### A5. Haptic sincronizado com animações

**Estado:** ⏳ Pendente

**Proposta:** cada preset de animação dispara um nível de haptic:
- `subtle` → `hapticLight()`
- `delight` → `hapticMedium()`
- `milestone` → `hapticHeavy()`/`hapticSuccess()`

`@capacitor/haptics` já instalado. É só sincronizar.

**Seu feedback:**
> _(preencher)_

---

### A6. Fontes recusadas (reafirmar)

**Estado:** ⏳ Pendente — só confirmação

**Proposta:** NÃO adotar Plus Jakarta Sans, DM Sans, Nunito. Tríade saturada no segmento wellbeing.

**Seu feedback:**
> _(preencher — confirma rejeição?)_

---

### A7. Cores recusadas (reafirmar)

**Estado:** ⏳ Pendente — só confirmação

**Proposta:** NÃO adotar:
- Dark mode marrom (`#1A1612`)
- Accent pêssego `#F4A261`
- Bege caramelo em qualquer variante
- Branco gelo `#FAF7F4` no light

**Seu feedback:**
> _(preencher — confirma rejeição?)_

---

### A8. Empty states — emoji + copy OU ilustrações/imagens por IA

**Estado:** 🔧 Ajustado pela discussão

**Proposta revisada:** User trouxe alternativa válida — IA gera ilustração ou imagem realista. Humaniza mais que emoji frio, sem custo de ilustrador contratado.

**Processo de curadoria obrigatório:**
- Prompt fixo definido (ex: "soft illustration, lavender + dusty pink palette, editorial line, minimalist warmth")
- Gerar múltiplas variações → descartar as fora do tom
- Edição de cor/crop uniformizando o lote antes de subir
- Empty states **frequentes** (history vazio, marcos sem registro, insights sem dados) ganham imagem curada
- Empty states **secundários** ficam emoji + copy como fallback

**Seu feedback:**
> _(preencher — OK com o processo de curadoria? quer definir já a paleta/tom de prompt?)_

---

## Parte B — Implementação Fase 1 (impacto alto, risco baixo)

Depois que Parte A for aprovada, começo daqui. Cada item = um commit/PR no branch `design-v2`, testável isoladamente no Vercel Preview.

### B1. Skeleton screens em todas as páginas principais

**Estado:** ⏳ Pendente

**O que é skeleton screen:** placeholder animado com a forma do conteúdo real, em vez de spinner (bolinha girando). Ex: em vez de `⟳ carregando...`, aparece silhueta cinza dos cards (linhas simulando cada log). Cérebro "preenche" mentalmente → percepção de velocidade maior. Usado por Facebook, LinkedIn, YouTube.

**Escopo:**
- [ ] `HistoryPage` — se já tem `HistorySkeleton`, revisar e melhorar fidelidade
- [ ] `TrackerPage` — idem com `TrackerSkeleton`
- [ ] `InsightsPage` — criar
- [ ] `VaccinesPage` / `MilestonesPage` / `MedicationsPage` — se tiver spinner, substituir

**Critério de pronto:** abrir cada página com conexão lenta (DevTools throttle Slow 3G) → nunca aparece spinner, sempre skeleton com forma do conteúdo real.

**Seu feedback:**
> _(preencher)_

---

### B2. Hierarquia tipográfica ousada

**Estado:** ⏳ Pendente

**Escopo:**
- [ ] Auditar números de destaque (duração de sono, streak count, horários na timeline, Yaya+ chip) → peso 800 + letter-spacing `-0.03em`
- [ ] Metadata e legendas ("por Papai", "há 2h4min") → peso 400
- [ ] Eyebrow labels (uppercase tipo "ÚLTIMO REGISTRO") → peso 600 + letter-spacing `0.05em`
- [ ] Títulos de página (Histórico, Insights, Perfil) → peso 800

Sem trocar Manrope. Só aplicar a hierarquia.

**Arquivos impactados:** `globals.css` (tokens novos pra `font-weight-*`), componentes-chave que renderizam números.

**Critério:** comparar home antes/depois → números "gritam" mais, metadata "sussurra" mais, hierarquia clara.

**Seu feedback:**
> _(preencher)_

---

### B3. Sombras em 2 camadas (CTAs + ActivityButton)

**Estado:** ⏳ Pendente

**Escopo:**
- [ ] Criar classe utility `.shadow-cta-primary` no globals.css com as 2 camadas
- [ ] Aplicar em todos CTAs primários (busca por `bg-primary` + botão)
- [ ] Adicionar sombra sutil nos `ActivityButton` (hoje são flat)

**Critério:** CTAs parecem "flutuar" um pouco do fundo. ActivityButton tem dimensão de "card físico", não área plana.

**Seu feedback:**
> _(preencher — quer valores de sombra mais sutis ou mais pronunciados?)_

---

### B4. Instalar Framer Motion + migrar 3 animações prioritárias

**Estado:** ⏳ Pendente

**Escopo:**
- [ ] `npm install framer-motion`
- [ ] Criar `src/lib/motion.ts` exportando os 3 presets de spring (`subtle`/`delight`/`milestone`)
- [ ] Migrar tap em `ActivityButton` pra spring
- [ ] Migrar abertura de sheets (`useSheetBackClose` hook pode ficar, só troca a transição CSS pela Framer)
- [ ] Migrar abertura de modais (`EditModal`, `BottleModal`, etc)

**Critério:** tocar em ActivityButton → resposta física, não mecânica. Abrir Sheet → movimento natural, não "slide programado".

**Risco:** bundle +40kB. Mensurar antes/depois.

**Seu feedback:**
> _(preencher)_

---

### B5. Haptic sincronizado

**Estado:** ⏳ Pendente

**Escopo:**
- [ ] Revisar `src/lib/haptics.ts` — garantir que tem `hapticLight`/`hapticMedium`/`hapticHeavy`/`hapticSuccess`
- [ ] No `src/lib/motion.ts`, cada preset exporta também a função haptic correspondente
- [ ] Componentes que animam chamam tanto o `motion` quanto o haptic no mesmo momento

**Critério:** tocar ativamente no device (não simulator) → cada micro-animação tem vibração sincronizada proporcional.

**Seu feedback:**
> _(preencher)_

---

## Parte C — Implementação Fase 2 (diferenciação visual)

Só começo depois que Fase 1 tiver merge validado.

### C1. Introduzir `--color-lavender-muted` + substituir cinza frio

**Estado:** ⏳ Pendente

Search & replace de `text-on-surface-variant/60`, `text-on-surface-variant/40`, `bg-outline-variant/*` por token novo quando for semântico ("metadata", "separator", "placeholder").

**Seu feedback:**
> _(preencher)_

---

### C2. Migrar light mode pros novos tokens

**Estado:** ⏳ Pendente

Swap em `globals.css` seção `html.theme-light`. Testar em todas as páginas (é parte do app menos testada).

**Seu feedback:**
> _(preencher)_

---

### C3. 3 presets de celebração aplicados em pontos-chave

**Estado:** ⏳ Pendente

- [ ] `subtle` em todos os taps de botão secundário
- [ ] `delight` em swipe-dismiss, checkbox de marco, toggle de vacina
- [ ] `milestone` em registro de marco novo + 10ª indicação ativada + streak completo

**Seu feedback:**
> _(preencher)_

---

### C4. ~~Breathing animation em timer ativo~~ — REMOVIDO

**Estado:** ❌ Rejeitado (discutido com user)

**Motivo:** app atual só registra momento (timestamp), não duração. Não existe "mamada em curso" — cada evento é pontual. Sem modelo de duração, a animação não tem gatilho semântico real.

Se futuramente for introduzido timer com início + fim de atividade, reabrir.

---

### C5. Transições entre abas + animações na bottom nav

**Estado:** ⏳ Pendente (ampliado após discussão)

**Escopo:**
- [ ] **Transição de página**: slide horizontal 200ms ease-out em `/` ↔ `/history` ↔ `/insights` ↔ `/profile`. Hoje é corte seco.
- [ ] **Tap no tab ativo**: ícone pulsa levemente (scale 1 → 1.15 → 1, spring `subtle` ~200ms) + `hapticLight()` sincronizado
- [ ] **Transição de cor do label**: smooth entre inativo (`on-surface-variant`) → ativo (`primary`), sem corte seco

Respeitar `prefers-reduced-motion`.

**Seu feedback:**
> _(preencher)_

---

## Parte D — Implementação Fase 3 (polish final)

### D1. Empty states revisados

**Estado:** ⏳ Pendente

Template novo aplicado nas telas vazias: history, milestones sem registro, insights sem dados, MGM sem indicações, medicamentos sem cadastro, etc.

**Seu feedback:**
> _(preencher)_

---

### D2. Celebração de marco aprimorada

**Estado:** ⏳ Pendente

`MilestoneCelebration.tsx` ganha spring milestone + efeito de partículas discretas (estrelas pequenas saindo do ícone, fade 500ms).

**Seu feedback:**
> _(preencher)_

---

### D3. Streak com brilho radial

**Estado:** ⏳ Pendente

Ao completar ciclo de streak (7/14/30 dias), a chama ganha pulso dourado radial de ~400ms. Uma única vez por milestone.

**Seu feedback:**
> _(preencher)_

---

### D4. Focus states + aria-labels auditados

**Estado:** ⏳ Pendente

**O que é:** acessibilidade pra teclado externo (tablet + keyboard), VoiceOver (iPhone), TalkBack (Android), switch control (acessibilidade motora).

- **Focus state**: quando user navega com Tab ou tecnologia assistiva, o elemento "selecionado" precisa ter indicador visual claro (contorno/halo). Hoje alguns botões somem do foco.

- **aria-label**: atributo HTML que dá nome ao elemento pra leitor de tela ler em voz alta. Botão só-ícone (ex: ✕ pra fechar) sem aria-label é anunciado como "botão, sem rótulo" — péssima experiência.

  ```tsx
  // ❌ ruim
  <button onClick={onClose}>✕</button>
  // Leitor de tela: "botão"

  // ✅ bom
  <button onClick={onClose} aria-label="Fechar modal">✕</button>
  // Leitor de tela: "fechar modal, botão"
  ```

- **Touch targets ≥44×44pt (iOS) / 48×48dp (Android)** — pra mãos trêmulas/dedões grandes acertarem.

**Por que obrigatório:** compliance de acessibilidade é requisito pra aprovação em Play Store + App Store. Não é opcional.

**Seu feedback:**
> _(preencher)_

---

## Próximo papo combinado

**"Jornada do usuário"** — depois desse redesign, abrir sessão separada pra conversar sobre:
- Marcos do app / conquistas secundárias ("100º banho", "1 ano de Yaya")
- Cards de resumo compartilháveis (screenshot-ready)
- Onboarding emocional
- Celebrações contextuais por momento da jornada (1ª semana, 1º mês, etc)

Registrado pra não perder.

---

## Próximo passo (como usar este doc)

1. Você lê este arquivo
2. Preenche os `_(preencher)_` em cada item com `OK`, `ajustar: <descrição>`, ou `rejeitar`
3. Commita o diff ou me cola os comentários no chat
4. Eu atualizo os estados pra ✅/🔧/❌ e começo a implementar a Parte B (Fase 1) em ordem
5. Cada item implementado vira ✔️ **Feito** com link pro commit

Primeiro batch pra validar é a **Parte A** (decisões). Depois dela aprovada, Parte B é só sequência de commits pequenos.
