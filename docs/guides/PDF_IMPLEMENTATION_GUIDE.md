# Yaya — PDF Pediatra: Guia de Implementação para Claude Code
**Versão:** 1.0 | **Data:** 2026-04-12

> **INSTRUÇÕES:** Este documento contém TUDO que você precisa para implementar o Relatório PDF do Pediatra no Yaya Baby. Leia inteiro antes de começar. Execute na ordem dos steps. Para detalhes de produto (textos, regras, layout visual), consulte `PDF_PEDIATRA_SPEC.md`.

---

## Contexto do Projeto

- **Stack:** React 19 + Vite + TypeScript + Capacitor 8.3 (iOS/Android) + Supabase
- **App path:** `app/`
- **jsPDF:** v4.2.1 já instalado (NÃO instalar react-pdf)
- **Monetização:** RevenueCat (entitlement: `yaya_plus`), contexto em `src/contexts/PurchaseContext.tsx`
- **PaywallModal:** já suporta `trigger="pdf"` (em `src/components/ui/PaywallModal.tsx`)

---

## Mapa do que JÁ EXISTE (não recriar)

### Arquivos-chave:

| Arquivo | O que faz | Relevância |
|---------|-----------|------------|
| `src/components/profile/DataManagement.tsx` | Export PDF básico (tabela de logs) com jsPDF. Função `handleExportPDF()` linhas 20-67. | **SUBSTITUIR** pela nova geração de PDF premium |
| `src/components/ui/PaywallModal.tsx` | Modal de paywall. Já tem trigger="pdf" com título "Relatório para pediatra". | **REUSAR** — já funciona |
| `src/hooks/useInsights.ts` | Cálculos: DaySummary, FeedingPattern (avg interval, breast/bottle), SleepPattern (total, naps, longest). WeekTrend (7 dias). | **REUSAR** e estender para 30 dias |
| `src/hooks/usePremium.ts` | Wrapper do PurchaseContext. Retorna `isPremium`. | **REUSAR** |
| `src/pages/ProfilePage.tsx` | Perfil do bebê (413 linhas). Seção DataManagement no final (linha 360). | **EDITAR** para adicionar botão "Preparar para consulta" |
| `src/components/profile/BabyCard.tsx` | Card do bebê com nome, nascimento, foto. 264 linhas. | **REUSAR** dados do baby |
| `src/types/index.ts` | Types: LogEntry, Baby, EventCategory, IntervalConfig | **REUSAR** |
| `src/lib/constants.ts` | DEFAULT_EVENTS com IDs: breast_left/right/both, bottle, diaper_wet/dirty, sleep, wake, bath | **REUSAR** |
| `src/lib/formatters.ts` | formatDate, formatTime, formatAge, formatBirthDate, timeSince | **REUSAR** |
| `src/contexts/AppContext.tsx` | State: logs, baby, babies, members. Funções: addLog, etc. | **REUSAR** dados |

### O que NÃO existe:

- ❌ Tabela `measurements` (peso/altura) — não existe no Supabase
- ❌ UI para registrar peso/altura
- ❌ Dados OMS (JSONs estáticos de percentis)
- ❌ PDF com layout premium (2 páginas com gráficos)
- ❌ `@capacitor/share` plugin (não instalado)
- ❌ Cálculos estendidos para 30 dias (useInsights faz 7 dias)
- ❌ Separação sono noturno vs diurno
- ❌ Gráficos SVG→Canvas→jsPDF

### Dados disponíveis no LogEntry:

```typescript
// Já rastreados:
- breast_left, breast_right, breast_both → contagem amamentação
- bottle → contagem + ml (hasAmount)
- diaper_wet, diaper_dirty → contagem fraldas por tipo
- sleep, wake → pares = duração do sono
- bath → contagem

// NÃO rastreados:
- Peso/Altura → precisa criar tabela measurements + UI
- Duração da amamentação → NÃO medir (decisão de produto)
- Lado mais frequente → PODE calcular (breast_left vs breast_right vs breast_both)
```

---

## STEP 1 — Tabela `measurements` + Migration

**Criar:** `supabase/migrations/20260412_measurements.sql`

```sql
-- ============================================
-- MEASUREMENTS — Peso, altura, perímetro cefálico
-- ============================================

CREATE TABLE IF NOT EXISTS measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('weight', 'height', 'head_circumference')),
  value NUMERIC(6,2) NOT NULL, -- kg para peso, cm para altura/PC
  unit TEXT NOT NULL DEFAULT 'kg', -- 'kg' ou 'cm'
  measured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  measured_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read baby measurements" ON measurements
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM baby_members WHERE baby_members.baby_id = measurements.baby_id AND baby_members.user_id = auth.uid())
  );

CREATE POLICY "Members can insert baby measurements" ON measurements
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM baby_members WHERE baby_members.baby_id = measurements.baby_id AND baby_members.user_id = auth.uid())
  );

CREATE POLICY "Members can update baby measurements" ON measurements
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM baby_members WHERE baby_members.baby_id = measurements.baby_id AND baby_members.user_id = auth.uid())
  );

CREATE POLICY "Members can delete baby measurements" ON measurements
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM baby_members WHERE baby_members.baby_id = measurements.baby_id AND baby_members.user_id = auth.uid())
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_measurements_baby ON measurements(baby_id, type, measured_at DESC);
```

---

## STEP 2 — Instalar Capacitor Share

```bash
cd app
npm install @capacitor/share
npx cap sync
```

---

## STEP 3 — UI de registro de peso/altura

**Objetivo:** Adicionar seção "Crescimento" na ProfilePage, abaixo do BabyCard.

**Editar:** `src/pages/ProfilePage.tsx`

**Adicionar entre o BabyCard e a seção de Cuidadores:**

Criar componente: `src/components/profile/GrowthSection.tsx`

