import { jsPDF } from 'jspdf';
import type { PDFData } from '../hooks/usePDFData';
import type { Baby } from '../types';
import { formatAge, parseLocalDate } from './formatters';
import { getOMSWeight, type OMSDataPoint } from './omsData';

// ─── PALETA PREMIUM (Stitch Design) ────────────
const PRIMARY: [number, number, number] = [124, 77, 255];    // #7C4DFF
const PRIMARY_DARK: [number, number, number] = [99, 44, 229]; // #632CE5
const DARK: [number, number, number] = [26, 26, 46];          // #1A1A2E
const TEXT: [number, number, number] = [73, 68, 85];           // #494455
const GRAY: [number, number, number] = [122, 116, 135];       // #7A7487
const CARD_BG: [number, number, number] = [226, 224, 252];    // #E2E0FC
const SURFACE_LOW: [number, number, number] = [245, 242, 255]; // #F5F2FF
const WHITE: [number, number, number] = [255, 255, 255];
const GREEN: [number, number, number] = [76, 175, 80];        // #4CAF50
const BLUE_CHART: [number, number, number] = [52, 152, 219];  // #3498DB
const PURPLE_CHART: [number, number, number] = [142, 68, 173]; // #8E44AD
const OUTLINE: [number, number, number] = [202, 195, 216];    // #CAC3D8

const PW = 210; // Page width
const PH = 297; // Page height
const ML = 15;  // Margin left
const MR = 15;  // Margin right
const CW = PW - ML - MR; // Content width

export function generatePediatricPDF(data: PDFData, baby: Baby, qrDataUrl?: string): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4');

  // ═════════════════════════════════════
  //  PAGE 1
  // ═════════════════════════════════════

  let y = drawPage1Header(doc, baby, data);
  y = drawKPICards(doc, data, y);
  y = drawFeedingSection(doc, data, y);
  y = drawSleepSection(doc, data, y);
  drawPage1Footer(doc);

  // ═════════════════════════════════════
  //  PAGE 2
  // ═════════════════════════════════════
  doc.addPage();

  y = drawPage2Header(doc, baby);
  y = drawPage2Content(doc, data, baby, y, qrDataUrl);

  return doc;
}

// ═════════════════════════════════════════
//  PAGE 1 — HEADER
// ═════════════════════════════════════════

function drawPage1Header(doc: jsPDF, baby: Baby, data: PDFData): number {
  const headerH = 38;

  // Fundo roxo
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, PW, headerH, 'F');

  // Logo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...WHITE);
  doc.text('YAYA', ML, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text('PEDIATRIC ANALYTICS', ML, 18);

  // Titulo direita
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...WHITE);
  doc.text('RELATORIO DE ACOMPANHAMENTO PEDIATRICO', PW - MR, 13, { align: 'right' });

  // Linha divisoria sutil
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.15);
  const lineY = 22;
  doc.line(PW - MR - 140, lineY, PW - MR, lineY);

  // 4 colunas de info
  const cols = [
    { label: 'PACIENTE', value: baby.name.toUpperCase() },
    { label: 'NASCIMENTO', value: formatDateBR(parseLocalDate(baby.birthDate)) },
    { label: 'IDADE', value: formatAge(baby.birthDate) },
    { label: 'PERIODO', value: `${formatDateShort(data.periodStart)} - ${formatDateShort(data.periodEnd)}` },
  ];

  const colStartX = PW - MR - 140;
  const colSpacing = 35;

  doc.setFont('helvetica', 'normal');
  cols.forEach((col, i) => {
    const x = colStartX + i * colSpacing;
    doc.setFontSize(5.5);
    doc.setTextColor(230, 220, 255);
    doc.text(col.label, x, 26);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...WHITE);
    doc.text(col.value, x, 31);
    doc.setFont('helvetica', 'normal');
  });

  // Linha fina roxa escura embaixo
  doc.setFillColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
  doc.rect(0, headerH, PW, 1.5, 'F');

  return headerH + 6;
}

// ═════════════════════════════════════════
//  PAGE 1 — KPI CARDS (4 cards, ultimo em roxo)
// ═════════════════════════════════════════

