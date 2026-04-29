# Specs — Guia do Primeiro Ano

**Versão:** 1.0  
**Data:** 2026-04-28  
**Status:** Em produção

---

## 1. Posicionamento

**Nome oficial:** Guia do Primeiro Ano  
**Subtítulo:** Do nascimento ao 1 ano, semana a semana, baseado em evidências  
**Slug:** `primeiro-ano`  
**Ticket:** R$ 67 lançamento / R$ 97 regular  
**Stripe:** price_id a criar no dashboard antes do deploy  

**Proposta central:** O guia mais completo do 1º ano de vida do bebê em português, organizado por fase, com fontes verificáveis em cada afirmação de saúde — para pais que querem entender o que está acontecendo, não só sobreviver.

**Diferenciação:**
- Cobre os 12 meses completos em ordem cronológica, módulo por módulo
- Cada afirmação de saúde tem fonte citada inline (OMS, SBP, AAP, MS)
- Integrado ao Yaya: cada módulo tem gancho direto com feature do app
- Elementos interativos: checklists persistidos, flashcards de revisão, quiz de fase
- Imagens realistas com paleta Yaya ao longo do conteúdo (não só nos heroes)

**Público:** Pais com bebê de 0 a 12 meses, especialmente primeiros filhos  
**Relação com G01:** Standalone — cobre do nascimento ao 1 ano sem depender do Guia das Últimas Semanas. Quem tem os dois tem a jornada completa do 3º trimestre ao 1 ano.

---

## 2. Estrutura de seções (para o seed script)

```
Introdução (part)
  └─ O que é este guia (linear)
  └─ Como usar (linear)

Módulo 1: 0 a 3 meses (part)
  ├─ 1.1 Sono do recém-nascido (linear)
  ├─ 1.2 Amamentação sob demanda (linear)
  ├─ 1.3 Pega correta e posições (linear)
  ├─ 1.4 Leite materno, ordenhagem e fórmula (linear)
  ├─ 1.5 Choro: tipos e o que fazem (linear)
  ├─ 1.6 Cólicas (linear)
  ├─ 1.7 Rotina do recém-nascido (linear)
  ├─ 1.8 Ganho de peso (linear)
  ├─ 1.9 Saúde: o que monitorar (linear)
  ├─ 1.10 Tummy time, banho e fraldas (linear)
  └─ Vamos revisar? (flashcards)

Módulo 2: 3 a 6 meses (part)
  ├─ 2.1 Regressão do sono aos 4 meses (linear)
  ├─ 2.2 Métodos de treinamento do sono (linear)
  ├─ 2.3 Saltos de desenvolvimento (linear)
  ├─ 2.4 Marcos 3-6 meses (linear)
  ├─ 2.5 Rotina do bebê de 3-4 meses (linear)
  ├─ 2.6 Sono do bebê 3-6 meses (linear)
  ├─ 2.7 Fase oral, rolar e brincadeiras (linear)
  ├─ 2.8 Linguagem: do balbucio às primeiras sílabas (linear)
  └─ Vamos revisar? (flashcards)

Módulo 3: 6 a 9 meses (part)
  ├─ 3.1 Introdução alimentar (linear)
  ├─ 3.2 BLW vs. papinha (linear)
  ├─ 3.3 Alimentos alergênicos (linear)
  ├─ 3.4 Cardápio 6-9 meses (linear)
  ├─ 3.5 Bebê que não quer comer (linear)
  ├─ 3.6 Água: quando e quanto (linear)
  ├─ 3.7 Desenvolvimento motor 6-9 meses (linear)
  ├─ 3.8 Regressão do sono 8-9 meses (linear)
  ├─ 3.9 Segurança em casa (checklist) ← dinâmico
  └─ Vamos revisar? (flashcards)

Módulo 4: 9 a 12 meses (part)
  ├─ 4.1 Primeiros passos (linear)
  ├─ 4.2 Primeiras palavras (linear)
  ├─ 4.3 Alimentação 9-12 meses (linear)
  ├─ 4.4 Sono 9-12 meses e regressão de 12 meses (linear)
  ├─ 4.5 Vacinas do 1º ano (linear)
  ├─ 4.6 Consulta de 1 ano (linear)
  ├─ 4.7 Doenças comuns do 1º ano (linear)
  ├─ 4.8 O que celebrar além da festa (linear)
  └─ Vamos revisar? (flashcards)

Conclusão (linear — flags: hide_completion_btn + show_nps + show_yaya_cta)
  └─ Tool links: quiz + checklist de marcos (linear)

Bônus: Quiz — em que fase está o seu bebê? (quiz)
Bônus: Checklist de marcos 0-12 meses (checklist) ← dinâmico
Bônus: Tabela de janelas de sono (linear) ← estático
Bônus: Calendário de vacinas (checklist) ← dinâmico
Bônus: Guia rápido de IA por mês (linear) ← estático
```