```typescript
/**
 * Seção de crescimento no perfil do bebê.
 * - Input rápido de peso (kg) e altura (cm)
 * - Histórico de medições
 * - UX: 2 toques para registrar (tap no campo + confirmar)
 */

interface GrowthSectionProps {
  babyId: string;
}
```

**Layout da seção:**
```
── 📏 Crescimento ─────────────────────

┌─────────────────┐ ┌─────────────────┐
│ Peso             │ │ Altura           │
│ [3,88] kg        │ │ [55] cm          │
│ Último: 05/04    │ │ Último: 05/04    │
│ [Registrar]      │ │ [Registrar]      │
└─────────────────┘ └─────────────────┘

Histórico:
  05/04 — 3,88 kg · 55 cm
  22/03 — 3,45 kg · 53 cm
  08/03 — 3,20 kg · 49 cm (nascimento)
```

**Regras de UX:**
- Input numérico com step 0.01 para peso, 0.1 para altura
- Placeholder: último valor registrado
- Botão "Registrar" salva no Supabase (tabela measurements)
- Histórico: últimas 10 medições, ordenadas por data desc
- Se nenhuma medição: "Registre o peso e altura do bebê para acompanhar o crescimento"
- **Mínimo de cliques:** tap no campo → digitar → tap "Registrar" = 3 toques. Se puder reduzir para 2 (input + enter), melhor.

**Persistência:**
```typescript
import { supabase } from '../../lib/supabase';

async function saveMeasurement(babyId: string, type: 'weight' | 'height', value: number) {
  const unit = type === 'weight' ? 'kg' : 'cm';
  const { data: { user } } = await supabase.auth.getUser();
  
  return supabase.from('measurements').insert({
    baby_id: babyId,
    type,
    value,
    unit,
    measured_by: user?.id,
    measured_at: new Date().toISOString(),
  });
}

async function getMeasurements(babyId: string) {
  return supabase
    .from('measurements')
    .select('*')
    .eq('baby_id', babyId)
    .order('measured_at', { ascending: false })
    .limit(20);
}
```

---

## STEP 4 — Dados OMS (JSONs estáticos)

**Criar:** `src/lib/omsData.ts`

Dados da OMS para curvas de crescimento. Fonte: WHO Child Growth Standards.

