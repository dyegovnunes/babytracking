# Prompt de Rebranding — BebêLog → Yaya

> **Instrução para Claude Code:** Leia este arquivo inteiro antes de começar qualquer alteração. Execute tudo na ordem indicada.

---

## Contexto

O app está sendo rebrandado de "BebêLog" / "BabyTracking" para **Yaya**.

- **Nome do app:** Yaya
- **Tagline:** Cada momento conta.
- **Domínio:** yayababy.app
- **Plano premium:** Yaya+
- **Design system:** Nocturnal Sanctuary (mantido — apenas o nome muda)

---

## Assets de logo disponíveis

Os arquivos já estão na pasta `Logo/` do projeto:

| Arquivo | Uso |
|---------|-----|
| `Logo/iconeyaya 2.png` | Ícone do app — fundo escuro (#0d0a27), símbolo em lilás com glow |
| `Logo/simboloyaya2.png` | Símbolo isolado — para uso em fundo claro, sem fundo |

A partir do `iconeyaya 2.png`, gere as seguintes variantes e salve em `app/public/`:

| Arquivo de destino | Tamanho | Uso |
|-------------------|---------|-----|
| `app/public/icon-1024.png` | 1024×1024 | App Store / Play Store |
| `app/public/icon-512.png` | 512×512 | PWA |
| `app/public/icon-192.png` | 192×192 | PWA manifest |
| `app/public/apple-touch-icon.png` | 180×180 | iOS home screen |
| `app/public/favicon.ico` | 32×32 | Browser tab |

---

## Alterações necessárias

### 1. `app/package.json`
```json
"name": "yaya",
"description": "Yaya — Baby Tracker. Cada momento conta."
```

### 2. `app/index.html`
- `<title>` → `Yaya — Baby Tracker`
- `<meta name="description">` → `Acompanhe a rotina do seu bebê com calma e clareza.`
- `<meta name="apple-mobile-web-app-title">` → `Yaya`
- `<meta property="og:title">` → `Yaya — Baby Tracker`
- `<meta property="og:site_name">` → `Yaya`
- Atualizar referências de ícone para os novos arquivos gerados

### 3. Manifest PWA (`manifest.json` ou `vite.config.ts`)
```json
"name": "Yaya — Baby Tracker",
"short_name": "Yaya",
"description": "Cada momento conta.",
"theme_color": "#0d0a27",
"background_color": "#0d0a27"
```
Atualizar os caminhos dos ícones para os novos arquivos.

### 4. Buscar e substituir strings no código-fonte

Buscar em todos os arquivos `.tsx`, `.ts`, `.html`, `.json`, `.css`:

| Buscar | Substituir por |
|--------|---------------|
| `BebêLog` | `Yaya` |
| `Bebelog` | `Yaya` |
| `BabyTracking` | `Yaya` |
| `Baby Tracking` | `Yaya` |
| `Ninar` | `Yaya` |
| `ninar` | `yaya` |
| `NINAR` | `YAYA` |
| `Ninar+` | `Yaya+` |
| `ninar+` | `yaya+` |

> Atenção: respeitar capitalização conforme o contexto. O nome de marca é "Yaya" (capitalizado) em código e textos gerais; o display visual pode usar "yaya" em minúsculo conforme o design system.

### 5. Telas com branding visível

Verificar e atualizar texto exibido nas seguintes telas:

- **`LoginPage.tsx`** — nome do app na tela de entrada, tagline se houver
- **`OnboardingPage.tsx`** — qualquer menção ao nome do app
- **Loading/Splash** — texto de carregamento inicial
- **Cabeçalhos e rodapés** com nome hardcoded

### 6. Variáveis de ambiente

Verificar se existe `.env` ou `.env.local` com `VITE_APP_NAME` ou similar.
Se existir, atualizar para `"Yaya"`.

---

## Paleta de cores (tokens do design system — confirmar que estão corretos)

```
Surface/Background: #0d0a27  (Yaya Night)
Primary:            #b79fff  (Yaya Purple)
Primary Container:  #ab8ffe  (Yaya Glow)
Accent:             #ff96b9  (Yaya Blush)
On Surface (texto): #e7e2ff  (Yaya Cloud)
```

---

## Resultado esperado após o rebranding

- [ ] Aba do browser mostra "Yaya — Baby Tracker"
- [ ] Tela de login/splash exibe o nome "Yaya" e tagline "Cada momento conta."
- [ ] Ícone do PWA é o novo ícone (nas variantes corretas em `app/public/`)
- [ ] Zero referências ao nome anterior ("BebêLog", "Ninar", "BabyTracking") em qualquer tela ou metadado
- [ ] Plano premium referenciado como "Yaya+" em todo o app

---

## Como acionar no Claude Code

```
Leia o arquivo PROMPT_REBRANDING.md na raiz do projeto e execute
todas as alterações descritas nele. Os arquivos de logo estão na
pasta Logo/.
```
