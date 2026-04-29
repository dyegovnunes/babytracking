---
name: Layout de paginas sob AppShell e elementos fixed no bottom
description: Regras pra evitar input fixo invisivel atras da BottomNav e viewport aninhado
type: feedback
originSessionId: c58fd3b0-37de-46a2-84ac-b1ab74961354
---
Regras ao criar uma pagina nova em `features/<nome>/` renderizada dentro de `<Route element={<AppShell />}>`:

1. **Nao usar `h-[100dvh]` ou `h-dvh` no wrapper da pagina.** O AppShell ja controla o viewport com `h-dvh` no container e `<main>` scrollavel. Um segundo viewport cheio cria nested scroll containers e quebra Header sticky + BottomNav.

2. **Nao criar wrapper `flex-1 overflow-y-auto` interno.** Deixa o `<main>` do AppShell ser o scroll container unico. Sticky headers funcionam normalmente dentro dele.

3. **Elementos fixed no bottom da viewport (chat input, FAB baseado em rodape, sheet bottom-anchored) precisam offset da BottomNav:**
   ```
   bottom: calc(4rem + env(safe-area-inset-bottom) + var(--yaya-ad-offset, 0px))
   ```
   - `4rem` = altura da BottomNav (`h-16`)
   - `env(safe-area-inset-bottom)` = home indicator iOS / gesture bar Android
   - `--yaya-ad-offset` = altura do AdBanner quando visivel pra free users (setado pelo AdBanner component)
   
   Conteudo da pagina (scroll area) precisa ganhar `paddingBottom` equivalente pra nao ficar coberto pelo elemento fixed.

4. **Sheet modais que abrem "de baixo pra cima" (`items-end`) precisam:**
   - `useSheetBackClose(isOpen, onClose)` obrigatorio (CLAUDE.md ja registra)
   - Padding inferior extra alem do `pb-safe`, pra nao colar no home indicator: `pb-[calc(env(safe-area-inset-bottom)+1rem)]`

5. **Auto-scroll em listas dentro de AppShell main**: scrollar o proprio `<main>` (`document.querySelector('main')?.scrollTo(...)`) em vez de um ref interno, porque o scroll container e o main, nao a pagina.

**Why:** Bug descoberto na yaIA (2026-04-23): ChatInput fixo em `bottom: 0` ficou atras da BottomNav (usuario nao conseguia escrever), e o `h-[100dvh]` no wrapper da pagina criou nested scroll que atrapalhou o layout. Demorou uma ida e volta pra descobrir.

**How to apply:** Ao criar qualquer pagina nova sob AppShell, validar esses 5 pontos antes de entregar. Quando terminar, testar no dev server: abrir a pagina, rolar ate o fim, verificar que nenhum rodape fica atras da BottomNav e que o gesture bar do celular nao corta conteudo.
