# Sessão: Padronização completa da Sua Biblioteca Yaya

> Datas: 2026-04-30 e 2026-05-01
> Resultado: pipeline unificado + validador editorial + revisão completa
> dos guias G01 (ultimas-semanas) e G02 (primeiro-ano), incluindo geração
> de áudio TTS pra ambos.

---

## Sumário do que foi entregue

### Fase 1 — Infra do pipeline (commits `5031908`, `e81a82f`, `a5a5d0a`, `7c8c25f`)

**Pipeline unificado** substituiu 3 scripts duplicados (`seed-guia-{ultimas-semanas,primeiro-ano,sono}.ts`):

```
scripts/
├── seed-guide.ts                  # orquestrador único: npx tsx scripts/seed-guide.ts <slug>
├── validate-guide.ts              # validador editorial (CLI standalone)
└── lib/
    ├── seed-utils.ts              # helpers: env, supabase admin, hashText, uploadImages
    ├── md-utils.ts                # helpers puros (sem Supabase): rewriteImagePaths, slugify, stripAnchors
    ├── md-parser.ts               # parser self-describing único (suporta 5 tipos + category)
    └── validation-rules.ts        # 9 categorias de checks em 3 níveis (error/warning/info)
```

**Pasta-modelo** `content/infoprodutos/_template/`:
- `guia-template.md` (esqueleto comentado)
- `imagens/.gitkeep`
- `README.md`

**Manual de estilo** completo em `docs/biblioteca/MANUAL_DE_ESTILO.md` (12 seções):
- Estrutura em 3 camadas (narrative obrigatório / complementary opcional / áudio transversal)
- 5 tipos de seção: `part`, `linear`, `checklist`, `quiz`, `flashcards`
- 5 callouts canônicos: `:::ciencia`, `:::mito`, `:::alerta`, `:::yaya`, `:::disclaimer`
- Convenções de imagens (paths, naming, aspect ratios)
- Áudio TTS (gerado automaticamente)
- Validador automático (§9)
- Checklist de QA (§10)

**Doc do cowork** em `docs/biblioteca/COMO_VALIDAR.md` (passo-a-passo simples).

### Fase 2 — Schema e infra de áudio (migration `20260501_guide_standardization`)

