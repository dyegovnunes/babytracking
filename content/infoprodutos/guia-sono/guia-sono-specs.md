# Specs — Guia do Sono

**Versão:** 1.0  
**Data:** 2026-04-29  
**Status:** Em produção

---

## 1. Posicionamento

**Nome oficial:** Guia do Sono  
**Subtítulo:** Do recém-nascido ao toddler: métodos, regressões e rotinas baseados em evidências  
**Slug:** `guia-sono`  
**Ticket:** R$ 67 lançamento / R$ 97 regular  
**Stripe:** price_id a criar no dashboard antes do deploy

**Proposta central:** O guia mais completo sobre sono infantil em português, que não escolhe um lado — compara métodos com honestidade, explica regressões antes que aconteçam e entrega rotinas práticas por fase. Para pais que querem entender o sono do filho, não só sobreviver às noites.

**Diferenciação:**
- Cobre RN ao toddler (0-24 meses) em ordem cronológica por fase
- Compara métodos (Ferber, fading, no-cry, EASY) sem doutrinação — apresenta evidências e trade-offs
- Cada regressão tem seção própria com o que esperar, quanto dura e o que fazer
- Integrado ao Yaya: cada módulo conecta com o tracking de sono do app
- Elementos interativos: checklist de ambiente seguro, quiz de perfil de abordagem, flashcards de revisão
- Bônus: tabela de janelas de sono por fase (referência rápida)

**Público:** Pais com bebê de 0 a 24 meses, especialmente quem está vivendo uma regressão ou quer estruturar rotina  
**Relação com G02:** Complementar — G02 toca sono em cada módulo de forma introdutória; G03 aprofunda com métodos, comparativos e troubleshooting. Quem tem os dois tem o ecossistema completo.

---

## 2. Estrutura de seções (para o seed script)

```
Introdução (part)
  └─ O que é este guia (linear)
  └─ Como usar (linear)

Módulo 1: o sono do recém-nascido (0-3 meses) (part)
  ├─ 1.1 Como o bebê dorme: ciclos, fases e o que é normal (linear)
  ├─ 1.2 Sono seguro: regras que salvam vidas (linear)
  ├─ 1.3 Co-leito: o que a ciência diz (linear)
  ├─ 1.4 Ruído branco, embalar e outros apoios (linear)
  ├─ 1.5 A rotina antes de existir rotina (linear)
  ├─ 1.6 Sono do RN e amamentação: o par inseparável (linear)
  └─ Vamos revisar? (flashcards)

Módulo 2: a grande virada (3-6 meses) (part)
  ├─ 2.1 A regressão dos 4 meses: o que muda para sempre (linear)
  ├─ 2.2 Janelas de sono: a chave que ninguém te contou (linear)
  ├─ 2.3 Construindo uma rotina consistente (linear)
  ├─ 2.4 Métodos de treinamento do sono: visão geral (linear)
  ├─ 2.5 Ferber (extinção graduada): como funciona, prós e contras (linear)
  ├─ 2.6 No-cry e fading: como funciona, prós e contras (linear)
  ├─ 2.7 Como escolher o método certo para a sua família (linear)
  ├─ 2.8 A rotina EASY: estrutura sem rigidez (linear)
  └─ Vamos revisar? (flashcards)

Módulo 3: o meio do caminho (6-12 meses) (part)
  ├─ 3.1 A regressão dos 8-9 meses (linear)
  ├─ 3.2 A regressão dos 12 meses (linear)
  ├─ 3.3 Transição de 3 para 2 sestas (linear)
  ├─ 3.4 Transição de 2 para 1 sesta (linear)
  ├─ 3.5 Acordar cedo demais (linear)
  ├─ 3.6 Sono e introdução alimentar (linear)
  ├─ 3.7 Ansiedade de separação e sono (linear)
  ├─ 3.8 Ambiente de sono: quarto, berço e temperatura (checklist) ← dinâmico
  └─ Vamos revisar? (flashcards)

Módulo 4: o toddler (12-24 meses) (part)
  ├─ 4.1 A regressão dos 18 meses (linear)
  ├─ 4.2 Transição para a cama de criança (linear)
  ├─ 4.3 Resistência para dormir e procrastinação do sono (linear)
  ├─ 4.4 Pesadelos e terror noturno (linear)
  ├─ 4.5 Sono e dentição (linear)
  ├─ 4.6 Rotina do toddler: o que funciona (linear)
  └─ Vamos revisar? (flashcards)

Conclusão (linear — flags: hide_completion_btn + show_nps + show_yaya_cta)
  └─ Tool links: quiz + checklist de ambiente (linear)

Bônus: Quiz — qual abordagem combina com a sua família? (quiz)
Bônus: Checklist de ambiente de sono seguro (checklist) ← dinâmico
Bônus: Tabela de janelas de sono por fase (linear) ← estático
Bônus: Guia de troubleshooting — quando nada está funcionando (linear) ← estático
```

