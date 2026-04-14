# Prompt para Claude Code — Migração Monetização Yaya+ v2

## Contexto

O Yaya é um baby tracking app com duas codebases:
- `app/` — React + Vite + Tailwind + Capacitor (web → iOS/Android)
- `mobile/` — React Native + Expo + NativeWind

O modelo de monetização mudou de **compra única (R$49,90 lifetime)** para **assinatura com 3 planos**:

| Plano | Preço | Tipo no RevenueCat |
|-------|-------|--------------------|
| Mensal | R$29,90/mês | Auto-Renewable Subscription |
| Anual | R$202,80/ano (12x R$16,90) | Auto-Renewable Subscription |
| Vitalício | R$299,90 | Non-Consumable (one-time) |

O plano free também mudou:
- **Antes:** Histórico 7 dias, registros ilimitados
- **Agora:** Histórico 3 dias, 5 registros/dia (ad rewarded para liberar +5), ads banner

Referência completa: `MONETIZACAO_PLANO.md` e `BRAND_BOOK.md` (seção 5).

**REGRA DE COPY:** Nunca usar a palavra "mamada" — usar sempre "amamentação". O app é para o dia todo, não focar em cenário noturno.

---

## O que já existe (não criar do zero)

### app/ (Capacitor)
- `@revenuecat/purchases-capacitor` v12.3.1 já instalado
- `.env` com test keys (`VITE_REVENUECAT_IOS_KEY`, `VITE_REVENUECAT_ANDROID_KEY`)
- `src/lib/purchases.ts` — funções de init, check, purchase (HARDCODED para lifetime)
- `src/contexts/PurchaseContext.tsx` — provider com `isPremium` state + teste account override (`teste@yayababy.app`)
- `src/hooks/usePremium.ts` — hook que retorna `{ isPremium, isLoading, purchase, restore }`
- `src/components/ui/PaywallModal.tsx` — modal com 6 tipos de trigger (history, insights, pdf, multi_caregiver, multi_profile, generic). Preço hardcoded "R$49,90" e texto "Compra única"
- Feature gating em 3 páginas:
  - `HistoryPage.tsx` — `HISTORY_LIMIT_DAYS = 7`
  - `InsightsPage.tsx` — blurred preview para free
  - `components/profile/DataManagement.tsx` — PDF export bloqueado

### Supabase
- Migration `20260406_add_is_premium.sql`: colunas `is_premium`, `premium_purchased_at`, `revenuecat_user_id`
- Edge function `revenuecat-webhook/index.ts`: handler para GRANT/REVOKE events (comentário na linha 44 referencia modelo lifetime)

### mobile/ (Expo)
- **ZERO monetização implementada.** Sem RevenueCat, sem purchase context, sem paywall, sem feature gating.

---

## Tarefas — executar na ordem

### TAREFA 1: Schema Supabase

Criar nova migration `supabase/migrations/20260409_subscription_model.sql`:

```sql
-- Adicionar colunas de assinatura ao profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free' 
  CHECK (subscription_status IN ('free', 'active', 'cancelled', 'expired', 'grace_period'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_plan TEXT 
  CHECK (subscription_plan IN ('monthly', 'annual', 'lifetime', NULL));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_cancelled_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS billing_provider TEXT 
  CHECK (billing_provider IN ('apple', 'google', 'stripe', NULL));

-- Index para queries de status
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);

-- Migrar dados existentes: quem tem is_premium = true vira lifetime
UPDATE profiles 
SET subscription_status = 'active', 
    subscription_plan = 'lifetime',
    subscription_started_at = premium_purchased_at
WHERE is_premium = TRUE;
```

**NÃO remover** as colunas antigas (`is_premium`, `premium_purchased_at`) ainda — manter para retrocompatibilidade.

---

### TAREFA 2: Atualizar Edge Function (webhook)

Arquivo: `supabase/functions/revenuecat-webhook/index.ts`

Atualizar para:
1. Extrair `product_id` do evento para determinar `subscription_plan` (monthly/annual/lifetime)
2. Mapear product IDs:
   - `app.yayababy.plus.monthly` / `yaya_plus_monthly` → `monthly`
   - `app.yayababy.plus.annual` / `yaya_plus_annual` → `annual`
   - `app.yayababy.plus.lifetime` / `yaya_plus_lifetime` → `lifetime`
3. Nos eventos de GRANT (`INITIAL_PURCHASE`, `RENEWAL`, `UNCANCELLATION`, `RESTORE`):
   - Setar `subscription_status = 'active'`
   - Setar `subscription_plan` conforme product ID
   - Setar `subscription_started_at`
   - Setar `subscription_expires_at` (do evento RevenueCat `expiration_at_ms`)
   - Setar `is_premium = true` (retrocompat)
   - Setar `billing_provider` baseado na store do evento
