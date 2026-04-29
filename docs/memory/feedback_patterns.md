# Padrões e armadilhas descobertos nesta sessão (2026-04-16)

## AdMob
- **NUNCA** montar AdBanner em cada página — montar uma vez só no AppShell. Ciclos rápidos de show/hide quando navega crasha o plugin.
- `lib/admob.ts` agora serializa via `bannerVisible` flag + `bannerCall` promise.
- Margin default do banner no BOTTOM_CENTER: usar **80dp**, não 56dp (5rem do bottom nav).
- Rewarded ad no web é simulado (1.5s timeout) — cuidado ao testar flows.

## PointerEvents > Touch + Mouse
No mobile, um tap físico dispara **ambos** touchend e mouseup (emulação). Ao registrar os dois handlers, o mesmo tap é contado como double-tap.
**Fix:** usar `onPointerDown`/`onPointerUp`/`onPointerCancel` (unifica os dois). Fizemos isso no BottomNav (gesture de perfil).

## useSheetBackClose — race ao aninhar sheets
O hook usa `history.pushState` + `popstate` + `history.back()` no cleanup. Se o parent sheet tenta controlar `isOpen` dinamicamente (true→false) ao abrir um nested sheet, o `history.back()` do cleanup dispara `popstate` que é capturado pelo listener do nested recém-montado → fecha tudo (a "tremida" visível).
**Fix:** manter `useSheetBackClose(true, ...)` sempre enquanto o sheet está montado. Nested sheets empilham entradas próprias.

## RLS silencioso em UPDATE/DELETE
Policies com `WITH CHECK` restritivas podem bloquear silenciosamente — `.update()` retorna `{ error: null }` mas 0 linhas afetadas. **Sempre** encadear `.select('id')` após mutações e checar `data && data.length > 0`. Documentado no CLAUDE.md.

Exemplo real: policy `Parents can update member roles` só aceitava role IN (parent, caregiver). Promover a guardian falhava silenciosamente até a gente corrigir policy + adicionar `.select()`.

## Auto-register de marcos/vacinas
Ao criar um bebê com idade > 0, marcar automaticamente itens passados:
- Marcos: tudo com `typicalAgeDaysMax < (ageDays - 10)` (buffer de 10 dias)
- Vacinas: APENAS PNI (`isMandatory`) com `recommendedAgeDays <= ageDays`
- Usar `applied_at = null` / `achieved_at = null` com `auto_registered = true`
- Upsert com `onConflict: 'baby_id,milestone_id'` + `ignoreDuplicates: true`

## Checkbox UX unificado (marcos + vacinas)
- Tap no checkbox: **toggle simples sem modal**
  - Não registrado → marca como auto_registered (sem data)
  - Registrado → deleta
- Tap na linha inteira: abre modal/detail pra editar com data/foto/nota

## CSS Variables > Classes `dark:`
Tailwind v4 com `@theme` bridge automaticamente para utils. Light mode = redefinir variables em `html.theme-light`. NÃO adicionar `darkMode: 'class'` (teria que prefixar 1.082 lugares).

## Realtime Supabase em DELETE
Para filtrar DELETE por `user_id` (ou qualquer coluna não-PK), precisa `ALTER TABLE x REPLICA IDENTITY FULL`. Default é só PK no payload.

## Capacitor Camera
- `@capacitor/camera` necessário pra câmera nativa funcionar no Android (só `<input capture="environment">` não basta — precisa do permission CAMERA no AndroidManifest)
- Web fallback: `<input type="file" accept="image/*" capture>`
- Permissions adicionadas: `CAMERA`, `READ_MEDIA_IMAGES`, feature `camera` (required=false)

