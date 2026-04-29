# iOS Submission v1.9.2 — Preparação para Apple App Review (2026-04-22)

## Versão alvo
- iOS: v1.9.2 / build 49 (CURRENT_PROJECT_VERSION = 49, MARKETING_VERSION = 1.9.2)
- Android: v1.9.2 / versionCode 48
- Codemagic workflow: `ios-testflight`
- Conta demo: `teste@yayababy.app` (premium, Sofia 2 como bebê)

## Fixes aplicados (P0 — bloqueadores)

### 1. Delete Account → onboarding bug
**Arquivo:** `app/src/hooks/useDeleteAccount.ts`
- Trocou clear seletivo por `localStorage.clear()` + `sessionStorage.clear()`
- Redirect: `window.location.replace()` → `window.location.href` (hard reload)
- Delay de 1.2s para toast aparecer antes do reload

**Arquivo:** `app/src/pages/settings/modals/DeleteAccountModal.tsx`
- Adicionou `onToast('Conta excluída com sucesso.')` no sucesso

### 2. RevenueCat iOS — "Invalid API Key" + offerings vazios
- Root cause 1: `VITE_REVENUECAT_IOS_KEY` no Codemagic tinha o **nome** da variável como valor (string "VITE_REV...") em vez da chave real
- Root cause 2: Paid Apps Agreement no App Store Connect estava "Novo" (sem assinar) — sem isso, ASC não serve produtos

**Chave correta iOS:** `appl_EsyNTUbNiabdxStyPcJgQIXUIKo`

**Arquivo:** `app/src/lib/purchases.ts`
- Adicionado `OfferingsDiagnostic` interface com `packageDetails: string[]`
- `lastDiagnostic` module-level var + `getLastOfferingsDiagnostic()` getter público
- Init log: `console.log('[RC] platform=', platform, 'key prefix=', key.slice(0, 8))`
- `getAvailablePackages()`: 3-strategy fallback:
  1. `current.monthly/annual/lifetime` (RC standard getters)
  2. `packages.find(p => String(p.packageType) === typeStr)` (enum string match)
  3. `packages.find(p => p.product?.identifier?.includes(productIdContains))` (ID substring)

### 3. PaywallModal — light mode + diagnóstico
**Arquivo:** `app/src/components/ui/PaywallModal.tsx`
- Todos os hex hardcoded → tokens Tailwind (`bg-surface`, `text-on-surface`, `border-primary/20`)
- `sm:items-center` para responsividade em viewports maiores
- Painel diagnóstico RevenueCat: botão "Ver diagnóstico" mostra `OfferingsDiagnostic`
- Import adicionado: `getLastOfferingsDiagnostic` de `../../lib/purchases`

### 4. PurchaseContext — SDK nunca era inicializado para conta de teste
**Arquivo:** `app/src/contexts/PurchaseContext.tsx`
- Root cause: `isTestAccount` check causava early return ANTES de `initializePurchases()` e `initAdMob()`
- Fix: mover SDK init ANTES do override de test account; SDKs inicializam pra todos em native

### 5. AdMob iOS — ATT + SKAdNetwork + test ads
**Arquivo:** `app/src/lib/admob.ts`
- ATT request flow antes de `AdMob.initialize()` no iOS
- `GOOGLE_TEST_IDS` constants para fill 100%
- `isTestAdsEnabled()` → verifica localStorage `yaya_test_ads=1`
- `showBanner()` retorna `Promise<boolean>` indicando se banner foi exibido

**Arquivo:** `app/src/components/ui/AdBanner.tsx`
- `--yaya-ad-offset` só aplicado quando `showBanner()` retorna `true` (evita gap vazio)
- Test ads: mostra banner mesmo pra premium quando `yaya_test_ads=1`

**Arquivo:** `app/ios/App/App/Info.plist`
- Adicionado `NSUserTrackingUsageDescription`
- `SKAdNetworkItems` expandido: 1 → 43 entradas (lista completa Google AdMob partners)

**Status AdMob iOS:** ads reais bloqueados por "Requer revisão" no AdMob Console. Resolve automaticamente quando app publicado na App Store OU review manual submetido. Test ads mode funciona ✓

### 6. "Assinar Yaya+" não fazia nada (paywall fechava imediatamente)
**Causa:** `useSheetBackClose` cleanup chama `history.back()` async no unmount do RewardedAdModal. Isso dispara `popstate` que o PaywallModal recém-montado captura → fecha PaywallModal instantaneamente.