4. No evento `CANCELLATION`:
   - Setar `subscription_status = 'cancelled'` (acesso até expirar)
   - Setar `subscription_cancelled_at`
5. Nos eventos `EXPIRATION`, `BILLING_ISSUE`:
   - Setar `subscription_status = 'expired'` ou `'grace_period'`
   - Setar `is_premium = false`
6. Para lifetime: nunca expira — `subscription_expires_at = NULL`, `subscription_status = 'active'` permanente
7. Remover o comentário antigo sobre "modelo lifetime" da linha 44

---

### TAREFA 3: Atualizar lib/purchases.ts (app/)

Arquivo: `app/src/lib/purchases.ts`

Substituir `getLifetimePackage()` e `purchaseYayaPlus()` por:

```typescript
export type PlanType = 'monthly' | 'annual' | 'lifetime'

export async function getAvailablePackages() {
  const offerings = await Purchases.getOfferings()
  const current = offerings.current
  if (!current) throw new Error('No offerings available')
  
  return {
    monthly: current.monthly,
    annual: current.annual,
    lifetime: current.lifetime,
  }
}

export async function purchasePackage(planType: PlanType) {
  const packages = await getAvailablePackages()
  const pkg = packages[planType]
  if (!pkg) throw new Error(`Package ${planType} not available`)
  
  const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg })
  return customerInfo.entitlements.active[ENTITLEMENT_YAYA_PLUS] !== undefined
}
```

Manter `initializePurchases()`, `checkIsPremium()` e `restorePurchases()` como estão.

---

### TAREFA 4: Atualizar PurchaseContext (app/)

Arquivo: `app/src/contexts/PurchaseContext.tsx`

Adicionar ao estado:
- `subscriptionPlan: PlanType | null`
- `subscriptionExpiresAt: Date | null`
- `purchase(planType: PlanType): Promise<void>` — agora recebe o tipo de plano

Manter o teste account override para `teste@yayababy.app`.

Buscar plano ativo do Supabase (`subscription_plan`, `subscription_expires_at`) além do `is_premium`.

---

### TAREFA 5: Redesenhar PaywallModal (app/)

Arquivo: `app/src/components/ui/PaywallModal.tsx`

Redesenhar para mostrar 3 opções de plano. Estrutura:

1. Header com ícone e título "Yaya+"
2. Lista de benefícios (manter os 6 atuais + adicionar "Registros ilimitados")
3. **3 cards de plano** empilhados verticalmente:
   - **Anual** (destacado como "Melhor valor" com badge): "R$16,90/mês" + "R$202,80/ano" + "Economize 43%"
   - **Mensal**: "R$29,90/mês"
   - **Vitalício**: "R$299,90 uma vez" + "Para sempre"
4. Botão "Assinar" que muda texto conforme seleção
5. Link "Restaurar compra" abaixo
6. Texto legal: "Cancele quando quiser. Renovação automática."

**Design:** Seguir design system do app — cores surface, primary, on-surface. O plano anual deve vir pré-selecionado.

Buscar preços dinâmicos do RevenueCat via `getAvailablePackages()`. Se falhar (web ou erro), mostrar preços hardcoded como fallback.

---

### TAREFA 6: Ajustar Feature Gating (app/)

#### 6.1 Histórico: 7 dias → 3 dias

Arquivo: `app/src/pages/HistoryPage.tsx`

Mudar `HISTORY_LIMIT_DAYS = 7` para `HISTORY_LIMIT_DAYS = 3`.

#### 6.2 Limite de 5 registros/dia (NOVO)

Criar hook `app/src/hooks/useDailyLimit.ts`:

```typescript
// Contar registros do dia atual no contexto/supabase
// Retornar: { canRecord: boolean, recordsToday: number, dailyLimit: 5, showRewardedAd: () => void }
// Se isPremium → canRecord sempre true
// Se free e recordsToday >= 5 → canRecord false, oferecer ad rewarded
```

Aplicar o gate em `TrackerPage.tsx`: antes de registrar atividade, checar `canRecord`. Se false, abrir modal de ad rewarded ou paywall.

#### 6.3 Ad Rewarded para registros extras (NOVO)

Criar componente `app/src/components/ui/RewardedAdModal.tsx`:

Modal que explica: "Você já fez 5 registros hoje. Assista um vídeo curto para liberar mais 5, ou assine o Yaya+ para registros ilimitados."

Dois botões:
- "Assistir vídeo" → integração com AdMob rewarded (placeholder por agora — apenas simular sucesso e liberar +5)
- "Conhecer Yaya+" → abrir PaywallModal

