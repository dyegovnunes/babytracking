# Sua Biblioteca Yaya — engajamento + jornada (próxima rodada)

**Status:** ideia validada com o usuário, ainda não implementada.
**Data anotada:** 2026-04-27

## Contexto

A primeira versão do leitor de "Sua Biblioteca Yaya" (rota
`blog.yayababy.app/sua-biblioteca/[slug]/ler`) está no ar com seções
do tipo `linear`, `part`, `quiz`, `checklist`. Hoje as seções com
checklist no markdown do guia "ultimas-semanas" usam apenas a
sintaxe `- [ ] item` do GFM — viram caixinhas em HTML mas não
salvam estado nem oferecem feedback de progresso.

O usuário quer transformar esses checklists em **componentes
interativos com gamificação por bloco**.

## Ideia confirmada pelo usuário

> "o checklist poderia ser um checklist mesmo, do usuario poder
> completar, e cada bloco (antes do parto, primeiros dias, semana
> 1 a 4) completos rendia uma comemoração."

### Princípios

1. **Checklist é por seção/bloco** — não um único checklist global
2. **Estado persistido por usuário** — já temos a tabela
   `guide_progress` (com `completed`/`completed_at`/`scroll_offset`)
   e a `guide_notes`. Provável criar `guide_checklist_items` ou usar
   JSONB em `guide_progress`.
3. **Comemoração ao completar um bloco** — animação + microcopy +
   talvez badge persistido. Não pop invasivo: algo que respeita o
   tom Yaya (acolhedor, não infantil).
4. **Comemoração quando todos os checklists do guia inteiro acabam**
   — moment maior, candidato a "share-worthy" (gerar imagem pra
   compartilhar, ex: "Concluí o Guia das Últimas Semanas no Yaya 💜").

## Implementação técnica preliminar

Já existem os blocos:

- `ChecklistRenderer.tsx` (componente que hoje renderiza JSONB tipo
  `{ items: [{id, text, required}] }` e salva em **localStorage**)
- Tabela `guide_progress` (user_id, section_id, completed, completed_at)
- `process_guide_purchase` SQL fn como modelo de função idempotente

### Próximos passos quando retomar

1. **Migrar localStorage → DB**: substituir o `localStorage` do
   `ChecklistRenderer` por uma tabela `guide_checklist_state`
   (user_id, section_id, item_id, checked_at) ou JSONB em
   `guide_progress.checklist_state`.
2. **Migrar checklists do markdown puro → JSONB estruturado**:
   hoje o guia "ultimas-semanas" tem `- [ ] item` em markdown. Pra
   virar interativo de verdade, esses itens precisam ser parseados
   pra `guide_sections.data.items` ou virar um tipo de seção
   especial. Pode ser feito no `seed-guia-ultimas-semanas.ts`.
3. **"Bloco" = parte do guia (parent_id NULL)**. Considera "bloco
   completo" quando 100% dos itens dos checklists das seções filhas
   estiverem marcados.
4. **Comemoração de bloco**: animação fullscreen (estilo confetti
   sutil + serif XL "Parte 1 completa! 💜" + microcopy + CTA "Ir
   pra Parte 2"). Reusa estilo do `QuizFullscreen.tsx` como
   referência.
5. **Comemoração de guia inteiro**: tela final com:
   - Badge persistido em `guide_purchases.metadata` ou tabela nova
   - Imagem dinâmica compartilhável (canvas com cover do guia +
     "Concluí" + nome do guia + data)
   - Sugestão de próximo guia da biblioteca

### Conexão com retenção/conversão Yaya+

- Conclusão do guia é momento ÓTIMO pra falar do Yaya+ (cortesia
  acaba em 30 dias — leitora terminou guia comprometida, perfeito
  pra upsell anual).
- Notificações por email celebrando cada parte concluída (via Resend)
  → mantém engajamento durante leitura.

## Onde gravar progresso por bloco

Schema candidato:

```sql
-- Estado de checklist items (alternativa a localStorage)
CREATE TABLE guide_checklist_state (
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  section_id UUID REFERENCES guide_sections(id) ON DELETE CASCADE,
  item_id    TEXT NOT NULL,         -- id do item dentro do data.items
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, section_id, item_id)
);

-- Conquista de bloco/guia (pra animar só uma vez + analytics)
CREATE TABLE guide_milestones (
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  guide_id   UUID REFERENCES guides(id) ON DELETE CASCADE,
  milestone  TEXT NOT NULL,          -- ex: 'part-completed', 'guide-completed'
  ref        TEXT,                   -- ex: section_id da parte completa
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, guide_id, milestone, ref)
);
```

## Quando voltar a esse tópico

O usuário disse: "vou querer falar de engajamento e jornada depois
aqui". Quando ele trouxer "engajamento", "retenção", "conclusão",
"checklist interativo", ou "comemoração", retomar este arquivo como
ponto de partida.
