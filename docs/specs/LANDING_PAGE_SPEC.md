# Yaya — Landing Page Spec (yayababy.app)
**Versão:** 1.0 | **Data:** 2026-04-11  
**Objetivo:** Apresentar o Yaya, gerar confiança e converter visitantes em downloads (iOS / Android)

---

## Stack Recomendada

- **Framework:** Next.js (já existe projeto `landing-app/` no repo)
- **UI:** Tailwind CSS + componentes do 21st.dev e Magic UI
- **Animações:** Framer Motion (scroll-triggered) + CSS transitions
- **Deploy:** Vercel (já configurado em www.yayababy.app)
- **Analytics:** Vercel Analytics + evento de clique nos botões de download

---

## Componentes 21st.dev / Magic UI sugeridos

Usar como referência e instalar via 21st.dev CLI:

| Componente | Onde usar | Referência |
|---|---|---|
| **Hero com phone mockup animado** | Seção 1 — Hero | 21st.dev/community/components/s/hero |
| **Bento Grid** | Seção 3 — Features | 21st.dev/community/components/aceternity/bento-grid |
| **Number Ticker** | Seção 5 — Social Proof (contadores animados) | magicui.design/docs/components/number-ticker |
| **Animated Testimonials** | Seção 6 — Depoimentos | Bento grid com expand on click |
| **Pricing Table** | Seção 7 — Preços | 21st.dev/community/components/kokonutd/pricing-table |
| **Scroll Reveal / Fade In** | Todas as seções | Framer Motion `whileInView` |
| **Marquee** | Seção 5 — logos ou badges | magicui.design/docs/components/marquee |
| **Globe / Particles** | Footer ou background sutil | Efeito ambiental leve |

---

## Estrutura da Landing Page

### Regras de copy (obrigatórias)

1. **Nunca usar "mamada"** — sempre "amamentação"
2. **Headline oficial:** "A rotina do seu bebê, com 1 toque, na palma da sua mão."
3. **Tom:** Premium, acolhedor, confiante. Não é um app noturno — é companheiro de rotina completa
4. **Linguagem:** Direta, sem diminutivos excessivos. Fala com pais inteligentes e cansados

---

### SEÇÃO 1 — HERO (viewport inteira)

**Objetivo:** Impacto imediato. Entender o produto em 3 segundos.