**Nota:** A integração real com AdMob será feita depois. Por agora, criar a estrutura e o fluxo com um mock que simula o ad completado.

#### 6.4 Banner ads (NOVO — placeholder)

Criar componente `app/src/components/ui/AdBanner.tsx`:

Banner fixo no rodapé (56px de altura) que aparece apenas para free users.

Por agora, render placeholder visual (div com texto "Ad Space" e estilo consistente com o design system). Integração real com AdMob será posterior.

Adicionar o AdBanner em:
- `HistoryPage.tsx` (rodapé)
- `InsightsPage.tsx` (rodapé)

**NÃO adicionar em:**
- `TrackerPage.tsx` (tela principal de registro — zero distração)
- Modais
- Durante timers ativos

---

### TAREFA 7: Portar monetização para mobile/ (Expo)

No codebase `mobile/`:

1. **Instalar:** `react-native-purchases` (RevenueCat SDK para React Native)
2. **Criar `.env`** com as mesmas keys do app/
3. **Portar** os seguintes arquivos adaptando para React Native:
   - `src/lib/purchases.ts` — mesma lógica, import de `react-native-purchases` em vez de `@revenuecat/purchases-capacitor`
   - `src/contexts/PurchaseContext.tsx` — mesma lógica
   - `src/hooks/usePremium.ts` — mesmo
   - `src/hooks/useDailyLimit.ts` — mesmo
4. **Criar PaywallModal** em React Native (NativeWind para estilo) com a mesma estrutura da TAREFA 5
5. **Criar RewardedAdModal** e **AdBanner** (placeholders)
6. **Aplicar feature gating** nas screens equivalentes:
   - `HistoryScreen.tsx` — 3 dias
   - `InsightsScreen.tsx` — blurred
   - `TrackerScreen.tsx` — limite 5/dia
   - PDF export (se existir)

---

### TAREFA 8: Verificação final

1. Rodar `npm run build` no app/ — deve compilar sem erros
2. Verificar que PaywallModal mostra 3 planos com anual pré-selecionado
3. Verificar que HistoryPage agora limita a 3 dias (não 7)
4. Verificar que o teste account (`teste@yayababy.app`) ainda funciona como premium
5. Verificar que a edge function aceita os novos event types sem erro
6. Listar todos os arquivos modificados e criados

---

## Referências de arquivos

| Arquivo | Ação |
|---------|------|
| `supabase/migrations/20260409_subscription_model.sql` | CRIAR |
| `supabase/functions/revenuecat-webhook/index.ts` | MODIFICAR |
| `app/src/lib/purchases.ts` | MODIFICAR |
| `app/src/contexts/PurchaseContext.tsx` | MODIFICAR |
| `app/src/hooks/usePremium.ts` | MODIFICAR (se necessário) |
| `app/src/hooks/useDailyLimit.ts` | CRIAR |
| `app/src/components/ui/PaywallModal.tsx` | REESCREVER |
| `app/src/components/ui/RewardedAdModal.tsx` | CRIAR |
| `app/src/components/ui/AdBanner.tsx` | CRIAR |
| `app/src/pages/TrackerPage.tsx` | MODIFICAR (gate 5/dia) |
| `app/src/pages/HistoryPage.tsx` | MODIFICAR (7→3 dias) |
| `app/src/pages/InsightsPage.tsx` | MODIFICAR (adicionar AdBanner) |
| `mobile/package.json` | MODIFICAR (adicionar react-native-purchases) |
| `mobile/src/lib/purchases.ts` | CRIAR |
| `mobile/src/contexts/PurchaseContext.tsx` | CRIAR |
| `mobile/src/hooks/usePremium.ts` | CRIAR |
| `mobile/src/hooks/useDailyLimit.ts` | CRIAR |
| `mobile/src/components/ui/PaywallModal.tsx` | CRIAR |
| `mobile/src/components/ui/RewardedAdModal.tsx` | CRIAR |
| `mobile/src/components/ui/AdBanner.tsx` | CRIAR |
| `mobile/src/screens/TrackerScreen.tsx` | MODIFICAR |
| `mobile/src/screens/HistoryScreen.tsx` | MODIFICAR |
| `mobile/src/screens/InsightsScreen.tsx` | MODIFICAR |

---

## Ordem de execução recomendada

1. Schema Supabase (base para tudo)
2. Edge Function (backend pronto)
3. purchases.ts + PurchaseContext (core da lógica)
4. PaywallModal (UI de conversão)
5. Feature gating + DailyLimit + ads placeholders
6. Portar tudo para mobile/
7. Verificação final
