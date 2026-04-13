# Plano de Implementação — Monetização Yaya+

**Versão:** 2.0 | **Data:** Abril 2026
**Modelo:** Freemium + Yaya+ assinatura (mensal / anual / vitalício)
**Infraestrutura:** Capacitor + RevenueCat + App Store IAP / Google Play IAP

---

## Mudança de modelo (v1 → v2)

| Aspecto | v1 (compra única) | v2 (assinatura) |
|---------|-------------------|-----------------|
| Modelo | R$49,90 lifetime | Mensal + Anual + Vitalício |
| Receita recorrente | Não | Sim (MRR previsível) |
| LTV potencial | R$49,90 fixo | R$202,80+/ano por assinante |
| MGM (indicação) | Limitado | Mais alavancas (meses grátis, desconto) |
| Risco de churn | Zero (pagou uma vez) | Existe, mas ciclo natural do produto mitiga |

**Racional da mudança:** Um usuário que fica 2 meses no mensal (R$59,80) já supera o antigo preço vitalício. O anual incentiva compromisso mais longo e gera receita previsível. O vitalício funciona como âncora de preço que torna o anual mais atrativo.

---

## Estrutura de planos

### Plano Free

| Feature | Limite Free | Yaya+ |
|---------|-------------|-------|
| Registros por dia | 5 (rewarded ad libera +2) | Ilimitado |
| Histórico | 3 dias | Completo |
| Perfis de bebê | 1 | Até 2 |
| Membros da família | Até 2 | Ilimitado |
| Anúncios | Banner em todas as telas | Zero |
| Insights | Bloqueado (preview blur) | Completo |
| Saltos de desenvolvimento | Limitado | Completo |
| Super Relatório do Bebê | Bloqueado | Completo |
| Medidas de crescimento | Rewarded ad para adicionar | Liberado |
| Alterar foto do bebê | Rewarded ad | Liberado |

**Regra de ads para registros extras:** Após o 5º registro do dia, o app exibe um ad rewarded (vídeo curto). O usuário assiste e desbloqueia +2 registros. Pode repetir quantas vezes quiser. A experiência não deve ser punitiva — o tom é "assistir para continuar", não "você atingiu seu limite".

**Rewarded ads adicionais:** Medidas de crescimento e alteração de foto do bebê também requerem rewarded ad para usuários free. Isso incentiva upgrade sem bloquear funcionalidade essencial.

### Plano Yaya+ Mensal

| | |
|---|---|
| **Preço** | R$ 29,90/mês |
| **Renovação** | Automática |
| **Trial** | Sem trial (free já funciona como trial permanente) |
| **Cancelamento** | A qualquer momento, acesso até fim do período pago |

### Plano Yaya+ Anual

| | |
|---|---|
| **Preço** | R$ 202,80/ano (12x R$ 16,90) |
| **Economia vs. mensal** | 43% de desconto (R$ 156/ano de economia) |
| **Renovação** | Automática |
| **Cancelamento** | A qualquer momento, acesso até fim do período pago |

### Plano Yaya+ Vitalício

| | |
|---|---|
| **Preço** | R$ 299,90 (pagamento único) |
| **Equivalente a** | ~15 meses de mensal ou ~18 meses de anual |
| **Posicionamento** | "Para famílias que planejam mais filhos" |
| **Função estratégica** | Âncora de preço — faz o anual parecer muito mais atrativo |

### Tabela comparativa (visão do usuário)

| Feature | Free | Yaya+ |
|---------|------|-------|
| Registros por dia | 5 (+ ads para mais) | Ilimitados |
| Histórico | 3 dias | Ilimitado |
| Perfis de bebê | 1 | Até 4 |
| Cuidadores | 1 | Ilimitados |
| Anúncios | Sim | Sem anúncios |
| Insights e padrões | Resumo básico | Completo |
| PDF para pediatra | Não | Sim (em breve) |
| Backup na nuvem | Não | Sim |

---

## Precificação internacional

| Mercado | Mensal | Anual | Vitalício |
|---------|--------|-------|-----------|
| Brasil | R$ 29,90 | R$ 202,80 (12x R$ 16,90) | R$ 299,90 |
| Internacional | $5.99 | $39.99/ano ($3.33/mês) | $59.99 |