**Layout:**
- Fundo escuro (#1a1a2e ou gradiente para dark purple) com partículas/stars sutis animadas
- Lado esquerdo: texto
- Lado direito: mockup 3D do celular com tela do app (screenshots reais do Yaya)
- O phone mockup rota levemente com parallax no mouse move (ou scroll no mobile)

**Conteúdo:**
```
[Logo Yaya — branco]

A rotina do seu bebê,
com 1 toque, na palma da sua mão.

Registre amamentação, sono, fraldas e mais.
Insights inteligentes que crescem com seu filho.

[Botão App Store]  [Botão Google Play]

"Grátis para começar. Yaya+ para ir além."
```

**Animações:**
- Headline com typewriter ou fade-in word-by-word
- Phone mockup com float animation (sobe e desce suave)
- Botões com pulse sutil no CTA
- Scroll indicator animado (chevron bounce) no bottom

**Elementos diferenciados:**
- Background com partículas estilo estrelas (remete a noite/conforto mas sem ser "app noturno")
- Badge "Featured on App Store" se aplicável, ou "★ 4.8" animado

---

### SEÇÃO 2 — PROBLEMA + SOLUÇÃO (scroll storytelling)

**Objetivo:** Empatia. O visitante pensa "isso sou eu".

**Layout:**
- Scroll-triggered: conforme scrollar, texto muda com transição de opacidade
- Fundo claro (branco/off-white)
- Estilo editorial — pouco visual, muito texto emocional

**Conteúdo (3 etapas que revelam conforme scroll):**

```
Etapa 1:
"Quantas vezes mamou hoje?"
"Quando foi a última fralda?"
"A que horas dormiu ontem?"

Toda mãe e todo pai já se perguntou isso.
No meio da exaustão, lembrar é impossível.

↓

Etapa 2:
Anotações em papel se perdem.
Apps genéricos são complicados demais.
E o pediatra sempre pergunta o que você não lembra.

↓

Etapa 3:
O Yaya nasceu pra resolver isso.
1 toque. Pronto. Registrado.
Sem formulários. Sem complicação.
```

**Animações:**
- Cada etapa faz fade-in ao entrar no viewport e fade-out ao sair
- Texto centralizado, grande (24-32px)
- Transição suave entre etapas com opacity + translateY

---

### SEÇÃO 3 — FEATURES (Bento Grid)

**Objetivo:** Mostrar o que o Yaya faz, visualmente.

**Layout:**
- Bento Grid com 6 cards de tamanhos variados
- Cada card tem ícone animado + título curto + screenshot ou ilustração
- Grid assimétrico: 2 cards grandes, 4 menores

**Cards:**

| Card | Tamanho | Título | Detalhe | Visual |
|---|---|---|---|---|
| 🍼 Amamentação | Grande | "Registro em 1 toque" | Timer, lado, duração. Sem formulários. | Screenshot do botão de registro |
| 😴 Sono | Grande | "Sono monitorado" | Início, fim, tempo total. Previsão inteligente (Yaya+). | Screenshot com gráfico de sono |
| 🧷 Fraldas | Pequeno | "Fraldas rastreadas" | Xixi, cocô, contagem diária. | Ícone animado |
| 📊 Insights | Pequeno | "Insights por fase" | Dados que evoluem com seu bebê, de 0 a 24 meses. | Mini gráfico animado |
| 👨‍👩‍👧 Compartilhar | Pequeno | "Família conectada" | Babá, avó, pai — todos registram juntos. | Ícones de avatares |
| 🩺 Pediatra | Pequeno | "Relatório pro pediatra" | PDF profissional com 30 dias de dados. 1 clique. | Preview do PDF |

**Animações:**
- Cards fazem staggered fade-in (um de cada vez, com 100ms de delay)
- Hover: card levanta (translateY -4px) com shadow aumentada
- Ícones animam no hover (lottie ou CSS keyframes)

---

### SEÇÃO 4 — COMO FUNCIONA (3 steps)

**Objetivo:** Simplicidade. Quebrar objeção "deve ser complicado".

**Layout:**
- 3 colunas (desktop) / vertical (mobile)
- Cada step com número grande animado (number ticker), ícone e texto
- Linha conectora entre os 3 (tracejada, animada no scroll)

**Conteúdo:**

```
1. Baixe grátis
   App Store ou Google Play.
   Cadastro em 30 segundos.

2. Registre com 1 toque
   Amamentação, sono, fralda.
   Timer incluso. Sem complicação.

3. Acompanhe a evolução
   Insights inteligentes.
   Relatório para o pediatra.
```

**Animação:**
- Números 1→2→3 com number ticker (contam de 0 ao número)
- Linha tracejada "desenha" conforme scroll (SVG path animation)
- Screenshots do app aparecem atrás de cada step

---

### SEÇÃO 5 — SOCIAL PROOF (números + badges)

**Objetivo:** Credibilidade. "Outros pais já confiam."

**Layout:**
- Background escuro (contraste com seções anteriores)
- 4 counters grandes animados em linha
- Abaixo: marquee horizontal com logos/badges

**Counters (number ticker com animação):**

```
5.000+        50.000+        4.8 ★         30+
famílias      registros/dia  avaliação      dias de insights
```

*Nota: ajustar números conforme dados reais no lançamento. Melhor começar modesto e real.*

**Marquee abaixo:**
- Badges: "App Store", "Google Play", "Feito no Brasil", "LGPD Compliant", "Dados criptografados"
- Scroll horizontal infinito, velocidade lenta

**Animação:**
- Counters fazem count-up quando seção entra no viewport
- Marquee contínuo

---

### SEÇÃO 6 — DEPOIMENTOS

**Objetivo:** Prova social emocional. Mães/pais reais falando.

**Layout:**
- Bento grid com 5 depoimentos (3 grandes, 2 menores)
- Cada card: foto, nome, idade do bebê, texto curto, rating em estrelas
- Click para expandir o depoimento completo

**Depoimentos sugeridos (criar quando tiver reais):**

```
"Finalmente consigo responder o pediatra sem ficar tentando lembrar."
— Ana, mãe do Theo (4 meses)

"Minha babá registra tudo e eu acompanho do trabalho. Game changer."
— Carla, mãe da Sofia (8 meses)

"O insight de sono me salvou. Entendi que meu filho precisava dormir mais cedo."
— Rafael, pai do Bento (6 meses)

"Uso desde o nascimento. Tenho todo o histórico dos primeiros 100 dias."
— Juliana, mãe da Helena (3 meses)

"Simples. Bonito. Funciona. É tudo que eu precisava."
— Marcos, pai do Miguel (2 meses)
```

*Nota: substituir por depoimentos reais assim que existirem. Enquanto isso, pode usar esses como placeholder ou omitir a seção até ter dados reais.*

**Animação:**
- Cards com staggered reveal
- Expand on click com smooth height transition
- Estrelas preenchem com animação (da esquerda pra direita)

---

### SEÇÃO 7 — PRICING (Yaya+)

**Objetivo:** Converter visitantes que já estão interessados.

**Layout:**
- 3 cards side by side (mobile: carousel/swipe)
- Card do meio (Anual) destacado com borda, badge "Mais popular", escala 1.05x
- Toggle "Mensal / Anual / Vitalício" no topo — NÃO, os 3 aparecem juntos

**Cards:**

```
┌─────────────────┐  ┌─────────────────────┐  ┌─────────────────┐
│    MENSAL        │  │  ★ ANUAL            │  │   VITALÍCIO     │
│                  │  │   MAIS POPULAR       │  │                 │
│   R$ 29,90/mês  │  │  R$ 16,90/mês       │  │  R$ 299,90      │
│                  │  │  R$ 202,80/ano       │  │  pagamento único│
│ ✓ Registros ∞   │  │  ✓ Tudo do mensal    │  │  ✓ Tudo do anual│
│ ✓ Insights IA   │  │  ✓ Economia de 43%   │  │  ✓ Para sempre  │
│ ✓ Histórico ∞   │  │  ✓ 12 meses          │  │  ✓ Próximos     │
│ ✓ Múltiplos     │  │                      │  │    filhos tb    │
│   bebês         │  │                      │  │                 │
│ ✓ Compartilhar  │  │                      │  │                 │
│                  │  │                      │  │                 │
│ [Assinar]        │  │ [Assinar — Melhor    │  │ [Garantir       │
│                  │  │  custo-benefício]    │  │  acesso]        │
└─────────────────┘  └─────────────────────┘  └─────────────────┘
```

**Abaixo dos cards:**
```
"Comece grátis. Sem cartão de crédito. Upgrade quando quiser."
```

**Animação:**
- Cards fazem slide-in da base
- Card do meio chega por último (delayed) para chamar atenção
- Badge "Mais popular" com shimmer/glow animado
- Preço com number ticker (conta de 0 até valor)

---

### SEÇÃO 8 — FAQ

**Objetivo:** Quebrar objeções finais.

**Layout:**
- Accordion com 6-8 perguntas
- Estilo limpo, sem background
- Ícone + animação de abertura suave

**Perguntas sugeridas:**

```
1. O Yaya é grátis?
   → Sim! O plano gratuito permite até 5 registros por dia, histórico de 3 dias
     e 1 bebê. Para registros ilimitados, insights e mais, conheça o Yaya+.

2. Meus dados estão seguros?
   → Sim. Usamos criptografia de ponta a ponta e seguimos a LGPD.
     Seus dados nunca são compartilhados com terceiros.

3. Posso compartilhar com minha babá ou minha mãe?
   → Sim! No Yaya+, você pode convidar cuidadores para registrar junto.
     Cada um com seu perfil, todos os dados sincronizados.

4. Funciona offline?
   → Os registros são salvos localmente e sincronizam quando voltar a conexão.

5. Posso acompanhar mais de um bebê?
   → Sim, no Yaya+. Gêmeos, irmãos — cada um com seu perfil e insights.

6. O que é o relatório para o pediatra?
   → Um PDF profissional com 30 dias de dados: médias, gráficos de tendência
     e padrões de sono/alimentação. Gere com 1 toque antes da consulta.

7. Funciona no iPhone e no Android?
   → Sim, disponível na App Store e na Google Play.

8. Posso cancelar a assinatura a qualquer momento?
   → Sim, sem multa e sem complicação. Direto pela loja (App Store ou Google Play).
```

**Animação:**
- Accordion com height transition suave
- Ícone de + gira pra × ao abrir

---

### SEÇÃO 9 — CTA FINAL + FOOTER

**Objetivo:** Último empurrão para download.

**Layout:**
- Background gradiente escuro (matching hero)
- CTA centralizado, grande
- Footer minimalista abaixo

**Conteúdo CTA:**
```
Pronto para simplificar a rotina?

[Botão App Store]  [Botão Google Play]

Grátis. Sem cartão. Começa em 30 segundos.
```

**Footer:**
```
Logo Yaya (pequeno)

Produto  |  Preços  |  Suporte  |  Privacidade  |  Termos

© 2026 Yaya Baby. Feito com 💜 no Brasil.

[Instagram]  [TikTok]
```

**Animação:**
- CTA com parallax leve no background
- Botões com hover glow

---

## Responsividade

| Elemento | Desktop | Mobile |
|---|---|---|
| Hero | 2 colunas (texto + phone) | Stack vertical, phone em baixo |
| Bento Grid | 6 cards grid | 2 colunas ou stack |
| Pricing | 3 cards lado a lado | Swipe horizontal |
| Steps | 3 colunas | Vertical com linha |
| Counters | 4 em linha | 2x2 grid |
| FAQ | Largura média centralizada | Full width com padding |

---

## SEO — Meta Tags

```html
<title>Yaya — A rotina do seu bebê, com 1 toque</title>
<meta name="description" content="Registre amamentação, sono e fraldas com 1 toque. Insights inteligentes que crescem com seu filho. Grátis para iOS e Android." />
<meta property="og:title" content="Yaya Baby — Acompanhe a rotina do seu bebê" />
<meta property="og:description" content="Registre amamentação, sono e fraldas com 1 toque. Grátis." />
<meta property="og:image" content="https://www.yayababy.app/og-image.png" />
<meta property="og:url" content="https://www.yayababy.app" />
<meta name="twitter:card" content="summary_large_image" />
```

**Keywords alvo:** "app acompanhar bebê", "app amamentação", "rotina recém-nascido", "baby tracker", "app para pais"

---

## Performance

- **Lighthouse target:** 95+ em todas as métricas
- **LCP:** < 2.5s (carregar hero e phone mockup com priority)
- **Images:** WebP, lazy load exceto hero
- **Fonts:** Inter ou Satoshi, preloaded, subset PT-BR
- **Animações:** Respeitar `prefers-reduced-motion`

---

## Entregáveis necessários antes de desenvolver

| Item | Status | Responsável |
|---|---|---|
| Screenshots reais do app (5–6 telas) | Pendente | Dyego |
| Logo Yaya em SVG (branco + colorido) | Pendente | Verificar assets |
| Ícones dos stores (App Store + Google Play badges) | Disponível | SVG padrão Apple/Google |
| OG Image (1200x630) | Pendente | Criar |
| Depoimentos reais | Pendente | Coletar após beta |
| Números reais de usuários | Pendente | Após lançamento |
| Links reais das stores | Pendente | Após publicação |
| Política de Privacidade | Pendente | Criar |
| Termos de Uso | Pendente | Criar |
