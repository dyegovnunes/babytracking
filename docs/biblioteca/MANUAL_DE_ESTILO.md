# Manual de Estilo — Sua Biblioteca Yaya

> Documento de referência para o time editorial (cowork) que produz os
> guias da Sua Biblioteca Yaya.
>
> Última atualização: 2026-04-30

---

## 1. Visão geral

A Sua Biblioteca Yaya é a coleção de guias premium do ecossistema Yaya.
Cada guia é vendido avulso e/ou incluso na assinatura Yaya+.

Todo guia segue uma **estrutura padronizada em 3 camadas**:

```
┌─ Camada 1: Conteúdo narrativo (obrigatório) ───────────────┐
│  Introdução → Parte 1, 2, ..., N → Conclusão               │
└────────────────────────────────────────────────────────────┘
┌─ Camada 2: Materiais complementares (opcionais com regra) ─┐
│  Aparecem DEPOIS da Conclusão, com destaque na sidebar     │
│  • Checklist Mestre (se há preparação prática)             │
│  • Quiz de Perfil (se há perfis editorialmente distintos)  │
│  • Flashcards de Revisão (recomendado em todo guia)        │
└────────────────────────────────────────────────────────────┘
┌─ Camada 3: Mídia (transversal, automática) ────────────────┐
│  • Áudio TTS por seção (gerado automaticamente)            │
└────────────────────────────────────────────────────────────┘
```

A **Conclusão** fecha o conteúdo narrativo e indica os materiais
complementares como próximos passos. A avaliação 5 estrelas e o CTA
Yaya+ dinâmico são renderizados **automaticamente pelo leitor** ao
fim da Conclusão — não precisa escrever no markdown.

---

## 2. Estrutura de pastas de um guia

Todo guia mora em `content/infoprodutos/<slug-do-guia>/`:

```
content/infoprodutos/<slug-do-guia>/
├── <slug-do-guia>.md      ← markdown self-describing (este manual)
└── imagens/                ← PNGs/JPGs (vão pra WebP no upload)
```

Para começar, copie a pasta-template:

```bash
cp -r content/infoprodutos/_template content/infoprodutos/<slug-do-guia>
mv content/infoprodutos/<slug-do-guia>/guia-template.md \
   content/infoprodutos/<slug-do-guia>/<slug-do-guia>.md
rm content/infoprodutos/<slug-do-guia>/README.md
```

Convenção de slug: kebab-case, sem acentos, descritivo (ex:
`ultimas-semanas`, `primeiro-ano`, `sono-0-12-meses`).

---

## 3. Formato self-describing do markdown

Cada seção do guia começa com `## SEÇÃO:` seguida de metadados explícitos.
**O parser não usa o título para inferir nada** — todas as decisões
estruturais (type, slug, parent, etc.) ficam declaradas como metadados.

### 3.1 Exemplo mínimo de uma seção `linear`

````markdown
## SEÇÃO: 1.1 Enxoval — o que realmente precisa

**type:** `linear`
**slug:** `11-enxoval`
**parent:** `parte-1-preparacao`
**category:** `narrative`
**estimated_minutes:** `5`

```markdown
Conteúdo da seção em markdown puro. Pode ter listas, callouts, imagens.

:::ciencia
Texto baseado em estudo. Cite fonte: SBP 2024.
:::
```
````

### 3.2 Metadados aceitos

| Chave | Obrigatório | Valores | Descrição |
|---|---|---|---|
| `type` | ✅ | `part`, `linear`, `checklist`, `quiz`, `flashcards` | Tipo da seção (ver §4) |
| `slug` | ✅ | kebab-case único no guia | Identificador estável da seção |
| `parent` | ✅ | slug de uma `part` ou `null` | Hierarquia. `null` para Introdução, Conclusão e materiais complementares. |
| `category` | recomendado | `narrative` ou `complementary` | Como aparece na sidebar (ver §5). Default: inferido do `type`. |
| `estimated_minutes` | recomendado | inteiro ≥ 1 | Tempo estimado de leitura. |
| `cover_image_url` | opcional | path no storage | Capa de uma `part` (chapter opener). |
| `is_preview` | opcional | `true` ou `false` | Aparece como amostra grátis na landing. Default: `false`. |