## localStorage keys do projeto (inventário)
- `yaya_active_baby` — bebê ativo
- `yaya_theme`, `yaya_adaptive_theme`, `yaya_theme_before_night`, `yaya_night_applied` — tema
- `yaya_vaccines_unlock_${babyId}` — timestamp de unlock temporário de vacinas
- `yaya_milestones_welcome_seen_${babyId}` — banner de welcome marcos
- `yaya_vaccines_welcome_seen_${babyId}` — modal de welcome vacinas
- `yaya_milestones_banner_dismissed_${babyId}` — legacy (agora é modal, key existe mas não é mais escrita)
- `yaya_ad_${key}_${YYYY-MM-DD}` — controle de interstitial skippable uma vez por dia
- `milestone_dismissed_${code}` — 14 days TTL (chip da home dismissed)

## Pontos de entrada do BabySwitcher
1. Tap no nome/foto do bebê na home (HeroIdentity)
2. Chevron `expand_more` ao lado do nome (só com 2+ bebês)
3. Long press 600ms no ícone Perfil da bottom nav
4. (Dentro do perfil) botão "Trocar bebê"

Double tap no ícone Perfil (2+ bebês) NÃO abre o sheet — troca direto pro próximo bebê da lista circular.

## useSheetBackClose — race ao abrir sheet dentro do onClose de outro sheet
Quando Sheet A fecha e `onClose` abre Sheet B, o `history.back()` do cleanup de A dispara
um `popstate` que o listener recém-registrado de B captura → B fecha instantaneamente.
**Fix:** em vez de chamar `onOpenB()` diretamente dentro do `onClose`, usar:
```tsx
onClose(); // fecha A
setTimeout(() => onOpenB(), 100); // espera 100ms pra drenar o popstate
```
Padrão aplicado em `RewardedAdModal.tsx` botão "Assinar Yaya+".
**Regra geral:** todo botão que fecha um sheet E abre outro deve usar o `setTimeout(100)`.

## AdMob iOS — estado de revisão
- Ads reais no iOS ficam bloqueados ("Requer revisão") até o app estar publicado na App Store
  OU até submeter o app para review manual no AdMob Console
- Test ads mode (localStorage `yaya_test_ads=1`) funciona independente do status de revisão
- `showBanner()` retorna `Promise<boolean>` — só aplica `--yaya-ad-offset` se retornar `true`
- ATT: chamar `requestTrackingAuthorization()` antes de `AdMob.initialize()` no iOS;
  pra ler o status depois, chamar `trackingAuthorizationStatus()` separado (não captura `.status`
  do retorno de `requestTrackingAuthorization` — ele retorna `Promise<void>`)

## RevenueCat iOS — armadilhas
- Se o diagnostic mostrar `key: VITE_REV...`, a variável de ambiente tem o NOME como valor
  (bug de configuração no Codemagic). Re-entrar a chave no painel do Codemagic.
- Offerings vazios mesmo com produtos configurados no RC? Checar se Paid Apps Agreement
  no App Store Connect está **Active**. Sem isso, ASC não serve produtos pro StoreKit/RC.
- `PurchaseContext`: NÃO colocar early return antes de `initializePurchases()` +
  `initAdMob()`. Test account override deve vir DEPOIS que os SDKs inicializam.

## Debug Panel (easter egg)
- 7 taps no título "Configurações" revela painel de debug
- Toggle `yaya_test_ads` localStorage força test ads (banner Google "Test Ad" com fill 100%)
- Botão "Testar RevenueCat" mostra `OfferingsDiagnostic` completo
- Seguro para builds de submission (Apple reviewer dificilmente descobre o easter egg)

## localStorage keys — adições (2026-04-22)
- `yaya_test_ads` — quando `'1'`, usa Google test ad IDs (banner aparece mesmo pra premium)

## SharedReportPage — fetch com headers Supabase
Ao fazer fetch direto pra uma Edge Function ou endpoint Supabase fora do SDK,
incluir obrigatoriamente:
```ts
headers: {
  'apikey': supabaseAnonKey,
  'Authorization': `Bearer ${supabaseAnonKey}`,
  'Content-Type': 'application/json',
}
```
Sem esses headers, o gateway retorna 401 com corpo HTML/texto, não JSON.
`res.json()` joga SyntaxError → é caught como "Erro de conexão".
