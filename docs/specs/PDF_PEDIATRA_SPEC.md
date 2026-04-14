# Yaya — Relatório PDF para Pediatra
**Versão:** 2.0 | **Data:** 2026-04-11

---

## Decisões de Produto

- **Formato:** Máximo 2 páginas. Visual, objetivo, premium.
- **Período:** Últimos 30 dias (padrão) ou personalizado
- **Tom:** Observações e dados, NUNCA conclusões ou diagnósticos
- **Feature:** Yaya+ (botão "Preparar para consulta")
- **Compartilhamento:** WhatsApp, email, salvar no dispositivo
- **Amamentação:** NÃO mede duração (não é feature do app hoje). Pode virar insight futuro para primeiros meses.

---

## Visão estratégica: PDF como ponte para a Caderneta Digital

O PDF é a **v1 do relacionamento Yaya ↔ Pediatra**. Funciona sozinho (pai gera e leva pra consulta), mas é desenhado para evoluir para a Caderneta Digital Colaborativa descrita no documento de canais profissionais.

### Evolução planejada:

```
v1 (agora) — PDF gerado pelo pai
  └→ Pai gera, leva pro pediatra no celular ou impresso
  └→ Pediatra vê dados reais pela primeira vez → "que app é esse?"

v2 (futuro) — Caderneta Digital com painel do pediatra
  └→ Pediatra acessa via web, registra peso/altura/vacina/observações
  └→ Dados do pediatra aparecem no PDF junto com dados dos pais
  └→ PDF vira relatório bidirecional: dados dos pais + anotações do pediatra

v3 (futuro) — Prescrição de função
  └→ Pediatra prescreve acompanhamento específico (sono, alimentação)
  └→ Função liberada por 30 dias no app dos pais
  └→ PDF seguinte reflete o período prescrito
```

### O que isso muda no PDF v1:
- Deixar espaço visual para "Dados do pediatra" (vazio agora, preenchido no v2)
- Campo "Observações do pediatra" com área em branco (impresso) ou editável (digital)
- Rodapé com "Quer que seu pediatra acompanhe pelo Yaya? Saiba mais em yayababy.app/pediatra"
- QR code discreto no rodapé apontando para landing page do pediatra (futura)

---

## Linguagem: observações, não conclusões

### REGRA ABSOLUTA:
O PDF apresenta dados e observações. Nunca faz diagnóstico, nunca sugere que algo está "errado", nunca usa termos médicos que impliquem condição clínica.

| ❌ Proibido | ✅ Permitido |
|---|---|
| "Sono insuficiente" | "Sono total abaixo da faixa de referência OMS para a idade" |
| "Amamentação irregular" | "Intervalo médio entre amamentações variou de 1h40 a 4h20" |
| "Desenvolvimento atrasado" | Não incluir — marco não registrado ≠ marco não atingido |
| "Alerta: peso abaixo do esperado" | "Peso no percentil 10 da curva OMS" (sem qualificação) |
| "Recomendamos..." | Nunca. O app não recomenda nada médico. |

Rodapé obrigatório em todas as páginas:
> "Dados registrados pelos cuidadores via app Yaya Baby. Não substitui avaliação clínica."

---

