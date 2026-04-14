# Medicamentos: Spec Completa

**Status:** Aprovado para implementação
**Prioridade:** P1
**Tags:** `dev` `saúde` `retenção`

---

## Visão geral

Seção do app onde os pais cadastram os medicamentos que o bebê está tomando, com horários, dosagem e duração. O Yaya controla se já foi administrado, notifica quando está perto do horário e permite que todos os cuidadores vejam o status em tempo real.

Exemplos de uso real:
- Vitamina D (uso contínuo, 1x/dia)
- Antitérmico (5 dias, a cada 6h)
- Antibiótico (7 dias, a cada 8h)
- Antigases (uso contínuo, antes das mamadas)
- Suplemento de ferro (uso contínuo, 1x/dia)

**Disclaimer (discreto, no cadastro):**
"O Yaya ajuda a organizar a rotina de medicamentos. Sempre siga as orientações do médico."

---

## Experiência do usuário

### Tela principal: Medicamentos ativos

```
[ Header: Medicamentos ]
[ Subtítulo: "Controle o que o [nome] está tomando" ]

Ativos agora:

┌──────────────────────────────────────────┐
│ 💊 Vitamina D                            │
│ 3 gotas, 1x por dia (manhã)             │
│ Uso contínuo                             │
│                                          │
│ Hoje: ✅ 08:30 (você)                    │
│ Próximo: amanhã 08:00                    │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ 💊 Dipirona                              │
│ 1ml, a cada 6h                           │
│ Dia 3 de 5                               │
│ ██████░░░░ 60%                           │
│                                          │
│ Hoje: ✅ 08:00 (babá) · ✅ 14:00 (você)  │
│ Próximo: 20:00 ← 🔔 em 2h               │
└──────────────────────────────────────────┘

[ Botão: "+ Adicionar medicamento" ]
[ Link: "Ver encerrados" ]

[ Se free e já tem 1 ativo: paywall no botão adicionar ]
```

### Cadastro de medicamento

```
Tela de cadastro:

[ Nome do medicamento ] (texto livre, obrigatório)

[ Dosagem ] (texto livre, ex: "3 gotas", "5ml", "1 comprimido")

[ Frequência ]
  ( ) 1x por dia
  ( ) A cada 6h
  ( ) A cada 8h
  ( ) A cada 12h
  ( ) Personalizado: a cada ___h

[ Horários ] (calculados automaticamente a partir da frequência)
  Ex: se "a cada 8h" e primeiro horário 08:00 → 08:00, 16:00, 00:00
  Editáveis manualmente

[ Duração ]
  ( ) Uso contínuo (sem data de fim)
  ( ) Por ___ dias (a partir de hoje ou data customizada)
  Início: [data] (default: hoje)
  Fim: [calculado ou manual]

[ Observações ] (opcional, ex: "dar antes da mamada", "com suco")

[ Botão: "Salvar" ]
```

### Registrar administração (dar o remédio)

Na tela principal, ao tocar no card do medicamento:

```
Bottom sheet:

💊 Vitamina D
Dosagem: 3 gotas

[ Botão grande: "Dar agora" ] → registra com timestamp atual
[ Link: "Registrar outro horário" ] → abre picker de hora

Quem deu: [avatar do usuário logado, automático]

Histórico de hoje:
  08:30 — Você
```

O botão "Dar agora" é o fluxo principal: um toque, registra, fecha. Rápido como registrar uma amamentação.

### Visão para cuidadores

Todos os membros do bebê (pais, babás, avós) veem os mesmos medicamentos e o mesmo status de administração. Quando a babá registra que deu o remédio, os pais veem instantaneamente.

O campo "Quem deu" é preenchido automaticamente com o nome do usuário logado.

---

## Free vs Yaya+

| Funcionalidade | Free | Yaya+ |
|---|---|---|
| Cadastrar medicamentos | 1 ativo | Ilimitado |
| Registrar administração | Sim | Sim |
| Ver status do dia (dado/pendente) | Sim | Sim |
| Push de lembrete (próximo horário) | Não | Sim |
| Push de atraso ("já passou do horário") | Não | Sim |
| Histórico completo (dias anteriores) | Últimas 24h | Completo |
| Medicamentos encerrados (arquivo) | Não | Sim |

---

## Notificações (Yaya+ only)

| Tipo | Quando | Texto |
|---|---|---|
| Lembrete | 15 min antes do horário | "💊 [Nome] precisa tomar [Medicamento] às [hora]" |
| Atrasado | 30 min após o horário sem registro | "⚠️ [Medicamento] de [Nome] estava previsto para [hora]. Já foi dado?" |
| Concluído | Último dia do tratamento | "Tratamento de [Medicamento] finalizado! 🎉" |

Notificações vão para TODOS os membros do bebê (pais + cuidadores). Qualquer um pode registrar a administração.

---

## Estrutura de dados

### Tabela: `medications` (medicamentos cadastrados)

```sql
CREATE TABLE medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency_hours NUMERIC NOT NULL,
  schedule_times TIME[] NOT NULL,
  duration_type TEXT NOT NULL CHECK (duration_type IN ('continuous', 'fixed')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Tabela: `medication_logs` (registros de administração)

```sql
CREATE TABLE medication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  administered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  administered_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### RLS: mesmo padrão baby_members

