# Como validar um guia antes de subir

> Guia rápido pro time editorial — 5 minutos pra checar se o guia
> está pronto antes de pedir pra subir no ar.

---

## O que o validador faz

Lê o arquivo `.md` do guia e procura problemas que **quebrariam a
experiência do leitor**, como:

- Travessões `—` na copy (regra de marca Yaya)
- Imagens referenciadas que não existem na pasta
- Callouts inventados (só são válidos: `:::ciencia`, `:::mito`,
  `:::alerta`, `:::yaya`, `:::disclaimer`)
- Conclusão fora do lugar
- Tom de voz fora do padrão Yaya
- Quiz, checklist ou flashcards mal formados

Se o validador encontrar **erros**, o seed (subida) fica bloqueado até
você consertar. Se encontrar **avisos**, ele passa, mas você decide
se vale revisar ou não.

---

## Como rodar (3 passos)

### 1. Abra o terminal na pasta do projeto

No VS Code/Cursor: `Terminal → New Terminal`. Você cai na raiz do repo.

### 2. Entre na pasta `blog`

```bash
cd blog
```

### 3. Rode o validador

```bash
npm run validate <slug-do-guia>
```

Exemplo, pro Guia das Últimas Semanas:

```bash
npm run validate ultimas-semanas
```

---

## O que você vai ver

### ✅ Tudo certo

```
✅ Nenhum problema encontrado. Pronto pra subir.
✅ Validação OK. Pode rodar o seed.
```

Pode pedir pro dev rodar o seed (ou rodar você mesmo se tiver acesso).

### ❌ Tem erros

```
❌ ERROS (3)
   • Travessão (—) encontrado no conteúdo. [no-em-dash]
     [seção: 11-enxoval]
   • Imagem `imagens/foo.jpg` não existe. [img-not-found]
     [seção: conclusao]
   • Callout `:::dica` não é canônico. [callout-invalid]
     [seção: 21-sinais-de-trabalho-de-parto]
```

Conserte um por um e rode o validador de novo até dar `✅`.

A indicação `[seção: ...]` te diz **onde** procurar no MD (use
Ctrl+F com o slug pra encontrar rápido).

A tag entre colchetes (ex: `[no-em-dash]`) é o nome da regra. Se
não entender, procure no manual de estilo (`MANUAL_DE_ESTILO.md`).

### ⚠️ Tem avisos

```
⚠️ AVISOS (2)
   • Parte 'introducao' sem cover_image_url. [part-no-cover]
   • Nenhum :::disclaimer no guia. [no-disclaimer]
```

Não bloqueia, mas vale considerar. Avisos típicos:

- **Parts sem capa**: ainda não criou as imagens 21:9. Tudo bem, dá
  pra subir e adicionar depois.
- **Sem disclaimer**: guia sem aviso médico-legal. Recomendado
  adicionar pelo menos 1 `:::disclaimer` em alguma seção sensível.
- **Sem is_preview**: a landing pública não terá amostra grátis.

---

## Erros mais comuns e como consertar

### Travessão (`—`)

**Errado:**

```markdown
A regra é simples — leite na primeira hora.
```

**Certo (qualquer um):**

```markdown
A regra é simples: leite na primeira hora.
A regra é simples - leite na primeira hora.
A regra é simples, leite na primeira hora.
```

### Imagem não encontrada

Verifique:

1. O arquivo existe em `content/infoprodutos/<slug>/imagens/`?
2. O nome bate **exatamente** (sem maiúscula/minúscula trocada)?
3. O path no markdown é `imagens/nome.jpg` (não `./imagens/...` nem
   `/imagens/...`)?

### Callout não canônico

Só esses 5 funcionam: `:::ciencia`, `:::mito`, `:::alerta`,
`:::yaya`, `:::disclaimer`. Não invente novos.

### Conclusão fora do lugar

A Conclusão precisa ser a **última** seção raiz do guia, com:

```markdown
**type:** `linear`
**slug:** `conclusao`
**parent:** `null`
**category:** `narrative`
```

E ela deve aparecer **depois de todas as Partes** no MD, antes dos
materiais complementares (quiz, checklist, flashcards).

### Tom Yaya fora do padrão

O validador reclama de:

- "Mamãezinha", "minha mãe", "amada", "querida" — vocativos
  sentimentais. Use "você" ou "a mãe".
- "Você é incrível", "você é a melhor" — afirmações grandiosas.
  Yaya é informativo, não puxa-saco.
- Excesso de pontos de exclamação. Tom Yaya é firme, não eufórico.

---

## Fluxo completo (você + dev)

1. **Você (cowork):** edita o `.md` em `content/infoprodutos/<slug>/`
2. **Você:** roda `npm run validate <slug>` no terminal
3. **Você:** se der erro, conserta e re-valida até passar
4. **Você:** commita e dá push (ou abre PR)
5. **Dev:** roda `npm run seed:guide <slug>` pra subir as mudanças
   pro DB. O seed roda o validador antes — se o MD está OK, sobe.

---

## Comandos completos (cheatsheet)

```bash
# Validar um guia
cd blog
npm run validate ultimas-semanas

# Subir o guia pro DB (roda validate primeiro)
npm run seed:guide ultimas-semanas

# Subir gerando áudio TTS junto (cuidado, custa $)
GENERATE_AUDIO=1 npm run seed:guide ultimas-semanas

# Subir ignorando validação (emergência apenas)
npm run seed:guide ultimas-semanas -- --skip-validation
```

---

## Não consigo rodar o terminal / não tenho Node

Sem stress. Edite o `.md` e dá push do mesmo jeito. O dev vai rodar o
validador no lado dele e te avisar se tem alguma coisa pra arrumar.

(Numa próxima fase a gente liga uma checagem automática no GitHub que
roda em cada PR e comenta os problemas direto.)
