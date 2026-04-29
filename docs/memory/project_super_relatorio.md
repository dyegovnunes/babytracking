# Super Relatório — revisão 2026-04-20

## Decisão de produto
**Não existe mais "relatório PDF".** A única forma de ter PDF é `window.print()` na página web compartilhada. O arquivo `app/src/lib/generatePDF.ts` (1098 linhas, jsPDF) é legado e NÃO faz mais parte do produto — candidato a deleção numa task futura.

## Arquitetura atual
- **Página**: `app/src/pages/SharedReportPage.tsx` — aberta em `/r/:token` com senha.
- **Edge function**: `supabase/functions/report-view/index.ts` — valida senha, aplica rate limit, retorna dados do bebê (incluindo vacinas/marcos/saltos/medicamentos).
- **CRUD de links**: `app/src/features/profile/sharedReports.ts` + UI em `SharedReports.tsx`.
- **Tabela**: `shared_reports` — evoluída nesta rodada com `audience`, `access_count`, `last_accessed_at`, `failed_attempts`, `locked_until`, `password_algo`.

## Decisões desta rodada
- **Audience** (público-alvo do link): `pediatrician` | `caregiver` | `family`. Escolhido na criação, imutável. Muda seções renderizadas e CTA. Default `pediatrician` preserva compat.
  - Pediatra: KPIs com semáforo OMS, gráficos diários, vacinas, marcos, saltos, medicamentos, padrões.
  - Cuidadora: bloco "Agora" (última fralda/mamada/sono), marcos, saltos, medicamentos (sem gráficos, sem OMS).
  - Família: só crescimento simplificado + marcos (foco emocional).
- **QuietHours** persiste agora em `babies.quiet_hours_start/end` (migration `20260420a`). Fonte única pro relatório — o `useNotificationPrefs` escreve em `notification_prefs` (pushs) E em `babies` (relatório) em paralelo.
- **OMS por gênero**: já existia em `app/src/lib/omsData.ts` (WEIGHT_BOYS/GIRLS até 24m) — agora é consumido pelo relatório via prop `gender`.
- **Segurança**:
  - Bcrypt substitui SHA-256. Links antigos (sha256) são migrados transparentemente no primeiro acesso bem-sucedido (`password_algo: 'sha256' → 'bcrypt'`).
  - Rate limit: 5 falhas consecutivas → `locked_until` por 15 min. Erro sempre genérico "Senha incorreta" pra não vazar estado.
  - Log de acesso: `access_count` + `last_accessed_at` mostrados no card ("3 acessos · último há 2h"). Sem IP, sem device.
- **UX polimento**: `VITE_SUPABASE_URL` via env (antes hardcoded L3), filtros de período escondem opções sem dado (antes cinza/disabled), default filter inteligente (`30d → 15d → 7d → today → all`), curva OMS até 24 meses (antes 12).

## Fora do escopo (revisitar depois)
- **Bidirecional** (anotações do pediatra) — descartado até decisão sobre plataforma do pediatra.
- **Push de acesso** (pai ser notificado quando pediatra abre o link) — descartado pra não banalizar pushs. Revisão geral de pushs é outra task.
- **Deletar `generatePDF.ts`** — fazer numa task à parte após grep confirmar que nada chama.

## Migrations desta rodada
- `20260420a_baby_quiet_hours.sql` — colunas em `babies`.
- `20260420b_shared_reports_audience.sql` — coluna `audience`.
- `20260420c_shared_reports_security.sql` — colunas de log/lockout/algo.
Rodar em ordem com `supabase db push`. Deploy da edge function com `supabase functions deploy report-view`.

## Verificação end-to-end
1. `npm run build` e `npx tsc --noEmit` passam.
2. Criar 3 links (um de cada audience). Abrir cada um → renderização distinta, CTA correto.
3. Link antigo (SHA-256) → primeiro acesso com senha correta funciona e `password_algo` vira `'bcrypt'` no DB.
4. Errar senha 5× → "Senha incorreta" persistente por 15min mesmo com senha certa.
5. Card do link mostra contador subindo a cada acesso.
6. Menino vs menina → curva OMS diferente.
7. Quiet hours alterado no app (ex: 23h–6h) → recarregar link → noturno/diurno usa 23–6.
