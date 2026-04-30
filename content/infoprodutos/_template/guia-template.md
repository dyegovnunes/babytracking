# Guia Template — Sua Biblioteca Yaya

> Esta é a pasta-modelo para criar um novo guia.
> Veja `docs/biblioteca/MANUAL_DE_ESTILO.md` para detalhes completos.
>
> **Como usar este template:**
> 1. Copie esta pasta inteira: `cp -r content/infoprodutos/_template content/infoprodutos/<slug-do-novo-guia>`
> 2. Renomeie `guia-template.md` para `<slug-do-novo-guia>.md`
> 3. Preencha as seções abaixo seguindo o formato self-describing
> 4. Adicione imagens em `imagens/` (PNG ou JPG, serão convertidas pra WebP)
> 5. Crie o registro do guide no DB:
>    `INSERT INTO guides (slug, title, price_cents, status) VALUES ('<slug>', 'Título', 4700, 'draft');`
> 6. Rode: `cd blog && npx tsx ../scripts/seed-guide.ts <slug-do-novo-guia>`

Tudo abaixo deste primeiro `#` é ignorado pelo parser. O parser começa
no primeiro `## SEÇÃO:`.

---

## SEÇÃO: Introdução

**type:** `linear`
**slug:** `introducao`
**parent:** `null`
**category:** `narrative`
**estimated_minutes:** `4`
**is_preview:** `true`

```markdown
Bem-vindo à Sua Biblioteca Yaya. Este guia foi feito pra você que [...].

Aqui você vai encontrar [resumo do que o leitor leva].

:::yaya
Use o app Yaya pra registrar [aplicação prática do guia] enquanto lê.
Cada minuto registrado vira um insight no app.
:::

:::disclaimer
Este guia é educativo e não substitui acompanhamento pediátrico.
Sempre consulte seu médico antes de aplicar qualquer recomendação ao
seu bebê. Fontes: SBP 2024, OMS 2023.
:::

![Imagem de hero do guia](imagens/hero-intro.png)
```

---

## SEÇÃO: Parte 1 — Tema da primeira parte

**type:** `part`
**slug:** `parte-1-tema`
**parent:** `null`
**category:** `narrative`
**estimated_minutes:** `2`
**cover_image_url:** `<slug-do-guia>/img/capa-parte-1.webp`

```markdown
Abertura editorial da Parte 1. 2-4 parágrafos explicando o que vem nesta
parte e por que importa. Esta é a "capa" do capítulo.
```

---

## SEÇÃO: 1.1 Primeiro tópico da Parte 1

**type:** `linear`
**slug:** `11-primeiro-topico`
**parent:** `parte-1-tema`
**category:** `narrative`
**estimated_minutes:** `5`

```markdown
Conteúdo principal da seção. Markdown puro: parágrafos, listas, imagens,
links e callouts.

## Subseção interna (opcional)

Use `##` dentro do bloco markdown para subseções. Não confunda com `##
SEÇÃO:` que é o marcador estrutural do parser.

:::ciencia
Texto baseado em estudo (cite fonte).
Fonte: SBP 2024.
:::

:::mito
**Mito:** [afirmação comum].
**Realidade:** [fato baseado em evidência].
:::

:::alerta
Sinal de alarme: quando procurar atendimento médico imediato.
:::
```

---

## SEÇÃO: 1.2 Segundo tópico da Parte 1

**type:** `linear`
**slug:** `12-segundo-topico`
**parent:** `parte-1-tema`
**category:** `narrative`
**estimated_minutes:** `4`

```markdown
Conteúdo da segunda seção da parte 1.
```

---

## SEÇÃO: Parte 2 — Tema da segunda parte

**type:** `part`
**slug:** `parte-2-tema`
**parent:** `null`
**category:** `narrative`
**estimated_minutes:** `2`
**cover_image_url:** `<slug-do-guia>/img/capa-parte-2.webp`

```markdown
Abertura editorial da Parte 2.
```

---

## SEÇÃO: 2.1 Primeiro tópico da Parte 2

**type:** `linear`
**slug:** `21-primeiro-topico`
**parent:** `parte-2-tema`
**category:** `narrative`
**estimated_minutes:** `5`

```markdown
Conteúdo da seção 2.1.
```

---

## SEÇÃO: Conclusão

**type:** `linear`
**slug:** `conclusao`
**parent:** `null`
**category:** `narrative`
**estimated_minutes:** `3`

```markdown
Você concluiu a leitura do guia [Nome do guia]. [Reforço da jornada].

Agora é hora de [chamar pro próximo passo prático]:

- Use o **Checklist Mestre** abaixo nos próximos dias
- Descubra seu **perfil de cuidado** com o quiz
- Revise os conceitos com os **flashcards de revisão**

[A avaliação 5 estrelas e o CTA Yaya+ são renderizados automaticamente
pelo leitor — não inclua no markdown.]
```

---

## SEÇÃO: Checklist Mestre

**type:** `checklist`
**slug:** `checklist-mestre`
**parent:** `null`
**category:** `complementary`
**estimated_minutes:** `2`

```json
{
  "items": [
    {"id": "item-1", "text": "Primeiro item da checklist", "required": true},
    {"id": "item-2", "text": "Segundo item da checklist"},
    {"id": "item-3", "text": "Terceiro item da checklist"}
  ]
}
```

---

## SEÇÃO: Quiz: descubra seu perfil

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
        {"value": "b", "label": "Confio no instinto e respondo na hora"},
        {"value": "c", "label": "Fico ansiosa e peço ajuda"},
        {"value": "d", "label": "Vou direto pro checklist do que pode ser"}
      ]
    }
  ],
  "results": {
    "a": {
      "title": "Analítica",
      "description": "Você precisa entender antes de agir.",
      "recommended_sections": ["11-primeiro-topico"]
    },
    "b": {
      "title": "Intuitiva",
      "description": "Você confia no instinto.",
      "recommended_sections": ["12-segundo-topico"]
    },
    "c": {
      "title": "Ansiosa",
      "description": "Você precisa de clareza.",
      "recommended_sections": ["21-primeiro-topico"]
    },
    "d": {
      "title": "Pragmática",
      "description": "Você quer o checklist e a ação.",
      "recommended_sections": ["checklist-mestre"]
    }
  }
}
```

---

## SEÇÃO: Flashcards de revisão

**type:** `flashcards`
**slug:** `flashcards-revisao`
**parent:** `null`
**category:** `complementary`
**estimated_minutes:** `5`

```json
{
  "cards": [
    {"front": "Pergunta de revisão 1", "back": "Resposta concisa 1"},
    {"front": "Pergunta de revisão 2", "back": "Resposta concisa 2"},
    {"front": "Pergunta de revisão 3", "back": "Resposta concisa 3"}
  ]
}
```
