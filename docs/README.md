# docs/

Documentação de produto, specs de feature, guias de implementação e prompts
usados no desenvolvimento do Yaya. O código-fonte e o `CLAUDE.md` continuam
na raiz do repo — aqui ficam só os documentos que não afetam build/runtime.

## Estrutura

```
docs/
├── specs/      # Specs de feature (o "o quê" e "por quê")
├── guides/     # Guias de implementação (o "como")
├── product/    # Brand book, plano de growth, ASO, Play Store, monetização
├── prompts/    # Prompts auxiliares usados em sessões do Claude Code
└── PUSH_NOTIFICATIONS.md  # Documentação técnica de arquitetura
```

## Quando criar um arquivo aqui

- **Spec de feature nova** → `docs/specs/<FEATURE>_SPEC.md`
- **Guia de passo-a-passo** → `docs/guides/<FEATURE>_IMPLEMENTATION_GUIDE.md`
- **Decisão de produto / marca / pricing** → `docs/product/`
- **Prompt reutilizável** → `docs/prompts/`
- **Documentação de arquitetura runtime** → raiz de `docs/` (ex.: `PUSH_NOTIFICATIONS.md`)

## O que NÃO colocar aqui

- `CLAUDE.md` — fica na raiz para o Claude Code carregar automaticamente
- Código — vai em `app/src/`
- Migrations — vão em `supabase/migrations/`
- Edge functions — vão em `supabase/functions/`