function drawKPICards(doc: jsPDF, data: PDFData, y: number): number {
  const cardW = (CW - 9) / 4;
  const cardH = 28;

  const cards = [
    {
      label: 'AMAMENTACAO',
      value: data.feeding.avgPerDay.toFixed(1) + 'x',
      unit: '/dia',
      ref: 'Ref OMS: 8-12x',
      inRange: data.feeding.avgPerDay >= 7 && data.feeding.avgPerDay <= 13,
      hero: false,
    },
    {
      label: 'SONO MEDIO',
      value: formatHours(data.sleep.avgTotalMinutes),
      unit: '/dia',
      ref: 'Ref OMS: 14-17h',
      inRange: data.sleep.avgTotalMinutes >= 780 && data.sleep.avgTotalMinutes <= 1080,
      hero: false,
    },
    {
      label: 'FRALDAS',
      value: data.diapers.avgPerDay.toFixed(1) + 'x',
      unit: '/dia',
      ref: 'Ref: 6-10x',
      inRange: data.diapers.avgPerDay >= 5 && data.diapers.avgPerDay <= 11,
      hero: false,
    },
    {
      label: 'PESO ATUAL',
      value: data.growth?.currentWeight ? data.growth.currentWeight.toFixed(2) + ' kg' : '—',
      unit: '',
      ref: data.growth?.weightGain != null ? `+${(data.growth.weightGain * 1000).toFixed(0)}g periodo` : '',
      inRange: true,
      hero: true,
      percentile: data.growth?.weightPercentile ?? null,
    },
  ];

  cards.forEach((card, i) => {
    const x = ML + i * (cardW + 3);

    if (card.hero) {
      // Card roxo hero
      doc.setFillColor(...PRIMARY);
      doc.roundedRect(x, y, cardW, cardH, 2, 2, 'F');

      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(card.label, x + 3, y + 5.5);

      // Valor grande
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.text(card.value, x + 3, y + 16);

      // Ref + Percentil
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(230, 220, 255);
      doc.text(card.ref, x + 3, y + 21);

      if ((card as any).percentile) {
        // Badge percentil
        doc.setFillColor(255, 255, 255);
        doc.setGState(new (doc as any).GState({ opacity: 0.2 }));
        doc.roundedRect(x + cardW - 14, y + 22, 11, 4.5, 2, 2, 'F');
        doc.setGState(new (doc as any).GState({ opacity: 1 }));
        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...WHITE);
        doc.text((card as any).percentile, x + cardW - 8.5, y + 25.2, { align: 'center' });
      }
    } else {
      // Card normal
      doc.setFillColor(...CARD_BG);
      doc.roundedRect(x, y, cardW, cardH, 2, 2, 'F');

      // Indicador verde/amber
      const dotColor = card.inRange ? GREEN : [255, 179, 0] as [number, number, number];
      doc.setFillColor(...dotColor);
      doc.circle(x + cardW - 5, y + 5, 1.2, 'F');

      // Label
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...TEXT);
      doc.text(card.label, x + 3, y + 5.5);

      // Valor grande
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...DARK);
      const valParts = card.value.split(/(?=[/x])/);
      doc.text(valParts[0], x + 3, y + 16);
      if (card.unit) {
        const valW = doc.getTextWidth(valParts[0]);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(card.unit, x + 3 + valW + 1, y + 16);
      }

      // Ref
      doc.setFontSize(6);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...GRAY);
      doc.text(card.ref, x + 3, y + 22);
    }
  });

  return y + cardH + 6;
}

// ═════════════════════════════════════════
//  PAGE 1 — AMAMENTACAO (sidebar + chart)
// ═════════════════════════════════════════