> **Nota:** Apple e Google trabalham com tiers de preço fixos. Os valores acima são targets — usar o tier mais próximo disponível no painel de cada loja.

---

## Projeção de receita (cenário conservador)

**Premissas:** 2.000 MAU, 7% conversão para Yaya+, distribuição 60% anual / 30% mensal / 10% vitalício.

| Plano | Assinantes | Receita/mês | Receita/ano |
|-------|-----------|-------------|-------------|
| Mensal | 42 | R$ 1.255,80 | R$ 15.069,60 |
| Anual | 84 | R$ 1.419,60 | R$ 17.035,20 |
| Vitalício | 14 | R$ 349,86* | R$ 4.198,60 |
| Ads (free users) | 1.860 | R$ 500,00 | R$ 6.000,00 |
| **Total** | | **R$ 3.525,26** | **R$ 42.303,40** |

*Vitalício diluído em 12 meses para comparação mensal.

**Comparativo com v1:** O modelo anterior projetava ~R$7.000 lifetime por cohort de 2.000 MAU. O modelo v2 projeta R$42.303/ano com o mesmo cohort — **6x mais receita**.

---

## Decisão arquitetural

O app hoje é **React + Vite (PWA) + Capacitor**. Para IAP nativo nas lojas, o Capacitor envolve o web app numa casca nativa iOS/Android.

**Trade-off:** Sem Capacitor, só é possível cobrar via Stripe (web). Com Capacitor, usa IAP nativo das lojas com RevenueCat.

---

## Visão geral do fluxo

```
Usuário toca em feature premium (ou atinge limite de registros)
        ↓
PaywallModal abre com 3 opções (mensal / anual / vitalício)
        ↓
Usuário escolhe plano e confirma
        ↓
IAP nativo (Apple / Google) processa pagamento
        ↓
RevenueCat valida recibo + libera entitlement "yaya_plus"
        ↓
Webhook RevenueCat → Supabase Edge Function
        ↓
Supabase atualiza subscription_status + subscription_plan no perfil
        ↓
App desbloqueia todas as features Yaya+
```

---

## Etapas do plano

### ETAPA 1 — Configurações manuais (você faz, sem código)

#### 1.1 RevenueCat — criar conta e configurar app

1. Criar conta em **revenuecat.com**
2. Criar novo projeto: "Yaya"
3. Adicionar app iOS:
   - App name: Yaya
   - Bundle ID: `app.yayababy`
   - App Store Connect API Key (gerar em App Store Connect → Users → Keys)
4. Adicionar app Android:
   - Package name: `app.yayababy`
   - Google Play Service Account JSON (gerar no Google Play Console)
5. Em **Entitlements**, criar: `yaya_plus`
6. Em **Products**, criar:
   - iOS: `app.yayababy.plus.monthly`, `app.yayababy.plus.annual`, `app.yayababy.plus.lifetime`
   - Android: `yaya_plus_monthly`, `yaya_plus_annual`, `yaya_plus_lifetime`
7. Em **Offerings**, criar offering "default" com 3 packages:
   - Monthly → produto mensal
   - Annual → produto anual
   - Lifetime → produto vitalício
8. Copiar as **API Keys**: Public SDK Key (iOS) e Public SDK Key (Android)

#### 1.2 App Store Connect — criar produtos IAP

1. Acessar **appstoreconnect.apple.com**
2. Criar o app Yaya (Bundle ID: `app.yayababy`)
3. Criar **Auto-Renewable Subscriptions**:
   - Subscription Group: "Yaya+"
   - Product 1: `app.yayababy.plus.monthly` — R$29,90/mês
   - Product 2: `app.yayababy.plus.annual` — R$202,80/ano
4. Criar **Non-Consumable**:
   - Product: `app.yayababy.plus.lifetime` — R$299,90
5. Localização PT-BR para todos os produtos

#### 1.3 Google Play Console — criar produtos IAP

1. Acessar **play.google.com/console**
2. Criar **Subscriptions**:
   - Product ID: `yaya_plus_monthly` — R$29,90/mês
   - Product ID: `yaya_plus_annual` — R$202,80/ano
3. Criar **In-app product** (one-time):
   - Product ID: `yaya_plus_lifetime` — R$299,90

