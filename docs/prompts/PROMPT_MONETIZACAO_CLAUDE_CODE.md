# Prompt para Claude Code — Implementação Monetização Yaya+

> Cole este prompt no Claude Code dentro do projeto. Leia o arquivo `MONETIZACAO_PLANO.md` para contexto completo se precisar.

---

```
Preciso implementar a monetização completa do app Yaya. O modelo é freemium + compra única Yaya+ (R$49,90).
A infraestrutura escolhida é Capacitor + RevenueCat + IAP nativo (App Store / Google Play).

O app hoje é React + Vite puro, sem Capacitor. Execute todas as etapas abaixo na ordem indicada.

---

## ETAPA 1 — Adicionar Capacitor ao projeto

### 1.1 Instalar dependências

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npm install @revenuecat/purchases-capacitor
```

### 1.2 Inicializar Capacitor

```bash
npx cap init "Yaya" "app.yayababy" --web-dir=dist
npx cap add ios
npx cap add android
```

### 1.3 Atualizar vite.config.ts

Adicionar `base: './'` para Capacitor funcionar corretamente com assets relativos:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
```

### 1.4 Verificar capacitor.config.ts gerado

Confirmar que o arquivo gerado contém:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.yayababy',
  appName: 'Yaya',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
```

---

## ETAPA 2 — Variáveis de ambiente

Adicionar ao arquivo `.env` (criar se não existir):

```
VITE_REVENUECAT_IOS_KEY=COLE_AQUI_A_KEY_IOS
VITE_REVENUECAT_ANDROID_KEY=COLE_AQUI_A_KEY_ANDROID
```

> Nota: as keys reais serão fornecidas pelo RevenueCat após configuração manual das lojas.

---

## ETAPA 3 — Criar lib/purchases.ts

Criar o arquivo `src/lib/purchases.ts` com o wrapper do RevenueCat:

```typescript
import { Purchases, LOG_LEVEL, PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';

export const ENTITLEMENT_YAYA_PLUS = 'yaya_plus';

export async function initializePurchases(userId: string) {
  const platform = Capacitor.getPlatform();

  if (platform === 'web') return; // RevenueCat não funciona na web

  const apiKey = platform === 'ios'
    ? import.meta.env.VITE_REVENUECAT_IOS_KEY
    : import.meta.env.VITE_REVENUECAT_ANDROID_KEY;

  await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
  await Purchases.configure({ apiKey });
  await Purchases.logIn({ appUserID: userId });
}

export async function checkIsPremium(): Promise<boolean> {
  if (Capacitor.getPlatform() === 'web') return false;

  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active[ENTITLEMENT_YAYA_PLUS] !== undefined;
  } catch {
    return false;
  }
}

export async function getLifetimePackage(): Promise<PurchasesPackage | null> {
  try {
    const { current } = await Purchases.getOfferings();
    return current?.lifetime ?? null;
  } catch {
    return null;
  }
}

export async function purchaseYayaPlus(): Promise<boolean> {
  try {
    const pkg = await getLifetimePackage();
    if (!pkg) throw new Error('Package not found');

    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
    return customerInfo.entitlements.active[ENTITLEMENT_YAYA_PLUS] !== undefined;
  } catch (error: any) {
    if (error?.code === 'PURCHASE_CANCELLED') return false;
    throw error;
  }
}

export async function restorePurchases(): Promise<boolean> {
  try {
    const { customerInfo } = await Purchases.restorePurchases();
    return customerInfo.entitlements.active[ENTITLEMENT_YAYA_PLUS] !== undefined;
  } catch {
    return false;
  }
}
```

---

## ETAPA 4 — Criar contexts/PurchaseContext.tsx

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  initializePurchases,
  checkIsPremium,
  purchaseYayaPlus,
  restorePurchases,
} from '../lib/purchases';
import { useAuth } from './AuthContext'; // ajustar import conforme o projeto

interface PurchaseContextType {
  isPremium: boolean;
  isLoading: boolean;
  purchase: () => Promise<boolean>;
  restore: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

const PurchaseContext = createContext<PurchaseContextType>({
  isPremium: false,
  isLoading: true,
  purchase: async () => false,
  restore: async () => false,
  refresh: async () => {},
});

export function PurchaseProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth(); // ajustar conforme o projeto
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    const status = await checkIsPremium();
    setIsPremium(status);
  };

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const init = async () => {
      setIsLoading(true);
      try {
        if (Capacitor.getPlatform() !== 'web') {
          await initializePurchases(user.id);
        }
        await refresh();
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [user?.id]);

  const purchase = async (): Promise<boolean> => {
    const success = await purchaseYayaPlus();
    if (success) await refresh();
    return success;
  };

  const restore = async (): Promise<boolean> => {
    const success = await restorePurchases();
    if (success) await refresh();
    return success;
  };

  return (
    <PurchaseContext.Provider value={{ isPremium, isLoading, purchase, restore, refresh }}>
      {children}
    </PurchaseContext.Provider>
  );
}