function drawFeedingSection(doc: jsPDF, data: PDFData, y: number): number {
  // Titulo com linha
  y = drawSectionTitle(doc, 'Amamentacao', y);

  const sidebarW = 38;
  const chartX = ML + sidebarW + 4;
  const chartW = CW - sidebarW - 4;
  const sectionH = 38;

  // Sidebar — 2 mini cards empilhados
  // Card Media Diaria
  doc.setFillColor(...SURFACE_LOW);
  doc.roundedRect(ML, y, sidebarW, 16, 1.5, 1.5, 'F');
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY);
  doc.text('MEDIA DIARIA', ML + 3, y + 4.5);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text(`${data.feeding.avgPerDay.toFixed(1)} sessoes`, ML + 3, y + 11);

  // Card Intervalo Medio
  doc.setFillColor(...SURFACE_LOW);
  doc.roundedRect(ML, y + 19, sidebarW, 16, 1.5, 1.5, 'F');
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY);
  doc.text('INTERVALO MEDIO', ML + 3, y + 23.5);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  const avgInt = data.feeding.avgIntervalDaytime > 0 ? formatMinutes(data.feeding.avgIntervalDaytime) : '--';
  doc.text(avgInt, ML + 3, y + 30);

  // Grafico area direita
  doc.setFillColor(...WHITE);
  doc.setDrawColor(...OUTLINE);
  doc.setLineWidth(0.15);
  doc.roundedRect(chartX, y, chartW, sectionH, 2, 2, 'FD');

  // Titulo do grafico + legenda OMS
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT);
  doc.text('FREQUENCIA DIARIA (30 DIAS)', chartX + 4, y + 4.5);

  // Legenda OMS
  doc.setDrawColor(144, 69, 0); // tertiary
  doc.setLineWidth(0.4);
  drawDashedH(doc, chartX + chartW - 40, y + 3, chartX + chartW - 36, 1.5, 1);
  doc.setFontSize(5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(144, 69, 0);
  doc.text('META OMS (8 MIN)', chartX + chartW - 34, y + 4.5);

  // Barras
  const values = data.feeding.dailyCounts.map(d => d.count);
  const maxVal = Math.max(...values, 1);
  const chartInnerX = chartX + 4;
  const chartInnerW = chartW - 8;
  const chartTop = y + 8;
  const chartBottom = y + sectionH - 5;
  const barAreaH = chartBottom - chartTop;
  const barW = chartInnerW / values.length;

  // Linha referencia OMS (8x)
  const refY = chartBottom - (8 / maxVal) * barAreaH;
  doc.setDrawColor(144, 69, 0);
  doc.setLineWidth(0.3);
  drawDashedH(doc, chartInnerX, refY, chartInnerX + chartInnerW, 2, 1.5);

  // Barras
  values.forEach((val, i) => {
    const barH = (val / maxVal) * barAreaH;
    const x = chartInnerX + i * barW;
    if (barH > 0.3) {
      const opacity = i % 2 === 0 ? 0.5 : 0.85;
      doc.setFillColor(...PRIMARY);
      doc.setGState(new (doc as any).GState({ opacity }));
      doc.rect(x + 0.2, chartBottom - barH, barW - 0.4, barH, 'F');
    }
  });
  doc.setGState(new (doc as any).GState({ opacity: 1 }));

  // X labels
  doc.setFontSize(4.5);
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'normal');
  doc.text('Dia 01', chartInnerX, chartBottom + 3);
  doc.text('Dia 15', chartInnerX + chartInnerW / 2, chartBottom + 3, { align: 'center' });
  doc.text('Dia 30', chartInnerX + chartInnerW, chartBottom + 3, { align: 'right' });

  return y + sectionH + 5;
}

// ═════════════════════════════════════════
//  PAGE 1 — SONO
// ═════════════════════════════════════════

function drawSleepSection(doc: jsPDF, data: PDFData, y: number): number {
  y = drawSectionTitle(doc, 'Higiene do Sono', y);

  // Container principal
  const boxH = 56;
  doc.setFillColor(...WHITE);
  doc.setDrawColor(...OUTLINE);
  doc.setLineWidth(0.15);
  doc.roundedRect(ML, y, CW, boxH, 2, 2, 'FD');

  // Stats row: Noturno | Diurno | Qualidade
  const statsY = y + 3;

  // Icone noturno (quadrado escuro)
  doc.setFillColor(47, 46, 67); // #2F2E43
  doc.roundedRect(ML + 4, statsY, 7, 7, 1.5, 1.5, 'F');
  // Lua icon placeholder - small circle
  doc.setFillColor(...WHITE);
  doc.circle(ML + 7.5, statsY + 3.5, 1.5, 'F');

  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT);
  doc.text('SONO NOTURNO', ML + 13, statsY + 2.5);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text(formatHours(data.sleep.avgNocturnalMinutes), ML + 13, statsY + 7.5);

  // Icone diurno (quadrado roxo)
  const diurX = ML + 55;
  doc.setFillColor(...PRIMARY);
  doc.roundedRect(diurX, statsY, 7, 7, 1.5, 1.5, 'F');
  doc.setFillColor(...WHITE);
  doc.circle(diurX + 3.5, statsY + 3.5, 1.5, 'F');

  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT);
  doc.text('SONO DIURNO', diurX + 9, statsY + 2.5);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text(formatHours(data.sleep.avgDiurnalMinutes), diurX + 9, statsY + 7.5);

  // Qualidade media
  const qualX = PW - MR - 30;
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT);
  doc.text('QUALIDADE MEDIA', qualX, statsY + 2.5);
  const totalSleep = data.sleep.avgTotalMinutes;
  const qualLabel = totalSleep >= 840 ? 'Excelente' : totalSleep >= 720 ? 'Bom' : 'Atencao';
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY);
  doc.text(qualLabel, qualX, statsY + 7.5);

  // Area chart de sono
  const chartY = statsY + 12;
  const chartH = 28;
  const chartBottom = chartY + chartH;
  const sleepData = data.sleep.dailyMinutes;
  const maxSleep = Math.max(...sleepData.map(d => d.nocturnal + d.diurnal), 1);

  // Fundo do chart
  doc.setFillColor(...SURFACE_LOW);
  doc.setGState(new (doc as any).GState({ opacity: 0.3 }));
  doc.roundedRect(ML + 3, chartY, CW - 6, chartH, 1, 1, 'F');
  doc.setGState(new (doc as any).GState({ opacity: 1 }));

  // Grid lines
  doc.setDrawColor(226, 224, 252);
  doc.setLineWidth(0.1);
  for (let g = 1; g <= 3; g++) {
    const gy = chartBottom - chartH * (g / 4);
    doc.line(ML + 3, gy, PW - MR - 3, gy);
  }

  const stepX = (CW - 6) / sleepData.length;

  // Noturno (escuro)
  sleepData.forEach((d, i) => {
    const totalH = ((d.nocturnal + d.diurnal) / maxSleep) * (chartH - 2);
    const noctH = (d.nocturnal / maxSleep) * (chartH - 2);
    const x = ML + 3 + i * stepX;

    // Total (diurno claro)
    if (totalH > 0.3) {
      doc.setFillColor(...PRIMARY);
      doc.setGState(new (doc as any).GState({ opacity: 0.35 }));
      doc.rect(x + 0.15, chartBottom - totalH, stepX - 0.3, totalH, 'F');
    }
    // Noturno (escuro)
    if (noctH > 0.3) {
      doc.setFillColor(47, 46, 67);
      doc.setGState(new (doc as any).GState({ opacity: 0.85 }));
      doc.rect(x + 0.15, chartBottom - noctH, stepX - 0.3, noctH, 'F');
    }
  });
  doc.setGState(new (doc as any).GState({ opacity: 1 }));

  // Label no chart
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('Progressao Mensal de Ciclos', ML + 6, chartBottom - 2);

  // X labels semanas
  doc.setFontSize(5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  const weekLabels = ['Semana 01', 'Semana 02', 'Semana 03', 'Semana 04'];
  weekLabels.forEach((label, i) => {
    const x = ML + 3 + (CW - 6) * (i / (weekLabels.length - 1));
    doc.text(label, x, chartBottom + 3.5, { align: i === 0 ? 'left' : i === weekLabels.length - 1 ? 'right' : 'center' });
  });

  return y + boxH + 4;
}

