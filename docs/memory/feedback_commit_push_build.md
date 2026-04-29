---
name: Commit + push + build ao finalizar tarefas
description: Ao concluir um conjunto de mudanças (ou quando o usuário pede), faça commit, push e, se aplicável, dispare o build/release. Não pare em "só editei os arquivos".
type: feedback
originSessionId: 6daaab0b-7b2b-4afe-af99-66af14792c15
---
Quando o trabalho em uma rodada de mudanças estiver finalizado (bugfixes/feature prontos e typecheck passando), **execute até o fim**:

1. `git add` (arquivos específicos — nunca `-A`/`.`)
2. `git commit` com mensagem descritiva no estilo do repo (`feat:` / `fix:` / `ci:`)
3. `git push origin main`
4. Se for release iOS: o usuário dispara o build pelo Codemagic (ele prefere fazer direto pela plataforma). Se for Android: gere o AAB via `./gradlew bundleRelease` e copie pra `build/yaya-<versao>-build<N>.aab`.

**Why:** o usuário reclamou (2026-04-20) que eu estava parando em "commit criado" sem pushar. Ele precisa do ciclo completo pra conseguir disparar o build. Ficar esperando "permissão" pra cada etapa atrasa horas.

**How to apply:** ao terminar um grupo de mudanças relacionadas, faça commit + push sem pedir confirmação. A única exceção é se o commit for em branch `main` de repo compartilhado com mudanças arriscadas (rebase/force push). Para push normal pra `main` do babytracking, é esperado.

**Bônus:** SEMPRE rode `npm run build` (ou `tsc -b && vite build`) antes do push — não só `tsc --noEmit`. O Codemagic roda o build completo, e o `tsc -b` (buildable project refs) às vezes pega erros que o `--noEmit` não pega, especialmente quando há arquivos stale fora do commit mas referenciados por imports.
