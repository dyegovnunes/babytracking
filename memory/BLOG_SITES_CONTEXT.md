# Blog & Sites — Contexto Direcional

> Arquivo criado para dar contexto a sessoes futuras sobre blog, landing pages e ecossistema web do Yaya.
> Atualizar sempre que houver mudancas relevantes.

---

## Ecossistema de URLs

| URL | Stack | Vercel Project | Status |
|---|---|---|---|
| `yayababy.app` | React SPA (`app/`) | Vercel: `babytracking-h1nj` (root dir: `app/`) | Ativo |
| `blog.yayababy.app` | Astro SSG (`blog/`) | Projeto blog no Vercel | Ativo |
| `blog.yayababy.app/biblioteca-yaya` | Astro SSG | — | Catálogo de guias |
| `blog.yayababy.app/biblioteca-yaya/[slug]/ler` | SPA React (client:only) | — | Leitor de guias |
| `blog.yayababy.app/admin` | SPA React (client:only) | — | Admin do blog |

---

## Diretórios locais

```
BabyTracking/
├── blog/               # Blog Astro (blog.yayababy.app)
├── landing-app/        # Landing page de vendas do app (yayababy.app)
├── landing/            # LEGADO — static HTML antigo (waitlist). NAO usar.
└── app/                # App mobile React + Capacitor
```

**`landing/index.html`**: arquivo estático legado, era a página waitlist antiga.
**`landing-app/`**: substituiu o legado — landing completa com Pricing via Stripe.

---

## Blog — Decisoes tecnicas

### URL rename: `/sua-biblioteca` → `/biblioteca-yaya`
Feito em 2026-04-29. Redirects 301 configurados em `blog/vercel.json`.
Todos os links internos e `BlogLayout.astro` atualizados.

### Smart banner mobile em posts do blog
`blog/src/pages/[slug].astro` tem deteccao server-side de UA mobile.
Banner aparece em mobile com link para App Store (iOS) ou Play Store (Android).
Dismiss via localStorage key `yb_smart_banner_dismissed` por 7 dias.

### UTMs nos CTAs do header do blog
`blog/src/layouts/BlogLayout.astro`:
- "Baixar app" (desktop): `utm_medium=header`
- "Baixar app" (mobile menu): `utm_medium=mobile_menu`
- "Conheca o app" (nav): `utm_medium=nav`

---

## App (mobile) — feature content integrada

### `app/src/features/content/`
Criado em 2026-04-29. Sem migration de DB — usa `blog_posts` diretamente.

**Hook principal**: `useContentArticles(babyAgeWeeks, options?)`
- Query: `blog_posts` WHERE range inclui `babyAgeWeeks` AND `status='published'`
- Filtro: `audience != 'gestante'`
- Scoring de relevancia client-side: `score = |midpoint - age| + width * 0.1`
- Dismiss via localStorage `yb_content_dismissed: { [slug]: timestamp }` (7 dias)

**Componentes**:
- `ContentArticleCard` — card vertical com imagem 16:9, entre HighlightsStrip e RecentLogs na Home
- `ContentSection` — secao "Entenda esta fase" na InsightsPage

### HeroIdentity fix (2026-04-29)
Nome do bebe agora em linha propria (nao trunca). Idade em linha menor abaixo.

---

## landing-app — Estado atual

### Componentes existentes
```
src/
├── App.tsx              # Orchestrator + SuccessBanner (?plano_ativado=1)
└── components/
    ├── Nav.tsx          # Sticky nav (aparece apos 50% scroll)
    ├── Hero.tsx         # H1 + CTAs App Store / Play Store + PhoneMockup
    ├── TrustBar.tsx
    ├── Problem.tsx
    ├── Screenshots.tsx
    ├── Features.tsx
    ├── Pricing.tsx      # 3 planos Stripe: Mensal R$34.90, Anual R$249.90, Vitalicio R$449.90
    ├── FinalCTA.tsx
    └── Footer.tsx
```