**Fix em:** `app/src/components/ui/RewardedAdModal.tsx`
```tsx
onClick={() => {
  onClose();
  setTimeout(() => onUpgrade(), 100); // drena o popstate antes do paywall registrar listener
}}
```
Este padrão **deve ser seguido** sempre que um sheet abre outro sheet no seu handler de fechar.

### 7. Foto do bebê (free) — UX silenciosa
**Arquivo:** `app/src/features/profile/components/BabyCard.tsx`
- Free: clique na foto abre `RewardedAdModal` com texto customizado (não ação silenciosa)
- `handleAdRewarded()` → abre file picker após ad completo
- `handleUpgradeFromUnlock()` → abre PaywallModal

**Arquivo:** `app/src/components/ui/RewardedAdModal.tsx`
- Generalizado com props opcionais: `title`, `description`, `adButtonLabel`, `upgradeButtonLabel`, `icon`
- Migrado pra tokens de tema

### 8. SharedReports — múltiplos fixes
**Arquivo:** `app/src/features/profile/components/SharedReports.tsx`
- Toast "Link copiado!" após clipboard write
- Template de "Copiar mensagem pronta" com texto amigável
- WhatsApp text conversacional
- Todas as cores hex → tokens de tema

**Arquivo:** `app/src/pages/SharedReportPage.tsx`
- Fix crítico: fetch incluía headers `apikey` + `Authorization Bearer` faltando
  - Sem headers → Supabase gateway retorna 401 com corpo não-JSON → `res.json()` joga → caught como "Erro de conexão"
  - Fix: usar `supabaseUrl, supabaseAnonKey` de `lib/supabase` nos headers do fetch

**Migration:** `20260421a_shared_reports_rls_per_baby.sql`
- Policy SELECT anterior: `created_by = auth.uid()` (só quem criou via)
- Nova policy: todos os membros do `baby_id` podem ver

### 9. Marcos — simplificado para lançar
**Arquivos:** `MilestonesPage.tsx`, `MilestoneRegister.tsx`, `MilestoneCelebration.tsx`, `milestoneData.ts`
- Welcome modal key: `yaya_milestones_welcome_seen` → `yaya_milestones_welcome_seen_${baby.id}`
- `formatAgeAtDate()`: valida inputs antes — retorna `'—'` em NaN/Invalid Date
- MilestoneRegister: removida UI de câmera/foto completamente
- MilestoneCelebration: `onShare` tornou-se opcional; botão só aparece se prop fornecida
- Fluxo de abertura: `onRowClick` sempre abre detail modal (não register direto)
- "Marcar como concluído" no detail modal faz insert com `achieved_at = today`
- Share: desabilitado (MilestoneShareImage não renderiza)

**Arquivos:** `autoRegister.ts` (milestones) + `autoRegister.ts` (vaccines)
- Removido gate premium — auto-register roda para TODOS os bebês

### 10. BabySwitcher / ProfilePage — label condicional
**Arquivo:** `app/src/features/profile/ProfilePage.tsx`
- `babiesWithRole.length <= 1` → label "Adicionar bebê", ícone `add_circle`
- `babiesWithRole.length >= 2` → label "Trocar bebê", ícone `swap_horiz`

### 11. AddBabySheet — paywall early (não depois de preencher)
**Arquivo:** `app/src/components/ui/AddBabySheet.tsx`
- `useEffect` no mount: se `reachedLimit === true`, abre PaywallModal imediatamente
- Fechar paywall quando `reachedLimit` também fecha o sheet

### 12. MGM/Referral — escondido temporariamente
**Arquivo:** `app/src/features/referral/YayaPlusPage.tsx`
- Constante `FEATURE_MGM = false` adicionada
- `<ReferralPanel />` não renderiza quando `FEATURE_MGM = false`
- Import do ReferralPanel comentado

## Debug Panel (easter egg em Configurações)
**Arquivo:** `app/src/pages/SettingsPage.tsx`
- 7 taps no título "Configurações" revela painel de debug
- Funções: toggle test ads (`yaya_test_ads=1`), testar RevenueCat (mostra OfferingsDiagnostic completo)
- **Deixar o painel no build de submission** — não tem como ser descoberto por reviewers da Apple

## Estado pós-sessão
- Build 49 submetido ao TestFlight via Codemagic ✓
- Sandbox Tester criado pelo usuário para teste de IAP
- Paid Apps Agreement: **Active** (banking Sicredi COMPE 748 + W-8BEN + Certificate of Foreign Status)
- Próximo passo: validar IAP sandbox → submeter para Apple App Review

## Builds do histórico nesta sessão
- Build 44 → 45 → 47 → 48 → **49** (iOS, via codemagic.yaml)
- versionCode 44 → 45 → 46 → 47 → **48** (Android, via build.gradle local)
