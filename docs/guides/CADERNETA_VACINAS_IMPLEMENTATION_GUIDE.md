# Caderneta de Vacinas: Guia de Implementação

**Spec:** `CADERNETA_VACINAS_SPEC.md`
**Stack:** React + TypeScript + Supabase + Capacitor

---

## O que já existe

- `ProfilePage.tsx` — adicionar botão de acesso aqui, entre GrowthSection e Cuidadores (~linha 196)
- `usePremium()` — hook de entitlement Yaya+
- `PaywallModal` — modal de paywall com prop `trigger`
- `babies`, `baby_members` — tabelas existentes com RLS padrão
- Push notifications — infraestrutura existente (edge function `push-scheduler`)

---

## STEP 1 — Migration: tabelas + seed

Criar `supabase/migrations/20260414_vaccines.sql` com:

1. Tabela `vaccines` (referência, read-only pelo app):
   - `code` TEXT UNIQUE, `name`, `short_name`, `protects_against`, `dose_label`, `dose_number` INT, `total_doses` INT, `recommended_age_days` INT, `source` TEXT CHECK ('PNI' | 'SBP'), `note`, `sort_order`
   - RLS: SELECT aberto para todos (`USING (true)`)

2. Tabela `baby_vaccines` (registros do usuário):
   - `baby_id` → babies, `vaccine_id` → vaccines, `applied_at` DATE, `location` TEXT, `batch_number` TEXT, `recorded_by` → auth.users
   - UNIQUE(baby_id, vaccine_id)
   - RLS: mesmo padrão de `baby_members` (SELECT/INSERT/UPDATE/DELETE via `baby_id IN (SELECT baby_id FROM baby_members WHERE user_id = auth.uid())`)

3. Seed na própria migration com ~40 vacinas do calendário PNI + SBP. Todas as vacinas estão mapeadas no spec (`CADERNETA_VACINAS_SPEC.md`), seção "Calendário vacinal: dados completos". Converter idades para dias (ex: 2 meses = 60 dias).

**Teste técnico:** `SELECT count(*) FROM vaccines` deve retornar ~40.

---

## STEP 2 — Dados client-side

Criar `app/src/lib/vaccineData.ts`:

- Array `VACCINES` espelhando a tabela (para uso offline e sem latência)
- Tipo `Vaccine` e `BabyVaccine`
- Função `getVaccineStatus(ageDays, recommendedAgeDays, isApplied)` → `'applied' | 'can_take' | 'overdue' | 'future'`
  - `future`: ageDays < recommendedAgeDays
  - `can_take`: ageDays >= recommendedAgeDays e não aplicada
  - `overdue`: ageDays >= recommendedAgeDays + 30 e não aplicada
  - `applied`: marcada pelo usuário

---

## STEP 3 — Hook `useVaccines`

Criar `app/src/hooks/useVaccines.ts`:

- Carrega `baby_vaccines` do banco para o `babyId` atual
- Expõe `achieved` (Set de vaccine codes aplicados), `applyVaccine(vaccineCode, date, location?, batch?)`, `loading`
- `applyVaccine` requer `isPremium` — retornar erro caso contrário

---

## STEP 4 — Página e componentes

Criar `app/src/pages/VaccinesPage.tsx` e componentes em `app/src/components/vaccines/`:

**Estrutura da página:**
- Disclaimer fixo no topo (texto no spec)
- Chips de filtro: Todas | Pode tomar | Atrasadas | Aplicadas
- Lista agrupada por faixa de idade (Ao nascer, 2 meses, 4 meses...)
- Cada vacina: ícone de status + nome + subtítulo + badge SUS/Particular

**Interações:**
- Tap em qualquer vacina → `VaccineDetailSheet` (informativo, free)
- Dentro do sheet, botão "Marcar como aplicada":
  - Se free → `PaywallModal` com `trigger="vaccines"`
  - Se Yaya+ → `VaccineApplySheet` (date + location + batch)
- Após aplicar → atualiza estado local e fecha sheet

**Visual de status** (detalhado no spec, seção "Status visual"):
- `applied`: borda verde, ícone ✅
- `can_take`: borda primary, ícone 🟢
- `overdue`: borda warning/laranja, ícone ⚠️
- `future`: opacidade reduzida, ícone 🔒
- `sbp`: borda tertiary, ícone 🔵

Paywall free: banner no rodapé "Marque vacinas como aplicadas e receba lembretes com Yaya+". Visualização do calendário é sempre free.

---

## STEP 5 — Integrar no ProfilePage

Adicionar botão entre `GrowthSection` e a seção de Cuidadores (~linha 196 do `ProfilePage.tsx`):

```
💉 Caderneta de Vacinas
   "X vacinas atrasadas · Y próximas"   ›
```

O subtítulo calcula dinamicamente usando `useVaccines` + `getVaccineStatus`.

Adicionar rota `/vacinas` no router.

---

## STEP 6 — Push notifications (Yaya+ only)

Nos lembretes de vacina, integrar com a edge function de push existente. Três triggers novos:

- **7 dias antes:** "Semana que vem [nome] pode tomar [vacina]. Já agendou?"
- **No dia:** "[nome] já pode tomar [vacina]. Agende com seu pediatra!"
- **30 dias após:** "[nome] está com [vacina] atrasada. Consulte o pediatra."

A lógica de quando disparar pode viver no scheduler existente ou num cron separado. Comparar `recommended_age_days` com a idade atual do bebê diariamente.

---

## O que eu (Dyego) vou testar

- Criar bebê de 2 meses e ver se as vacinas corretas aparecem como "pode tomar" e "atrasadas"
- Tentar marcar vacina como aplicada com conta free (deve abrir paywall)
- Marcar vacina com conta Yaya+ e ver se persiste ao reabrir
- Verificar visual SUS vs Particular
- Confirmar disclaimer aparece
