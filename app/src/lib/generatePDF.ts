import { jsPDF } from 'jspdf';
import type { PDFData } from '../hooks/usePDFData';
import type { Baby } from '../types';
import { formatAge } from './formatters';
import { getOMSWeight, type OMSDataPoint } from './omsData';

// ─── PALETA PREMIUM ────────────────────────────
const PURPLE: [number, number, number] = [124, 77, 255];
const PURPLE_LIGHT: [number, number, number] = [183, 159, 255];
const PURPLE_BG: [number, number, number] = [248, 245, 255];
const DARK: [number, number, number] = [26, 26, 46];
const TEXT_BODY: [number, number, number] = [51, 51, 51];
const GRAY: [number, number, number] = [120, 120, 130];
const GRAY_LIGHT: [number, number, number] = [200, 200, 205];
const CARD_BG: [number, number, number] = [248, 248, 252];
const WHITE: [number, number, number] = [255, 255, 255];
const GREEN_SOFT: [number, number, number] = [76, 175, 80];
const AMBER_SOFT: [number, number, number] = [255, 179, 0];
const BLUE_CHART: [number, number, number] = [100, 180, 255];
const BROWN_CHART: [number, number, number] = [180, 130, 80];

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 16;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

// ─── MAIN EXPORT ───────────────────────────────
export function generatePediatricPDF(data: PDFData, baby: Baby, qrDataUrl?: string): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4');

  // ═══════════════════════════════════════════
  //  PAGINA 1 — Visao Geral + Amamentacao + Sono
  // ═══════════════════════════════════════════

  let y = 0;

  // ── HEADER PREMIUM ──
  y = drawPremiumHeader(doc, baby, data);

  // ── RESUMO DO PERIODO (4 cards) ──
  y = drawSectionHeader(doc, 'RESUMO DO PERIODO', y);
  y = drawSummaryCards(doc, data, y);

  // ── AMAMENTACAO ──
  y = drawSectionHeader(doc, 'AMAMENTACAO', y);
  y = drawFeedingSection(doc, data, y);

  // ── SONO ──
  y = drawSectionHeader(doc, 'SONO', y);
  y = drawSleepSection(doc, data, y);

  // Footer pagina 1
  drawPremiumFooter(doc, 1, 2);

  // ═══════════════════════════════════════════
  //  PAGINA 2 — Fraldas + Crescimento + Padroes
  // ═══════════════════════════════════════════
  doc.addPage();

  // Mini header
  y = drawMiniHeader(doc, baby, data);

  // ── FRALDAS ──
  y = drawSectionHeader(doc, 'FRALDAS', y);
  y = drawDiapersSection(doc, data, y);

  // ── CRESCIMENTO ──
  y = drawSectionHeader(doc, 'CRESCIMENTO', y);
  y = drawGrowthSection(doc, data, baby, y);

  // ── PADROES OBSERVADOS ──
  if (data.patterns.length > 0) {
    y = drawSectionHeader(doc, 'PADROES OBSERVADOS', y);
    y = drawPatternsSection(doc, data, y);
  }

  // ── ESPACO DO PEDIATRA ──
  y = drawPediatriciansSection(doc, y);

  // ── FOOTER COM QR ──
  drawPage2Footer(doc, qrDataUrl);
  drawPremiumFooter(doc, 2, 2);

  return doc;
}

// ═══════════════════════════════════════════════
//  HEADER / FOOTER
// ═══════════════════════════════════════════════

function drawPremiumHeader(doc: jsPDF, baby: Baby, data: PDFData): number {
  // Faixa roxa no topo
  doc.setFillColor(...PURPLE);
  doc.rect(0, 0, PAGE_WIDTH, 42, 'F');

  // Faixa decorativa mais clara
  doc.setFillColor(PURPLE[0] + 30, PURPLE[1] + 30, PURPLE[2]);
  doc.rect(0, 42, PAGE_WIDTH, 2, 'F');

  // Logo YAYA
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...WHITE);
  doc.text('YAYA', MARGIN, 14);

  // Subtitulo
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('RELATORIO DE ACOMPANHAMENTO PEDIATRICO', MARGIN, 20);

  // Linha divisoria sutil
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.15);
  doc.line(MARGIN, 23, PAGE_WIDTH - MARGIN, 23);

  // Info do bebe — sobre fundo roxo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...WHITE);
  doc.text(baby.name.toUpperCase(), MARGIN, 30);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(230, 220, 255);
  const ageText = formatAge(baby.birthDate);
  doc.text(`Nascimento: ${formatDateBR(new Date(baby.birthDate))}  ·  ${ageText}`, MARGIN, 35);

  const periodText = `Periodo: ${formatDateBR(data.periodStart)} — ${formatDateBR(data.periodEnd)}  ·  ${data.totalLogs} registros`;
  doc.text(periodText, MARGIN, 40);

  return 50; // y position after header
}