```sql
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;

-- Policies para medications
CREATE POLICY "Members can view medications"
  ON medications FOR SELECT
  USING (baby_id IN (SELECT baby_id FROM baby_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can insert medications"
  ON medications FOR INSERT
  WITH CHECK (baby_id IN (SELECT baby_id FROM baby_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can update medications"
  ON medications FOR UPDATE
  USING (baby_id IN (SELECT baby_id FROM baby_members WHERE user_id = auth.uid()));

-- Policies para medication_logs
CREATE POLICY "Members can view medication_logs"
  ON medication_logs FOR SELECT
  USING (baby_id IN (SELECT baby_id FROM baby_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can insert medication_logs"
  ON medication_logs FOR INSERT
  WITH CHECK (baby_id IN (SELECT baby_id FROM baby_members WHERE user_id = auth.uid()));
```

---

## Lógica de status do dia

```typescript
interface MedicationDayStatus {
  medication: Medication
  scheduledTimes: string[]       // horários do dia (ex: ["08:00", "14:00", "20:00"])
  administeredTimes: {
    time: string
    by: string                    // nome de quem deu
  }[]
  nextDue: string | null          // próximo horário pendente
  isOverdue: boolean              // true se nextDue já passou
  minutesUntilNext: number | null
  progress: number                // 0 a 1 (doses dadas / doses do dia)
}

function getMedicationDayStatus(
  medication: Medication,
  logs: MedicationLog[],
  now: Date
): MedicationDayStatus {
  // Calcula horários agendados para hoje
  // Cruza com logs do dia
  // Determina próximo pendente
  // Calcula progresso
}
```

---

## Auto-encerramento

Para medicamentos com `duration_type === 'fixed'`:
- No dia após `end_date`, o medicamento muda automaticamente para `is_active = false`
- Aparece na seção "Encerrados" (Yaya+ only)
- Push: "Tratamento de [Medicamento] finalizado!"

Para `continuous`: permanece ativo até o pai desativar manualmente.

---

## Componentes

```
MedicationsPage.tsx              (nova página)
├── MedicationCard.tsx           (card com status do dia, progresso, próximo horário)
├── MedicationForm.tsx           (cadastro: nome, dosagem, frequência, horários, duração)
├── MedicationAdminSheet.tsx     (bottom sheet: "Dar agora" + histórico do dia)
├── MedicationHistory.tsx        (histórico completo, Yaya+ only)
└── MedicationArchive.tsx        (medicamentos encerrados, Yaya+ only)
```

### Navegação

Acessível via:
- TrackerPage: botão na ActivityGrid (novo botão "💊" ao lado dos outros) ou seção dedicada
- ProfilePage: botão "💊 Medicamentos"

**Card na home (TrackerPage):** aparece de forma discreta, apenas em duas situações:

1. **Atrasado:** passou do horário previsto sem registro. Visual laranja/warning.
   ```
   ⚠️  Helena tem medicamento atrasado
       Dipirona · prevista às 20:00                          ›
   ```

2. **Faltam 15 minutos:** próxima dose em até 15 min. Visual roxo/primary.
   ```
   💊  Helena tem medicamento para tomar
       Vitamina D · em 12 minutos                            ›
   ```

Regras do card:
- Aparece **somente** em um desses dois casos. Nunca como card permanente.
- Toque em qualquer parte abre diretamente a página de Medicamentos.
- Não há botão "Dar agora" no card da home. A ação acontece na página de medicamentos.
- **Sempre 1 card**, nunca dois. Se há múltiplos medicamentos em alerta, o card agrega todos:
  - 2 pendentes: "Dipirona atrasada · Vitamina D em 12min"
  - 3 ou mais: "Dipirona atrasada · +2 pendentes"
- Cor e ícone seguem o estado mais urgente: atrasado (laranja ⚠️) tem prioridade sobre próximo (roxo 💊).
- Some automaticamente quando o medicamento é registrado ou o horário passa de 30 min atrasado (não fica infinito).

---

## Interação com o Relatório PDF

No futuro, medicamentos ativos podem ser incluídos no Super Relatório do Bebê:
- Seção "Medicamentos em uso" com nome, dosagem, frequência
- Útil para o pediatra na consulta

Fora do escopo desta implementação.

---

## Checklist de implementação

- [ ] Criar migration: tabela `medications`
- [ ] Criar migration: tabela `medication_logs` + RLS
- [ ] Criar `app/src/lib/medicationUtils.ts` (lógica de status, próximo horário, progresso)
- [ ] Criar hook `useMedications.ts`
- [ ] Criar página `MedicationsPage.tsx`
- [ ] Criar componentes (MedicationCard, MedicationForm, MedicationAdminSheet)
- [ ] Criar MedicationHistory.tsx (Yaya+ only)
- [ ] Adicionar acesso via ProfilePage e/ou ActivityGrid
- [ ] Adicionar rota `/medicamentos`
- [ ] Implementar paywall: 1 ativo free, ilimitado Yaya+
- [ ] Integrar com push notifications (lembretes e atrasos)
- [ ] Implementar auto-encerramento para tratamentos com data de fim
- [ ] Testar com múltiplos cuidadores registrando administração
- [ ] Testar cenário de medicamento a cada 6h (horários noturnos)