```typescript
/**
 * Dados OMS weight-for-age e length-for-age
 * Percentis: p3, p15, p50, p85, p97
 * Idade: 0 a 24 meses (mensal)
 * Separado por sexo
 */

interface OMSDataPoint {
  months: number;
  p3: number;
  p15: number;
  p50: number;
  p85: number;
  p97: number;
}

// Peso (kg) — MENINOS
export const WEIGHT_BOYS: OMSDataPoint[] = [
  { months: 0, p3: 2.5, p15: 2.9, p50: 3.3, p85: 3.9, p97: 4.4 },
  { months: 1, p3: 3.4, p15: 3.9, p50: 4.5, p85: 5.1, p97: 5.8 },
  { months: 2, p3: 4.3, p15: 4.9, p50: 5.6, p85: 6.3, p97: 7.1 },
  { months: 3, p3: 5.0, p15: 5.7, p50: 6.4, p85: 7.2, p97: 8.0 },
  { months: 4, p3: 5.6, p15: 6.2, p50: 7.0, p85: 7.8, p97: 8.7 },
  { months: 5, p3: 6.0, p15: 6.7, p50: 7.5, p85: 8.4, p97: 9.3 },
  { months: 6, p3: 6.4, p15: 7.1, p50: 7.9, p85: 8.8, p97: 9.8 },
  { months: 7, p3: 6.7, p15: 7.4, p50: 8.3, p85: 9.2, p97: 10.3 },
  { months: 8, p3: 6.9, p15: 7.7, p50: 8.6, p85: 9.6, p97: 10.7 },
  { months: 9, p3: 7.1, p15: 7.9, p50: 8.9, p85: 9.9, p97: 11.0 },
  { months: 10, p3: 7.4, p15: 8.1, p50: 9.2, p85: 10.2, p97: 11.4 },
  { months: 11, p3: 7.6, p15: 8.4, p50: 9.4, p85: 10.5, p97: 11.7 },
  { months: 12, p3: 7.7, p15: 8.6, p50: 9.6, p85: 10.8, p97: 12.0 },
  { months: 15, p3: 8.3, p15: 9.2, p50: 10.3, p85: 11.5, p97: 12.8 },
  { months: 18, p3: 8.8, p15: 9.8, p50: 10.9, p85: 12.2, p97: 13.7 },
  { months: 21, p3: 9.3, p15: 10.3, p50: 11.5, p85: 12.9, p97: 14.5 },
  { months: 24, p3: 9.7, p15: 10.8, p50: 12.2, p85: 13.6, p97: 15.3 },
];

// Peso (kg) — MENINAS
export const WEIGHT_GIRLS: OMSDataPoint[] = [
  { months: 0, p3: 2.4, p15: 2.8, p50: 3.2, p85: 3.7, p97: 4.2 },
  { months: 1, p3: 3.2, p15: 3.6, p50: 4.2, p85: 4.8, p97: 5.5 },
  { months: 2, p3: 3.9, p15: 4.5, p50: 5.1, p85: 5.8, p97: 6.6 },
  { months: 3, p3: 4.5, p15: 5.2, p50: 5.8, p85: 6.6, p97: 7.5 },
  { months: 4, p3: 5.0, p15: 5.7, p50: 6.4, p85: 7.3, p97: 8.2 },
  { months: 5, p3: 5.4, p15: 6.1, p50: 6.9, p85: 7.8, p97: 8.8 },
  { months: 6, p3: 5.7, p15: 6.5, p50: 7.3, p85: 8.2, p97: 9.3 },
  { months: 7, p3: 6.0, p15: 6.8, p50: 7.6, p85: 8.6, p97: 9.8 },
  { months: 8, p3: 6.3, p15: 7.0, p50: 7.9, p85: 9.0, p97: 10.2 },
  { months: 9, p3: 6.5, p15: 7.3, p50: 8.2, p85: 9.3, p97: 10.5 },
  { months: 10, p3: 6.7, p15: 7.5, p50: 8.5, p85: 9.6, p97: 10.9 },
  { months: 11, p3: 6.9, p15: 7.7, p50: 8.7, p85: 9.9, p97: 11.2 },
  { months: 12, p3: 7.0, p15: 7.9, p50: 8.9, p85: 10.1, p97: 11.5 },
  { months: 15, p3: 7.6, p15: 8.5, p50: 9.6, p85: 10.9, p97: 12.4 },
  { months: 18, p3: 8.1, p15: 9.1, p50: 10.2, p85: 11.6, p97: 13.2 },
  { months: 21, p3: 8.6, p15: 9.6, p50: 10.9, p85: 12.4, p97: 14.2 },
  { months: 24, p3: 9.0, p15: 10.2, p50: 11.5, p85: 13.2, p97: 15.1 },
];

// Comprimento (cm) — MENINOS
export const LENGTH_BOYS: OMSDataPoint[] = [
  { months: 0, p3: 46.1, p15: 47.9, p50: 49.9, p85: 51.8, p97: 53.7 },
  { months: 1, p3: 50.8, p15: 52.4, p50: 54.7, p85: 56.7, p97: 58.6 },
  { months: 2, p3: 54.4, p15: 56.0, p50: 58.4, p85: 60.6, p97: 62.4 },
  { months: 3, p3: 57.3, p15: 59.0, p50: 61.4, p85: 63.5, p97: 65.5 },
  { months: 4, p3: 59.7, p15: 61.4, p50: 63.9, p85: 66.0, p97: 68.0 },
  { months: 5, p3: 61.7, p15: 63.4, p50: 65.9, p85: 68.0, p97: 70.1 },
  { months: 6, p3: 63.3, p15: 65.1, p50: 67.6, p85: 69.8, p97: 71.9 },
  { months: 9, p3: 67.5, p15: 69.4, p50: 72.0, p85: 74.2, p97: 76.5 },
  { months: 12, p3: 71.0, p15: 73.0, p50: 75.7, p85: 78.1, p97: 80.5 },
  { months: 15, p3: 74.1, p15: 76.2, p50: 79.1, p85: 81.7, p97: 84.2 },
  { months: 18, p3: 76.9, p15: 79.1, p50: 82.3, p85: 85.0, p97: 87.7 },
  { months: 24, p3: 81.7, p15: 84.1, p50: 87.8, p85: 90.9, p97: 93.9 },
];

// Comprimento (cm) — MENINAS
export const LENGTH_GIRLS: OMSDataPoint[] = [
  { months: 0, p3: 45.4, p15: 47.3, p50: 49.1, p85: 51.0, p97: 52.9 },
  { months: 1, p3: 49.8, p15: 51.5, p50: 53.7, p85: 55.6, p97: 57.6 },
  { months: 2, p3: 53.0, p15: 54.7, p50: 57.1, p85: 59.1, p97: 61.1 },
  { months: 3, p3: 55.6, p15: 57.3, p50: 59.8, p85: 61.9, p97: 64.0 },
  { months: 4, p3: 57.8, p15: 59.5, p50: 62.1, p85: 64.3, p97: 66.4 },
  { months: 5, p3: 59.6, p15: 61.4, p50: 64.0, p85: 66.2, p97: 68.5 },
  { months: 6, p3: 61.2, p15: 63.0, p50: 65.7, p85: 68.0, p97: 70.3 },
  { months: 9, p3: 65.3, p15: 67.3, p50: 70.1, p85: 72.6, p97: 75.0 },
  { months: 12, p3: 68.9, p15: 71.0, p50: 74.0, p85: 76.4, p97: 78.9 },
  { months: 15, p3: 72.0, p15: 74.1, p50: 77.5, p85: 80.2, p97: 82.7 },
  { months: 18, p3: 74.9, p15: 77.1, p50: 80.7, p85: 83.6, p97: 86.5 },
  { months: 24, p3: 80.0, p15: 82.5, p50: 86.4, p85: 89.6, p97: 92.5 },
];

/**
 * Retorna os dados OMS corretos para o sexo do bebê
 */
export function getOMSWeight(gender: 'boy' | 'girl'): OMSDataPoint[] {
  return gender === 'boy' ? WEIGHT_BOYS : WEIGHT_GIRLS;
}

export function getOMSLength(gender: 'boy' | 'girl'): OMSDataPoint[] {
  return gender === 'boy' ? LENGTH_BOYS : LENGTH_GIRLS;
}

/**
 * Calcula percentil aproximado dado valor, idade e sexo
 */
export function getPercentile(
  type: 'weight' | 'height',
  value: number,
  ageMonths: number,
  gender: 'boy' | 'girl'
): string {
  const data = type === 'weight' ? getOMSWeight(gender) : getOMSLength(gender);
  
  // Encontrar os 2 pontos OMS mais próximos da idade
  let closest = data[0];
  let minDiff = Infinity;
  for (const point of data) {
    const diff = Math.abs(point.months - ageMonths);
    if (diff < minDiff) {
      minDiff = diff;
      closest = point;
    }
  }

  if (value <= closest.p3) return '<p3';
  if (value <= closest.p15) return '~p10';
  if (value <= closest.p50) return '~p25-50';
  if (value <= closest.p85) return '~p50-85';
  if (value <= closest.p97) return '~p85-97';
  return '>p97';
}
```

**NOTA:** Estes dados são aproximados. Para produção, considere usar os CSVs oficiais da WHO. Mas para o MVP são suficientes.

---

## STEP 5 — Hook `usePDFData` — cálculos para 30 dias

**Criar:** `src/hooks/usePDFData.ts`