---

## 3. Callouts disponíveis (sintaxe do markdown)

```
:::ciencia
Dado científico com fonte inline. Ex: (OMS, 2023)
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
- Path: `primeiro-ano/img/hero-modulo-N.webp`
- Gerado no Gemini com prompt específico (ver seção de prompts)

**Imagens de quebra dentro de seções lineares:**
- Proporção: 16:9 ou 3:2
- Path: `primeiro-ano/img/secao-[slug].webp`
- Inseridas no markdown como `![alt](URL)`
- Máximo 200KB após conversão WebP

**Frequência:** 1 imagem de quebra a cada 400-600 palavras de texto corrido

**Paleta obrigatória:** roxo `#7056e0`, lilás `#e8e1ff`, tons neutros quentes. Nunca coral/laranja.  
**Estilo:** fotos realistas, famílias diversas, luz natural, ambiente doméstico acolhedor. Sem banco de imagens genérico.

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

**Regras:**
- Perguntas no estilo "o que", "quando", "por que", "qual a diferença"
- Respostas factuais, sem romantismo
- Cobrir os pontos mais importantes de cada seção do módulo
- Mínimo 6, máximo 10 cards por módulo

---

## 6. Padrão de checklists dinâmicos

**Checklist de segurança da casa (seção 3.9):**
```json
{
  "checklist_items": [
    {"id": "seg-01", "text": "Tomadas com protetor", "category": "Elétrica"},
    ...
  ]
}
```

**Checklist de marcos 0-12 meses (bônus):**
```json
{
  "checklist_items": [
    {"id": "marco-01-01", "text": "Sustenta a cabeça por breves momentos", "category": "1 mês"},
    ...
  ]
}
```

**Calendário de vacinas (bônus):**
```json
{
  "checklist_items": [
    {"id": "vac-rn", "text": "BCG + Hepatite B (ao nascer)", "category": "Recém-nascido"},
    ...
  ]
}
```

---

## 7. Quiz — "Em que fase está o seu bebê?"

```json
{
  "questions": [
    {
      "question": "Quantas semanas ou meses tem o seu bebê?",
      "options": [
        {"text": "0 a 3 meses", "profile": "modulo1"},
        {"text": "3 a 6 meses", "profile": "modulo2"},
        {"text": "6 a 9 meses", "profile": "modulo3"},
        {"text": "9 a 12 meses", "profile": "modulo4"}
      ]
    }
  ],
  "profiles": [
    {"id": "modulo1", "title": "Fase da sobrevivência", "description": "...", "icon": "🌱"},
    {"id": "modulo2", "title": "Fase do despertar", "description": "...", "icon": "✨"},
    {"id": "modulo3", "title": "Fase da exploração", "description": "...", "icon": "🌍"},
    {"id": "modulo4", "title": "Fase da conquista", "description": "...", "icon": "🏆"}
  ]
}
```

---

## 8. Regras editoriais obrigatórias

- Sem em-dash (—) em nenhum texto — usar vírgula, ponto e vírgula ou parênteses
- Sem "mamada" — usar "amamentação", "oferta do leite" ou "oferta do seio"
- Sem title case nos títulos — sentence case sempre (exceto nomes próprios e siglas)
- Sem "todo bebê é diferente" como não-resposta — sempre seguir de orientação prática
- Sem "aproveite cada segundo, passa tão rápido"
- Fontes citadas inline: (OMS, 2023), (SBP, 2024), (AAP, 2022)
- Linguagem inclusiva: "pais", "você e seu parceiro/a", não só "mãe"
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
- [ ] Imagens: sem broken links, WebP, max 200KB heroes
- [ ] Stripe price_id preenchido no `guides` table
- [ ] `published = false` até aprovação final