// ═════════════════════════════════════════
//  PAGE 1 — FOOTER
// ═════════════════════════════════════════

function drawPage1Footer(doc: jsPDF): void {
  const footerY = PH - 18;

  // Faixa de fundo
  doc.setFillColor(239, 236, 255); // surface-container
  doc.rect(0, footerY, PW, 18, 'F');

  // Linha topo
  doc.setDrawColor(...OUTLINE);
  doc.setLineWidth(0.15);
  doc.line(0, footerY, PW, footerY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(...PRIMARY);
  doc.text('YAYA PEDIATRIC ANALYTICS', ML, footerY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.setTextColor(...GRAY);
  doc.text('Este relatorio e um documento informativo e nao substitui a consulta medica.', ML, footerY + 9);
  doc.text('Referencia clinica: WHO Child Growth Standards.', ML, footerY + 12.5);

  // Pagina
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.setTextColor(...GRAY);
  doc.text('PAGINA', PW - MR - 10, footerY + 5);
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text('01', PW - MR - 6, footerY + 12);
  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  doc.setGState(new (doc as any).GState({ opacity: 0.4 }));
  doc.text('/ 02', PW - MR - 1, footerY + 12);
  doc.setGState(new (doc as any).GState({ opacity: 1 }));
}

// ═════════════════════════════════════════
//  PAGE 2 — HEADER
// ═════════════════════════════════════════

function drawPage2Header(doc: jsPDF, baby: Baby): number {
  // Linha inferior com YAYA | Nome
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...PRIMARY);
  doc.text('YAYA', ML, 12);

  // Separador vertical
  doc.setDrawColor(...OUTLINE);
  doc.setLineWidth(0.3);
  doc.line(ML + 16, 7, ML + 16, 14);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text(baby.name, ML + 19, 12);

  // Info direita
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(...GRAY);
  doc.text(`DOB: ${formatDateBR(parseLocalDate(baby.birthDate))}`, PW - MR - 50, 12);
  doc.text(`RELATORIO: ${formatDateShort(new Date())}`, PW - MR, 12, { align: 'right' });

  // Linha separadora
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.5);
  doc.setGState(new (doc as any).GState({ opacity: 0.2 }));
  doc.line(ML, 16, PW - MR, 16);
  doc.setGState(new (doc as any).GState({ opacity: 1 }));

  return 21;
}

// ═════════════════════════════════════════
//  PAGE 2 — CONTEUDO (grid 8+4)
// ═════════════════════════════════════════

