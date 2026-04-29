---
name: Biblioteca — padrão de flashcards de revisão
description: Padrão técnico e de produto para seções de revisão com flashcards nos guias da Biblioteca Yaya
type: project
originSessionId: 0088708d-4dc9-44fa-ad6c-b0289eee247f
---
# Padrão: Flashcards de Revisão nos Guias

Implementado no Guia das Últimas Semanas (Round 7, 2026-04-28). Este é o padrão a seguir em todos os guias futuros.

## Produto

- Uma seção "Vamos revisar?" ao final de cada Parte do guia
- Cards com pergunta/resposta, aparecendo um por vez em ordem aleatória
- Estado session-only (sem persistência no banco — React state apenas)
- Não conta para a barra de progresso do guia

## Estrutura de dados (DB)

`guide_sections` com `type = 'flashcards'` e `data.cards = [{front, back}]`:

```sql
INSERT INTO guide_sections (guide_id, parent_id, type, title, slug, order_index, estimated_minutes, data)
VALUES (
  '<guide_id>',
  '<parent_id_da_parte>',
  'flashcards',
  'Vamos revisar?',
  'flashcards-parte-N',
  <max_order_filho + 10>,
  5,
  '{"cards": [{"front": "...", "back": "..."}]}'::jsonb
);
```

**Atenção:** O check constraint em `guide_sections.type` deve incluir `'flashcards'`. Se não incluir, aplicar migration antes do INSERT:

```sql
ALTER TABLE guide_sections DROP CONSTRAINT guide_sections_type_check;
ALTER TABLE guide_sections ADD CONSTRAINT guide_sections_type_check
  CHECK (type IN ('linear','quiz','checklist','part','flashcards'));
```

## Código

**Componente:** `blog/src/sua-biblioteca/components/FlashcardSection.tsx`
- Props: `section: GuideSection`, `onContinue: () => void`
- Embaralha cards no mount via `useMemo(() => shuffle([...cards]), [])`
- Estado: `queue` (fila restante), `flipped`, `knownCount`
- "Já sei": remove da fila (`q.slice(1)`) + incrementa knownCount
- "Rever depois": move para o fim (`[...q.slice(1), q[0]]`)
- Flip 3D: CSS `perspective + preserve-3d + backface-visibility`
- Botão "Pular para a próxima seção" sempre visível (discreto, abaixo dos cards)
- Estado de conclusão (queue vazia): "Refazer" + "Continuar lendo"

**SectionRenderer:** adicionar case antes do `if (section.type === 'part')`:
```tsx
import FlashcardSection from './FlashcardSection'

if (section.type === 'flashcards') {
  return <FlashcardSection section={section} onContinue={() => next && onNavigate(next.id)} />
}
```

**Progresso:** excluir `type='flashcards'` do cálculo em GuideLayout e GuideSidebar:
```tsx
// GuideLayout.tsx
const totalSections = flatSections.filter(s => s.type !== 'part' && s.type !== 'flashcards').length

// GuideSidebar.tsx
const totalReadable = sections.filter(s => s.type !== 'part' && s.type !== 'flashcards').length
```

## UX aprovada

- Botões "Já sei" / "Rever depois" só aparecem após flip (não antes)
- Botão "Pular para a próxima seção" sempre visível fora do card (texto sutil + ícone arrow_forward)
- Contador "Card X de Y" + barra de progresso interna
- Conclusão com emoji + "Refazer" (outline) + "Continuar lendo" (accent)

**Why:** Padrão de sessão de revisão sem fricção — usuário pode completar, pular, ou refazer. Não punir quem quer avançar, mas recompensar quem revisa.
