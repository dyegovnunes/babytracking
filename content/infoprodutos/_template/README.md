# Pasta-modelo de guias da Sua Biblioteca Yaya

Esta pasta é o ponto de partida pra criar qualquer guia novo da biblioteca.
**Não edite nem deslogue daqui** — apenas copie pra criar um guia novo.

## Como criar um guia novo

```bash
# 1. Copie a pasta inteira
cp -r content/infoprodutos/_template content/infoprodutos/<slug-do-guia>

# 2. Renomeie o markdown principal
mv content/infoprodutos/<slug-do-guia>/guia-template.md \
   content/infoprodutos/<slug-do-guia>/<slug-do-guia>.md

# 3. Apague o README copiado (ele só faz sentido aqui)
rm content/infoprodutos/<slug-do-guia>/README.md
```

Depois abra `<slug-do-guia>.md` e siga o formato do template.

## O que esta pasta contém

```
_template/
├── README.md           ← este arquivo (não copiar)
├── guia-template.md    ← esqueleto comentado de um guia
└── imagens/            ← ponha aqui PNGs/JPGs (vão pra WebP no upload)
```

## Manual completo

Para entender o formato self-describing, callouts, convenção de imagens
e regras editoriais, leia:

📖 **`docs/biblioteca/MANUAL_DE_ESTILO.md`**

## Como rodar o seed

Após preencher o `<slug-do-guia>.md` e adicionar as imagens, rode:

```bash
cd blog
npx tsx ../scripts/seed-guide.ts <slug-do-guia>
```

O script vai:
1. Subir as imagens pro bucket `guide-images` (convertendo pra WebP)
2. Fazer parse do markdown self-describing
3. Validar (slugs únicos, parents existem, JSONs válidos)
4. Apagar conteúdo antigo do guide e inserir o novo (idempotente)

Pré-requisito: o registro do guide já precisa existir na tabela `guides`:

```sql
INSERT INTO guides (slug, title, price_cents, status)
VALUES ('<slug-do-guia>', 'Título do guia', 4700, 'draft');
```
