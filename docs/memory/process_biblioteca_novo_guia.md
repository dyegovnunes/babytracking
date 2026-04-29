---
name: Processo — criar novo guia na Biblioteca Yaya
description: Passo a passo completo para lançar um novo infoproduto/guia, do conteúdo ao deploy
type: process
originSessionId: 0088708d-4dc9-44fa-ad6c-b0289eee247f
---
# Como criar um novo guia na Biblioteca Yaya

Baseado na implementação do "Guia das Últimas Semanas" (primeiro guia, abr/2026).

---

## Visão geral da stack

- **Conteúdo**: Markdown com callouts customizados (:::ciencia/mito/alerta/yaya/disclaimer)
- **DB**: Supabase — tabelas `guides` + `guide_sections` (JSONB para dados interativos)
- **Imagens**: bucket público `guide-images/<slug-do-guia>/img/` (PNG→WebP no upload)
- **Pagamento**: Stripe (price criado no dashboard) + edge function `stripe-create-checkout-session`
- **Leitor**: SPA React em `blog.yayababy.app/sua-biblioteca/[slug]/ler`
- **Admin**: `/admin/biblioteca` (CRUD de guias e seções)

---

## Passo 1 — Estrutura de conteúdo

Definir hierarquia antes de escrever:
```
Introdução (part, sem filho, ou com filhos diretos)
  └─ Como usar este guia (linear)
  └─ O que este guia cobre (linear)

Parte 1: Título (part)
  ├─ 1.1 Seção (linear)
  ├─ 1.2 Seção (linear)
  └─ Vamos revisar? (flashcards) ← ao final de cada parte

Parte 2: Título (part)
  └─ ...

Conclusão (linear, com hide_completion_btn + show_nps + show_yaya_cta)
  └─ filho com tool_links (quiz + checklist cards)
```

**Tipos de seção disponíveis:**
| type | Uso |
|---|---|
| `part` | Capa de parte (ChapterOpener com hero image) |
| `linear` | Texto markdown com callouts, highlights, notas |
| `checklist` | Lista de tarefas persistida no DB |
| `quiz` | Quiz fullscreen com 4 perfis de resultado |
| `flashcards` | Revisão com cards frente/verso (session-only) |

---

## Passo 2 — Criar o guia no banco

```sql
INSERT INTO guides (title, slug, description, cover_image_url, price_cents, stripe_price_id, published)
VALUES (
  'Título do Guia',
  'slug-do-guia',
  'Descrição curta',
  'https://kgfjfdizxziacblgvplh.supabase.co/storage/v1/object/public/guide-images/slug-do-guia/img/cover.webp',
  4700,  -- R$47,00
  'price_STRIPE_ID_AQUI',
  false  -- publicar só quando pronto
);
```

---

## Passo 3 — Criar seções no banco

### Partes (type='part')
```sql
INSERT INTO guide_sections (guide_id, parent_id, type, title, slug, order_index, estimated_minutes, cover_image_url)
VALUES (
  '<guide_id>',
  NULL,
  'part',
  'Parte 1: Título',
  'parte-1',
  10,
  1,
  'https://.../img/nome-imagem.webp'
);
```

### Seções lineares (type='linear')
```sql
INSERT INTO guide_sections (guide_id, parent_id, type, title, slug, order_index, estimated_minutes, content_md)
VALUES (
  '<guide_id>',
  '<parent_id_da_parte>',
  'linear',
  '1.1 Título da seção',
  'secao-1-1',
  10,
  5,
  $$ [conteúdo markdown aqui] $$
);
```

### Flashcards (type='flashcards') — um por parte
```sql
-- Verificar check constraint antes: deve incluir 'flashcards'
-- Se não incluir: DROP + recreate constraint (ver project_biblioteca_flashcards_padrao.md)

INSERT INTO guide_sections (guide_id, parent_id, type, title, slug, order_index, estimated_minutes, data)
VALUES (
  '<guide_id>',
  '<parent_id_da_parte>',
  'flashcards',
  'Vamos revisar?',
  'flashcards-parte-N',
  <max_order_filho + 10>,
  5,
  '{"cards": [{"front": "Pergunta", "back": "Resposta"}]}'::jsonb
);
```

### Conclusão (flags especiais)
```sql
UPDATE guide_sections
SET data = data || '{"hide_completion_btn": true, "show_nps": true, "show_yaya_cta": true}'::jsonb
WHERE id = '<id_secao_conclusao>';
```

