# Imagens — Post 51: Introdução Alimentar aos 6 Meses

Geradas via **Gemini API** (`gemini-3.1-flash-image-preview`) em 2026-04-24.

---

## img51-1.png — Hero (16:9)

**Uso:** Capa do post no blog e thumbnail de compartilhamento.  
**Tamanho:** ~646 KB  
**Destino no blog:** `hero.webp` (converter antes do deploy)

**Prompt usado:**
```
Generate a realistic lifestyle photograph.
A happy 6-month-old baby sitting upright with support in a high chair,
looking curiously at colorful pureed vegetables in a small white ceramic bowl.
A loving parent's hand gently offers a soft silicone spoon.
Warm natural daylight from a window. Blurred kitchen background.
Soft pastel purple and lavender color accents.
Clean, modern, warm aesthetic. Wide landscape format. No text. No watermarks.
```

---

## img51-2.png — Complementar (4:3)

**Uso:** Imagem de meio de artigo (mid image).  
**Tamanho:** ~766 KB  
**Destino no blog:** `mid.webp` (converter antes do deploy)

**Prompt usado:**
```
Generate a realistic top-down food photo.
A small ceramic baby plate with colorful pureed baby food: orange carrot, green zucchini, banana.
A lavender silicone spoon beside the plate. White wooden background. Soft natural light. No text.
```

---

## Notas de deploy

1. Converter ambas para `.webp` antes de subir ao blog.
2. Fazer upload para Supabase Storage no bucket `blog-images` no caminho:
   - `posts/introducao-alimentar-6-meses-guia-completo/hero.webp`
   - `posts/introducao-alimentar-6-meses-guia-completo/mid.webp`
3. Os campos `image_url` e `mid_image_url` no frontmatter já estão configurados com as URLs corretas.

---

## Modelo e API

- **Modelo:** `gemini-3.1-flash-image-preview`
- **Endpoint:** `POST /v1beta/models/gemini-3.1-flash-image-preview:generateContent`
- **generationConfig:** `responseModalities: ["IMAGE", "TEXT"]`
- **Chave:** armazenada em `content/gemini.txt`