Este hook estende o `useInsights` para calcular métricas de 30 dias necessárias para o PDF.

```typescript
import { useMemo } from 'react';
import { useAppState } from '../contexts/AppContext';
import { supabase } from '../lib/supabase';

export interface PDFData {
  // Período
  periodStart: Date;
  periodEnd: Date;
  totalLogs: number;

  // Amamentação
  feeding: {
    avgPerDay: number;
    avgIntervalDaytime: number; // minutos (8h-20h)
    avgIntervalNighttime: number; // minutos (20h-8h)
    breastLeftCount: number;
    breastRightCount: number;
    breastBothCount: number;
    bottleCount: number;
    totalBottleMl: number;
    dominantSide: 'left' | 'right' | 'both' | 'equal';
    trend: 'stable' | 'increasing' | 'decreasing'; // variação < 15% = estável
    dailyCounts: { date: string; count: number }[]; // para gráfico barras
  };

  // Sono
  sleep: {
    avgTotalMinutes: number;
    avgNocturnalMinutes: number; // 20h-8h
    avgDiurnalMinutes: number; // 8h-20h
    longestBlockMinutes: number;
    avgNapsPerDay: number;
    avgNapDuration: number;
    nocturnalTrend: 'stable' | 'improving' | 'declining';
    dailyMinutes: { date: string; nocturnal: number; diurnal: number }[]; // para gráfico área
  };

  // Fraldas
  diapers: {
    avgPerDay: number;
    avgWetPerDay: number;
    avgDirtyPerDay: number;
    dailyCounts: { date: string; wet: number; dirty: number }[]; // para gráfico barras empilhadas
  };

  // Crescimento (pode ser null se sem measurements)
  growth: {
    currentWeight: number | null;
    currentHeight: number | null;
    birthWeight: number | null;
    birthHeight: number | null;
    weightGain: number | null; // total no período
    weightGainPerWeek: number | null;
    heightGain: number | null;
    weightPercentile: string | null; // "~p50"
    heightPercentile: string | null;
    weightHistory: { date: string; value: number }[]; // para curva
    heightHistory: { date: string; value: number }[];
  } | null;

  // Padrões observados
  patterns: string[]; // lista de observações textuais
}
```

**Lógica de cálculo (implementar dentro do hook):**

1. **Período:** Receber `periodDays` (default 30). Filtrar logs onde `timestamp >= now - periodDays`.

2. **Amamentação:**
   - Filtrar logs com eventId começando com `breast_` ou `bottle`
   - COUNT por dia → avgPerDay = total / dias
   - Intervalos: ordenar por timestamp, calcular diff entre consecutivos. Separar diurno (8h-20h) vs noturno (20h-8h)
   - Lado dominante: comparar COUNT breast_left vs breast_right vs breast_both
   - Trend: comparar avg primeira metade vs segunda metade do período. Diff < 15% = stable

3. **Sono:**
   - Encontrar pares sleep/wake (reaproveitar lógica de `computeSleepPairs` do useInsights)
   - Para cada par, classificar como noturno (início entre 20h-8h) ou diurno
   - Total/dia = SUM durations / dias
   - Maior bloco = MAX(duration) de todos os pares
   - Trend noturno: comparar média noturna primeira vs segunda metade

4. **Fraldas:**
   - Filtrar diaper_wet e diaper_dirty
   - COUNT por dia, split por tipo

5. **Crescimento:**
   - Buscar measurements do baby (query Supabase)
   - Se existir: calcular variação, ganho/semana, percentil OMS
   - Se não existir: retornar null (PDF omite seção graciosamente)
   - Birth weight/height: measurement mais antiga OU input manual do BabyCard

6. **Padrões observados (array de strings):**
   Gerar automaticamente baseado nos dados. Exemplos:
   - Se sono noturno > diurno por 10+ dias: "Sono noturno consistentemente maior que diurno nos últimos {X} dias"
   - Se amamentação estável: "Amamentações estáveis no período (variação inferior a 15%)"
   - Se tem peso: "Ganho de peso de {X}g/semana (referência OMS para a idade: {Y}-{Z}g/semana)"
   - Se longest block > 4h: "Maior bloco contínuo de sono: {X}h{Y}min"

**IMPORTANTE:** Todas as frases devem ser observacionais, NUNCA conclusões. Ver tabela de linguagem proibida/permitida no `PDF_PEDIATRA_SPEC.md`.

---

## STEP 6 — Componente gerador de PDF com jsPDF

**Criar:** `src/lib/generatePDF.ts`

Este é o arquivo principal que gera o PDF de 2 páginas usando jsPDF. NÃO criar componente React — é uma função pura que recebe dados e retorna um jsPDF doc.