export const usePurchase = () => useContext(PurchaseContext);
```

---

## ETAPA 5 — Criar hooks/usePremium.ts

```typescript
import { usePurchase } from '../contexts/PurchaseContext';

export function usePremium() {
  const { isPremium, isLoading, purchase, restore } = usePurchase();
  return { isPremium, isLoading, purchase, restore };
}
```

---

## ETAPA 6 — Criar components/ui/PaywallModal.tsx

```typescript
import React, { useState } from 'react';
import { usePurchase } from '../../contexts/PurchaseContext';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger?: 'history' | 'insights' | 'pdf' | 'multi_caregiver' | 'multi_profile' | 'generic';
}

const TRIGGER_MESSAGES: Record<string, { title: string; description: string }> = {
  history: {
    title: 'Histórico completo',
    description: 'Você está tentando acessar registros com mais de 7 dias. Com o Yaya+, seu histórico é ilimitado.',
  },
  insights: {
    title: 'Insights semanais',
    description: 'Veja padrões de sono, frequência de mamadas e resumos semanais com o Yaya+.',
  },
  pdf: {
    title: 'Relatório para pediatra',
    description: 'Exporte um PDF completo da rotina do seu bebê para levar na consulta.',
  },
  multi_caregiver: {
    title: 'Compartilhar com cuidadores',
    description: 'Compartilhe o acompanhamento com o parceiro, avós ou babá com o Yaya+.',
  },
  multi_profile: {
    title: 'Múltiplos bebês',
    description: 'Adicione perfis para outros filhos. Com o Yaya+, até 4 perfis.',
  },
  generic: {
    title: 'Yaya+',
    description: 'Desbloqueie o melhor do Yaya.',
  },
};

const BENEFITS = [
  'Histórico ilimitado de registros',
  'Até 4 perfis de bebê',
  'Cuidadores ilimitados',
  'Insights e padrões semanais',
  'Relatório PDF para pediatra',
  'Sem anúncios',
];

