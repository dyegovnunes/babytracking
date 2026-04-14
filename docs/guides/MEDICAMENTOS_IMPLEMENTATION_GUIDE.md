# Medicamentos: Guia de Implementação

**Spec:** `MEDICAMENTOS_SPEC.md`
**Stack:** React + TypeScript + Supabase + Capacitor

---

## O que já existe

- `TrackerPage.tsx` — adicionar o card de alerta aqui, após o MilestoneHomeCard (~linha 156)
- `ProfilePage.tsx` — adicionar botão de acesso aqui, entre Marcos e Cuidadores
- `usePremium()` — hook de entitlement Yaya+
- `PaywallModal` — modal de paywall com prop `trigger`
- `Toast` — componente de toast reutilizável
- Push notifications — infraestrutura existente (edge function `push-scheduler`)
- `baby_members` — RLS padrão a replicar

---

## STEP 1 — Migration: tabelas

Criar `supabase/migrations/20260414_medications.sql` com:

1. Tabela `medications`:
   - `baby_id` → babies, `name` TEXT, `dosage` TEXT, `frequency_hours` NUMERIC, `schedule_times` TIME[], `duration_type` CHECK('continuous' | 'fixed'), `start_date` DATE, `end_date` DATE nullable, `notes` TEXT, `is_active` BOOLEAN DEFAULT true, `created_by` → auth.users
   - RLS: padrão `baby_members`

2. Tabela `medication_logs`:
   - `medication_id` → medications ON DELETE CASCADE, `baby_id` → babies, `administered_at` TIMESTAMPTZ, `administered_by` → auth.users, `notes` TEXT
   - RLS: padrão `baby_members`

**Teste técnico:** inserir um medicamento e um log via SQL, confirmar que outro user sem acesso ao baby não consegue ler.

---

## STEP 2 — Hook `useMedications`

Criar `app/src/hooks/useMedications.ts`:

- Carrega `medications` (is_active = true) e `medication_logs` do dia para o `babyId`
- Expõe:
  - `activeMedications` — lista dos ativos
  - `todayLogs` — registros de hoje
  - `addMedication(data)` — respeita limite free (1 ativo): verificar `activeMedications.length >= 1 && !isPremium` antes de inserir
  - `administerDose(medicationId, administeredAt?)` — insere em `medication_logs`
  - `deactivateMedication(id)` — seta `is_active = false`
- Lógica de status por medicamento (calcular no hook):
  - `getMedicationAlertStatus(medication, todayLogs, now)` → `'overdue' | 'due_soon' | null`
  - `overdue`: passou o horário previsto por mais de 0 min sem log
  - `due_soon`: próximo horário em até 15 min
  - `null`: tudo ok, não mostrar na home

---

## STEP 3 — Card de alerta na home

Criar `app/src/components/medications/MedicationAlertCard.tsx`:

Lógica: recebe lista de `{ medication, status }`. Se lista vazia, retorna null (não renderiza nada).

**Regras de exibição (detalhadas no spec):**
- Sempre 1 card, nunca dois
- Cor/ícone seguem o estado mais urgente: `overdue` (laranja ⚠️) > `due_soon` (roxo 💊)
- 1 pendente: "[nome] tem medicamento [atrasado | para tomar]" + subtítulo com nome e horário
- 2+ pendentes: "[nome] tem medicamentos pendentes" + subtítulo lista primeiro + "+N pendentes"
- Toque no card inteiro → navega para `/medicamentos`
- Sem botão "Dar agora" inline

Integrar no `TrackerPage.tsx` após o MilestoneHomeCard.

---

## STEP 4 — Página de medicamentos

Criar `app/src/pages/MedicationsPage.tsx` e componentes em `app/src/components/medications/`:

**MedicationCard:** card por medicamento mostrando nome, dosagem, doses do dia (horários + quem administrou), barra de progresso do tratamento (dias restantes), próximo horário. Tap → `MedicationAdminSheet`.

**MedicationAdminSheet:** bottom sheet simples com botão "Dar agora" (registra `now()`) e link "Registrar outro horário" (time picker). Mostra histórico do dia com hora + nome de quem deu.

**MedicationForm:** cadastro com campos do spec. Calcular `schedule_times` automaticamente a partir de `frequency_hours` e primeiro horário. Mostrar preview dos horários antes de salvar. Paywall: se free e já tem 1 ativo → `PaywallModal` com `trigger="medications"`.

**Auto-encerramento:** ao carregar `useMedications`, verificar se algum medicamento com `duration_type = 'fixed'` tem `end_date < today`. Se sim, setar `is_active = false` automaticamente.

---

## STEP 5 — Integrar no ProfilePage

Adicionar botão entre Marcos e Cuidadores:

```
💊 Medicamentos
   "X ativos agora" (ou "Nenhum ativo")   ›
```

Adicionar rota `/medicamentos` no router.

---

## STEP 6 — Push notifications (Yaya+ only)

Dois triggers por medicamento ativo:

- **Lembrete:** 15 min antes do horário agendado → "💊 [nome] precisa tomar [medicamento] às [hora]"
- **Atraso:** 30 min após horário sem log → "⚠️ [medicamento] de [nome] estava previsto para [hora]. Já foi dado?"

Notificação vai para **todos os membros do bebê** (pais + cuidadores). Usar `baby_members` para buscar os tokens de push de todos.

Quando qualquer membro registra a dose, cancelar notificação pendente do mesmo horário se ainda não disparou (ou ignorar na lógica de verificação).

---

## O que eu (Dyego) vou testar

- Cadastrar vitamina D (uso contínuo, 1x/dia) com conta free — deve funcionar
- Tentar cadastrar segundo medicamento com conta free — deve abrir paywall
- Cadastrar antibiótico (a cada 8h, 7 dias) com Yaya+ e ver horários gerados
- Registrar dose como babá e ver se aparece o nome dela no histórico
- Deixar passar o horário e ver se o card de alerta aparece na home
- Verificar que o card some após registrar a dose