```typescript
import { jsPDF } from 'jspdf';
import type { PDFData } from '../hooks/usePDFData';
import type { Baby } from '../types';
import { formatAge } from './formatters';

/**
 * Gera o PDF premium de 2 páginas para o pediatra.
 * Retorna o jsPDF doc pronto para save() ou output().
 */
export function generatePediatricPDF(data: PDFData, baby: Baby): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4'); // portrait, millimeters, A4
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;

  // Cores
  const PURPLE = [124, 77, 255]; // #7C4DFF
  const DARK = [26, 26, 46]; // #1a1a2e
  const GRAY = [100, 100, 100];
  const LIGHT_GRAY = [200, 200, 200];
  const GREEN = [76, 175, 80]; // referência OK
  const AMBER = [255, 179, 0]; // referência fora

  // ═══════════════════════════════════
  // PÁGINA 1
  // ═══════════════════════════════════

  let y = margin;

  // Header: Logo + título
  doc.setFontSize(10);
  doc.setTextColor(...PURPLE);
  doc.text('YAYA', margin, y + 5);
  doc.setFontSize(14);
  doc.setTextColor(...DARK);
  doc.text('RELATÓRIO DE ACOMPANHAMENTO', margin + 20, y + 5);
  y += 15;

  // Card info do bebê
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, y, contentWidth, 22, 3, 3, 'F');
  doc.setFontSize(12);
  doc.setTextColor(...DARK);
  doc.text(baby.name.toUpperCase(), margin + 5, y + 7);
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  const ageText = formatAge(baby.birthDate);
  const periodText = `${formatDateBR(data.periodStart)} — ${formatDateBR(data.periodEnd)} (${data.totalLogs} registros)`;
  doc.text(`Nascimento: ${formatDateBR(new Date(baby.birthDate))} · ${ageText}`, margin + 5, y + 13);
  doc.text(`Período: ${periodText}`, margin + 5, y + 18);
  y += 28;

  // ── RESUMO DO PERÍODO ──
  y = drawSectionTitle(doc, 'RESUMO DO PERÍODO', y, margin);

  // 4 summary cards
  const cardW = (contentWidth - 15) / 4;
  const cards = [
    { emoji: '🍼', value: data.feeding.avgPerDay.toFixed(1) + 'x', label: '/dia', ref: 'ref OMS: 8-12x' },
    { emoji: '😴', value: formatHours(data.sleep.avgTotalMinutes), label: '/dia', ref: 'ref OMS: 14-17h' },
    { emoji: '🧷', value: data.diapers.avgPerDay.toFixed(1) + 'x', label: '/dia', ref: 'ref: 6-10x' },
    {
      emoji: '📏',
      value: data.growth?.currentWeight ? data.growth.currentWeight.toFixed(2) + 'kg' : '—',
      label: '',
      ref: data.growth?.weightGain ? `+${(data.growth.weightGain * 1000).toFixed(0)}g no período` : 'Sem registro'
    },
  ];

  cards.forEach((card, i) => {
    const x = margin + i * (cardW + 5);
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(x, y, cardW, 25, 2, 2, 'F');
    doc.setFontSize(8);
    doc.text(card.emoji, x + cardW / 2 - 2, y + 6);
    doc.setFontSize(16);
    doc.setTextColor(...DARK);
    doc.text(card.value, x + cardW / 2, y + 14, { align: 'center' });
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(card.label, x + cardW / 2, y + 18, { align: 'center' });
    doc.text(card.ref, x + cardW / 2, y + 22, { align: 'center' });
  });
  y += 32;

  // ── AMAMENTAÇÃO ──
  y = drawSectionTitle(doc, 'AMAMENTAÇÃO', y, margin);

  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text(`Média: ${data.feeding.avgPerDay.toFixed(1)} amamentações/dia`, margin, y);
  y += 5;
  doc.text(`Intervalo médio: ${formatMinutes(data.feeding.avgIntervalDaytime)} (diurno) / ${formatMinutes(data.feeding.avgIntervalNighttime)} (noturno)`, margin, y);
  y += 5;
  const sideText = data.feeding.dominantSide === 'equal' ? 'Sem preferência' :
    `Lado mais frequente: ${data.feeding.dominantSide === 'left' ? 'esquerdo' : data.feeding.dominantSide === 'right' ? 'direito' : 'ambos'}`;
  doc.text(sideText, margin, y);
  y += 5;
  const trendText = data.feeding.trend === 'stable' ? 'Tendência: estável (variação < 15% no período)' :
    data.feeding.trend === 'increasing' ? 'Tendência: frequência aumentando no período' :
    'Tendência: frequência diminuindo no período';
  doc.text(trendText, margin, y);
  y += 8;

  // Gráfico: barras amamentações/dia (30 dias)
  y = drawBarChart(doc, data.feeding.dailyCounts.map(d => d.count), data.feeding.dailyCounts.map(d => d.date), y, margin, contentWidth, 30, PURPLE);
  y += 5;

  // ── SONO ──
  y = drawSectionTitle(doc, 'SONO', y, margin);

  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text(`Sono médio total: ${formatHours(data.sleep.avgTotalMinutes)}/dia`, margin, y);
  y += 5;
  doc.text(`Noturno: ${formatHours(data.sleep.avgNocturnalMinutes)} · Diurno: ${formatHours(data.sleep.avgDiurnalMinutes)}`, margin, y);
  y += 5;
  doc.text(`Maior bloco contínuo: ${formatMinutes(data.sleep.longestBlockMinutes)}`, margin, y);
  y += 5;
  doc.text(`Sonecas: ${data.sleep.avgNapsPerDay.toFixed(1)}x/dia · Duração média: ${formatMinutes(data.sleep.avgNapDuration)}`, margin, y);
  y += 8;

  // Gráfico: área sono/dia (noturno escuro + diurno claro)
  y = drawStackedAreaChart(doc, data.sleep.dailyMinutes, y, margin, contentWidth, 30, PURPLE);
  y += 5;

  // Footer página 1
  drawFooter(doc, baby.name, data.periodStart, data.periodEnd, 1);

  // ═══════════════════════════════════
  // PÁGINA 2
  // ═══════════════════════════════════

  doc.addPage();
  y = margin;

  // Mini header
  doc.setFontSize(8);
  doc.setTextColor(...PURPLE);
  doc.text('YAYA', margin, y + 4);
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text(`${baby.name} · ${formatDateBR(data.periodStart)} — ${formatDateBR(data.periodEnd)}`, margin + 15, y + 4);
  y += 12;

  // ── FRALDAS ──
  y = drawSectionTitle(doc, 'FRALDAS', y, margin);
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text(`Média: ${data.diapers.avgPerDay.toFixed(1)} fraldas/dia (xixi: ${data.diapers.avgWetPerDay.toFixed(1)} · cocô: ${data.diapers.avgDirtyPerDay.toFixed(1)})`, margin, y);
  y += 5;
  doc.text('Referência: mínimo 6 fraldas molhadas/dia', margin, y);
  y += 8;

  // Mini gráfico fraldas
  y = drawStackedBarChart(doc, data.diapers.dailyCounts, y, margin, contentWidth, 20);
  y += 8;

  // ── CRESCIMENTO ── (condicional)
  if (data.growth && (data.growth.currentWeight || data.growth.currentHeight)) {
    y = drawSectionTitle(doc, 'CRESCIMENTO', y, margin);

    // Cards peso/altura lado a lado
    const halfW = (contentWidth - 5) / 2;

    if (data.growth.currentWeight) {
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(margin, y, halfW, 28, 2, 2, 'F');
      doc.setFontSize(8);
      doc.setTextColor(...GRAY);
      doc.text('PESO', margin + 3, y + 5);
      doc.setFontSize(11);
      doc.setTextColor(...DARK);
      doc.text(`Atual: ${data.growth.currentWeight.toFixed(2)} kg`, margin + 3, y + 11);
      doc.setFontSize(8);
      if (data.growth.birthWeight) doc.text(`Nascimento: ${data.growth.birthWeight.toFixed(2)} kg`, margin + 3, y + 16);
      if (data.growth.weightGain !== null) doc.text(`Variação: +${(data.growth.weightGain * 1000).toFixed(0)}g`, margin + 3, y + 21);
      if (data.growth.weightPercentile) doc.text(`Percentil: ${data.growth.weightPercentile}`, margin + 3, y + 26);
    }

    if (data.growth.currentHeight) {
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(margin + halfW + 5, y, halfW, 28, 2, 2, 'F');
      doc.setFontSize(8);
      doc.setTextColor(...GRAY);
      doc.text('COMPRIMENTO', margin + halfW + 8, y + 5);
      doc.setFontSize(11);
      doc.setTextColor(...DARK);
      doc.text(`Atual: ${data.growth.currentHeight.toFixed(1)} cm`, margin + halfW + 8, y + 11);
      doc.setFontSize(8);
      if (data.growth.birthHeight) doc.text(`Nascimento: ${data.growth.birthHeight.toFixed(1)} cm`, margin + halfW + 8, y + 16);
      if (data.growth.heightGain !== null) doc.text(`Variação: +${data.growth.heightGain.toFixed(1)} cm`, margin + halfW + 8, y + 21);
      if (data.growth.heightPercentile) doc.text(`Percentil: ${data.growth.heightPercentile}`, margin + halfW + 8, y + 26);
    }
    y += 33;

    // Curva OMS (peso) — se há histórico de medições
    if (data.growth.weightHistory.length >= 2) {
      y = drawOMSCurve(doc, data.growth.weightHistory, baby, 'weight', y, margin, contentWidth, 35);
      y += 5;
    }
  }

  // ── PADRÕES OBSERVADOS ──
  y = drawSectionTitle(doc, 'PADRÕES OBSERVADOS NO PERÍODO', y, margin);
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  data.patterns.forEach(pattern => {
    doc.text(`• ${pattern}`, margin, y);
    y += 5;
  });
  y += 5;

  // ── DADOS DO PEDIATRA ──
  y = drawSectionTitle(doc, 'DADOS DO PEDIATRA', y, margin);
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(...LIGHT_GRAY);
  doc.roundedRect(margin, y, contentWidth, 25, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text('(Espaço reservado para anotações da consulta)', margin + 5, y + 8);
  doc.text('Na próxima versão do Yaya, seu pediatra poderá', margin + 5, y + 14);
  doc.text('preencher este espaço diretamente pelo app.', margin + 5, y + 19);
  y += 30;

  // Footer página 2 com QR e CTA
  drawFooter(doc, baby.name, data.periodStart, data.periodEnd, 2);

  // CTA pediatra + QR (acima do footer)
  doc.setFontSize(8);
  doc.setTextColor(...PURPLE);
  doc.text('Quer que seu pediatra acompanhe pelo Yaya? Saiba mais: yayababy.app/pediatra', margin, pageHeight - 22);
  // QR code: usar jsPDF plugin ou gerar como imagem base64
  // doc.addImage(qrCodeBase64, 'PNG', pageWidth - margin - 20, pageHeight - 35, 18, 18);

  return doc;
}

// ─── HELPER FUNCTIONS ─────────────────────────

function formatDateBR(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h > 0) return `${h}h${m.toString().padStart(2, '0')}`;
  return `${m}min`;
}

function drawSectionTitle(doc: jsPDF, title: string, y: number, margin: number): number {
  doc.setFontSize(10);
  doc.setTextColor(124, 77, 255); // purple
  doc.text(`── ${title} `, margin, y);
  doc.setDrawColor(124, 77, 255);
  doc.setLineWidth(0.3);
  const textWidth = doc.getTextWidth(`── ${title} `);
  doc.line(margin + textWidth, y - 1, 210 - margin, y - 1);
  return y + 6;
}

function drawBarChart(
  doc: jsPDF, values: number[], labels: string[],
  y: number, margin: number, width: number, height: number,
  color: number[]
): number {
  // Implementar gráfico de barras simples com jsPDF
  // Cada barra = width / values.length
  // Altura proporcional ao max value
  const maxVal = Math.max(...values, 1);
  const barW = width / values.length;
  const chartBottom = y + height;

  values.forEach((val, i) => {
    const barH = (val / maxVal) * (height - 5);
    const x = margin + i * barW;
    doc.setFillColor(...color);
    doc.roundedRect(x + 0.5, chartBottom - barH, barW - 1, barH, 0.5, 0.5, 'F');
  });

  return chartBottom + 2;
}

function drawStackedAreaChart(
  doc: jsPDF, data: { date: string; nocturnal: number; diurnal: number }[],
  y: number, margin: number, width: number, height: number,
  color: number[]
): number {
  // Implementar gráfico de área empilhada
  // Nocturno (cor escura) + Diurno (cor clara)
  // Usar doc.lines() para paths
  const maxVal = Math.max(...data.map(d => d.nocturnal + d.diurnal), 1);
  const chartBottom = y + height;
  const stepX = width / data.length;

  // Área noturno (base)
  data.forEach((d, i) => {
    const barH = ((d.nocturnal + d.diurnal) / maxVal) * (height - 5);
    const noctH = (d.nocturnal / maxVal) * (height - 5);
    const x = margin + i * stepX;

    // Barra total (claro)
    doc.setFillColor(color[0], color[1], color[2], 0.3);
    doc.rect(x + 0.3, chartBottom - barH, stepX - 0.6, barH, 'F');

    // Barra noturno (escuro)
    doc.setFillColor(...color);
    doc.rect(x + 0.3, chartBottom - noctH, stepX - 0.6, noctH, 'F');
  });

  return chartBottom + 2;
}

function drawStackedBarChart(
  doc: jsPDF, data: { date: string; wet: number; dirty: number }[],
  y: number, margin: number, width: number, height: number
): number {
  const maxVal = Math.max(...data.map(d => d.wet + d.dirty), 1);
  const chartBottom = y + height;
  const barW = width / data.length;

  data.forEach((d, i) => {
    const totalH = ((d.wet + d.dirty) / maxVal) * (height - 3);
    const dirtyH = (d.dirty / maxVal) * (height - 3);
    const x = margin + i * barW;

    // Wet (azul claro)
    doc.setFillColor(100, 180, 255);
    doc.rect(x + 0.3, chartBottom - totalH, barW - 0.6, totalH, 'F');

    // Dirty (marrom)
    doc.setFillColor(180, 130, 80);
    doc.rect(x + 0.3, chartBottom - dirtyH, barW - 0.6, dirtyH, 'F');
  });

  return chartBottom + 2;
}

function drawOMSCurve(
  doc: jsPDF, measurements: { date: string; value: number }[],
  baby: Baby, type: 'weight' | 'height',
  y: number, margin: number, width: number, height: number
): number {
  // Desenhar curvas OMS (p3, p15, p50, p85, p97) em cinza
  // Plotar pontos do bebê em roxo
  // Implementação: usar doc.lines() para paths das curvas OMS
  // e doc.circle() para pontos de medição

  // Para MVP: simplificar com pontos e linhas retas
  // Curvas OMS como background em cinza claro
  // Medições do bebê como pontos roxos conectados

  return y + height;
}

function drawFooter(
  doc: jsPDF, babyName: string,
  periodStart: Date, periodEnd: Date,
  pageNum: number
): void {
  const pageHeight = 297;
  const margin = 15;

  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(
    'Dados registrados pelos cuidadores via app Yaya Baby. Não substitui avaliação clínica.',
    margin,
    pageHeight - 10
  );
  doc.text(`Pág ${pageNum}/2`, 210 - margin - 10, pageHeight - 10);
}
```