- `guide_sections.category` (`narrative` | `complementary`, default `narrative`)
- `guide_audio_segments` (cache TTS por `text_hash`)
- Bucket público `guide-audio` (50MB, audio/*)
- Edge function `generate-guide-audio` (OpenAI TTS `tts-1`, voz `nova`)
  - Pré-processamento: `Yaya` → `Iaiá` pra pronúncia "iaiÁH" em PT-BR
  - `voice_id` versionado (`nova-v2`) pra forçar cache miss em mudanças

### Fase 3 — Frontend do leitor (commits `a5a5d0a`, `8b45c8c`, `79bf078`, `60eb463`, `fe804bf`)

Novos:
- `AudioPlayer.tsx` — sticky no topo das `linear`, play/pause/scrubber/velocidade. Some quando sem áudio.
- `DynamicYayaCTA.tsx` — CTA com 4 variantes (avulso s/ Yaya+, mensal, anual/vitalício, sem nada)

Modificações:
- `SectionRenderer.tsx`:
  - Renderiza `<AudioPlayer>` no topo das `linear`
  - Auto-renderiza `NpsBlock` + `DynamicYayaCTA` na Conclusão (slug `conclusao*`)
  - Layout grid 2 colunas em desktop pros blocos da Conclusão
  - Tool links automáticos pros materiais complementares na Conclusão (cards clicáveis)
  - Botão "Concluída 💜" sem o texto "Desmarcar" (clicar de novo desmarca)
- `GuideSidebar.tsx`:
  - Agrupa por `category`: narrative no fluxo principal, divisor + cabeçalho "Materiais complementares"
  - Hamburguer no desktop colapsa/expande a sidebar (translateX + ajusta margin do `.reader-main`)
- `GuideLayout.tsx`:
  - Sidebar persiste em desktop quando seleciona seção (só fecha em mobile)
- `HighlightLayer.tsx`:
  - Limpa Selection ANTES de `setHighlights` pra Range ativa não bloquear re-aplicar das marks
- `NpsBlock.tsx`:
  - Textarea + botão só aparecem após user clicar uma estrela
  - Botão centralizado (era alinhado à direita)
- `reader.css`:
  - Fontes da marca: `--r-display-font: Manrope` (UI/headings) + `--r-content-font: Plus Jakarta Sans` (corpo). Drop cap em Manrope (sem Fraunces).
  - Drop cap real implementado (>=600px viewport)
  - Tabelas: removido `display: block` que matava layout. Ganhou zebra striping, gradient no header, hover row. Mobile só vira scrollable se a tabela for muito larga.

### Fase 4 — G01 (ultimas-semanas) — limpo e regerado (commits `e81a82f`, `5031908`, `60eb463`)

- Migrado do formato natural pro **self-describing**
- 5 parts + 30 seções no DB
- 22 travessões (—) substituídos por hífen simples
- 14 imagens reais referenciadas no MD (5 pendentes do cowork pq são mockups com tela branca)
- Disclaimer médico-legal adicionado na Introdução (SBP/OMS/AAP)
- Checklist Mestre subdividido em 3 grupos (Antes do parto / Primeiros dias / Semana 1-4) com `data.groups`
- Quiz, Flashcards, Checklist Mestre como `complementary`
- Flashcards de cada parte como filhas das partes (parent=parte-N), título "Vamos relembrar?"
- Conclusão com tool_links automáticos pros materiais
- 24 áudios TTS gerados com pronúncia "Iaiá"
- Status: ✅ 0 erros no validador

### Fase 5 — G02 (primeiro-ano) — completa revisão (commits `f331fd9`, `1d4030f`, `fe804bf`, áudio em `2026-05-01`)

- 54 travessões corrigidos
- Quiz convertido pro formato canônico (`profiles[]` → `results{a,b,c,d}`)
- Checklist `seguranca-em-casa` com 7 grupos (Elétrica, Quedas, Intoxicação, Engasgo, Queimaduras, Afogamento, Emergência) + flags `required` nos críticos
- 33 imagens injetadas via script (`inject-g02-images.ts`)
- 35 blocos `**PROMPT GEMINI - X.webp:**` removidos (vazavam no leitor)
- 30 imagens substituídas pelas que o cowork havia mapeado originalmente (mais fiel à intenção editorial)
- Introdução marcada como `is_preview: true`
- 5 parts + 43 seções no DB
- **37 áudios TTS regerados** com pronúncia "Iaiá", sem prompts de Gemini
- Status: ✅ 0 erros, 1 aviso (quiz com 3 perguntas — recomendação)

### Acessos liberados

`guide_purchases` com `provider=manual` para `dyego.vnunes@gmail.com` em todos os 3 guias:
- G01 (`ultimas-semanas`)
- G02 (`primeiro-ano`)
- G03 (`guia-sono`)

---

## Como retomar em outra sessão

### 1. Prompt inicial sugerido

Cole isto na nova sessão pra o agente carregar o contexto:

> Estou continuando a padronização da Sua Biblioteca Yaya. Lê
> `docs/biblioteca/SESSAO_PADRONIZACAO_BIBLIOTECA.md` (esta doc) e
> `docs/biblioteca/MANUAL_DE_ESTILO.md` pra entender o padrão atual.
> O pipeline unificado e o validador editorial já estão prontos.
> O G01 e o G02 já passaram pela revisão completa, com áudios gerados.
>
> Próximos passos pendentes:
>
> 1. **Revisão do G03 (`guia-sono`)** seguindo o mesmo processo do G02:
>    - `npm run validate guia-sono` → corrigir erros (em-dashes, callouts inválidos, quiz mal formado, imagens faltando)
>    - Se houver blocos `**PROMPT GEMINI - X.webp:**` no MD, rodar
>      script de cleanup similar ao `scripts/cleanup-g02-prompts.ts`
>    - Conferir se o checklist tá agrupado por `data.groups` (se faz sentido)
>    - Conferir se as imagens da pasta `imagens/` estão referenciadas no MD
>    - Antes de gerar áudio: PEDIR CONFIRMAÇÃO. Custo ~$1/guia, 5-7 min.
>
> 2. **Bug de navegação no leitor**: ao clicar "voltar" no topbar do
>    leitor, ele vai pra `https://blog.yayababy.app/biblioteca-yaya/`.
>    Deveria ir pra `/minha-biblioteca`. Ver
>    `blog/src/sua-biblioteca/components/GuideTopbar.tsx` (handler do
>    botão arrow_back).

### 2. Comandos importantes

```bash
# Validar um guia (não toca DB)
cd blog && npm run validate <slug>

# Subir o guia (valida + insere no DB; --skip-validation pra emergência)
cd blog && npm run seed:guide <slug>

# Subir + gerar áudio TTS (custa ~$1, 5-7 min)
cd blog && GENERATE_AUDIO=1 npm run seed:guide <slug>
```

### 3. Estado dos guides no DB

```sql
-- 3 guides published, todos com schema novo (category, is_preview)
SELECT slug, title, status, price_cents FROM guides;
-- ultimas-semanas (R$47), primeiro-ano (R$67), guia-sono (R$97)
```

### 4. Arquivos-chave criados/modificados nesta sessão

```
docs/biblioteca/
├── MANUAL_DE_ESTILO.md          # entregável pro cowork
├── COMO_VALIDAR.md              # passo-a-passo do validador
├── REVISAO_G01_E_APRENDIZADOS.md
└── SESSAO_PADRONIZACAO_BIBLIOTECA.md  # este doc

scripts/
├── seed-guide.ts                # pipeline unificado
├── validate-guide.ts            # validador CLI
├── inject-g02-images.ts         # one-shot (já rodado)
├── cleanup-g02-prompts.ts       # one-shot (já rodado)
└── lib/
    ├── seed-utils.ts
    ├── md-utils.ts
    ├── md-parser.ts             # suporta `category`, `is_preview`, `groups`/`items`/`checklist_items`
    └── validation-rules.ts      # 9 checks em 3 níveis

content/infoprodutos/
├── _template/                   # ponto de partida pra novo guia
├── guia-ultimas-semanas/        # G01: 5p + 30s, áudio gerado
├── guia-primeiro-ano/           # G02: 5p + 43s, áudio gerado (37 sec narrativas)
└── guia-sono/                   # G03: PENDENTE revisão

blog/src/sua-biblioteca/
├── components/
│   ├── AudioPlayer.tsx          # NEW
│   ├── DynamicYayaCTA.tsx       # NEW
│   ├── SectionRenderer.tsx      # tool_links auto, NPS+CTA na conclusão, AudioPlayer no topo
│   ├── GuideSidebar.tsx         # agrupa por category, hamburguer toggle desktop
│   ├── GuideLayout.tsx          # sidebar persiste em desktop
│   ├── HighlightLayer.tsx       # fix: clear Selection antes de setHighlights
│   └── NpsBlock.tsx             # botão centralizado, só aparece após rating
└── styles/
    └── reader.css               # fontes da marca, drop cap real, tabelas com layout correto

supabase/
├── migrations/
│   └── (aplicadas via MCP — ver migrations dashboard) guide_standardization_category_and_audio
└── functions/
    └── generate-guide-audio/    # NEW: OpenAI TTS + pronúncia Yaya→Iaiá
```

### 5. Itens pendentes globais

**Imediato (próxima sessão):**
- ✅ Revisar G03 (`guia-sono`) — seguir processo do G02
- ✅ Fix botão voltar do leitor → `/minha-biblioteca`

**Backlog (sem prioridade):**
- 5 mockups do app (G01) com tela branca — quando o Dyego tiver os screenshots, substituir os arquivos em `imagens/` (path do storage preserva)
- 4 capas das partes 1-4 do G01 (formato 21:9) — ainda não criadas
- Landing pública `/sua-biblioteca` + `/sua-biblioteca/[slug]` (despriorizada)
- Admin `/admin/biblioteca/purchases` + `/admin/biblioteca/analytics`

---

## Notas técnicas pra debug futuro

### `Yaya` → `Iaiá` no áudio

A pronúncia foi corrigida via pré-processamento na edge function
`generate-guide-audio` antes de chamar a OpenAI TTS:

```ts
function applyPronunciationFixes(text: string): string {
  return text
    .replace(/\bYaya\b/g, 'Iaiá')
    .replace(/\byaIA\b/g, 'Iaiá')
}
```

O `voice_id` é versionado (`nova-v2`). Pra mudar pré-processamento sem
quebrar cache: bump pra `nova-v3`, deploy, próximo seed regera tudo.

### Cache de áudio

- Tabela `guide_audio_segments` com UNIQUE(section_id, text_hash, voice_id).
- Storage path: `guide-audio/<guide-slug>/<section-slug>-<hash12>-<voice_id>.mp3`
- Edge function checa cache primeiro; se hit, retorna URL existente sem
  chamar OpenAI.

### Pipeline de seed

1. `loadBlogEnv()` carrega `blog/.env`
2. `uploadImages()` converte PNG/JPG → WebP q=82 + upload bucket
   `guide-images` (idempotente, upsert)
3. `parseGuideMarkdown()` retorna sections + warnings + errors
4. `runValidation()` (a menos que `--skip-validation`)
5. `persistSections()` DELETE + INSERT (idempotente, cleanup FKs primeiro)
6. `maybeGenerateAudio()` se `GENERATE_AUDIO=1` invoca edge function
   pra cada `linear` section
