---
name: Proibido usar em-dash em textos do produto
description: Regra de copy do Yaya, aplica a todo texto visivel no app, prompts IA, docs de produto
type: feedback
originSessionId: c58fd3b0-37de-46a2-84ac-b1ab74961354
---
Nunca usar o caractere `—` (em-dash, U+2014) em textos do produto Yaya. Vale pra:
- Copy in-app (empty states, paywall, mensagens de erro, toasts, tooltips, disclaimers)
- System prompt da yaIA e prompts auxiliares do n8n
- Documentacao de produto/marketing (landing, stores, blog)
- Qualquer string visivel ao usuario final

Substituir por virgula, travessao simples (`-`), parenteses, ou reescrever a frase. Travessao simples e ok onde cabe, mas vale revisar se a pontuacao alternativa fica mais natural.

**Why:** Regra explicita de produto dada pelo usuario no dia 2026-04-23 durante o bug fix da yaIA. Foi corrigida em bloco em todos os arquivos da feature yaia e o PaywallModal.

**How to apply:** Ao escrever qualquer string que vai renderizar na UI ou ser consumida pelo modelo de IA, evitar `—`. Ao editar arquivo com copy existente, se for tocar num trecho que tem `—`, trocar. Nao precisa fazer scrub global fora da area editada, mas dentro da area de trabalho sempre trocar. Ao revisar system prompt da yaIA (docx) ou qualquer copy nova, passar um grep antes de commitar.
