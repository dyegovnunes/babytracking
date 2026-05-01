# Revisão do G01 (Guia das Últimas Semanas) + aprendizados

> Doc de trabalho — checklist pra revisão visual do G01 migrado e
> aprendizados pra refinar o manual de estilo + o pipeline.

Última atualização: 2026-04-30

---

## Contexto

O G01 foi migrado do formato natural (markdown puro + sections-config.json
+ flashcards.md separado) pro formato **self-describing** novo. Migração
foi automatizada via script one-shot, depois descartado.

Agora precisa **revisão visual** no leitor pra confirmar que nada se
perdeu na tradução, e ajustar o que estiver fora do padrão.

---

## URL pra revisar

```
https://blog.yayababy.app/biblioteca-yaya/ultimas-semanas/ler
```

(O Vercel deploya automaticamente após o push pro main.)

---

## Checklist de revisão visual

### Estrutura geral

- [ ] **Sidebar** mostra:
  - Introdução (com filhas: O que cobre, O que não cobre, Como usar)
  - Parte 1: Preparação (com 6 filhas)
  - Parte 2: O parto (com 3 filhas)
  - Parte 3: Primeiras 72 horas em casa (com 6 filhas)
  - Parte 4: Primeiras quatro semanas (com 5 filhas)
  - Conclusão (linear raiz, sem filhas)
  - **Divisor visual + cabeçalho "Materiais complementares"** com:
    - Checklist mestre
    - Quiz: qual seu estilo?
    - Flashcards de revisão — Parte 1
    - Flashcards de revisão — Parte 2
    - Flashcards de revisão — Parte 3
    - Flashcards de revisão — Parte 4

- [ ] Total de seções na sidebar: **5 partes + 30 filhas/raízes** = 35 itens.

### Conteúdo

- [ ] **Capas das partes 1-4** (`cover_image_url`) carregam com a imagem
  correta. **AVISO**: imagens com nomes `capa-parte-1-preparacao.webp`,
  etc, ainda **não foram criadas pelo cowork** — isso é um TODO. Hoje vão
  cair no fallback (sem capa).
- [ ] Introdução abre como `part` (chapter opener) sem capa, com 4 sub-seções.
- [ ] Conclusão abre como `linear` raiz (sem chapter opener).

### Callouts

- [ ] `:::ciencia` (🔬) renderiza com borda azul/lilás
- [ ] `:::mito` (✅) renderiza com borda âmbar/amarela
- [ ] `:::alerta` (🚨) renderiza com borda vermelha/rosa
- [ ] `:::yaya` (📱) renderiza com borda azul/yaya
- [ ] **Verificar se algum callout escapou da migração** — buscar no MD
  por `>🔬`, `>✅`, `>🚨`, `📱 **No Yaya...**` (não deveria ter mais)

### Áudio TTS

- [ ] **Player sticky aparece no topo de cada seção `linear`?**
  - Pode estar invisível porque o áudio ainda **não foi gerado** —
    requer setar `OPENAI_API_KEY` no Supabase dashboard e rodar
    `GENERATE_AUDIO=1 npx tsx ../scripts/seed-guide.ts ultimas-semanas`
- [ ] Quando gerado, o player tem play/pause + scrubber + velocidade 1x/1.25x/1.5x/2x

### Drop cap

- [ ] Em desktop (>600px), o **primeiro caractere** do primeiro parágrafo
  de cada seção aparece grande (3.6em), em Fraunces serif, com gradiente
  accent (roxo → lilás).
- [ ] Em mobile (<600px), drop cap **não** aparece (regra responsive).

### Conclusão

- [ ] Avaliação 5 estrelas (NpsBlock) aparece automaticamente no fim da
  Conclusão.
- [ ] Campo de comentário aparece quando você marca alguma estrela.
- [ ] **DynamicYayaCTA** aparece logo abaixo do Nps. Variantes:
  - Sua conta tem Yaya+ Anual? Deve aparecer "Continue sua jornada" +
    grid de outros guides (vai estar quase vazio porque só temos G01 e
    G02-rascunho).
  - Sua conta é avulso/cortesia? Aparece "Sua Yaya+ gratuita está ativa"
    + botão "Abrir o app".

### Quiz e flashcards

- [ ] Clicar em "Quiz: qual seu estilo?" abre o quiz fullscreen com 8 perguntas.
- [ ] Após responder, mostra o perfil (Analítica/Intuitiva/Ansiosa/Pragmática)
  e seções recomendadas.
- [ ] Cada "Flashcards de revisão — Parte N" mostra os cards daquela parte
  com flip 3D.

### Checklist mestre

- [ ] "Checklist mestre" abre com lista interativa.
- [ ] Marcar itens persiste no DB (não some ao recarregar).
- [ ] Ao concluir 100%, mostra o toast "Checklist completo 💜".

---

## Aprendizados / pontos de atenção

### 1. Hierarquia: introducao como `part` ou como `linear` raiz?

**Decidido:** Introdução do G01 vira `part` porque tem 4 sub-seções no
original. Pra guias futuros, o cowork escolhe:
- Tem 2+ sub-tópicos? → `type: part`, com filhas
- É um texto único de abertura? → `type: linear`, sem filhas

→ **Manual já cobre isso (§4.1 e §4.2).** Sem ação.

### 2. Conclusão sem flags: NpsBlock + DynamicYayaCTA são automáticos