### Tool links (cards de quiz + checklist na conclusão)
```sql
UPDATE guide_sections
SET data = data || '{
  "tool_links": [
    {"type": "quiz", "label": "Fazer o quiz", "section_id": "<quiz_section_id>"},
    {"type": "checklist", "label": "Ver checklist", "section_id": "<checklist_section_id>"}
  ]
}'::jsonb
WHERE id = '<id_filho_conclusao>';
```

---

## Passo 4 — Upload de imagens

Bucket: `guide-images` (público)
Path padrão: `<slug-do-guia>/img/<nome>.webp`

Converter PNG→WebP antes de subir (usa o script de seed ou upload manual no Supabase dashboard).

URL base: `https://kgfjfdizxziacblgvplh.supabase.co/storage/v1/object/public/guide-images/`

---

## Passo 5 — Callouts no markdown

```markdown
:::ciencia
Evidência científica com fonte.
:::

:::mito
Mito comum seguido de refutação.
:::

:::alerta
Situação que exige atenção ou ação.
:::

:::yaya
Conexão com o app Yaya (funcionalidade relevante para o tema).
:::

:::disclaimer
Nota médica ou de responsabilidade.
:::
```

---

## Passo 6 — Seção de conclusão: padrão de conteúdo

Tom: direto, caloroso, "você" constante, sem romanticismo excessivo.
- 4-5 parágrafos curtos
- Parágrafo final: aproveite o momento / boa sorte
- Separador `---` + frase de transição para os tool cards
- SEM em-dash (U+2014) em nenhum texto
- SEM :::yaya callout redundante (YayaCtaBlock já aparece via flag)

---

## Passo 7 — Stripe

1. Dashboard Stripe → Products → Add product
2. Definir preço (one-time)
3. Copiar `price_id` → atualizar `guides.stripe_price_id`
4. Edge function `stripe-create-checkout-session` já está configurada para usar esse price_id

---

## Passo 8 — Quiz (type='quiz')

`data.questions = [{question, options: [{text, profile}]}]`
`data.profiles = [{id, title, description, icon}]`

Perfis: 4 tipos (ex: organizadora/intuitiva/ansiosa/tranquila).
O componente `QuizFullscreen` já gerencia tudo.

---

## Passo 9 — Checklist (type='checklist')

`data.checklist_items = [{id, text, category?}]`
Persistido em `guide_progress.checklist_state` (JSONB).

---

## Passo 10 — Publicar

```sql
UPDATE guides SET published = true WHERE slug = 'slug-do-guia';
```

---

## Checklist de verificação antes de publicar

- [ ] Todas as seções têm `content_md` ou `data` preenchidos
- [ ] Imagens: sem broken links, proporções corretas (hero 21/9, callout max 300px)
- [ ] Partes têm `cover_image_url` para o modal de celebração (PartCompletionModal)
- [ ] Seção de conclusão: `hide_completion_btn + show_nps + show_yaya_cta = true`
- [ ] Flashcards: um por parte, mínimo 5 cards cada
- [ ] Quiz e checklist têm seções próprias com data correta
- [ ] Stripe price_id correto no `guides` table
- [ ] `published = true`
- [ ] Build sem erros TypeScript
- [ ] Sem em-dash em nenhum texto

---

## Arquivos-chave no código

| Arquivo | Responsabilidade |
|---|---|
| `blog/src/sua-biblioteca/components/GuideLayout.tsx` | Estado global do leitor |
| `blog/src/sua-biblioteca/components/SectionRenderer.tsx` | Dispatcher por type |
| `blog/src/sua-biblioteca/components/ChapterOpener.tsx` | Render de type='part' |
| `blog/src/sua-biblioteca/components/FlashcardSection.tsx` | Render de type='flashcards' |
| `blog/src/sua-biblioteca/components/InteractiveChecklist.tsx` | Render de type='checklist' |
| `blog/src/sua-biblioteca/components/QuizFullscreen.tsx` | Render de type='quiz' |
| `blog/src/sua-biblioteca/components/NpsBlock.tsx` | Avaliação de estrelas (show_nps) |
| `blog/src/sua-biblioteca/lib/markdownRenderer.ts` | Marked + callouts customizados |
| `blog/src/sua-biblioteca/styles/reader.css` | Tokens CSS do leitor |
| `scripts/seed-guia-ultimas-semanas.ts` | Referência de seed script |