#### 1.4 Variáveis de ambiente

```
VITE_REVENUECAT_IOS_KEY=appl_xxxxxxxxxxxxxxxx
VITE_REVENUECAT_ANDROID_KEY=goog_xxxxxxxxxxxxxxxx
```

#### 1.5 RevenueCat Webhook → Supabase

1. **Project Settings → Webhooks → Add Webhook**
2. URL: `https://kgfjfdizxziacblgvplh.supabase.co/functions/v1/revenuecat-webhook`
3. Authorization Header: criar um secret e adicionar no `.env` Supabase

---

### ETAPA 2 — Implementação de código

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `package.json` | Adicionar | Capacitor + RevenueCat SDK |
| `vite.config.ts` | Modificar | Adicionar `base: './'` para Capacitor |
| `capacitor.config.ts` | Criar | Configuração do Capacitor |
| `lib/purchases.ts` | Criar | Wrapper RevenueCat: init, compra, restore, check status |
| `contexts/PurchaseContext.tsx` | Criar | Estado global de assinatura (plano ativo, status) |
| `hooks/usePremium.ts` | Criar | Hook `isPremium` + `subscriptionPlan` |
| `hooks/useDailyLimit.ts` | Criar | Hook para controle de 5 registros/dia (free) |
| `components/ui/PaywallModal.tsx` | Criar | Modal com 3 opções de plano |
| `components/ui/RewardedAdModal.tsx` | Criar | Modal de ad rewarded para registros extras |
| `App.tsx` | Modificar | Envolver com PurchaseProvider |
| `TrackerPage.tsx` | Modificar | Gate: limite de 5 registros/dia |
| `HistoryPage.tsx` | Modificar | Gate: histórico 3 dias |
| `InsightsPage.tsx` | Modificar | Gate: insights completos |
| `components/profile/DataManagement.tsx` | Modificar | Gate: exportação PDF |
| Supabase Migration | Criar | Adicionar `subscription_status`, `subscription_plan`, `subscription_expires_at` |
| Supabase Edge Function | Atualizar | Webhook handler com suporte a subscription events |

---

### ETAPA 3 — Build e deploy nas lojas

```bash
npm run build
npx cap sync
npx cap open ios      # Xcode
npx cap open android  # Android Studio
```

---

## Feature gating — regras completas

| Feature | Free | Yaya+ | Gatilho de paywall |
|---------|------|-------|--------------------|
| Registros/dia | 5 (+ ad rewarded) | Ilimitados | Ao tentar 6º registro |
| Histórico | 3 dias | Ilimitado | Ao tentar ver dia 4+ |
| Perfis de bebê | 1 | 4 | Ao tentar criar 2º perfil |
| Cuidadores | 1 | Ilimitados | Ao tentar convidar |
| Insights completos | Resumo básico | Completo | Ao acessar seção completa |
| PDF para pediatra | Não | Sim | Ao tocar em exportar |
| Anúncios | Banner + rewarded | Nenhum | — |
| Backup na nuvem | Não | Sim | Ao ativar |

---

## Estratégia de ads

**Regras invioláveis:**
- Zero ads durante registro ativo (cronometrando amamentação = zero interrupção)
- Zero ads na tela de registro rápido (primeiros 5 registros do dia)
- Nenhum ad intersticial (tela cheia forçado) — jamais
- Apenas banners estáticos discretos no rodapé do histórico ou resumo
- Ads rewarded (vídeo opcional) apenas para desbloquear registros além do limite de 5/dia
- Ads contextuais e relevantes (produtos para bebê, não casino)

---

## MGM (Member Get Member) — a definir

Reservado para próxima iteração. Possibilidades:
- Quem indica + indicado ganham 1 mês grátis de Yaya+
- Desconto % no plano anual para ambos
- Meses acumuláveis (indica 3 amigos = 3 meses grátis)

---

## Referências

- RevenueCat docs: docs.revenuecat.com
- RevenueCat Capacitor plugin: github.com/RevenueCat/purchases-capacitor
- Capacitor + Vite setup: capacitorjs.com/docs/getting-started/vite
- App Store IAP guidelines: developer.apple.com/in-app-purchase
- Google Play billing: developer.android.com/google/play/billing
