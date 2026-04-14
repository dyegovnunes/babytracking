# Caderneta de Vacinas: Spec Completa

**Status:** Aprovado para implementação
**Prioridade:** P1
**Tags:** `dev` `saúde` `retenção`

---

## Visão geral

O Yaya mostra o calendário vacinal completo (PNI + SBP) de 0 a 24 meses, organizado por idade. Os pais visualizam quais vacinas já podem ser tomadas, quais estão atrasadas e quais são futuras. Usuários Yaya+ podem marcar vacinas como aplicadas, receber lembretes e manter o controle atualizado.

**Disclaimer obrigatório (visível no topo da página):**
"Este calendário é baseado no PNI (SUS) e nas recomendações da SBP. Serve como apoio para organização da rotina. Consulte sempre o pediatra do seu bebê antes de vacinar."

---

## Experiência do usuário

### Tela principal: Calendário

```
[ Header: Caderneta de Vacinas ]
[ Disclaimer discreto ]
[ Filtro: Todas | Pode tomar | Atrasadas | Aplicadas ]

[ Agrupado por idade ]

Ao nascer
  ✅ BCG (dose única)                    SUS
     Aplicada em 10/12/2025
  ✅ Hepatite B (1ª dose)                SUS
     Aplicada em 10/12/2025

2 meses
  ⚠️ Pentavalente (1ª dose)             SUS    ← ATRASADA
     Prevista para 10/02/2026
  🟢 Pneumocócica 10v (1ª dose)         SUS    ← PODE TOMAR
     A partir de 10/02/2026
  🟢 Rotavírus (1ª dose)                SUS
  🔵 Pneumocócica 13v (1ª dose)         Particular
     "Versão com maior cobertura. Consulte seu pediatra."

4 meses
  🔒 Pentavalente (2ª dose)             SUS    ← FUTURO
  🔒 Rotavírus (2ª dose)                SUS
  ...

[ Se free: banner paywall após visualizar ]
```

### Status visual de cada vacina

| Status | Ícone | Cor | Condição |
|---|---|---|---|
| Aplicada | ✅ | Verde (success) | Usuário marcou como aplicada |
| Pode tomar | 🟢 | Primary (roxo) | Bebê atingiu idade mínima, ainda não aplicada |
| Atrasada | ⚠️ | Warning (laranja) | Bebê passou da idade recomendada + 30 dias |
| Futura | 🔒 | Dim (cinza) | Bebê ainda não atingiu idade mínima |
| Particular | 🔵 | Tertiary (rosa) | Tag visual para vacinas SBP (pagas) |

### Marcar como aplicada (Yaya+ only)

Ao tocar em uma vacina com status "Pode tomar" ou "Atrasada":

```
Bottom sheet:
[ Vacina: Pentavalente (1ª dose) ]
[ Protege contra: Difteria, Tétano, Coqueluche, Hib, Poliomielite ]
[ Campo: Data de aplicação (default: hoje) ]
[ Campo: Local (opcional, texto livre, ex: "UBS Centro") ]
[ Campo: Lote (opcional, texto livre) ]
[ Botão: "Marcar como aplicada" ]
```

Free: ao tocar, abre PaywallModal com mensagem "Controle suas vacinas com Yaya+".

### Detalhe da vacina (tap em qualquer vacina)

```
Bottom sheet (informativo, free):
[ Nome: Pneumocócica Conjugada 10-valente ]
[ Tipo: SUS (gratuita) ]
[ Protege contra: Doenças invasivas por pneumococo ]
[ Doses: 3 doses + 1 reforço ]
[ Esquema: 2m, 4m, 6m + reforço 12m ]
[ Status: Pode tomar a partir de 10/02/2026 ]

[ Se SBP: nota "Disponível em clínicas particulares. Consulte seu pediatra." ]

[ Botão: "Marcar como aplicada" (Yaya+ only) ]
```

---

## Free vs Yaya+