function drawPage2Content(doc: jsPDF, data: PDFData, baby: Baby, y: number, qrDataUrl?: string): number {
  // Coluna esquerda: 8/12 = ~118mm
  const leftW = CW * 0.62;
  const rightX = ML + leftW + 6;
  const rightW = CW - leftW - 6;

  // ═══ LEFT COLUMN ═══

  // Crescimento titulo
  let ly = y;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...PRIMARY);
  doc.text('Monitoramento de Crescimento', ML, ly);
  ly += 5;

  // Cards peso + comprimento
  const growthCardW = (leftW - 4) / 2;
  const growthCardH = 28;

  if (data.growth && data.growth.currentWeight) {
    // Card Peso
    doc.setFillColor(...SURFACE_LOW);
    doc.roundedRect(ML, ly, growthCardW, growthCardH, 2, 2, 'F');

    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PRIMARY);
    doc.text('PESO ATUAL', ML + 3, ly + 5);

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    const wVal = data.growth.currentWeight.toFixed(1);
    doc.text(wVal, ML + 3, ly + 14);
    const wValW = doc.getTextWidth(wVal);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('kg', ML + 3 + wValW + 1, ly + 14);

    // Linha divisoria
    doc.setDrawColor(...PRIMARY);
    doc.setLineWidth(0.1);
    doc.setGState(new (doc as any).GState({ opacity: 0.15 }));
    doc.line(ML + 3, ly + 17, ML + growthCardW - 3, ly + 17);
    doc.setGState(new (doc as any).GState({ opacity: 1 }));

    // Nascimento / Percentil
    doc.setFontSize(5.5);
    doc.setTextColor(...GRAY);
    doc.setGState(new (doc as any).GState({ opacity: 0.6 }));
    doc.text('Nascimento', ML + 3, ly + 21);
    doc.text('Percentil', ML + growthCardW - 3, ly + 21, { align: 'right' });
    doc.setGState(new (doc as any).GState({ opacity: 1 }));
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text(data.growth.birthWeight ? `${data.growth.birthWeight.toFixed(1)}kg` : '--', ML + 3, ly + 25);
    doc.setTextColor(...PRIMARY);
    doc.text(data.growth.weightPercentile ?? '--', ML + growthCardW - 3, ly + 25, { align: 'right' });
  }

  if (data.growth && data.growth.currentHeight) {
    // Card Comprimento
    const cx = ML + growthCardW + 4;
    doc.setFillColor(...SURFACE_LOW);
    doc.roundedRect(cx, ly, growthCardW, growthCardH, 2, 2, 'F');

    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PRIMARY);
    doc.text('COMPRIMENTO', cx + 3, ly + 5);

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    const hVal = data.growth.currentHeight.toFixed(1);
    doc.text(hVal, cx + 3, ly + 14);
    const hValW = doc.getTextWidth(hVal);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('cm', cx + 3 + hValW + 1, ly + 14);

    doc.setDrawColor(...PRIMARY);
    doc.setLineWidth(0.1);
    doc.setGState(new (doc as any).GState({ opacity: 0.15 }));
    doc.line(cx + 3, ly + 17, cx + growthCardW - 3, ly + 17);
    doc.setGState(new (doc as any).GState({ opacity: 1 }));

    doc.setFontSize(5.5);
    doc.setTextColor(...GRAY);
    doc.setGState(new (doc as any).GState({ opacity: 0.6 }));
    doc.text('Nascimento', cx + 3, ly + 21);
    doc.text('Percentil', cx + growthCardW - 3, ly + 21, { align: 'right' });
    doc.setGState(new (doc as any).GState({ opacity: 1 }));
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text(data.growth.birthHeight ? `${data.growth.birthHeight.toFixed(1)}cm` : '--', cx + 3, ly + 25);
    doc.setTextColor(...PRIMARY);
    doc.text(data.growth.heightPercentile ?? '--', cx + growthCardW - 3, ly + 25, { align: 'right' });
  }

  if (!data.growth || (!data.growth.currentWeight && !data.growth.currentHeight)) {
    doc.setFillColor(...SURFACE_LOW);
    doc.roundedRect(ML, ly, leftW, 14, 2, 2, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text('Nenhuma medicao registrada. Adicione peso/altura no perfil.', ML + 4, ly + 8);
  }

  ly += growthCardH + 5;

  // Curva OMS
  if (data.growth && data.growth.weightHistory.length >= 2) {
    ly = drawOMSCurve(doc, data.growth.weightHistory, baby, ML, ly, leftW, 60);
    ly += 3;
  }

  // Padroes observados
  if (data.patterns.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...PRIMARY);
    doc.text('Padroes Observados', ML, ly + 2);
    ly += 6;

    // Card com borda esquerda verde
    const patLines: string[] = [];
    for (const p of data.patterns) {
      patLines.push(...doc.splitTextToSize(p, leftW - 14));
    }
    const patCardH = Math.max(data.patterns.length * 8 + 6, 18);

    doc.setFillColor(...SURFACE_LOW);
    doc.roundedRect(ML, ly, leftW, patCardH, 2, 2, 'F');
    // Borda verde esquerda
    doc.setFillColor(...GREEN);
    doc.rect(ML, ly, 1.5, patCardH, 'F');

    let patY = ly + 5;
    for (const pattern of data.patterns) {
      // Icone check verde
      doc.setFillColor(...GREEN);
      doc.circle(ML + 5, patY - 0.5, 1.2, 'F');
      doc.setFillColor(...WHITE);
      // Small check mark approximation
      doc.setFontSize(4);
      doc.setTextColor(...WHITE);
      doc.text('v', ML + 4.4, patY + 0.2);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...DARK);
      const lines = doc.splitTextToSize(pattern, leftW - 14);
      doc.text(lines, ML + 9, patY);
      patY += lines.length * 4 + 3;
    }

    ly += patCardH + 3;
  }

  // ═══ RIGHT COLUMN ═══

  let ry = y;

  // Fraldas
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...PRIMARY);
  doc.text('Higiene: Ultimos 30 dias', rightX, ry);
  ry += 4;

  // Card fraldas
  const diaperCardH = 42;
  doc.setFillColor(...CARD_BG);
  doc.setGState(new (doc as any).GState({ opacity: 0.4 }));
  doc.roundedRect(rightX, ry, rightW, diaperCardH, 2, 2, 'F');
  doc.setGState(new (doc as any).GState({ opacity: 1 }));

  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT);
  doc.text('VOLUME DE TROCAS DIARIAS', rightX + 3, ry + 5);

  // Barras empilhadas fraldas
  const diaperData = data.diapers.dailyCounts;
  const maxDiaper = Math.max(...diaperData.map(d => d.wet + d.dirty), 1);
  const dBarW = (rightW - 8) / diaperData.length;
  const dChartBottom = ry + diaperCardH - 10;
  const dChartH = 22;

  diaperData.forEach((d, i) => {
    const wetH = (d.wet / maxDiaper) * dChartH;
    const dirtyH = (d.dirty / maxDiaper) * dChartH;
    const x = rightX + 4 + i * dBarW;

    if (wetH > 0.2) {
      doc.setFillColor(...BLUE_CHART);
      doc.rect(x, dChartBottom - wetH - dirtyH, dBarW - 0.3, wetH, 'F');
    }
    if (dirtyH > 0.2) {
      doc.setFillColor(...PURPLE_CHART);
      doc.rect(x, dChartBottom - dirtyH, dBarW - 0.3, dirtyH, 'F');
    }
  });

  // Legenda fraldas
  doc.setFontSize(5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GRAY);
  doc.setFillColor(...BLUE_CHART);
  doc.circle(rightX + 4, dChartBottom + 4, 0.8, 'F');
  doc.text(`Xixi (Med. ${data.diapers.avgWetPerDay.toFixed(1)})`, rightX + 6, dChartBottom + 5);
  doc.setFillColor(...PURPLE_CHART);
  doc.circle(rightX + rightW / 2 + 2, dChartBottom + 4, 0.8, 'F');
  doc.text(`Coco (Med. ${data.diapers.avgDirtyPerDay.toFixed(1)})`, rightX + rightW / 2 + 4, dChartBottom + 5);

  ry += diaperCardH + 6;

  // Espaco do Pediatra
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...PRIMARY);
  doc.text('Espaco do Pediatra', rightX, ry);
  ry += 4;

  const pedH = PH - ry - 60; // Preenche ate o footer
  // Caixa pontilhada
  doc.setDrawColor(...OUTLINE);
  doc.setLineWidth(0.4);
  drawDashedRect(doc, rightX, ry, rightW, pedH);

  // Linhas de escrita
  doc.setDrawColor(...OUTLINE);
  doc.setLineWidth(0.1);
  doc.setGState(new (doc as any).GState({ opacity: 0.3 }));
  for (let lineY = ry + 8; lineY < ry + pedH - 18; lineY += 6) {
    doc.line(rightX + 3, lineY, rightX + rightW - 3, lineY);
  }
  doc.setGState(new (doc as any).GState({ opacity: 1 }));

  // Carimbo e assinatura
  doc.setDrawColor(...DARK);
  doc.setLineWidth(0.3);
  const sigY = ry + pedH - 12;
  doc.line(rightX + rightW / 2 - 15, sigY, rightX + rightW / 2 + 15, sigY);
  doc.setFontSize(4.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GRAY);
  doc.text('CARIMBO E ASSINATURA', rightX + rightW / 2, sigY + 3, { align: 'center' });

  // ═══ FOOTER CTA ═══
  drawPage2Footer(doc, qrDataUrl);

  return Math.max(ly, ry);
}