### 3.3 Blocos de conteúdo

Cada seção tem **um** dos dois blocos abaixo (depende do `type`):

**Para `part` e `linear`:** bloco markdown.

````
```markdown
Conteúdo aqui.
```
````

**Para `checklist`, `quiz`, `flashcards`:** bloco JSON com a estrutura
do tipo correspondente. Exemplos completos em §4.

---

## 4. Tipos de seção

### 4.1 `part` — abertura de capítulo

Toda parte do guia (Parte 1, Parte 2, ...) tem `type: part`. Aparece como
capa visual editorial (chapter opener) com título grande, capa de imagem
e descrição curta.

```markdown
## SEÇÃO: Parte 1: Preparação (semanas 28 a 40)

**type:** `part`
**slug:** `parte-1-preparacao`
**parent:** `null`
**category:** `narrative`
**estimated_minutes:** `2`
**cover_image_url:** `ultimas-semanas/img/capa-parte-1.webp`

```markdown
Texto de abertura desta parte. 2-4 parágrafos explicando o que vem.
```
```

> **Importante:** o `cover_image_url` é o path **no storage** (relativo
> ao bucket `guide-images`), não o path local. Use a convenção
> `<slug-do-guia>/img/<nome>.webp`.

### 4.2 `linear` — seção de leitura

A maior parte do conteúdo. Markdown puro com callouts permitidos.

```markdown
## SEÇÃO: 1.1 Enxoval — o que realmente precisa

**type:** `linear`
**slug:** `11-enxoval`
**parent:** `parte-1-preparacao`
**category:** `narrative`
**estimated_minutes:** `5`

```markdown
Texto em markdown.