| Funcionalidade | Free | Yaya+ |
|---|---|---|
| Ver calendário completo (PNI + SBP) | Sim | Sim |
| Ver status (pode tomar, atrasada, futura) | Sim | Sim |
| Ver detalhes da vacina (proteção, doses) | Sim | Sim |
| Marcar vacina como aplicada | Não | Sim |
| Receber push "Vacina X já pode ser tomada" | Não | Sim |
| Receber push "Vacina X está atrasada" | Não | Sim |
| Ver histórico de vacinas aplicadas | Não | Sim |
| Incluir vacinas no Relatório PDF do Pediatra | Não | Sim (futuro) |

---

## Calendário vacinal: dados completos

### PNI (SUS, gratuito)

| Idade | Vacina | Dose | Protege contra |
|---|---|---|---|
| Nascimento | BCG | Única | Tuberculose |
| Nascimento | Hepatite B | 1ª | Hepatite B |
| 2 meses | Pentavalente (DTP+Hib+HepB) | 1ª | Difteria, Tétano, Coqueluche, Hib, Hepatite B |
| 2 meses | VIP (Poliomielite inativada) | 1ª | Poliomielite |
| 2 meses | Rotavírus monovalente | 1ª | Rotavírus |
| 2 meses | Pneumocócica 10v (VPC10) | 1ª | Doenças pneumocócicas (10 sorotipos) |
| 2 meses | Meningocócica C | 1ª | Meningite tipo C |
| 4 meses | Pentavalente | 2ª | Difteria, Tétano, Coqueluche, Hib, Hepatite B |
| 4 meses | VIP | 2ª | Poliomielite |
| 4 meses | Rotavírus monovalente | 2ª | Rotavírus |
| 4 meses | Pneumocócica 10v | 2ª | Doenças pneumocócicas |
| 4 meses | Meningocócica C | 2ª | Meningite tipo C |
| 6 meses | Pentavalente | 3ª | Difteria, Tétano, Coqueluche, Hib, Hepatite B |
| 6 meses | VIP | 3ª | Poliomielite |
| 6 meses | Influenza | 1ª | Gripe |
| 7 meses | Influenza | 2ª | Gripe |
| 9 meses | Febre Amarela | 1ª | Febre Amarela |
| 12 meses | Tríplice Viral (SCR) | 1ª | Sarampo, Caxumba, Rubéola |
| 12 meses | Pneumocócica 10v | Reforço | Doenças pneumocócicas |
| 12 meses | Meningocócica C | Reforço | Meningite tipo C |
| 12 meses | Varicela | 1ª | Catapora |
| 15 meses | DTP | 1º reforço | Difteria, Tétano, Coqueluche |
| 15 meses | VIP | 1º reforço | Poliomielite |
| 15 meses | Hepatite A | Única | Hepatite A |
| 15 meses | Tetra Viral (SCR-V) | 2ª | Sarampo, Caxumba, Rubéola, Varicela |

### SBP/SBIm (Particular, pago)

| Idade | Vacina | Dose | Protege contra | Nota |
|---|---|---|---|---|
| 2 meses | Pneumocócica 13v (VPC13) | 1ª | Doenças pneumocócicas (13 sorotipos) | Alternativa à 10v com maior cobertura |
| 2 meses | Rotavírus pentavalente | 1ª | Rotavírus (5 sorotipos) | Alternativa à monovalente com maior cobertura |
| 3 meses | Meningocócica B | 1ª | Meningite tipo B | Não disponível no SUS |
| 4 meses | Pneumocócica 13v | 2ª | Doenças pneumocócicas (13 sorotipos) | |
| 4 meses | Rotavírus pentavalente | 2ª | Rotavírus (5 sorotipos) | |
| 5 meses | Meningocócica B | 2ª | Meningite tipo B | |
| 6 meses | Pneumocócica 13v | 3ª | Doenças pneumocócicas (13 sorotipos) | |
| 6 meses | Rotavírus pentavalente | 3ª | Rotavírus (5 sorotipos) | |
| 6 meses | Meningocócica ACWY | 1ª | Meningite tipos A, C, W, Y | Substitui a C com maior cobertura |
| 12 meses | Pneumocócica 13v | Reforço | Doenças pneumocócicas (13 sorotipos) | |
| 12 meses | Meningocócica B | 3ª (reforço) | Meningite tipo B | |
| 12 meses | Meningocócica ACWY | 2ª | Meningite tipos A, C, W, Y | |
| 12 meses | Hepatite A | 1ª | Hepatite A | SBP recomenda 2 doses (12m + 18m) |
| 18 meses | Hepatite A | 2ª | Hepatite A | PNI faz dose única aos 15m |
| 18 meses | Meningocócica ACWY | Reforço | Meningite tipos A, C, W, Y | |