---

## 3. Callouts disponíveis (sintaxe do markdown)

```
:::ciencia
Dado científico com fonte inline. Ex: (AAP, 2022)
:::

:::mito
Mito comum. Realidade: refutação baseada em evidência.
:::

:::alerta
Sinal de alerta ou situação que exige ação médica.
:::

:::yaya
Como o app Yaya ajuda especificamente nesse momento.
:::

:::disclaimer
Nota médica ou de responsabilidade.
:::
```

---

## 4. Padrão de imagens

**Hero de módulo (type='part'):**
- Proporção: 21:9
- Path: `guia-sono/imagens/hero-modulo-N.png`

**Imagens de quebra dentro de seções lineares:**
- Proporção: 3:2 ou 16:9
- Path: `guia-sono/imagens/secao-[slug].png`
- Frequência: 1 imagem a cada 400-600 palavras

**Paleta obrigatória:** azul lavanda `#7C83DB`, lilás `#e8e1ff`, roxo `#7056e0`, tons neutros quentes. Nunca coral/laranja.  
**Estilo:** fotos realistas, famílias brasileiras diversas, luz natural ou de abajur, ambiente doméstico noturno acolhedor.

---

## 5. Padrão de flashcards por módulo

Mínimo 6 cards por módulo. Estrutura JSON:
```json
{
  "cards": [
    {"front": "Pergunta direta sobre o conteúdo do módulo", "back": "Resposta objetiva, máx 2 linhas"},
    ...
  ]
}
```

---

## 6. Checklist de ambiente de sono seguro (seção 3.8)

```json
{
  "checklist_items": [
    {"id": "amb-01", "text": "Berço com grades fixas e colchão firme", "category": "Berço"},
    {"id": "amb-02", "text": "Sem travesseiro, edredom ou bumper no berço", "category": "Berço"},
    {"id": "amb-03", "text": "Sem brinquedos soltos dentro do berço", "category": "Berço"},
    {"id": "amb-04", "text": "Temperatura do quarto entre 20-22°C", "category": "Ambiente"},
    {"id": "amb-05", "text": "Blackout ou cortina escurecedora instalada", "category": "Ambiente"},
    {"id": "amb-06", "text": "Ruído branco disponível (máx 50dB, longe do berço)", "category": "Ambiente"},
    {"id": "amb-07", "text": "Monitor de bebê funcionando", "category": "Equipamentos"},
    {"id": "amb-08", "text": "Sem cordões ou cabos ao alcance do bebê", "category": "Segurança"},
    {"id": "amb-09", "text": "Bebê sempre dormindo de costas", "category": "Segurança"},
    {"id": "amb-10", "text": "Saco de dormir no lugar de cobertores soltos", "category": "Segurança"}
  ]
}
```

---

## 7. Quiz — "Qual abordagem combina com a sua família?"