function drawMiniHeader(doc: jsPDF, baby: Baby, data: PDFData): number {
  // Faixa roxa fina
  doc.setFillColor(...PURPLE);
  doc.rect(0, 0, PAGE_WIDTH, 14, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...WHITE);
  doc.text('YAYA', MARGIN, 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(230, 220, 255);
  doc.text(
    `${baby.name}  ·  ${formatDateBR(data.periodStart)} — ${formatDateBR(data.periodEnd)}`,
    MARGIN + 18, 9
  );

  return 20;
}

function drawPremiumFooter(doc: jsPDF, page: number, totalPages: number): void {
  const footerY = PAGE_HEIGHT - 12;

  // Linha separadora
  doc.setDrawColor(...GRAY_LIGHT);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, footerY - 3, PAGE_WIDTH - MARGIN, footerY - 3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...GRAY);
  doc.text(
    'Dados registrados pelos cuidadores via app Yaya Baby. Nao substitui avaliacao clinica.',
    MARGIN, footerY
  );

  // Pagina
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...PURPLE);
  doc.text(`${page}/${totalPages}`, PAGE_WIDTH - MARGIN, footerY, { align: 'right' });
}

function drawPage2Footer(doc: jsPDF, qrDataUrl?: string): void {
  const footerTop = PAGE_HEIGHT - 36;

  // Faixa CTA
  doc.setFillColor(...PURPLE_BG);
  doc.roundedRect(MARGIN, footerTop, CONTENT_WIDTH, 20, 3, 3, 'F');

  // Borda sutil
  doc.setDrawColor(...PURPLE_LIGHT);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, footerTop, CONTENT_WIDTH, 20, 3, 3, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...PURPLE);
  doc.text('Quer que seu pediatra acompanhe pelo Yaya?', MARGIN + 5, footerTop + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...TEXT_BODY);
  doc.text(
    'Escaneie o QR code para conhecer a plataforma de acompanhamento pediatrico.',
    MARGIN + 5, footerTop + 12
  );

  doc.setFontSize(7);
  doc.setTextColor(...PURPLE);
  doc.setFont('helvetica', 'bold');
  doc.text('yayababy.app/pediatra', MARGIN + 5, footerTop + 17);

  // QR Code
  if (qrDataUrl) {
    try {
      const qrSize = 16;
      const qrX = PAGE_WIDTH - MARGIN - qrSize - 3;
      const qrY = footerTop + 2;
      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
    } catch {
      // QR failed — skip
    }
  }
}

// ═══════════════════════════════════════════════
//  SECTION HEADERS
// ═══════════════════════════════════════════════

function drawSectionHeader(doc: jsPDF, title: string, y: number): number {
  // Bolinha roxa + titulo + linha
  doc.setFillColor(...PURPLE);
  doc.circle(MARGIN + 1.5, y - 1, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...DARK);
  doc.text(title, MARGIN + 5, y);

  // Linha que completa ate o final
  const textW = doc.getTextWidth(title);
  doc.setDrawColor(...PURPLE_LIGHT);
  doc.setLineWidth(0.25);
  doc.line(MARGIN + 5 + textW + 2, y - 1, PAGE_WIDTH - MARGIN, y - 1);

  return y + 5;
}

// ═══════════════════════════════════════════════
//  RESUMO — 4 CARDS
// ═══════════════════════════════════════════════

