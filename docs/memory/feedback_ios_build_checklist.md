---
name: Checklist pré-push iOS — evitar ciclo de debug no Codemagic
description: Build do Codemagic custa ~30min por tentativa. Rode o build completo local + verifique imports/types cross-file ANTES de pushar, pra não queimar ciclos.
type: feedback
originSessionId: 6daaab0b-7b2b-4afe-af99-66af14792c15
---
Codemagic roda `npm run build` (= `tsc -b && vite build`). Se quebrar ali, o workflow aborta em ~2min mas você acabou de gastar 4min de pipeline + o tempo de esperar. Pilhar tentativas custa horas.

**Antes de qualquer `git push` que vá rodar no Codemagic:**

1. `cd app && npm run build` localmente — **não só `tsc --noEmit`**. O `tsc -b` (build mode com project references) pega erros diferentes, e o `vite build` valida imports dinâmicos.

2. **Se o git status mostra arquivos modificados que você NÃO vai commitar**, cheque se eles são referenciados por arquivos que você VAI commitar:
   - Ex: você edita `ComponentA.tsx` que importa de `shared.ts`. Se `shared.ts` também tem modificações pendentes (staged ou working tree) e você só commita `ComponentA.tsx`, o Codemagic vai puxar o `shared.ts` original (sem as mudanças) e quebrar.
   - Rode `git diff --name-only HEAD` e bata os paths contra os imports do que você está commitando.

3. **Erros típicos que vi em builds iOS do Yaya:**
   - `TS2305: Module has no exported member 'X'` → esqueceu de commitar o arquivo que exporta X.
   - `TS2339: Property 'X' does not exist on type` → schema/tipo atualizado num arquivo mas não em outro, ou migration não aplicada + tipos gerados stale.
   - `TS2554: Expected N arguments, but got M` → assinatura de função mudou e algum chamador não foi atualizado.
   - Plugin Capacitor tipos: `Property 'status' does not exist on type 'never'` → método retorna `Promise<void>`, não acesse `.status` diretamente. Chame o getter separado.

4. **Codemagic debug dicas:**
   - Log do RevenueCat: `[RC] platform=ios key prefix=appl_xxx` — confirma que a chave certa bakeou no build.
   - Log do AdMob: `[AdMob] ATT status=…` e `[AdMob] initialized platform=ios` — confirma init.
   - Se o build passa mas o app crasha no TestFlight, o problema raramente é de build — normalmente provisioning, Info.plist faltando permissão, ou RC key errada.

**Why:** em 2026-04-20 perdi uma submissão Apple porque commitei `SharedReports.tsx` (consumer) sem commitar `sharedReports.ts` (exporter). O `tsc --noEmit` local passou porque ambos estavam stale-corretos no working tree; o Codemagic puxou o commit HEAD que tinha só um dos dois e quebrou com `TS2305: no exported member 'ReportAudience'`.

**How to apply:** sempre cheque `git status` ANTES do push. Se houver arquivos `M ` (modificados não-commitados) que compartilham pastas com o que você commitou, provavelmente eles vão junto no próximo commit.