- Listas funcionam
- **Negrito** e *itálico* também
- [Links externos](https://exemplo.com)

![Alt text obrigatório](imagens/exemplo.png)

:::ciencia
Caixa de destaque com fonte SBP/OMS.
:::
```
```

### 4.3 `checklist` — lista interativa persistida em DB

O leitor marca itens como concluídos; o estado é salvo em
`guide_checklist_state`. Use para listas que o leitor vai consultar
ao longo do tempo (ex: enxoval, kit primeiros socorros, mala da
maternidade).

**Modo simples (lista plana):**

```markdown
## SEÇÃO: Checklist Mestre

**type:** `checklist`
**slug:** `checklist-mestre`
**parent:** `null`
**category:** `complementary`
**estimated_minutes:** `2`

```json
{
  "items": [
    {"id": "item-1", "text": "Mala da maternidade pronta", "required": true},
    {"id": "item-2", "text": "Pediatra escolhido"},
    {"id": "item-3", "text": "Berço montado"}
  ]
}
```
```

**Modo agrupado (recomendado para checklists longos):** quando os itens
naturalmente se dividem em fases/etapas, use `groups` em vez de `items`.
A sidebar do leitor mostra o progresso por grupo (ex: 4/6 marcados):

```json
{
  "groups": [
    {
      "title": "Antes do parto (semana 35+)",
      "items": [
        {"id": "item-1", "text": "Mala da maternidade pronta", "required": true},
        {"id": "item-2", "text": "Plano de parto entregue"}
      ]
    },
    {
      "title": "Primeiros dias em casa",
      "items": [
        {"id": "item-7", "text": "Pediatra agendado", "required": true}
      ]
    }
  ]
}
```

Campos do item:
- `id` (string única dentro da checklist inteira — não pode repetir
  entre grupos)
- `text` (texto exibido)
- `required` (opcional, indica item crítico)

### 4.4 `quiz` — quiz fullscreen com perfis

Perguntas de múltipla escolha que recomendam um perfil ao final.
**Use só se há perfis editorialmente distintos** — não force um quiz
em todo guia.

```markdown
## SEÇÃO: Bônus: quiz — qual seu estilo de cuidar?

**type:** `quiz`
**slug:** `quiz-perfil`
**parent:** `null`
**category:** `complementary`
**estimated_minutes:** `5`

```json
{
  "questions": [
    {
      "id": "q1",
      "text": "Qual sua primeira reação quando o bebê chora?",
      "options": [
        {"value": "a", "label": "Pesquiso o que pode ser antes de agir"},
        {"value": "b", "label": "Confio no instinto"},
        {"value": "c", "label": "Fico ansiosa e peço ajuda"},
        {"value": "d", "label": "Vou direto pro checklist"}
      ]
    }
  ],
  "results": {
    "a": {
      "title": "Analítica",
      "description": "Você precisa entender antes de agir.",
      "recommended_sections": ["11-enxoval"]
    },
    "b": { "title": "Intuitiva", "description": "...", "recommended_sections": [] },
    "c": { "title": "Ansiosa", "description": "...", "recommended_sections": [] },
    "d": { "title": "Pragmática", "description": "...", "recommended_sections": [] }
  }
}
```
```

Convenção: 4 perfis (a, b, c, d), 8 perguntas é o ideal (o leitor faz em
~3 minutos). Cada `recommended_sections` lista slugs de seções `linear`
recomendadas pra aquele perfil.

### 4.5 `flashcards` — cards de revisão

Fixação de conceitos. Não conta no progresso de leitura. Recomendado em
todo guia com 4+ conceitos por parte.

```markdown
## SEÇÃO: Flashcards de revisão

**type:** `flashcards`
**slug:** `flashcards-revisao`
**parent:** `null`
**category:** `complementary`
**estimated_minutes:** `5`

```json
{
  "cards": [
    {"front": "Qual a regra 5-1-1 do trabalho de parto?",
     "back": "Contrações a cada 5 minutos, durando 1 minuto, por 1 hora."},
    {"front": "Quando ligar pra maternidade?",
     "back": "Quando atingir 5-1-1 + bolsa rota OU sangramento intenso."}
  ]
}
```
```

`front` é a pergunta, `back` é a resposta. Mantenha cada card curto
(uma frase no front, 1-3 frases no back).

---

## 5. Sidebar: como tudo aparece pro leitor

Depois do seed, a sidebar do leitor agrupa as seções por `category`:

```
─── Sidebar do leitor ─────────────────
 Introdução
 Parte 1: Preparação
   ├ 1.1 Enxoval
   ├ 1.2 Mala da maternidade
   └ ...
 Parte 2: O parto
   ├ 2.1 ...
   └ ...
 Parte N
 Conclusão
 ───────────── divisor ────────────────
 ✦ Materiais complementares
   ├ 📋 Checklist Mestre
   ├ ❓ Quiz: qual seu estilo?
   └ 🃏 Flashcards de revisão
────────────────────────────────────────
```

Regras:
- `category: narrative` → vai no grupo principal (Introdução, Partes,
  Conclusão).
- `category: complementary` → vai no grupo "Materiais complementares"
  com ícones por type.
- O parser **infere automaticamente** se você omitir `category`:
  - `part`, `linear` → `narrative`
  - `checklist`, `quiz`, `flashcards` → `complementary`

---

## 6. Callouts (caixas de destaque)

Use as caixas pra destacar informação que merece quebrar o fluxo da
leitura. **Sintaxe é a mesma para os 5 tipos**, só muda o nome:

```markdown
:::ciencia
Texto baseado em evidência. Cite a fonte (SBP 2024, OMS 2023).
:::

:::mito
**Mito:** [afirmação comum].
**Realidade:** [fato baseado em evidência].
:::

:::alerta
Sinal de alarme. Use pra "quando procurar atendimento médico imediato".
:::

:::yaya
Conexão com o app Yaya: como a feature X complementa o que está sendo lido.
:::

:::disclaimer
Aviso médico-legal. Use perto de informação clínica delicada.
Exemplo: "Este guia é educativo e não substitui acompanhamento pediátrico.
Sempre consulte seu médico. Fontes: SBP 2024, OMS 2023."
:::
```

**Não crie variantes ad-hoc** (ex: `:::dica`, `:::importante`). Os 5 tipos
acima cobrem todas as necessidades. Se sentir falta de algum, fale com o
time de produto antes de adicionar.

### Quando usar cada callout

| Callout | Use quando |
|---|---|
| `:::ciencia` | Vai citar estudo, fonte oficial (SBP, OMS), dado quantitativo |
| `:::mito` | Vai contrapor uma crença popular comum com evidência |
| `:::alerta` | Vai listar sinais de alarme que exigem ação imediata |
| `:::yaya` | Vai conectar com uma feature do app Yaya |
| `:::disclaimer` | Vai dar aviso médico-legal (fonte + "consulte médico") |

---

## 7. Imagens

### 7.1 Onde colocar

Todas as imagens vão em `content/infoprodutos/<slug>/imagens/`. O seed
script converte automaticamente PNG/JPG → WebP (qualidade 82) e faz
upload pro bucket `guide-images`.

### 7.2 Naming

- Kebab-case, sem acentos, sem espaços.
- Use prefixos descritivos:
  - `hero-lp.png` ou `hero-intro.png` (capa da landing + cover do guide)
  - `capa-parte-1-preparacao.png` (chapter opener)
  - `ilustracao-pega-correta.png` (ilustração inline)
  - `mockup-app-grafico-sono.png` (screenshot do app)

### 7.3 Aspect ratios sugeridos

| Contexto | Aspect ratio | Resolução mínima |
|---|---|---|
| Hero da LP / cover do guide | 16:9 | 1920×1080 |
| Capa de Parte (chapter opener) | 21:9 | 1920×820 |
| Ilustração inline | 4:3 ou 16:9 | 1200px largura |
| Mockup de app | 9:19 (mobile) | 720×1520 |

### 7.4 Alt-text obrigatório

Toda imagem no markdown precisa de alt-text descritivo. Não use
`![](imagens/foo.png)` (alt vazio).

```markdown
✅ ![Bebê em posição correta de pega na amamentação](imagens/pega-correta.png)
❌ ![](imagens/pega-correta.png)
```

### 7.5 Como referenciar no markdown

Use o path local — o seed substitui pelas URLs públicas no upload:

```markdown
![Alt text](imagens/exemplo.png)
```

Para `cover_image_url` em `part`, use o path **no storage**:

```
**cover_image_url:** `<slug-do-guia>/img/capa-parte-1.webp`
```

---

## 8. Áudio (gerado automaticamente)

Toda seção `linear` ganha automaticamente uma versão narrada via TTS
(text-to-speech). O leitor mostra um player sticky no topo com play/pause,
velocidade (1x/1.25x/1.5x/2x) e scrubber.

**Você não precisa fazer nada** — o áudio é gerado quando o seed roda.
Se você editar o `content_md`, o áudio é regenerado automaticamente
(comparação por hash do texto).

Voz padrão: OpenAI TTS modelo `tts-1`, voz `nova` (em PT-BR).

---

## 9. Validador automático (use SEMPRE antes do seed)

Antes de rodar o seed, valide o guia:

```bash
cd blog
npx tsx ../scripts/validate-guide.ts <slug-do-guia>
```

O validador checa:

**Bloqueantes (impedem o seed):**
- Estrutura: `Introdução` + ≥1 Parte + `Conclusão` (e Conclusão é a **última seção raiz `narrative`**, depois de todas as Partes)
- Conclusão é `parent: null` + `category: narrative`
- Callouts fora do catálogo (`:::ciencia`, `:::mito`, `:::alerta`, `:::yaya`, `:::disclaimer`)
- **Travessão `—`** em título ou conteúdo (use hífen simples, vírgula, ou dois-pontos)
- Imagens referenciadas que não existem em `imagens/`
- Quiz sem os 4 perfis (a, b, c, d) ou results sem title/description
- Flashcards com `front` ou `back` vazio
- Checklist sem items, com ids duplicados, ou items incompletos

**Avisos (passa mas reclama):**
- Sem `:::disclaimer` em nenhum lugar do guia (médico-legal)
- Imagem com alt-text vazio ou <8 chars
- Seção `linear` com <200 caracteres
- Parts sem `cover_image_url` (capa)
- Checklist com >10 items sem `groups`
- Nenhuma seção com `is_preview: true`
- Cita OMS/NICE/ACOG/AAP mas zero menções a SBP (SBP é fonte prioritária)
- Tom Yaya: termos como "mamãezinha", "minha mãe", "amada", "querida", "você é incrível"
- Excesso de pontos de exclamação

**Sugestões (info):**
- Tempo total >180min (talvez dividir em 2 guias?)

O `seed-guide.ts` roda o validador automaticamente antes do INSERT. Se houver erros, o seed para. Em emergência, use `--skip-validation` (mas isso é exceção, não regra).

---

## 10. Checklist de QA pré-publicação

Antes de pedir publicação do guia (mudar `status` de `draft` pra
`published`), confira:

- [ ] Todas as seções têm `type`, `slug`, `parent`, `category`
- [ ] `slug` é único dentro do guia (sem repetições)
- [ ] Todo `parent` referenciado existe como uma `part`
- [ ] `cover_image_url` de cada `part` aponta pra imagem real no storage
- [ ] Todas as imagens em `imagens/` estão referenciadas com alt-text
- [ ] `is_preview: true` em ao menos 1 seção (amostra grátis)
- [ ] Conclusão tem `slug: conclusao` (o leitor renderiza Rating + CTA Yaya+ automaticamente)
- [ ] Callouts usam só os 5 tipos canônicos (`ciencia`, `mito`, `alerta`, `yaya`, `disclaimer`)
- [ ] Pelo menos 1 `:::disclaimer` em qualquer ponto com informação clínica
- [ ] Quiz tem 4 perfis (a, b, c, d) com `recommended_sections` válidos
- [ ] Flashcards têm `front` curto (uma frase) e `back` conciso
- [ ] Roda `npx tsx ../scripts/seed-guide.ts <slug>` sem erros
- [ ] Acessa `/admin/biblioteca/<slug>` e vê todas as seções listadas
- [ ] Acessa `/biblioteca-yaya/<slug>/ler` e revisa visualmente

---

## 10. Como rodar o seed

A partir da raiz do repositório:

```bash
cd blog
npx tsx ../scripts/seed-guide.ts <slug-do-guia>
```

O script:
1. Sobe imagens (PNG/JPG → WebP) pro bucket `guide-images`
2. Atualiza `cover_image_url` do guide a partir de `hero-lp.png` ou `hero-intro.png`
3. Faz parse do markdown self-describing
4. Valida slugs únicos, parents existentes, JSONs
5. Apaga conteúdo antigo do guide e insere o novo (idempotente)

Pré-requisito: o registro do guide já precisa existir na tabela `guides`:

```sql
INSERT INTO guides (slug, title, price_cents, status, courtesy_days)
VALUES ('<slug>', 'Título', 4700, 'draft', 30);
```

---

## 11. Glossário rápido

- **Guide** — uma unidade vendável da biblioteca (ex: "Guia das Últimas Semanas")
- **Section** — uma unidade dentro do guide (Parte, seção, checklist, quiz, etc)
- **Part** — `type: part`, capítulo do guide, contém seções filhas
- **Self-describing** — formato em que cada seção declara seus metadados no próprio markdown
- **Callout** — caixa de destaque (`:::tipo ... :::`) renderizada com estilo próprio
- **Cortesia** — 30 dias de Yaya+ que vêm grátis com a compra avulsa de qualquer guia
- **Sidebar** — menu lateral do leitor com índice das seções

---

## 12. Mudanças no padrão (changelog)

- **2026-04-30** — Versão 1.0 do manual. Padronização self-describing,
  3 camadas (narrative/complementary/áudio), CTA Yaya+ dinâmico,
  RatingBlock automático na Conclusão.

Quando o padrão evoluir (novos types, novos callouts, novas convenções),
atualize este documento e o template em `content/infoprodutos/_template/`.