export function PaywallModal({ isOpen, onClose, trigger = 'generic' }: PaywallModalProps) {
  const { purchase, restore } = usePurchase();
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const message = TRIGGER_MESSAGES[trigger];

  const handlePurchase = async () => {
    setLoading(true);
    try {
      const success = await purchase();
      if (success) onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const success = await restore();
      if (success) onClose();
    } finally {
      setRestoring(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-t-3xl bg-[#0d0a27] border border-[#b79fff]/20 p-6 pb-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs font-semibold tracking-widest uppercase text-[#b79fff]">Yaya+</span>
          <button onClick={onClose} className="text-[#e7e2ff]/40 hover:text-[#e7e2ff] text-xl">✕</button>
        </div>

        {/* Trigger context */}
        <h2 className="text-xl font-bold text-[#e7e2ff] mb-2">{message.title}</h2>
        <p className="text-sm text-[#e7e2ff]/60 mb-6">{message.description}</p>

        {/* Benefits */}
        <ul className="space-y-2 mb-8">
          {BENEFITS.map((benefit) => (
            <li key={benefit} className="flex items-center gap-3 text-sm text-[#e7e2ff]/80">
              <span className="text-[#b79fff]">✓</span>
              {benefit}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <button
          onClick={handlePurchase}
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-[#b79fff] text-[#0d0a27] font-bold text-base mb-3 disabled:opacity-50"
        >
          {loading ? 'Processando...' : 'Assinar Yaya+ — R$49,90'}
        </button>
        <p className="text-center text-xs text-[#e7e2ff]/40 mb-3">Compra única. Sem assinatura. Para sempre.</p>
        <button
          onClick={handleRestore}
          disabled={restoring}
          className="w-full text-center text-xs text-[#e7e2ff]/40 hover:text-[#e7e2ff]/70 py-2"
        >
          {restoring ? 'Verificando...' : 'Já comprei — restaurar acesso'}
        </button>
      </div>
    </div>
  );
}
```

---

## ETAPA 7 — Atualizar App.tsx

Envolver a aplicação com o `PurchaseProvider`. Importar e adicionar logo abaixo do AuthProvider (ou do provider de contexto principal):

```typescript
import { PurchaseProvider } from './contexts/PurchaseContext';

// Dentro do JSX, envolver os filhos:
<AuthProvider>
  <PurchaseProvider>
    {/* resto do app */}
  </PurchaseProvider>
</AuthProvider>
```

---

## ETAPA 8 — Feature gating

### 8.1 HistoryPage.tsx — gate no histórico > 7 dias

Importar `usePremium` e `PaywallModal`. No ponto onde a lista de registros é renderizada, verificar se o registro tem mais de 7 dias e o usuário não é premium:

```typescript
import { usePremium } from '../hooks/usePremium';
import { PaywallModal } from '../components/ui/PaywallModal';

// No componente:
const { isPremium } = usePremium();
const [showPaywall, setShowPaywall] = useState(false);

// Lógica de corte (adicionar na função que carrega/filtra registros):
const HISTORY_LIMIT_DAYS = 7;
const cutoffDate = isPremium
  ? null
  : new Date(Date.now() - HISTORY_LIMIT_DAYS * 24 * 60 * 60 * 1000);

// Ao tentar ver registros além do limite, mostrar paywall:
// if (!isPremium && entryDate < cutoffDate) setShowPaywall(true);

// No JSX, adicionar:
<PaywallModal
  isOpen={showPaywall}
  onClose={() => setShowPaywall(false)}
  trigger="history"
/>
```

### 8.2 InsightsPage.tsx — gate nos gráficos semanais

```typescript
import { usePremium } from '../hooks/usePremium';
import { PaywallModal } from '../components/ui/PaywallModal';

const { isPremium } = usePremium();
const [showPaywall, setShowPaywall] = useState(false);

// Envolver o WeekChart e cards semanais com verificação:
// Se !isPremium, mostrar preview desfocado + botão "Ver com Yaya+"
// Ao clicar: setShowPaywall(true)
```

### 8.3 DataManagement.tsx — gate no PDF

```typescript
import { usePremium } from '../hooks/usePremium';
import { PaywallModal } from '../components/ui/PaywallModal';

const { isPremium } = usePremium();
const [showPaywall, setShowPaywall] = useState(false);

// No botão de exportar PDF:
const handleExportPDF = () => {
  if (!isPremium) {
    setShowPaywall(true);
    return;
  }
  // lógica de exportação existente
};
```

---

## ETAPA 9 — Supabase: migração e Edge Function

### 9.1 Migration SQL

Criar o arquivo `supabase/migrations/[timestamp]_add_is_premium.sql`:

```sql
-- Adicionar coluna is_premium ao perfil do usuário
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS premium_purchased_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS revenuecat_user_id TEXT;

-- Index para queries de verificação
CREATE INDEX IF NOT EXISTS idx_profiles_is_premium ON profiles(is_premium);
```

### 9.2 Edge Function — webhook do RevenueCat

Criar o arquivo `supabase/functions/revenuecat-webhook/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const REVENUECAT_WEBHOOK_SECRET = Deno.env.get('REVENUECAT_WEBHOOK_SECRET') ?? '';

serve(async (req) => {
  // Verificar authorization
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== REVENUECAT_WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  const event = await req.json();
  const { type, app_user_id } = event.event;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Eventos que concedem ou revogam premium
  const GRANT_EVENTS = [
    'INITIAL_PURCHASE',
    'NON_SUBSCRIPTION_PURCHASE',
    'RENEWAL',
    'UNCANCELLATION',
    'RESTORE',
  ];

  const REVOKE_EVENTS = ['EXPIRATION', 'BILLING_ISSUE'];

  if (GRANT_EVENTS.includes(type)) {
    await supabase
      .from('profiles')
      .update({
        is_premium: true,
        premium_purchased_at: new Date().toISOString(),
        revenuecat_user_id: app_user_id,
      })
      .eq('id', app_user_id);
  }

  if (REVOKE_EVENTS.includes(type)) {
    // Para compra única (Non-Consumable), EXPIRATION não deve ocorrer.
    // Manter aqui como segurança, mas não esperado no modelo lifetime.
    await supabase
      .from('profiles')
      .update({ is_premium: false })
      .eq('id', app_user_id);
  }

  return new Response('OK', { status: 200 });
});
```

Para deployar a Edge Function:
```bash
npx supabase functions deploy revenuecat-webhook
npx supabase secrets set REVENUECAT_WEBHOOK_SECRET=seu_secret_aqui
```

---

## ETAPA 10 — Sincronização final

Após build e sync:

```bash
npm run build
npx cap sync
```

Verificar se não há erros de build. Confirmar que:
- [ ] `capacitor.config.ts` existe na raiz
- [ ] `ios/` e `android/` foram gerados
- [ ] `@revenuecat/purchases-capacitor` está instalado
- [ ] `PurchaseProvider` está no App.tsx
- [ ] PaywallModal aparece nas 3 telas gate (History, Insights, DataManagement)
- [ ] Edge Function deployada no Supabase
- [ ] Migration aplicada no banco

---

> Após executar tudo, me avise para validar os pontos de integração com RevenueCat antes do build final para as lojas.
```