function drawPage2Footer(doc: jsPDF, qrDataUrl?: string): void {
  const footerY = PH - 42;

  // CTA card
  doc.setFillColor(...PRIMARY);
  doc.setGState(new (doc as any).GState({ opacity: 0.05 }));
  doc.roundedRect(ML, footerY, CW, 22, 3, 3, 'F');
  doc.setGState(new (doc as any).GState({ opacity: 1 }));

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...PRIMARY);
  doc.text('Quer que seu pediatra acompanhe pelo Yaya?', ML + 5, footerY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...TEXT);
  doc.text('Compartilhe o historico em tempo real e facilite o diagnostico clinico atraves de dados precisos.', ML + 5, footerY + 12);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...PRIMARY);
  doc.text('yayababy.app/pediatra', ML + 5, footerY + 17);

  // QR code
  if (qrDataUrl) {
    try {
      const qrSize = 15;
      const qrX = PW - MR - qrSize - 5;
      // Fundo branco para QR
      doc.setFillColor(...WHITE);
      doc.roundedRect(qrX - 1, footerY + 2, qrSize + 2, qrSize + 2 + 5, 1.5, 1.5, 'F');
      // Borda sutil
      doc.setDrawColor(...CARD_BG);
      doc.setLineWidth(0.3);
      doc.roundedRect(qrX - 1, footerY + 2, qrSize + 2, qrSize + 2 + 5, 1.5, 1.5, 'S');

      doc.setFontSize(4.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...GRAY);
      doc.text('ACESSO MEDICO', qrX + qrSize / 2, footerY + 4, { align: 'center' });

      doc.addImage(qrDataUrl, 'PNG', qrX, footerY + 5.5, qrSize, qrSize);
    } catch {
      // skip
    }
  }

  // Disclaimer bottom
  const discY = PH - 16;
  doc.setDrawColor(...OUTLINE);
  doc.setLineWidth(0.1);
  doc.line(ML, discY - 2, PW - MR, discY - 2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.setTextColor(...GRAY);
  doc.text('© 2026 YAYA Pediatric Analytics', ML, discY + 1);
  doc.text('WHO Child Growth Standards Reference', ML + 50, discY + 1);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...DARK);
  doc.text('Pagina 2 / 2', PW - MR, discY + 1, { align: 'right' });
}