## Layout — Página 1: Visão Geral

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  [Logo Yaya — roxo]     RELATÓRIO DE ACOMPANHAMENTO     │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │  MIGUEL NUNES                                    │    │
│  │  Nascimento: 28/01/2026 · 2 meses e 13 dias     │    │
│  │  Período: 12/03 — 11/04/2026 (30 dias)          │    │
│  │  Registros no período: 487                       │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ── RESUMO DO PERÍODO ──────────────────────────────    │
│                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │   🍼     │ │   😴     │ │   🧷     │ │   📏     │   │
│  │  8,2x    │ │  14,5h   │ │  7,8x    │ │  3,88kg  │   │
│  │  /dia    │ │  /dia    │ │  /dia    │ │          │   │
│  │          │ │          │ │          │ │  +680g   │   │
│  │ ref OMS: │ │ ref OMS: │ │ ref:     │ │ no       │   │
│  │ 8-12x    │ │ 14-17h   │ │ 6-10x   │ │ período  │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│                                                         │
│  ── AMAMENTAÇÃO ────────────────────────────────────    │
│                                                         │
│  Média: 8,2 amamentações/dia                            │
│  Intervalo médio: 2h55 (diurno) / 3h40 (noturno)       │
│  Lado mais frequente: esquerdo (54%)                    │
│  Tendência: estável (variação < 15% no período)         │
│                                                         │
│  [GRÁFICO: barras — amamentações/dia, 30 dias]          │
│   Linha referência pontilhada: 8 (mín) e 12 (máx)      │
│                                                         │
│  ── SONO ───────────────────────────────────────────    │
│                                                         │
│  Sono médio total: 14,5h/dia                            │
│  Noturno: 9,2h · Diurno: 5,3h                          │
│  Maior bloco contínuo: 4h20                             │
│  Sonecas: 4,1x/dia · Duração média: 1h18               │
│  Observação: sono noturno > diurno nos últimos 10 dias  │
│                                                         │
│  [GRÁFICO: área — sono total/dia, 30 dias]              │
│   Azul escuro = noturno · Azul claro = diurno           │
│   Linha referência: 14h (mín OMS para idade)            │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│  Dados registrados pelos cuidadores via Yaya Baby.      │
│  Não substitui avaliação clínica.            Pág 1/2   │
└─────────────────────────────────────────────────────────┘
```

---

## Layout — Página 2: Fraldas, Crescimento e Observações

```
┌─────────────────────────────────────────────────────────┐
│  [Logo Yaya]    Miguel Nunes · 12/03 — 11/04/2026       │
│                                                         │
│  ── FRALDAS ────────────────────────────────────────    │
│                                                         │
│  Média: 7,8 fraldas/dia (xixi: 5,2 · cocô: 2,6)       │
│  Referência: mínimo 6 fraldas molhadas/dia              │
│                                                         │
│  [MINI GRÁFICO: barras empilhadas xixi/cocô, 30 dias]  │
│                                                         │
│  ── CRESCIMENTO ────────────────────────────────────    │
│                                                         │
│  ┌────────────────────┐  ┌────────────────────┐         │
│  │ PESO               │  │ COMPRIMENTO        │         │
│  │ Atual: 3,88 kg     │  │ Atual: 55 cm       │         │
│  │ Nascimento: 3,20kg │  │ Nascimento: 49 cm  │         │
│  │ Variação: +680g    │  │ Variação: +6 cm    │         │
│  │ Ganho/semana: 170g │  │                    │         │
│  │ Percentil: ~p50    │  │ Percentil: ~p45    │         │
│  └────────────────────┘  └────────────────────┘         │
│                                                         │
│  [GRÁFICO: curva peso vs OMS (p3, p15, p50, p85, p97)] │
│   Pontos roxos = pesagens registradas                   │
│   Curvas OMS em cinza claro                             │
│                                                         │
│  ── PADRÕES OBSERVADOS NO PERÍODO ──────────────────    │
│                                                         │
│  • Sono noturno consistentemente > sono diurno          │
│    nos últimos 10 dias                                  │
│  • Amamentações estáveis (variação < 15%)               │
│  • Ganho de peso de 170g/semana                         │
│    (referência OMS para a idade: 150–200g/semana)       │
│  • Bloco noturno mais longo: 4h20                       │
│    (média da faixa etária: 4–6h)                        │
│                                                         │
│  ── DADOS DO PEDIATRA ──────────────────────────────    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │                                                  │    │
│  │  (Espaço reservado para anotações da consulta)  │    │
│  │                                                  │    │
│  │  Na próxima versão do Yaya, seu pediatra poderá │    │
│  │  preencher este espaço diretamente pelo app.    │    │
│  │                                                  │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│  Dados registrados pelos cuidadores via Yaya Baby.      │
│  Não substitui avaliação clínica.                       │
│                                                         │
│  Quer que seu pediatra acompanhe pelo Yaya?             │
│  Saiba mais: yayababy.app/pediatra  [QR CODE]           │
│                                                 Pág 2/2 │
└─────────────────────────────────────────────────────────┘
```

---

## Elementos de Design

### Paleta:
| Elemento | Cor |
|---|---|
| Header/títulos | #1a1a2e |
| Accent (dados, linhas) | #7C4DFF |
| Referência "dentro da faixa" | #4CAF50 (verde discreto) |
| Referência "fora da faixa" | #FFB300 (amber, sem alarme) |
| Curvas OMS | #E0E0E0 |
| Background cards | #F5F5F5 |
| Texto corpo | #333333 |

### Tipografia:
- Título principal: Inter Bold 16pt
- Seções: Inter SemiBold 12pt
- Corpo: Inter Regular 10pt
- Números grandes (cards): Inter Bold 24pt
- Disclaimer/footer: Inter Light 8pt

### Gráficos:
- Minimalistas, sem grid pesado
- Roxo (#7C4DFF) para dados do bebê
- Cinza claro para referências OMS
- Labels diretos no gráfico
- Barras com border-radius suave

---

## Dados Necessários

| Dado | Fonte | Cálculo |
|---|---|---|
| Amamentações/dia | events type='feeding' | COUNT por dia, média 30d |
| Intervalo entre amamentações | Diferença timestamps consecutivos | AVG separado dia/noite |
| Lado frequente | events.metadata.side | COUNT left/right/both |
| Sono total/dia | events type='sleep' | SUM duration por dia |
| Sono noturno vs diurno | Hora 20h-8h vs 8h-20h | SUM por período |
| Maior bloco contínuo | MAX(duration) sleep | Por semana |
| Sonecas/dia | COUNT sleep diurnos | Média |
| Fraldas/dia | events type='diaper' | COUNT, split wet/dirty |
| Peso | measurements type='weight' | Último + variação |
| Altura | measurements type='height' | Último |
| Percentis OMS | JSON estático por idade/sexo | Interpolação |
| Total registros | COUNT todos os events | Total do período |

**Nota sobre duração de amamentação:** o app hoje não mede duração. Se no futuro passar a medir, incluir no relatório. Por enquanto, mostrar apenas contagem e intervalos.

---

## Fluxo do Usuário

```
Perfil do bebê
  └→ Botão "📋 Preparar para consulta"
       └→ Tela de configuração:
            - Período: [Últimos 30 dias ▼] [Personalizar]
            - Incluir: ☑ Amamentação ☑ Sono ☑ Fraldas ☑ Crescimento
            - [Preview miniatura]
            └→ Botão "Gerar relatório"
                 └→ Loading (2-3 seg)
                      └→ PDF pronto!
                           ├→ 📱 Compartilhar via WhatsApp
                           ├→ ✉️ Enviar por email
                           └→ 💾 Salvar no dispositivo