**NOTAS DE IMPLEMENTAÇÃO:**
- jsPDF não suporta SVG nativo. Os gráficos são desenhados com primitivas (rect, line, circle).
- Para gráficos mais elaborados: renderizar em `<canvas>`, capturar com `canvas.toDataURL('image/png')`, inserir com `doc.addImage()`.
- O QR code pode ser gerado com a lib `qrcode` (npm install qrcode) como data URL.

---

## STEP 7 — Fluxo "Preparar para consulta"

**Criar:** `src/components/profile/PrepareConsultation.tsx`

Este é o componente que orquestra todo o fluxo.

**Fluxo UX:**
```
[Botão "📋 Preparar para consulta"]
       │
       ├── Free? → PaywallModal (trigger="pdf")
       │
       └── Premium? → Bottom Sheet:
                ├── Período: [Últimos 30 dias ▾] ou [Personalizar]
                ├── [Preview miniatura página 1]
                └── [Gerar Relatório]
                       │
                       └── Loading (2-3s)
                             │
                             └── PDF pronto!
                                  ├── [📱 Compartilhar] (Capacitor Share)
                                  ├── [💾 Salvar] (download)
                                  └── [✕ Fechar]
```

```typescript
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { generatePediatricPDF } from '../../lib/generatePDF';
import { usePDFData } from '../../hooks/usePDFData';
import { usePurchase } from '../../contexts/PurchaseContext';
import { useAppState } from '../../contexts/AppContext';

export function PrepareConsultation() {
  const { isPremium } = usePurchase();
  const { baby, logs } = useAppState();
  const [showPaywall, setShowPaywall] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [periodDays, setPeriodDays] = useState(30);
  const [isGenerating, setIsGenerating] = useState(false);

  const pdfData = usePDFData(periodDays);

  const handleGenerate = async () => {
    if (!isPremium) {
      setShowPaywall(true);
      return;
    }
    if (!baby || !pdfData) return;

    setIsGenerating(true);
    try {
      const doc = generatePediatricPDF(pdfData, baby);
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const fileName = `yaya-${baby.name.toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;

      if (Capacitor.isNativePlatform()) {
        // Converter para base64 para Share API
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = (reader.result as string).split(',')[1];
          // Salvar temporariamente e compartilhar
          // Usar Filesystem API do Capacitor para salvar + Share
          await Share.share({
            title: `Relatório ${baby.name}`,
            text: `Relatório de acompanhamento - ${baby.name}`,
            url: pdfUrl, // funciona no Android
            dialogTitle: 'Compartilhar relatório',
          });
        };
        reader.readAsDataURL(pdfBlob);
      } else {
        // Web: download direto
        doc.save(fileName);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // ... render bottom sheet com config de período + botão gerar
}
```

**Posicionar na ProfilePage:**

No `ProfilePage.tsx`, adicionar o botão ACIMA da seção DataManagement:

```typescript
// Antes de <DataManagement>:
<PrepareConsultation />
```

**Design do botão:**
```
┌──────────────────────────────────────┐
│  📋  Preparar para consulta           │
│      Gere o relatório do pediatra    │
│                              →       │
└──────────────────────────────────────┘
```

Card com fundo surface, ícone, título bold, subtítulo muted, chevron right. Tap → abre bottom sheet (premium) ou paywall (free).

---

## STEP 8 — Feature gate + preview com blur

**Comportamento para usuário FREE:**

1. O botão "Preparar para consulta" é **visível** (não escondido)
2. Ao clicar, mostra um preview da página 1 com **blur forte** (CSS filter: blur(8px))
3. Overlay com CTA: "Desbloqueie o relatório completo com Yaya+"
4. Botão "Ver planos" → abre PaywallModal com trigger="pdf"

**Implementação:**

Usar o PaywallModal que **já existe** em `src/components/ui/PaywallModal.tsx` com trigger="pdf". Já tem o título correto: "Relatório para pediatra" e descrição "Exporte um PDF completo da rotina do seu bebê para levar na consulta."

```typescript
// No PrepareConsultation:
if (!isPremium) {
  return (
    <>
      <button onClick={() => setShowPaywall(true)}>
        {/* Preview com blur + overlay CTA */}
      </button>
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        trigger="pdf"
      />
    </>
  );
}
```

---

## STEP 9 — QR Code no PDF

**Instalar:**
```bash
cd app
npm install qrcode
npm install -D @types/qrcode
```

**Gerar QR como data URL:**
```typescript
import QRCode from 'qrcode';