function drawSummaryCards(doc: jsPDF, data: PDFData, y: number): number {
  const cardW = (CONTENT_WIDTH - 9) / 4;
  const cardH = 30;

  const cards = [
    {
      icon: 'Amamentacao',
      value: data.feeding.avgPerDay.toFixed(1) + 'x',
      sub: 'por dia',
      ref: 'ref OMS: 8-12x',
      inRange: data.feeding.avgPerDay >= 8 && data.feeding.avgPerDay <= 12,
    },
    {
      icon: 'Sono',
      value: formatHours(data.sleep.avgTotalMinutes),
      sub: 'por dia',
      ref: 'ref OMS: 14-17h',
      inRange: data.sleep.avgTotalMinutes >= 840 && data.sleep.avgTotalMinutes <= 1020,
    },
    {
      icon: 'Fraldas',
      value: data.diapers.avgPerDay.toFixed(1) + 'x',
      sub: 'por dia',
      ref: 'ref: 6-10x',
      inRange: data.diapers.avgPerDay >= 6 && data.diapers.avgPerDay <= 10,
    },
    {
      icon: 'Peso',
      value: data.growth?.currentWeight ? data.growth.currentWeight.toFixed(2) + 'kg' : '--',
      sub: data.growth?.weightGain != null ? `+${(data.growth.weightGain * 1000).toFixed(0)}g no periodo` : '',
      ref: data.growth?.weightPercentile ? `Percentil ${data.growth.weightPercentile}` : 'Sem registro',
      inRange: true,
    },
  ];

  cards.forEach((card, i) => {
    const x = MARGIN + i * (cardW + 3);

    // Card background
    doc.setFillColor(...CARD_BG);
    doc.roundedRect(x, y, cardW, cardH, 2.5, 2.5, 'F');

    // Borda lateral colorida (indicador visual)
    doc.setFillColor(...PURPLE);
    doc.roundedRect(x, y, 1.2, cardH, 0.6, 0.6, 'F');

    // Label
    doc.setFontSize(6.5);
    doc.setTextColor(...PURPLE);
    doc.setFont('helvetica', 'bold');
    doc.text(card.icon.toUpperCase(), x + 4, y + 5);

    // Valor grande
    doc.setFontSize(16);
    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'bold');
    doc.text(card.value, x + 4, y + 15);

    // Sub
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...GRAY);
    doc.text(card.sub, x + 4, y + 20);

    // Ref com indicador de cor
    if (card.ref !== 'Sem registro') {
      const refColor = card.inRange ? GREEN_SOFT : AMBER_SOFT;
      doc.setFillColor(...refColor);
      doc.circle(x + 5, y + 25.5, 1, 'F');
      doc.setFontSize(6);
      doc.setTextColor(...GRAY);
      doc.text(card.ref, x + 7.5, y + 26.5);
    } else {
      doc.setFontSize(6);
      doc.setTextColor(...GRAY_LIGHT);
      doc.text(card.ref, x + 4, y + 26.5);
    }
  });

  return y + cardH + 6;
}

// ═══════════════════════════════════════════════
//  AMAMENTACAO
// ═══════════════════════════════════════════════

function drawFeedingSection(doc: jsPDF, data: PDFData, y: number): number {
  // Dados textuais
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...TEXT_BODY);

  doc.text(`Media: ${data.feeding.avgPerDay.toFixed(1)} amamentacoes/dia`, MARGIN, y);
  y += 4.5;

  if (data.feeding.avgIntervalDaytime > 0 || data.feeding.avgIntervalNighttime > 0) {
    doc.text(
      `Intervalo medio: ${formatMinutes(data.feeding.avgIntervalDaytime)} (diurno) / ${formatMinutes(data.feeding.avgIntervalNighttime)} (noturno)`,
      MARGIN, y
    );
    y += 4.5;
  }

  const sideText = data.feeding.dominantSide === 'equal'
    ? 'Sem preferencia de lado'
    : `Lado mais frequente: ${data.feeding.dominantSide === 'left' ? 'esquerdo' : data.feeding.dominantSide === 'right' ? 'direito' : 'ambos'}`;
  doc.text(sideText, MARGIN, y);
  y += 4.5;

  // Mamadeira
  if (data.feeding.bottleCount > 0) {
    doc.text(`Mamadeira: ${data.feeding.bottleCount}x (${data.feeding.totalBottleMl}ml total)`, MARGIN, y);
    y += 4.5;
  }

  const trendText = data.feeding.trend === 'stable'
    ? 'Tendencia: estavel (variacao < 15%)'
    : data.feeding.trend === 'increasing'
      ? 'Tendencia: frequencia aumentando'
      : 'Tendencia: frequencia diminuindo';

  // Indicador de trend com cor
  const trendColor = data.feeding.trend === 'stable' ? GREEN_SOFT : AMBER_SOFT;
  doc.setFillColor(...trendColor);
  doc.circle(MARGIN + 1, y - 0.8, 0.8, 'F');
  doc.text(trendText, MARGIN + 3, y);
  y += 6;

  // Grafico de barras
  y = drawPremiumBarChart(doc, data.feeding.dailyCounts.map(d => d.count), y, 26, PURPLE, 'Amamentacoes/dia');

  return y + 4;
}

// ═══════════════════════════════════════════════
//  SONO
// ═══════════════════════════════════════════════