### Links de loja no landing-app
- App Store: `https://apps.apple.com/app/yaya-baby` (URL generica — verificar com ID real)
- Play Store: `https://play.google.com/store/apps/details?id=app.yayababy` (correto)

### Pricing (Stripe) no landing-app
Chama edge function `stripe-create-subscription-session` (diferente da de guias).
Plans: `monthly`, `annual`, `lifetime`.
Anual e Vitalicio incluem `📚 + Biblioteca de Guias`.
Success redirect: `/?plano_ativado=1`.

### Env vars necessarias
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

---

## Guias (Biblioteca Yaya) — Estado atual

Stack no blog:
- `blog/src/pages/biblioteca-yaya/` — paginas Astro SSG
- `blog/src/sua-biblioteca/` — componentes React do leitor
- `blog/src/admin/pages/biblioteca/` — admin CRUD

Guia publicado: **"Guia das Ultimas Semanas"** (slug: `ultimas-semanas`)
- Stripe price: `price_1TQcxQ2ZxL6z9xaKdR0vjZvJ`
- Preco: R$47

### Acesso via Yaya+
`is_premium = true` desbloqueia todos os guias (sem compra avulsa necessaria).
Verificado em `blog/src/sua-biblioteca/lib/useGuideAccess.ts`.

---

## Metadata de posts para motor de relevancia

O cowork foi instruido a adicionar campos `tipo` e `gatilho` nos posts.
Prompt enviado para o cowork:

```
Para cada post no blog_posts, adicione dois campos novos:
- tipo: 'evergreen' | 'evento' | 'regressao' | 'fase'
- gatilho: null | 'retorno_trabalho' | 'introducao_alimentar' | 'crise_sono_4m' | etc.

Posts tipo 'evento' so devem aparecer ANTES do gatilho (ex: artigo sobre retorno ao trabalho
deve aparecer 2-3 semanas antes de o usuario retornar, nao depois).
Posts tipo 'regressao' so aparecem em contexto de regressao de sono detectada pelo app.
```

Status: cowork atualizou posts mas campos ainda nao foram localizados/aplicados no DB.
Verificar existencia de colunas `tipo` e `gatilho` em `blog_posts` antes de usar.

---

## Landing page do app (yayababy.app)

**REGRA: Quando o usuario falar em "landing page do app" ou "landing page do yayababy.app", estamos sempre falando de:**
- Pagina: `app/src/pages/LandingPage.tsx`
- Componentes: `app/src/components/landing/` (Hero, Features, Pricing, etc.)
- Vercel: projeto `babytracking-h1nj`, root dir `app/`
- Rotas do app (ex: `/login`, `/tracker`) continuam funcionando normalmente na mesma URL

A landing e uma rota `/` dentro do React Router da web app. NAO e um projeto separado.

Referencia de design: `lovable-waitlist/src/components/lp/` (projeto separado em `github.com/dyegovnunes/remix-of-yaya-waitlist-launch`). Os componentes Lp* sao a fonte de verdade visual.

---

## Ecossistema Vercel (estado 2026-04-29)

| Projeto Vercel | Root Dir | Dominio | Status |
|---|---|---|---|
| `babytracking-h1nj` | `app/` | `yayababy.app` | Ativo — web app + landing |
| `babytracking-blog` | `blog/` | `blog.yayababy.app` | Ativo — blog Astro |
| `babytracking` | `./` | nenhum | Desconectado do Git (nao desperdiça mais deploy slots) |
| `lovable-waitlist` | — | `lovable-waitlist.vercel.app` | Ativo — repo proprio |

---

## Regra de sessao

**Sempre que fizer algo relevante sobre blog/sites/landing, atualizar este arquivo.**
Path: `C:\Users\Dyego\Documents\Claude\Agencia de desenvolvimento\BabyTracking\memory\BLOG_SITES_CONTEXT.md`