// ═════════════════════════════════════════
//  CURVA OMS
// ═════════════════════════════════════════

function drawOMSCurve(
  doc: jsPDF,
  weightHistory: { date: string; value: number }[],
  baby: Baby,
  startX: number,
  y: number,
  width: number,
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

  // Titulo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...DARK);
  doc.text('Curva de Peso (OMS)', startX, y);

  // Legenda
  doc.setFontSize(5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.setDrawColor(...OUTLINE);
  doc.setLineWidth(0.3);
  doc.line(startX + width - 42, y - 1, startX + width - 38, y - 1);
  doc.text('P3-P97', startX + width - 36, y);

  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.5);
  doc.line(startX + width - 20, y - 1, startX + width - 16, y - 1);
  doc.setTextColor(...PRIMARY);
  doc.text(baby.name, startX + width - 14, y);

  y += 4;

  // Chart container
  doc.setFillColor(...WHITE);
  doc.setDrawColor(...CARD_BG);
  doc.setLineWidth(0.2);
  doc.roundedRect(startX, y, width, height, 2, 2, 'FD');

  const chartL = startX + 8;
  const chartR = startX + width - 4;
  const chartT = y + 4;
  const chartB = y + height - 8;
  const chartW = chartR - chartL;
  const chartH = chartB - chartT;

  const minVal = Math.min(...relevantOMS.map(p => p.p3)) * 0.85;
  const maxVal = Math.max(...relevantOMS.map(p => p.p97)) * 1.1;
  const monthRange = relevantOMS[relevantOMS.length - 1].months;

  const scaleX = (months: number) => chartL + (months / monthRange) * chartW;
  const scaleY = (val: number) => chartB - ((val - minVal) / (maxVal - minVal)) * chartH;

  // Grid points
  doc.setDrawColor(...OUTLINE);
  doc.setLineWidth(0.05);
  doc.setGState(new (doc as any).GState({ opacity: 0.15 }));
  for (let gx = 0; gx <= monthRange; gx += (monthRange <= 6 ? 1 : 2)) {
    doc.line(scaleX(gx), chartT, scaleX(gx), chartB);
  }
  const valStep = (maxVal - minVal) / 4;
  for (let i = 0; i <= 4; i++) {
    const gy = chartT + chartH * (i / 4);
    doc.line(chartL, gy, chartR, gy);
  }
  doc.setGState(new (doc as any).GState({ opacity: 1 }));

  // Percentil lines
  const percLines: { key: keyof OMSDataPoint; dash: boolean }[] = [
    { key: 'p3', dash: true },
    { key: 'p50', dash: false },
    { key: 'p97', dash: true },
  ];

  for (const perc of percLines) {
    doc.setDrawColor(...OUTLINE);
    doc.setLineWidth(perc.key === 'p50' ? 0.4 : 0.25);

    for (let i = 1; i < relevantOMS.length; i++) {
      if (perc.dash) {
        drawDashedH(doc,
          scaleX(relevantOMS[i - 1].months),
          scaleY(relevantOMS[i - 1][perc.key] as number),
          scaleX(relevantOMS[i].months),
          1, 1
        );
      } else {
        doc.line(
          scaleX(relevantOMS[i - 1].months),
          scaleY(relevantOMS[i - 1][perc.key] as number),
          scaleX(relevantOMS[i].months),
          scaleY(relevantOMS[i][perc.key] as number)
        );
      }
    }
  }

  // Baby curve
  doc.setDrawColor(...PRIMARY_DARK);
  doc.setLineWidth(0.8);
  for (let i = 1; i < measurements.length; i++) {
    doc.line(
      scaleX(measurements[i - 1].months),
      scaleY(measurements[i - 1].value),
      scaleX(measurements[i].months),
      scaleY(measurements[i].value)
    );
  }

  // Data points
  for (const m of measurements) {
    doc.setFillColor(...PRIMARY_DARK);
    doc.circle(scaleX(m.months), scaleY(m.value), 1, 'F');
  }

  // Label "Hoje" no ultimo ponto
  const last = measurements[measurements.length - 1];
  doc.setFontSize(5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY_DARK);
  doc.text(`Hoje: ${last.value.toFixed(1)}kg`, scaleX(last.months) - 1, scaleY(last.value) - 2.5, { align: 'right' });

  // X axis labels
  doc.setFontSize(4.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GRAY);
  const mStep = monthRange <= 6 ? 2 : monthRange <= 12 ? 3 : 6;
  for (let m = 0; m <= monthRange; m += mStep) {
    doc.text(`${Math.round(m)} Meses`, scaleX(m), chartB + 4, { align: 'center' });
  }

  // Y axis labels
  for (let i = 0; i <= 4; i++) {
    const val = maxVal - valStep * i;
    doc.text(`${val.toFixed(0)}kg`, startX + 1, chartT + chartH * (i / 4) + 1);
  }

  return y + height + 2;
}