---

## Lógica de status

```typescript
type VaccineStatus = 'applied' | 'can_take' | 'overdue' | 'future'

function getVaccineStatus(
  ageDays: number,
  recommendedAgeDays: number,
  isApplied: boolean,
  overdueThresholdDays: number = 30
): VaccineStatus {
  if (isApplied) return 'applied'
  if (ageDays < recommendedAgeDays) return 'future'
  if (ageDays >= recommendedAgeDays + overdueThresholdDays) return 'overdue'
  return 'can_take'
}
```

---

## Notificações (Yaya+ only)

| Tipo | Quando | Texto |
|---|---|---|
| Pode tomar | No dia em que o bebê atinge a idade | "[Nome] já pode tomar a vacina [Vacina]. Agende com seu pediatra!" |
| Atrasada | 30 dias após a data recomendada | "[Nome] está com a vacina [Vacina] atrasada. Consulte o pediatra." |
| Lembrete | 7 dias antes da data recomendada | "Semana que vem o(a) [Nome] pode tomar [Vacina]. Já agendou?" |

---

## Estrutura de dados

### Tabela: `vaccines` (referência, read-only)

```sql
CREATE TABLE vaccines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  protects_against TEXT NOT NULL,
  dose_label TEXT NOT NULL,
  dose_number INT NOT NULL,
  total_doses INT NOT NULL,
  recommended_age_days INT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('PNI', 'SBP')),
  note TEXT,
  sort_order INT NOT NULL
);
```

### Tabela: `baby_vaccines` (registros do usuário, Yaya+ only)

```sql
CREATE TABLE baby_vaccines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  vaccine_id UUID NOT NULL REFERENCES vaccines(id),
  applied_at DATE NOT NULL,
  location TEXT,
  batch_number TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(baby_id, vaccine_id)
);
```

---

## Componentes

```
VaccinesPage.tsx              (nova página)
├── VaccineDisclaimer.tsx     (banner de aviso)
├── VaccineFilters.tsx        (Todas/Pode tomar/Atrasadas/Aplicadas)
├── VaccineAgeGroup.tsx       (grupo por idade: "2 meses", "4 meses")
│   └── VaccineRow.tsx        (linha individual com ícone de status + tag SUS/Particular)
├── VaccineDetailSheet.tsx    (bottom sheet: info da vacina + botão aplicar)
└── VaccineApplySheet.tsx     (bottom sheet: data + local + lote, Yaya+ only)
```

### Navegação

Acessível via ProfilePage (botão "💉 Caderneta de Vacinas") e potencialmente via insight de marco (lembrete de vacina).

---

## Checklist de implementação

- [ ] Criar migration: tabela `vaccines` + seed (~40 entradas PNI + SBP)
- [ ] Criar migration: tabela `baby_vaccines` + RLS
- [ ] Criar `app/src/lib/vaccineData.ts` com array client-side
- [ ] Criar hook `useVaccines.ts`
- [ ] Criar página `VaccinesPage.tsx`
- [ ] Criar componentes (VaccineRow, VaccineAgeGroup, VaccineDetailSheet, VaccineApplySheet)
- [ ] Adicionar botão no ProfilePage
- [ ] Adicionar rota `/vacinas`
- [ ] Implementar paywall: visualizar free, marcar/notificar Yaya+
- [ ] Integrar com push notifications (lembretes de vacina)
- [ ] Testar com bebês de diferentes idades