```json
{
  "questions": [
    {
      "question": "Como você se sente diante do choro do seu bebê?",
      "options": [
        {"text": "Consigo esperar alguns minutos se sei que é seguro", "profile": "estruturada"},
        {"text": "Preciso intervir imediatamente, é muito difícil ouvir", "profile": "gentil"},
        {"text": "Depende — consigo em algumas noites, em outras não", "profile": "flexivel"},
        {"text": "Prefiro evitar o choro ao máximo, mesmo que leve mais tempo", "profile": "gradual"}
      ]
    },
    {
      "question": "Qual é sua principal prioridade agora?",
      "options": [
        {"text": "Resultado rápido — não aguento mais dormir mal", "profile": "estruturada"},
        {"text": "Processo gentil, mesmo que demore mais", "profile": "gentil"},
        {"text": "Equilíbrio entre velocidade e conforto do bebê", "profile": "flexivel"},
        {"text": "Manter o vínculo acima de tudo", "profile": "gradual"}
      ]
    },
    {
      "question": "Como está a sua rotina hoje?",
      "options": [
        {"text": "Bem estruturada — horários fixos funcionam para nós", "profile": "estruturada"},
        {"text": "Flexível — seguimos o ritmo do bebê", "profile": "gentil"},
        {"text": "Em construção — tentando organizar", "profile": "flexivel"},
        {"text": "Sem rotina definida ainda", "profile": "gradual"}
      ]
    }
  ],
  "profiles": [
    {
      "id": "estruturada",
      "title": "Abordagem estruturada",
      "description": "Você tem perfil para métodos como Ferber ou extinção graduada. Resultados mais rápidos, exige consistência e tolerar algum choro supervisionado.",
      "icon": "🏗️"
    },
    {
      "id": "gentil",
      "title": "Abordagem gentil",
      "description": "Você tem perfil para o método no-cry ou fading. Processo mais lento, mas alinhado com sua tolerância ao choro e estilo parental.",
      "icon": "🌿"
    },
    {
      "id": "flexivel",
      "title": "Abordagem híbrida",
      "description": "Você pode combinar elementos de diferentes métodos. O importante é consistência dentro do que escolher — mudar de método a cada noite não funciona.",
      "icon": "⚖️"
    },
    {
      "id": "gradual",
      "title": "Abordagem gradual",
      "description": "Você tem perfil para o fading com presença (chair method). Mais lento, mas com sua presença constante durante o processo de aprendizado do sono.",
      "icon": "🐢"
    }
  ]
}
```

---

## 8. Regras editoriais obrigatórias

- Sem em-dash (—) em nenhum texto — usar vírgula, ponto e vírgula ou parênteses
- Sem "mamada" — usar "amamentação", "oferta do leite" ou "oferta do seio"
- Sem title case nos títulos — sentence case sempre
- Sem "todo bebê é diferente" como não-resposta — sempre seguir de orientação prática
- Sem "aproveite cada segundo, passa tão rápido"
- Sem julgamento de método — apresentar evidências e trade-offs de forma neutra
- Fontes citadas inline: (AAP, 2022), (SBP, 2024), (OMS, 2023)
- Linguagem inclusiva: "pais", não só "mãe"
- Parágrafos curtos: máximo 4 linhas
- Intertítulos a cada 2-3 parágrafos
- Resumo em 3 pontos ao final de cada seção linear longa (mais de 400 palavras)

---

## 9. Estrutura obrigatória de cada seção linear

1. **Título** (sentence case)
2. **Lead** (2-3 frases): situação real que o leitor está vivendo agora
3. **Corpo**: parágrafos curtos com intertítulos
4. **Callouts**: mínimo 1 por seção (:::ciencia, :::mito ou :::alerta)
5. **Imagem de quebra**: onde o texto fica denso (a cada ~500 palavras)
6. **:::yaya** ao final da maioria das seções
7. **Resumo em 3 pontos** ao final (seções longas)

---

## 10. Checklist de verificação antes do deploy

- [ ] Todas as seções `linear` têm `content_md` preenchido
- [ ] Todas as seções `part` têm `cover_image_url`
- [ ] Flashcards: mínimo 6 cards por módulo
- [ ] Checklists: IDs únicos em todos os itens
- [ ] Quiz: 4 perfis completos com description e icon
- [ ] Conclusão: flags `hide_completion_btn + show_nps + show_yaya_cta`
- [ ] Nenhum em-dash em nenhum texto
- [ ] Imagens: sem broken links, proporções corretas
- [ ] Stripe price_id preenchido no `guides` table
- [ ] `published = false` até aprovação final