async function generateQR(): Promise<string> {
  return QRCode.toDataURL('https://yayababy.app/pediatra', {
    width: 80,
    margin: 1,
    color: { dark: '#7C4DFF', light: '#FFFFFF' },
  });
}
```

**Inserir no PDF (página 2, rodapé):**
```typescript
const qrDataUrl = await generateQR();
doc.addImage(qrDataUrl, 'PNG', pageWidth - margin - 20, pageHeight - 38, 18, 18);
```

---

## STEP 10 — Revisão de linguagem (checklist)

Após implementar, verificar que NENHUMA frase no PDF viola as regras:

**Checklist obrigatório:**

- [ ] Nenhuma frase usa "insuficiente", "irregular", "atrasado", "alerta", "recomendamos"
- [ ] Nenhuma frase compara com "normal" ou "esperado" de forma qualificativa
- [ ] Percentis OMS são apresentados sem qualificação ("Peso no percentil 10" e NÃO "Peso abaixo do esperado")
- [ ] Fraldas: "mínimo 6 fraldas molhadas/dia" é referência, não diagnóstico
- [ ] Amamentação: NÃO menciona duração (não é medida pelo app)
- [ ] Disclaimer aparece em TODAS as páginas: "Dados registrados pelos cuidadores via app Yaya Baby. Não substitui avaliação clínica."
- [ ] Seção "Padrões observados" usa linguagem descritiva ("consistentemente maior que" em vez de "melhorou")
- [ ] Marco não registrado ≠ marco não atingido (NUNCA mencionar marcos ausentes)

---

## ORDEM DE EXECUÇÃO RECOMENDADA

```
STEP 1  → Migration SQL measurements (5 min, SQL Editor)
STEP 2  → npm install @capacitor/share + sync (2 min)
STEP 3  → GrowthSection componente + integrar no ProfilePage
STEP 4  → omsData.ts (dados estáticos OMS)
STEP 5  → usePDFData hook (cálculos 30 dias)
STEP 6  → generatePDF.ts (geração com jsPDF)
STEP 9  → QR code (npm install qrcode + integrar no PDF)
STEP 7  → PrepareConsultation componente + bottom sheet + share
STEP 8  → Feature gate (preview blur para free)
STEP 10 → Revisão de linguagem (checklist manual)
```

**Nota:** STEP 3 (registro peso/altura) e STEP 5-6 (PDF) são independentes. Se quiser, pode implementar o PDF sem peso/altura — a seção Crescimento será omitida graciosamente. Adicionar medições depois enriquece o PDF automaticamente.

---

## DEPENDÊNCIAS DE OUTROS GUIAS

- **Push Notifications:** PUSH_IMPLEMENTATION_GUIDE.md cria tabelas `push_tokens`, `streaks`, `push_log`. As migrations podem rodar em paralelo.
- **Admin Panel:** ADMIN_IMPLEMENTATION_GUIDE.md cria `courtesy_expires_at` em profiles. Independente do PDF.
- **checkIsPremium:** Se cortesia foi implementada (campo `courtesy_expires_at`), o PDF já se beneficia automaticamente — cortesia = premium = acesso ao PDF.

---

## REGRAS DE UX (OBRIGATÓRIO)

1. **Nunca usar "mamada"** — sempre "amamentação"
2. **Amamentação NÃO mede duração** — só contagem e intervalos
3. **Mínimo de cliques** — botão → confirmar → pronto (3 toques max)
4. **Degradação graciosa** — sem peso? omitir seção. Sem dados suficientes? mostrar o que tem
5. **Tom observacional** — dados, nunca conclusões. O pediatra conclui.
6. **Premium design** — o PDF é a vitrine do Yaya+. Deve parecer profissional.

---

## REFERÊNCIAS

- **Spec completa:** `PDF_PEDIATRA_SPEC.md` (layout visual, linguagem, paleta, tipografia)
- **jsPDF existente:** `src/components/profile/DataManagement.tsx` (referência, será substituído)
- **Insights existente:** `src/hooks/useInsights.ts` (base para usePDFData)
- **PaywallModal:** `src/components/ui/PaywallModal.tsx` (trigger="pdf" já funciona)
- **Formatters:** `src/lib/formatters.ts` (formatDate, formatAge, etc.)
- **Types:** `src/types/index.ts` (LogEntry, Baby, etc.)
- **Constants:** `src/lib/constants.ts` (event IDs e categorias)