// ═════════════════════════════════════════
//  HELPERS
// ═════════════════════════════════════════

function drawSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text(title, ML, y);

  const tw = doc.getTextWidth(title);
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.3);
  doc.setGState(new (doc as any).GState({ opacity: 0.2 }));
  doc.line(ML + tw + 3, y - 1, PW - MR, y - 1);
  doc.setGState(new (doc as any).GState({ opacity: 1 }));

  return y + 5;
}

function formatDateBR(date: Date): string {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${d}/${m}/${date.getFullYear()}`;
}

function formatDateShort(date: Date): string {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear().toString().slice(-2);
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
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}min`;
  return `${m}min`;
}

function drawDashedH(doc: jsPDF, x1: number, y1: number, x2: number, dashLen: number, gapLen: number): void {
  let pos = 0;
  const total = x2 - x1;
  while (pos < total) {
    const sx = x1 + pos;
    const ex = Math.min(sx + dashLen, x2);
    doc.line(sx, y1, ex, y1);
    pos += dashLen + gapLen;
  }
}

function drawDashedRect(doc: jsPDF, x: number, y: number, w: number, h: number): void {
  const dash = 2;
  const gap = 1.5;
  // Top
  let pos = 0;
  while (pos < w) { const s = x + pos; const e = Math.min(s + dash, x + w); doc.line(s, y, e, y); pos += dash + gap; }
  // Bottom
  pos = 0;
  while (pos < w) { const s = x + pos; const e = Math.min(s + dash, x + w); doc.line(s, y + h, e, y + h); pos += dash + gap; }
  // Left
  pos = 0;
  while (pos < h) { const s = y + pos; const e = Math.min(s + dash, y + h); doc.line(x, s, x, e); pos += dash + gap; }
  // Right
  pos = 0;
  while (pos < h) { const s = y + pos; const e = Math.min(s + dash, y + h); doc.line(x + w, s, x + w, e); pos += dash + gap; }
}