```

---

## Geração Técnica

### Opção recomendada: react-pdf (@react-pdf/renderer)

```
- Gera PDF client-side (Capacitor)
- Funciona offline
- Gráficos via SVG inline
- Rápido (2-3 segundos)
```

### Gráficos:
- SVG puro (compatível com react-pdf)
- Barras, áreas e linhas são simples em SVG
- Curva OMS: JSON com pontos pré-calculados → path SVG
- Sem dependência de Chart.js (não funciona em react-pdf)

### Dados OMS (JSON estáticos no app):
```
who_weight_boys.json — p3, p15, p50, p85, p97 (0-24m)
who_weight_girls.json
who_length_boys.json
who_length_girls.json
```

---

## Feature Gate

| Elemento | Free | Yaya+ |
|---|---|---|
| Botão "Preparar para consulta" | Visível (paywall ao clicar) | ✅ |
| Preview página 1 | Com blur forte | Sem blur |
| Gerar PDF | ❌ | ✅ |
| Compartilhar | ❌ | ✅ |

**Upsell:** Preview da página 1 sem blur + página 2 com blur. CTA: "Desbloqueie o relatório completo com Yaya+"

---

## Conexão com Caderneta Digital (futuro)

Quando o painel do pediatra existir, o PDF será enriquecido com:

| Dado | Quem registra | Onde aparece no PDF |
|---|---|---|
| Amamentação, sono, fraldas | Pais/cuidadores | Página 1 |
| Peso, altura, PC | Pediatra (medição oficial) | Página 2 — Crescimento |
| Vacinas aplicadas | Pediatra | Nova seção ou página 2 |
| Observações clínicas | Pediatra | "Dados do pediatra" |
| Função prescrita ativa | Pediatra | Badge no header |

Até lá, peso/altura são registrados pelos pais (se disponível no app).
