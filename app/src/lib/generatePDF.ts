import { jsPDF } from 'jspdf';
import type { PDFData } from '../hooks/usePDFData';
import type { Baby } from '../types';
import { formatAge } from './formatters';
import { getOMSWeight, type OMSDataPoint } from './omsData';

// Cores
const PURPLE: [number, number, number] = [124, 77, 255];
const DARK: [number, number, number] = [26, 26, 46];
const GRAY: [number, number, number] = [100, 100, 100];
const LIGHT_GRAY: [number, number, number] = [200, 200, 200];

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 15;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

/**
 * Gera o PDF premium de 2 paginas para o pediatra.
 * Retorna o jsPDF doc pronto para save() ou output().
 */
export function generatePediatricPDF(data: PDFData, baby: Baby, qrDataUrl?: string): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4');

  // ═══════════════════════════════════
  // PAGINA 1
  // ═══════════════════════════════════
  let y = MARGIN;

  // Header
  doc.setFontSize(12);
  doc.setTextColor(...PURPLE);
  doc.setFont('helvetica', 'bold');
  doc.text('YAYA', MARGIN, y + 5);
  doc.setFontSize(13);
  doc.setTextColor(...DARK);
  doc.text('RELATORIO DE ACOMPANHAMENTO', MARGIN + 18, y + 5);
  y += 14;

  // Card info do bebe
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 22, 3, 3, 'F');
  doc.setFontSize(12);
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.text(baby.name.toUpperCase(), MARGIN + 5, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  const ageText = formatAge(baby.birthDate);
  doc.text(`Nascimento: ${formatDateBR(new Date(baby.birthDate))} · ${ageText}`, MARGIN + 5, y + 13);
  const periodText = `${formatDateBR(data.periodStart)} — ${formatDateBR(data.periodEnd)} (${data.totalLogs} registros)`;
  doc.text(`Periodo: ${periodText}`, MARGIN + 5, y + 18);
  y += 28;

  // ── RESUMO DO PERIODO ──
  y = drawSectionTitle(doc, 'RESUMO DO PERIODO', y);

  const cardW = (CONTENT_WIDTH - 15) / 4;
  const cards = [
    { label: 'Amamentacao', value: data.feeding.avgPerDay.toFixed(1) + 'x', sub: '/dia', ref: 'ref OMS: 8-12x' },
    { label: 'Sono', value: formatHours(data.sleep.avgTotalMinutes), sub: '/dia', ref: 'ref OMS: 14-17h' },
    { label: 'Fraldas', value: data.diapers.avgPerDay.toFixed(1) + 'x', sub: '/dia', ref: 'ref: 6-10x' },
    {
      label: 'Peso',
      value: data.growth?.currentWeight ? data.growth.currentWeight.toFixed(2) + 'kg' : '—',
      sub: '',
      ref: data.growth?.weightGain != null ? `+${(data.growth.weightGain * 1000).toFixed(0)}g` : 'Sem registro',
    },
  ];

  cards.forEach((card, i) => {
    const x = MARGIN + i * (cardW + 5);
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(x, y, cardW, 25, 2, 2, 'F');

    doc.setFontSize(7);
    doc.setTextColor(...PURPLE);
    doc.setFont('helvetica', 'bold');
    doc.text(card.label.toUpperCase(), x + cardW / 2, y + 5, { align: 'center' });

    doc.setFontSize(14);
    doc.setTextColor(...DARK);
    doc.text(card.value, x + cardW / 2, y + 14, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(card.sub, x + cardW / 2, y + 18, { align: 'center' });
    doc.text(card.ref, x + cardW / 2, y + 22, { align: 'center' });
  });
  y += 32;

  // ── AMAMENTACAO ──
  y = drawSectionTitle(doc, 'AMAMENTACAO', y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text(`Media: ${data.feeding.avgPerDay.toFixed(1)} amamentacoes/dia`, MARGIN, y);
  y += 5;

  if (data.feeding.avgIntervalDaytime > 0 || data.feeding.avgIntervalNighttime > 0) {
    doc.text(
      `Intervalo medio: ${formatMinutes(data.feeding.avgIntervalDaytime)} (diurno) / ${formatMinutes(data.feeding.avgIntervalNighttime)} (noturno)`,
      MARGIN, y
    );
    y += 5;
  }

  const sideText = data.feeding.dominantSide === 'equal'
    ? 'Sem preferencia de lado'
    : `Lado mais frequente: ${data.feeding.dominantSide === 'left' ? 'esquerdo' : data.feeding.dominantSide === 'right' ? 'direito' : 'ambos'}`;
  doc.text(sideText, MARGIN, y);
  y += 5;

  const trendText = data.feeding.trend === 'stable'
    ? 'Tendencia: estavel (variacao < 15% no periodo)'
    : data.feeding.trend === 'increasing'
      ? 'Tendencia: frequencia aumentando no periodo'
      : 'Tendencia: frequencia diminuindo no periodo';
  doc.text(trendText, MARGIN, y);
  y += 8;

  // Grafico barras amamentacao/dia
  y = drawBarChart(doc, data.feeding.dailyCounts.map((d) => d.count), y, 28, PURPLE);
  y += 5;

  // ── SONO ──
  y = drawSectionTitle(doc, 'SONO', y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text(`Sono medio total: ${formatHours(data.sleep.avgTotalMinutes)}/dia`, MARGIN, y);
  y += 5;
  doc.text(
    `Noturno: ${formatHours(data.sleep.avgNocturnalMinutes)} · Diurno: ${formatHours(data.sleep.avgDiurnalMinutes)}`,
    MARGIN, y
  );
  y += 5;
  doc.text(`Maior bloco continuo: ${formatMinutes(data.sleep.longestBlockMinutes)}`, MARGIN, y);
  y += 5;
  doc.text(
    `Sonecas: ${data.sleep.avgNapsPerDay.toFixed(1)}x/dia · Duracao media: ${formatMinutes(data.sleep.avgNapDuration)}`,
    MARGIN, y
  );
  y += 8;

  // Grafico area sono/dia
  y = drawStackedAreaChart(doc, data.sleep.dailyMinutes, y, 28, PURPLE);
  y += 3;

  // Footer pagina 1
  drawFooter(doc, 1);

  // ═══════════════════════════════════
  // PAGINA 2
  // ═══════════════════════════════════
  doc.addPage();
  y = MARGIN;

  // Mini header
  doc.setFontSize(9);
  doc.setTextColor(...PURPLE);
  doc.setFont('helvetica', 'bold');
  doc.text('YAYA', MARGIN, y + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(`${baby.name} · ${formatDateBR(data.periodStart)} — ${formatDateBR(data.periodEnd)}`, MARGIN + 15, y + 4);
  y += 12;

  // ── FRALDAS ──
  y = drawSectionTitle(doc, 'FRALDAS', y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text(
    `Media: ${data.diapers.avgPerDay.toFixed(1)} fraldas/dia (xixi: ${data.diapers.avgWetPerDay.toFixed(1)} · coco: ${data.diapers.avgDirtyPerDay.toFixed(1)})`,
    MARGIN, y
  );
  y += 5;
  doc.text('Referencia: minimo 6 fraldas molhadas/dia', MARGIN, y);
  y += 8;

  // Mini grafico fraldas
  y = drawStackedBarChart(doc, data.diapers.dailyCounts, y, 20);
  y += 8;

  // ── CRESCIMENTO ── (condicional)
  if (data.growth && (data.growth.currentWeight || data.growth.currentHeight)) {
    y = drawSectionTitle(doc, 'CRESCIMENTO', y);

    const halfW = (CONTENT_WIDTH - 5) / 2;

    if (data.growth.currentWeight) {
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(MARGIN, y, halfW, 28, 2, 2, 'F');
      doc.setFontSize(7);
      doc.setTextColor(...PURPLE);
      doc.setFont('helvetica', 'bold');
      doc.text('PESO', MARGIN + 3, y + 5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...DARK);
      doc.text(`Atual: ${data.growth.currentWeight.toFixed(2)} kg`, MARGIN + 3, y + 11);
      doc.setFontSize(8);
      doc.setTextColor(...GRAY);
      if (data.growth.birthWeight) doc.text(`Nascimento: ${data.growth.birthWeight.toFixed(2)} kg`, MARGIN + 3, y + 16);
      if (data.growth.weightGain != null) doc.text(`Variacao: +${(data.growth.weightGain * 1000).toFixed(0)}g`, MARGIN + 3, y + 21);
      if (data.growth.weightPercentile) doc.text(`Percentil: ${data.growth.weightPercentile}`, MARGIN + 3, y + 26);
    }

    if (data.growth.currentHeight) {
      const xRight = MARGIN + halfW + 5;
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(xRight, y, halfW, 28, 2, 2, 'F');
      doc.setFontSize(7);
      doc.setTextColor(...PURPLE);
      doc.setFont('helvetica', 'bold');
      doc.text('COMPRIMENTO', xRight + 3, y + 5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...DARK);
      doc.text(`Atual: ${data.growth.currentHeight.toFixed(1)} cm`, xRight + 3, y + 11);
      doc.setFontSize(8);
      doc.setTextColor(...GRAY);
      if (data.growth.birthHeight) doc.text(`Nascimento: ${data.growth.birthHeight.toFixed(1)} cm`, xRight + 3, y + 16);
      if (data.growth.heightGain != null) doc.text(`Variacao: +${data.growth.heightGain.toFixed(1)} cm`, xRight + 3, y + 21);
      if (data.growth.heightPercentile) doc.text(`Percentil: ${data.growth.heightPercentile}`, xRight + 3, y + 26);
    }
    y += 33;

    // Curva OMS (peso) se ha historico
    if (data.growth.weightHistory.length >= 2) {
      y = drawOMSCurve(doc, data.growth.weightHistory, baby, y, 35);
      y += 5;
    }
  } else {
    // Degradacao graciosa: mostrar placeholder
    y = drawSectionTitle(doc, 'CRESCIMENTO', y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    doc.text('Nenhuma medicao de peso ou altura registrada.', MARGIN, y);
    y += 5;
    doc.text('Registre na aba Perfil para incluir dados de crescimento.', MARGIN, y);
    y += 10;
  }

  // ── PADROES OBSERVADOS ──
  if (data.patterns.length > 0) {
    y = drawSectionTitle(doc, 'PADROES OBSERVADOS NO PERIODO', y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    for (const pattern of data.patterns) {
      // Wrap long lines
      const lines = doc.splitTextToSize(`• ${pattern}`, CONTENT_WIDTH);
      doc.text(lines, MARGIN, y);
      y += lines.length * 4.5;
    }
    y += 3;
  }

  // ── DADOS DO PEDIATRA ──
  y = drawSectionTitle(doc, 'DADOS DO PEDIATRA', y);
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(...LIGHT_GRAY);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 25, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text('(Espaco reservado para anotacoes da consulta)', MARGIN + 5, y + 8);
  doc.text('Na proxima versao do Yaya, seu pediatra podera', MARGIN + 5, y + 14);
  doc.text('preencher este espaco diretamente pelo app.', MARGIN + 5, y + 19);

  // Footer pagina 2 com CTA e QR
  if (qrDataUrl) {
    try {
      const qrSize = 18;
      const qrX = PAGE_WIDTH - MARGIN - qrSize;
      const qrY = PAGE_HEIGHT - 38;
      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

      // Link abaixo do QR
      doc.setFontSize(5.5);
      doc.setTextColor(...PURPLE);
      doc.setFont('helvetica', 'bold');
      doc.text('yayababy.app/pediatra', qrX + qrSize / 2, qrY + qrSize + 3, { align: 'center' });
    } catch {
      // QR code failed — skip silently
    }
  }

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PURPLE);
  doc.text(
    'Quer que seu pediatra acompanhe pelo Yaya? Escaneie o QR code.',
    MARGIN,
    PAGE_HEIGHT - 22
  );

  drawFooter(doc, 2);

  return doc;
}

// ─── HELPER FUNCTIONS ─────────────────────────

function formatDateBR(date: Date): string {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function formatHours(minutes: number): string {
  if (minutes <= 0) return '0h';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
}

function formatMinutes(minutes: number): string {
  if (minutes <= 0) return '0min';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h > 0) return `${h}h${m.toString().padStart(2, '0')}`;
  return `${m}min`;
}

function drawSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PURPLE);
  const titleText = `── ${title} `;
  doc.text(titleText, MARGIN, y);
  doc.setDrawColor(...PURPLE);
  doc.setLineWidth(0.3);
  const textWidth = doc.getTextWidth(titleText);
  doc.line(MARGIN + textWidth, y - 1, PAGE_WIDTH - MARGIN, y - 1);
  return y + 6;
}

function drawBarChart(
  doc: jsPDF,
  values: number[],
  y: number,
  height: number,
  color: [number, number, number]
): number {
  if (values.length === 0) return y;
  const maxVal = Math.max(...values, 1);
  const barW = CONTENT_WIDTH / values.length;
  const chartBottom = y + height;

  values.forEach((val, i) => {
    const barH = (val / maxVal) * (height - 5);
    const x = MARGIN + i * barW;
    doc.setFillColor(color[0], color[1], color[2]);
    if (barH > 0.5) {
      doc.roundedRect(x + 0.3, chartBottom - barH, barW - 0.6, barH, 0.5, 0.5, 'F');
    }
  });

  // X-axis labels (every 5 days)
  doc.setFontSize(5);
  doc.setTextColor(...GRAY);
  for (let i = 0; i < values.length; i += 5) {
    const x = MARGIN + i * barW + barW / 2;
    doc.text(`${i + 1}`, x, chartBottom + 3, { align: 'center' });
  }

  return chartBottom + 4;
}

function drawStackedAreaChart(
  doc: jsPDF,
  data: { date: string; nocturnal: number; diurnal: number }[],
  y: number,
  height: number,
  color: [number, number, number]
): number {
  if (data.length === 0) return y;
  const maxVal = Math.max(...data.map((d) => d.nocturnal + d.diurnal), 1);
  const chartBottom = y + height;
  const stepX = CONTENT_WIDTH / data.length;

  data.forEach((d, i) => {
    const barH = ((d.nocturnal + d.diurnal) / maxVal) * (height - 5);
    const noctH = (d.nocturnal / maxVal) * (height - 5);
    const x = MARGIN + i * stepX;

    // Total bar (light)
    if (barH > 0.5) {
      doc.setFillColor(color[0], color[1], color[2]);
      doc.setGState(new (doc as any).GState({ opacity: 0.3 }));
      doc.rect(x + 0.2, chartBottom - barH, stepX - 0.4, barH, 'F');
      doc.setGState(new (doc as any).GState({ opacity: 1 }));
    }

    // Nocturnal bar (solid)
    if (noctH > 0.5) {
      doc.setFillColor(color[0], color[1], color[2]);
      doc.rect(x + 0.2, chartBottom - noctH, stepX - 0.4, noctH, 'F');
    }
  });

  // Legend
  doc.setFontSize(6);
  doc.setTextColor(...GRAY);
  doc.setFillColor(...color);
  doc.rect(MARGIN, chartBottom + 2, 3, 2, 'F');
  doc.text('Noturno', MARGIN + 4, chartBottom + 3.5);
  doc.setFillColor(color[0], color[1], color[2]);
  doc.setGState(new (doc as any).GState({ opacity: 0.3 }));
  doc.rect(MARGIN + 25, chartBottom + 2, 3, 2, 'F');
  doc.setGState(new (doc as any).GState({ opacity: 1 }));
  doc.text('Diurno', MARGIN + 29, chartBottom + 3.5);

  return chartBottom + 6;
}

function drawStackedBarChart(
  doc: jsPDF,
  data: { date: string; wet: number; dirty: number }[],
  y: number,
  height: number
): number {
  if (data.length === 0) return y;
  const maxVal = Math.max(...data.map((d) => d.wet + d.dirty), 1);
  const chartBottom = y + height;
  const barW = CONTENT_WIDTH / data.length;

  data.forEach((d, i) => {
    const totalH = ((d.wet + d.dirty) / maxVal) * (height - 3);
    const dirtyH = (d.dirty / maxVal) * (height - 3);
    const x = MARGIN + i * barW;

    // Wet (blue)
    if (totalH > 0.5) {
      doc.setFillColor(100, 180, 255);
      doc.rect(x + 0.2, chartBottom - totalH, barW - 0.4, totalH, 'F');
    }

    // Dirty (brown, on top)
    if (dirtyH > 0.5) {
      doc.setFillColor(180, 130, 80);
      doc.rect(x + 0.2, chartBottom - dirtyH, barW - 0.4, dirtyH, 'F');
    }
  });

  // Legend
  doc.setFontSize(6);
  doc.setTextColor(...GRAY);
  doc.setFillColor(100, 180, 255);
  doc.rect(MARGIN, chartBottom + 2, 3, 2, 'F');
  doc.text('Xixi', MARGIN + 4, chartBottom + 3.5);
  doc.setFillColor(180, 130, 80);
  doc.rect(MARGIN + 18, chartBottom + 2, 3, 2, 'F');
  doc.text('Coco', MARGIN + 22, chartBottom + 3.5);

  return chartBottom + 6;
}

function drawOMSCurve(
  doc: jsPDF,
  weightHistory: { date: string; value: number }[],
  baby: Baby,
  y: number,
  height: number
): number {
  const gender = baby.gender || 'boy';
  const omsData: OMSDataPoint[] = getOMSWeight(gender);
  const birthDate = new Date(baby.birthDate);

  // Determine age range in months
  const measurements = weightHistory.map((w) => {
    const d = new Date(w.date);
    const ageMonths = (d.getTime() - birthDate.getTime()) / (30.44 * 86400000);
    return { months: Math.max(0, ageMonths), value: w.value };
  });

  const maxMonths = Math.max(...measurements.map((m) => m.months), 6);
  const relevantOMS = omsData.filter((p) => p.months <= maxMonths + 2);

  if (relevantOMS.length < 2) return y;

  const chartBottom = y + height;
  const minVal = Math.min(...relevantOMS.map((p) => p.p3)) * 0.9;
  const maxVal = Math.max(...relevantOMS.map((p) => p.p97)) * 1.05;
  const monthRange = relevantOMS[relevantOMS.length - 1].months;

  const scaleX = (months: number) => MARGIN + (months / monthRange) * CONTENT_WIDTH;
  const scaleY = (val: number) => chartBottom - ((val - minVal) / (maxVal - minVal)) * (height - 5);

  // Draw OMS percentile lines (p3, p50, p97)
  const percentiles: { key: keyof OMSDataPoint; label: string }[] = [
    { key: 'p3', label: 'p3' },
    { key: 'p50', label: 'p50' },
    { key: 'p97', label: 'p97' },
  ];

  for (const perc of percentiles) {
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    for (let i = 1; i < relevantOMS.length; i++) {
      doc.line(
        scaleX(relevantOMS[i - 1].months),
        scaleY(relevantOMS[i - 1][perc.key] as number),
        scaleX(relevantOMS[i].months),
        scaleY(relevantOMS[i][perc.key] as number)
      );
    }
    // Label
    const last = relevantOMS[relevantOMS.length - 1];
    doc.setFontSize(5);
    doc.setTextColor(180, 180, 180);
    doc.text(perc.label, scaleX(last.months) + 1, scaleY(last[perc.key] as number) + 1);
  }

  // Draw baby's weight points
  doc.setFillColor(...PURPLE);
  for (let i = 0; i < measurements.length; i++) {
    const m = measurements[i];
    const cx = scaleX(m.months);
    const cy = scaleY(m.value);
    doc.circle(cx, cy, 1.2, 'F');

    // Connect with lines
    if (i > 0) {
      doc.setDrawColor(...PURPLE);
      doc.setLineWidth(0.5);
      const prev = measurements[i - 1];
      doc.line(scaleX(prev.months), scaleY(prev.value), cx, cy);
    }
  }

  // X axis label
  doc.setFontSize(6);
  doc.setTextColor(...GRAY);
  doc.text('Meses', MARGIN + CONTENT_WIDTH / 2, chartBottom + 4, { align: 'center' });

  return chartBottom + 5;
}

function drawFooter(doc: jsPDF, pageNum: number): void {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(
    'Dados registrados pelos cuidadores via app Yaya Baby. Nao substitui avaliacao clinica.',
    MARGIN,
    PAGE_HEIGHT - 10
  );
  doc.text(`Pag ${pageNum}/2`, PAGE_WIDTH - MARGIN - 10, PAGE_HEIGHT - 10);
}