**Decidido:** Se `slug` começa com `conclusao`, o leitor renderiza Nps +
CTA automaticamente. As flags `show_nps`/`show_yaya_cta` continuam
funcionando como **override manual** pra ativar em outros pontos do guia
(ex: NPS no fim de cada parte, se quiser).

→ **Manual deve documentar isso melhor.** Adicionar nota no §4.2 (linear).

### 3. Capas das partes não existem como arquivo

O migration gerou `cover_image_url` pra Partes 1-4 referenciando paths
(`ultimas-semanas/img/capa-parte-1-preparacao.webp`, etc.) que **não têm
imagens correspondentes**. Hoje cai no fallback.

→ **Ação editorial:** o cowork precisa criar essas 4 capas (21:9, mín
1920×820) e upar em `content/infoprodutos/guia-ultimas-semanas/imagens/`.
Próximo seed sobe automaticamente.

### 4. Flashcards: 4 seções vs 1 só consolidada

**Decidido:** Migrei como 4 seções (`flashcards-parte-1`, `-2`, `-3`,
`-4`) preservando o agrupamento por parte. Pedagógicamente faz sentido
(revisar conceitos da parte recém-lida).

**Alternativa**: poderia ser 1 só "Flashcards de revisão" com todos os
cards. Decisão fica em aberto pro cowork em guias futuros.

→ **Manual pode mostrar os dois padrões** — adicionar nota no §4.5.

### 5. Quiz Bônus virou material complementary

No original era a 6ª `## part` (Bônus: quiz). Agora é uma seção
`type: quiz` com `category: complementary`, parent=null. Aparece na
sidebar após o divisor "Materiais complementares".

→ **Coerente com o padrão.** Sem ação.

### 6. Checklist mestre: uma das seções viu sua estrutura mudar

No original: era uma `### section` filha da Parte 1, mas com
`is_preview: true` e `type: 'checklist'` via override no `sections-config.json`.

Agora: é uma seção `type: checklist`, `parent: null`, `category: complementary`.
**Mudou de hierarquia** — antes ficava dentro da Parte 1, agora fica em
"Materiais complementares".

→ **Pode ou não ser problema.** Verificar com o cowork: o leitor que está
fazendo a leitura linear ainda chega no checklist no momento certo (depois
da Conclusão)? Ou seria melhor mantê-lo dentro da Parte 1?

Se quiser manter dentro da Parte 1, basta editar no MD:
```
**parent:** `parte-1-preparacao`
**category:** `narrative`
```

### 7. Conclusão: a copy hoje não menciona materiais complementares

A Conclusão do G01 (migrada do original) não tem chamada explícita do
tipo "agora explore o checklist mestre, faça o quiz e revise os
flashcards". É um texto solto de fechamento.

→ **Recomendação de copy editorial pro cowork:** ajustar o último
parágrafo da Conclusão pra mencionar os materiais complementares como
"próximos passos da sua jornada".

→ **Manual já recomenda isso (§1, §4.2).** Reforçar com cowork.

### 8. Imagens com prefixo `imagens/` vs sem prefixo

O migration converteu paths `imagens/foo.png` pra URLs públicas. **Não
quebrou nada**, mas vale lembrar que o seed novo aceita `imagens/foo.png`,
`./foo.png` e `foo.png` — todos resolvem pro mesmo arquivo upado.

→ **Manual já cobre (§7.5).**

### 9. `cover_image_url` em `part` vs path vs URL

O migration gerou paths relativos no formato `ultimas-semanas/img/foo.webp`.
O parser resolve isso pra URL pública via `resolveStorageUrl()`.

→ **Manual já cobre (§4.1, blockquote final).** Cowork deve usar **path
relativo no storage**, não URL completa.

### 10. Drop cap pode atrapalhar leitura em algumas seções

Drop cap é aplicado **no 1º parágrafo de toda seção** automaticamente.
Em seções muito curtas (menos de 3 parágrafos), pode parecer over-styled.

→ **Solução possível futuro:** classe `.no-drop-cap` que o cowork pode
adicionar via metadado opcional `**no_drop_cap:** \`true\`` na seção.
Por enquanto, observar como fica visualmente e decidir.

---

## Itens a fazer depois da revisão

### Imediato

- [ ] Setar `OPENAI_API_KEY` no Supabase Dashboard
  → `Settings > Edge Functions > Secrets`
- [ ] Rodar áudio do G01:
  ```bash
  cd blog
  GENERATE_AUDIO=1 npx tsx ../scripts/seed-guide.ts ultimas-semanas
  ```
  (custa ~$0.75 pelo G01 inteiro — 50k chars × $15/1M)
- [ ] Cowork criar 4 capas de partes (21:9) em `imagens/`
- [ ] Validar visualmente o leitor

### Curto prazo (próximas sessões)

- [ ] Atualizar manual de estilo com aprendizados 2, 4, 7
- [ ] Decidir item 6 (Checklist mestre fica em complementary ou volta pra Parte 1)
- [ ] Considerar item 10 (drop cap opcional)
- [ ] Migrar G02 (primeiro-ano) pro mesmo formato self-describing
  (já está parcialmente — só ajustar `category` em algumas seções)

### Backlog

- [ ] Admin de áudio: botão "Gerar áudio agora" na admin pra cada
  seção (sem precisar rodar seed inteiro)
- [ ] Stats de áudio: quantos minutos de áudio cada usuário consumiu
  por guide (analytics)
- [ ] Voz humana opcional pra seções premium (intro/conclusão)
