# Prompt para Claude Code — Ajustes Landing Page Yaya

> Arquivo: `Landingpage/code.html`
> Leia o `BRAND_BOOK.md` antes de começar para entender a identidade da marca.
> Execute todos os ajustes abaixo na ordem indicada.

---

## AJUSTE 1 — Validar alinhamento com Brand Book

Leia o arquivo `BRAND_BOOK.md` e verifique se o `code.html` está correto em:

**Cores — tokens obrigatórios:**
- Background principal: `#0d0a27` (Yaya Night)
- Cor primária / acentos: `#b79fff` (Yaya Purple)
- Glow / gradientes: `#ab8ffe` (Yaya Glow)
- Accent quente (uso esparso): `#ff96b9` (Yaya Blush)
- Texto principal: `#e7e2ff` (Yaya Cloud) — NUNCA usar `#ffffff`
- Texto secundário: `rgba(231,226,255,0.5)`

**Tipografia:**
- Headlines e logo: `Manrope` ExtraBold/Bold
- Corpo e labels: `Plus Jakarta Sans`
- Garantir que ambas as fontes estão importadas do Google Fonts

**Tom de voz (copy):**
- Acolhedor, como uma amiga que já passou por isso
- Linguagem: "Seu bebê", "Você", "A gente sabe"
- Sem termos técnicos ou frios
- Botões de CTA: "Quero ser avisado", "Começar grátis", "Garantir acesso vitalício"

Corrija qualquer desvio encontrado.

---

## AJUSTE 2 — Adicionar logo e wordmark

O arquivo de logo está em: `Logo/simboloyaya2.png` (símbolo isolado, fundo transparente)

**No header/nav:**
- Substituir qualquer texto simples "Yaya" pelo logo completo
- Estrutura: `<img>` do símbolo (20-24px altura) + texto "yaya" em Manrope ExtraBold ao lado
- Cor do texto: `#e7e2ff`
- Exemplo de implementação:
```html
<div class="logo">
  <img src="../Logo/simboloyaya2.png" alt="Yaya" height="24" />
  <span>yaya</span>
</div>
```

**No footer:**
- Mesma estrutura: símbolo + "yaya"
- Tamanho um pouco menor (18-20px)

**No hero (opcional, se houver espaço):**
- Versão maior do símbolo (48-64px) centralizada acima do headline principal
- Com glow purple sutil ao redor: `filter: drop-shadow(0 0 20px rgba(183,159,255,0.4))`

---

## AJUSTE 3 — Mockups de telas do app

O app ainda não tem screenshots reais. Use **mockups placeholder realistas** que representem as telas do Yaya.

**Para cada mockup de iPhone:**
- Frame do iPhone: use CSS/HTML para simular (sem imagem externa)
  - Container: 280px × 560px, border-radius 40px
  - Borda: 8px solid #2a2750
  - Notch no topo: pequeno retângulo centralizado
  - Fundo interno: `#0d0a27`
- Conteúdo interno simulando as telas (HTML/CSS, não imagem):

**Mockup 1 — Tracker principal:**
```
Header: "Yaya  •  Luna, 47 dias"
Grid 3x2 de botões com ícones:
🤱 Mama esq.  🍼 Mamadeira  💧 Fralda
🌙 Sono       🛁 Banho      ➕ Outro
Card flutuante: "🤱 Última mamada: 2h30 atrás"
```

**Mockup 2 — Timeline do dia:**
```
Header: "Hoje — 6 registros"
Lista vertical de eventos com horário:
• 06:14  🤱 Mama direita · 12min
• 07:30  💧 Fralda · Xixi
• 09:45  🌙 Início do sono
• 11:20  🌙 Acordou · 1h35min
• 12:00  🍼 Mamadeira · 90ml
• 13:15  💧 Fralda · Cocô
```

**Mockup 3 — Insights:**
```
Header: "Insights — Esta semana"
Card: "Sono médio: 14h/dia ↑"
Card: "Mamadas: 8x/dia"
Barra de progresso visual simplificada
Card: "Padrão identificado: dorme melhor após mamada"
```

Cada mockup deve ter:
- Fundo `#0d0a27` internamente
- Textos em `#e7e2ff` e `rgba(231,226,255,0.6)`
- Acentos em `#b79fff`
- Glow sutil embaixo de cada phone frame: `box-shadow: 0 30px 60px rgba(171,142,254,0.2)`

---

## AJUSTE 4 — Mais benefícios no plano pago

Na seção de pricing, o plano **Yaya+** deve listar os seguintes benefícios (com ✓ em `#b79fff`):

```
✓ Histórico ilimitado de registros
✓ Até 4 perfis de bebê (para o próximo filho também)
✓ Cuidadores ilimitados — parceiro, avós, babá
✓ Insights e padrões semanais completos
✓ Relatório PDF para levar ao pediatra
✓ Sem anúncios, para sempre
✓ Backup automático na nuvem
✓ Suporte prioritário
```

Adicionar abaixo da lista, dentro do card, uma linha de reforço:
```
"Menos que uma caixa de fraldas. Para sempre."
```
Em `rgba(231,226,255,0.5)`, tamanho 13px, centralizado.

---

## AJUSTE 5 — Renomear planos

**Substituir em todo o HTML:**

| Antes | Depois |
|-------|--------|
| "Gratuito" | "Yaya Free" |
| "Plano Gratuito" | "Yaya Free" |
| "Free" isolado | "Yaya Free" |
| "Premium" | "Yaya+" |
| "Pro" | "Yaya+" |

O plano gratuito deve mostrar suas limitações de forma honesta mas sem ser negativo:
```
Yaya Free — R$0
• Tracking completo (mama, fralda, sono, banho)
• Histórico dos últimos 7 dias
• 1 perfil de bebê
• 1 cuidador
• Anúncios discretos no rodapé
```

---

## RESULTADO ESPERADO

Após os ajustes:
- [ ] Cores 100% alinhadas com Brand Book (sem branco puro, sem cinza genérico)
- [ ] Logo símbolo + wordmark "yaya" no header e footer
- [ ] 3 mockups de iPhone simulados em HTML/CSS mostrando as telas do app
- [ ] Plano Yaya+ com 8 benefícios + frase de reforço
- [ ] Plano renomeado para "Yaya Free" em todo o arquivo
- [ ] Fontes Manrope + Plus Jakarta Sans carregadas

---

## Arquivos de referência
- `BRAND_BOOK.md` — identidade visual completa
- `Logo/simboloyaya2.png` — símbolo isolado para usar no header/footer
- `Landingpage/code.html` — arquivo a ser editado
- `Landingpage/DESIGN.md` — design system do Stitch (referência visual)