function drawSleepSection(doc: jsPDF, data: PDFData, y: number): number {
  // Dados em 2 colunas usando mini-cards
  const halfW = (CONTENT_WIDTH - 4) / 2;

  // Card sono noturno
  doc.setFillColor(...CARD_BG);
  doc.roundedRect(MARGIN, y, halfW, 18, 2, 2, 'F');
  doc.setFontSize(6.5);
  doc.setTextColor(...PURPLE);
  doc.setFont('helvetica', 'bold');
  doc.text('SONO NOTURNO', MARGIN + 3, y + 4.5);
  doc.setFontSize(12);
  doc.setTextColor(...DARK);
  doc.text(formatHours(data.sleep.avgNocturnalMinutes), MARGIN + 3, y + 11);
  doc.setFontSize(6.5);
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'normal');
  doc.text(`Maior bloco: ${formatMinutes(data.sleep.longestBlockMinutes)}`, MARGIN + 3, y + 15.5);

  // Card sono diurno
  const xRight = MARGIN + halfW + 4;
  doc.setFillColor(...CARD_BG);
  doc.roundedRect(xRight, y, halfW, 18, 2, 2, 'F');
  doc.setFontSize(6.5);
  doc.setTextColor(...PURPLE);
  doc.setFont('helvetica', 'bold');
  doc.text('SONO DIURNO (SONECAS)', xRight + 3, y + 4.5);
  doc.setFontSize(12);
  doc.setTextColor(...DARK);
  doc.text(formatHours(data.sleep.avgDiurnalMinutes), xRight + 3, y + 11);
  doc.setFontSize(6.5);
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.sleep.avgNapsPerDay.toFixed(1)}x/dia · Media: ${formatMinutes(data.sleep.avgNapDuration)}`, xRight + 3, y + 15.5);

  y += 22;

  // Total
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...TEXT_BODY);
  doc.text(`Sono medio total: ${formatHours(data.sleep.avgTotalMinutes)}/dia`, MARGIN, y);
  y += 5;

  // Grafico area
  y = drawPremiumAreaChart(doc, data.sleep.dailyMinutes, y, 26, PURPLE, 'Horas de sono/dia');

  return y + 3;
}

// ═══════════════════════════════════════════════
//  FRALDAS
// ═══════════════════════════════════════════════

function drawDiapersSection(doc: jsPDF, data: PDFData, y: number): number {
  // Info textual
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...TEXT_BODY);
  doc.text(
    `Media: ${data.diapers.avgPerDay.toFixed(1)} fraldas/dia  ·  Xixi: ${data.diapers.avgWetPerDay.toFixed(1)}  ·  Coco: ${data.diapers.avgDirtyPerDay.toFixed(1)}`,
    MARGIN, y
  );
  y += 4.5;

  // Referencia com indicador
  const inRange = data.diapers.avgWetPerDay >= 6;
  doc.setFillColor(...(inRange ? GREEN_SOFT : AMBER_SOFT));
  doc.circle(MARGIN + 1, y - 0.8, 0.8, 'F');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(`Referencia: minimo 6 fraldas molhadas/dia`, MARGIN + 3, y);
  y += 6;

  // Mini grafico empilhado
  y = drawPremiumStackedBarChart(doc, data.diapers.dailyCounts, y, 20);

  return y + 5;
}

// ═══════════════════════════════════════════════
//  CRESCIMENTO
// ═══════════════════════════════════════════════

function drawGrowthSection(doc: jsPDF, data: PDFData, baby: Baby, y: number): number {
  if (!data.growth || (!data.growth.currentWeight && !data.growth.currentHeight)) {
    // Placeholder elegante
    doc.setFillColor(...CARD_BG);
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 16, 2.5, 2.5, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text('Nenhuma medicao de peso ou altura registrada.', MARGIN + 5, y + 7);
    doc.text('Registre na aba Perfil para incluir dados de crescimento no relatorio.', MARGIN + 5, y + 12);
    return y + 22;
  }

  const halfW = (CONTENT_WIDTH - 6) / 2;

  // Card Peso
  if (data.growth.currentWeight) {
    doc.setFillColor(...CARD_BG);
    doc.roundedRect(MARGIN, y, halfW, 30, 2.5, 2.5, 'F');

    // Barra lateral
    doc.setFillColor(...PURPLE);
    doc.roundedRect(MARGIN, y, 1.2, 30, 0.6, 0.6, 'F');

    doc.setFontSize(6.5);
    doc.setTextColor(...PURPLE);
    doc.setFont('helvetica', 'bold');
    doc.text('PESO', MARGIN + 4, y + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...DARK);
    doc.text(`${data.growth.currentWeight.toFixed(2)} kg`, MARGIN + 4, y + 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    let detailY = y + 18;

    if (data.growth.birthWeight) {
      doc.text(`Nascimento: ${data.growth.birthWeight.toFixed(2)} kg`, MARGIN + 4, detailY);
      detailY += 4;
    }
    if (data.growth.weightGain != null) {
      const gain = data.growth.weightGain * 1000;
      doc.text(`Variacao: ${gain >= 0 ? '+' : ''}${gain.toFixed(0)}g`, MARGIN + 4, detailY);
      detailY += 4;
    }
    if (data.growth.weightPercentile) {
      doc.text(`Percentil: ${data.growth.weightPercentile}`, MARGIN + 4, detailY);
    }
  }

  // Card Comprimento
  if (data.growth.currentHeight) {
    const xR = MARGIN + halfW + 6;
    doc.setFillColor(...CARD_BG);
    doc.roundedRect(xR, y, halfW, 30, 2.5, 2.5, 'F');

    // Barra lateral
    doc.setFillColor(...PURPLE_LIGHT);
    doc.roundedRect(xR, y, 1.2, 30, 0.6, 0.6, 'F');

    doc.setFontSize(6.5);
    doc.setTextColor(...PURPLE);
    doc.setFont('helvetica', 'bold');
    doc.text('COMPRIMENTO', xR + 4, y + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...DARK);
    doc.text(`${data.growth.currentHeight.toFixed(1)} cm`, xR + 4, y + 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    let detailY = y + 18;

    if (data.growth.birthHeight) {
      doc.text(`Nascimento: ${data.growth.birthHeight.toFixed(1)} cm`, xR + 4, detailY);
      detailY += 4;
    }
    if (data.growth.heightGain != null) {
      doc.text(`Variacao: +${data.growth.heightGain.toFixed(1)} cm`, xR + 4, detailY);
      detailY += 4;
    }
    if (data.growth.heightPercentile) {
      doc.text(`Percentil: ${data.growth.heightPercentile}`, xR + 4, detailY);
    }
  }

  y += 35;

  // Curva OMS
  if (data.growth.weightHistory.length >= 2) {
    y = drawPremiumOMSCurve(doc, data.growth.weightHistory, baby, y, 38);
    y += 3;
  }

  return y;
}

// ═══════════════════════════════════════════════
//  PADROES OBSERVADOS
// ═══════════════════════════════════════════════

function drawPatternsSection(doc: jsPDF, data: PDFData, y: number): number {
  // Card com fundo sutil
  const patternLines: string[] = [];
  for (const p of data.patterns) {
    const wrapped = doc.splitTextToSize(p, CONTENT_WIDTH - 12);
    patternLines.push(...wrapped);
  }

  const cardH = Math.max(patternLines.length * 4.5 + 6, 14);
  doc.setFillColor(...CARD_BG);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, cardH, 2.5, 2.5, 'F');

  // Barra lateral
  doc.setFillColor(...GREEN_SOFT);
  doc.roundedRect(MARGIN, y, 1.2, cardH, 0.6, 0.6, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_BODY);

  let textY = y + 5;
  for (const pattern of data.patterns) {
    const lines = doc.splitTextToSize(`•  ${pattern}`, CONTENT_WIDTH - 12);
    doc.text(lines, MARGIN + 5, textY);
    textY += lines.length * 4.5;
  }

  return y + cardH + 4;
}

// ═══════════════════════════════════════════════
//  ESPACO DO PEDIATRA
// ═══════════════════════════════════════════════

function drawPediatriciansSection(doc: jsPDF, y: number): number {
  y = drawSectionHeader(doc, 'ANOTACOES DO PEDIATRA', y);

  // Caixa pontilhada elegante
  doc.setDrawColor(...PURPLE_LIGHT);
  doc.setLineWidth(0.3);
  // Desenha borda pontilhada manualmente
  const boxH = 24;
  const dashLen = 2;
  const gapLen = 1.5;

  // Top
  drawDashedLine(doc, MARGIN, y, PAGE_WIDTH - MARGIN, y, dashLen, gapLen);
  // Bottom
  drawDashedLine(doc, MARGIN, y + boxH, PAGE_WIDTH - MARGIN, y + boxH, dashLen, gapLen);
  // Left
  drawDashedLineV(doc, MARGIN, y, MARGIN, y + boxH, dashLen, gapLen);
  // Right
  drawDashedLineV(doc, PAGE_WIDTH - MARGIN, y, PAGE_WIDTH - MARGIN, y + boxH, dashLen, gapLen);

  // Texto placeholder
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY_LIGHT);
  doc.text('Espaco reservado para anotacoes da consulta', MARGIN + 5, y + 8);
  doc.text('Na proxima versao do Yaya, o pediatra podera preencher diretamente pelo app.', MARGIN + 5, y + 13);

  // Linhas de escrita
  doc.setDrawColor(240, 240, 242);
  doc.setLineWidth(0.15);
  for (let lineY = y + 17; lineY < y + boxH - 1; lineY += 5) {
    doc.line(MARGIN + 3, lineY, PAGE_WIDTH - MARGIN - 3, lineY);
  }

  return y + boxH + 4;
}

// ═══════════════════════════════════════════════
//  GRAFICOS PREMIUM
// ═══════════════════════════════════════════════

function drawPremiumBarChart(
  doc: jsPDF,
  values: number[],
  y: number,
  height: number,
  color: [number, number, number],
  _label: string
): number {
  if (values.length === 0) return y;

  const chartLeft = MARGIN;
  const chartRight = PAGE_WIDTH - MARGIN;
  const chartW = chartRight - chartLeft;
  const maxVal = Math.max(...values, 1);
  const barW = chartW / values.length;
  const chartBottom = y + height;

  // Fundo do grafico
  doc.setFillColor(252, 252, 255);
  doc.roundedRect(chartLeft, y, chartW, height, 1.5, 1.5, 'F');

  // Grid lines horizontais (sutis)
  doc.setDrawColor(240, 240, 245);
  doc.setLineWidth(0.1);
  for (let i = 1; i <= 3; i++) {
    const lineY = chartBottom - (height - 3) * (i / 4);
    doc.line(chartLeft + 1, lineY, chartRight - 1, lineY);
  }

  // Barras com gradiente (mais escuras na base)
  values.forEach((val, i) => {
    const barH = (val / maxVal) * (height - 5);
    const x = chartLeft + i * barW;
    if (barH > 0.5) {
      // Barra principal
      doc.setFillColor(color[0], color[1], color[2]);
      doc.setGState(new (doc as any).GState({ opacity: 0.7 }));
      doc.roundedRect(x + 0.4, chartBottom - barH, barW - 0.8, barH, 0.4, 0.4, 'F');
      doc.setGState(new (doc as any).GState({ opacity: 1 }));
    }
  });

  // Labels eixo X (a cada 7 dias)
  doc.setFontSize(5);
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'normal');
  for (let i = 0; i < values.length; i += 7) {
    const x = chartLeft + i * barW + barW / 2;
    doc.text(`${i + 1}`, x, chartBottom + 3, { align: 'center' });
  }
  // Ultimo dia
  if (values.length > 7) {
    const lastX = chartLeft + (values.length - 1) * barW + barW / 2;
    doc.text(`${values.length}`, lastX, chartBottom + 3, { align: 'center' });
  }

  // Label "dias" no eixo
  doc.setFontSize(5);
  doc.setTextColor(...GRAY_LIGHT);
  doc.text('dias', chartLeft + chartW / 2, chartBottom + 6, { align: 'center' });

  return chartBottom + 7;
}

function drawPremiumAreaChart(
  doc: jsPDF,
  data: { date: string; nocturnal: number; diurnal: number }[],
  y: number,
  height: number,
  color: [number, number, number],
  _label: string
): number {
  if (data.length === 0) return y;

  const chartLeft = MARGIN;
  const chartW = CONTENT_WIDTH;
  const maxVal = Math.max(...data.map(d => d.nocturnal + d.diurnal), 1);
  const chartBottom = y + height;
  const stepX = chartW / data.length;

  // Fundo
  doc.setFillColor(252, 252, 255);
  doc.roundedRect(chartLeft, y, chartW, height, 1.5, 1.5, 'F');

  // Grid
  doc.setDrawColor(240, 240, 245);
  doc.setLineWidth(0.1);
  for (let i = 1; i <= 3; i++) {
    const lineY = chartBottom - (height - 3) * (i / 4);
    doc.line(chartLeft + 1, lineY, chartLeft + chartW - 1, lineY);
  }

  // Barras
  data.forEach((d, i) => {
    const totalH = ((d.nocturnal + d.diurnal) / maxVal) * (height - 4);
    const noctH = (d.nocturnal / maxVal) * (height - 4);
    const x = chartLeft + i * stepX;

    // Total (diurno + noturno) - claro
    if (totalH > 0.5) {
      doc.setFillColor(color[0], color[1], color[2]);
      doc.setGState(new (doc as any).GState({ opacity: 0.2 }));
      doc.rect(x + 0.2, chartBottom - totalH, stepX - 0.4, totalH, 'F');
      doc.setGState(new (doc as any).GState({ opacity: 1 }));
    }

    // Noturno - solido
    if (noctH > 0.5) {
      doc.setFillColor(color[0], color[1], color[2]);
      doc.setGState(new (doc as any).GState({ opacity: 0.65 }));
      doc.rect(x + 0.2, chartBottom - noctH, stepX - 0.4, noctH, 'F');
      doc.setGState(new (doc as any).GState({ opacity: 1 }));
    }
  });

  // Legenda
  doc.setFontSize(6);
  doc.setTextColor(...GRAY);
  doc.setFillColor(color[0], color[1], color[2]);
  doc.setGState(new (doc as any).GState({ opacity: 0.65 }));
  doc.roundedRect(chartLeft, chartBottom + 2, 5, 2.5, 0.5, 0.5, 'F');
  doc.setGState(new (doc as any).GState({ opacity: 1 }));
  doc.text('Noturno', chartLeft + 6, chartBottom + 4);

  doc.setFillColor(color[0], color[1], color[2]);
  doc.setGState(new (doc as any).GState({ opacity: 0.2 }));
  doc.roundedRect(chartLeft + 28, chartBottom + 2, 5, 2.5, 0.5, 0.5, 'F');
  doc.setGState(new (doc as any).GState({ opacity: 1 }));
  doc.text('Diurno', chartLeft + 34, chartBottom + 4);

  return chartBottom + 7;
}

function drawPremiumStackedBarChart(
  doc: jsPDF,
  data: { date: string; wet: number; dirty: number }[],
  y: number,
  height: number
): number {
  if (data.length === 0) return y;

  const chartLeft = MARGIN;
  const chartW = CONTENT_WIDTH;
  const maxVal = Math.max(...data.map(d => d.wet + d.dirty), 1);
  const chartBottom = y + height;
  const barW = chartW / data.length;

  // Fundo
  doc.setFillColor(252, 252, 255);
  doc.roundedRect(chartLeft, y, chartW, height, 1.5, 1.5, 'F');

  data.forEach((d, i) => {
    const totalH = ((d.wet + d.dirty) / maxVal) * (height - 3);
    const dirtyH = (d.dirty / maxVal) * (height - 3);
    const x = chartLeft + i * barW;

    // Xixi (azul)
    if (totalH > 0.5) {
      doc.setFillColor(...BLUE_CHART);
      doc.setGState(new (doc as any).GState({ opacity: 0.6 }));
      doc.rect(x + 0.2, chartBottom - totalH, barW - 0.4, totalH, 'F');
      doc.setGState(new (doc as any).GState({ opacity: 1 }));
    }

    // Coco (marrom, empilhado)
    if (dirtyH > 0.5) {
      doc.setFillColor(...BROWN_CHART);
      doc.setGState(new (doc as any).GState({ opacity: 0.7 }));
      doc.rect(x + 0.2, chartBottom - dirtyH, barW - 0.4, dirtyH, 'F');
      doc.setGState(new (doc as any).GState({ opacity: 1 }));
    }
  });

  // Legenda
  doc.setFontSize(6);
  doc.setTextColor(...GRAY);

  doc.setFillColor(...BLUE_CHART);
  doc.setGState(new (doc as any).GState({ opacity: 0.6 }));
  doc.roundedRect(chartLeft, chartBottom + 2, 5, 2.5, 0.5, 0.5, 'F');
  doc.setGState(new (doc as any).GState({ opacity: 1 }));
  doc.text('Xixi', chartLeft + 6, chartBottom + 4);

  doc.setFillColor(...BROWN_CHART);
  doc.setGState(new (doc as any).GState({ opacity: 0.7 }));
  doc.roundedRect(chartLeft + 20, chartBottom + 2, 5, 2.5, 0.5, 0.5, 'F');
  doc.setGState(new (doc as any).GState({ opacity: 1 }));
  doc.text('Coco', chartLeft + 26, chartBottom + 4);

  return chartBottom + 7;
}

function drawPremiumOMSCurve(
  doc: jsPDF,
  weightHistory: { date: string; value: number }[],
  baby: Baby,
  y: number,
  height: number
): number {
  const gender = baby.gender || 'boy';
  const omsData: OMSDataPoint[] = getOMSWeight(gender);
  const birthDate = new Date(baby.birthDate);

  const measurements = weightHistory.map(w => {
    const d = new Date(w.date);
    const ageMonths = (d.getTime() - birthDate.getTime()) / (30.44 * 86400000);
    return { months: Math.max(0, ageMonths), value: w.value };
  });

  const maxMonths = Math.max(...measurements.map(m => m.months), 6);
  const relevantOMS = omsData.filter(p => p.months <= maxMonths + 2);
  if (relevantOMS.length < 2) return y;

  const chartBottom = y + height;
  const chartLeft = MARGIN + 8;
  const chartRight = PAGE_WIDTH - MARGIN;
  const chartW = chartRight - chartLeft;

  const minVal = Math.min(...relevantOMS.map(p => p.p3)) * 0.9;
  const maxVal = Math.max(...relevantOMS.map(p => p.p97)) * 1.05;
  const monthRange = relevantOMS[relevantOMS.length - 1].months;

  const scaleX = (months: number) => chartLeft + (months / monthRange) * chartW;
  const scaleY = (val: number) => chartBottom - ((val - minVal) / (maxVal - minVal)) * (height - 6);

  // Titulo do grafico
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...PURPLE);
  doc.text('CURVA DE PESO — OMS', MARGIN, y + 3);
  y += 2;

  // Fundo
  doc.setFillColor(252, 252, 255);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, height, 2, 2, 'F');

  // Linhas de percentil OMS
  const percentiles: { key: keyof OMSDataPoint; label: string; dash: boolean }[] = [
    { key: 'p3', label: 'P3', dash: true },
    { key: 'p15' as any, label: '', dash: false }, // skip if not available
    { key: 'p50', label: 'P50', dash: false },
    { key: 'p97', label: 'P97', dash: true },
  ];

  for (const perc of percentiles) {
    if (!relevantOMS[0][perc.key]) continue;

    doc.setDrawColor(210, 220, 210);
    doc.setLineWidth(perc.key === 'p50' ? 0.4 : 0.2);

    for (let i = 1; i < relevantOMS.length; i++) {
      doc.line(
        scaleX(relevantOMS[i - 1].months),
        scaleY(relevantOMS[i - 1][perc.key] as number),
        scaleX(relevantOMS[i].months),
        scaleY(relevantOMS[i][perc.key] as number)
      );
    }

    // Label
    if (perc.label) {
      const last = relevantOMS[relevantOMS.length - 1];
      doc.setFontSize(5);
      doc.setTextColor(180, 190, 180);
      doc.setFont('helvetica', 'normal');
      doc.text(perc.label, scaleX(last.months) + 1, scaleY(last[perc.key] as number) + 1);
    }
  }

  // Pontos do bebe — linha conectando
  if (measurements.length >= 2) {
    doc.setDrawColor(...PURPLE);
    doc.setLineWidth(0.7);
    for (let i = 1; i < measurements.length; i++) {
      doc.line(
        scaleX(measurements[i - 1].months),
        scaleY(measurements[i - 1].value),
        scaleX(measurements[i].months),
        scaleY(measurements[i].value)
      );
    }
  }

  // Pontos
  for (const m of measurements) {
    const cx = scaleX(m.months);
    const cy = scaleY(m.value);

    // Halo branco
    doc.setFillColor(...WHITE);
    doc.circle(cx, cy, 1.8, 'F');
    // Ponto roxo
    doc.setFillColor(...PURPLE);
    doc.circle(cx, cy, 1.2, 'F');
  }

  // Eixo X label
  doc.setFontSize(5.5);
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'normal');
  doc.text('meses', chartLeft + chartW / 2, chartBottom + 4, { align: 'center' });

  // Escala no eixo X
  const monthStep = monthRange <= 6 ? 1 : monthRange <= 12 ? 2 : 3;
  for (let m = 0; m <= monthRange; m += monthStep) {
    doc.text(`${m}`, scaleX(m), chartBottom + 2, { align: 'center' });
  }

  // Escala eixo Y (peso em kg)
  const valRange = maxVal - minVal;
  const yStep = valRange <= 5 ? 1 : valRange <= 10 ? 2 : 5;
  for (let v = Math.ceil(minVal); v <= maxVal; v += yStep) {
    const yPos = scaleY(v);
    if (yPos > y + 3 && yPos < chartBottom - 2) {
      doc.setFontSize(5);
      doc.setTextColor(...GRAY_LIGHT);
      doc.text(`${v}kg`, MARGIN, yPos + 1);
    }
  }

  return chartBottom + 5;
}

// ═══════════════════════════════════════════════
//  UTILIDADES
// ═══════════════════════════════════════════════

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

function drawDashedLine(doc: jsPDF, x1: number, y1: number, x2: number, _y2: number, dashLen: number, gapLen: number): void {
  const totalLen = x2 - x1;
  let pos = 0;
  while (pos < totalLen) {
    const start = x1 + pos;
    const end = Math.min(start + dashLen, x2);
    doc.line(start, y1, end, y1);
    pos += dashLen + gapLen;
  }
}

function drawDashedLineV(doc: jsPDF, x1: number, y1: number, _x2: number, y2: number, dashLen: number, gapLen: number): void {
  const totalLen = y2 - y1;
  let pos = 0;
  while (pos < totalLen) {
    const start = y1 + pos;
    const end = Math.min(start + dashLen, y2);
    doc.line(x1, start, x1, end);
    pos += dashLen + gapLen;
  }
}

