# Trilha de Descoberta v2 — Referência de Copy

**Versão:** 2.0 | **Data:** maio/2026  
**Para revisão do agente de copy** — lista completa de textos visíveis ao usuário organizados por momento (antes / durante / depois) para cada passo da trilha, mais nudges e spotlights.

---

## Trilha de Descoberta — Labels (visíveis na lista)

| Step ID | Label exibido |
|---|---|
| Passo 0 — fixo | "Criou o perfil de [nome]" |
| `record` | "Acompanhe tudo em um lugar" |
| `routine` | "Ajuste para a rotina do [nome]" |
| `insights` (0-3m) | "Descubra os padrões do [nome]" |
| `milestones` (3-12m) | "Acompanhe o desenvolvimento do [nome]" |
| `leaps` (12m+) | "Explore os saltos do [nome]" |
| `yaia` | "Tenha uma IA que conhece o [nome]" |
| `invite` | "Cuide junto com quem você confia" |
| `report` | "Compartilhe a rotina com o pediatra" |

**Token:** `[nome]` é substituído pelo nome do bebê na renderização.

---

## Passo `record` — Acompanhe tudo em um lugar

### Antes
> *(sem sheet — o label é o "antes". Tocar no passo não abre sheet; user já está na home.)*

### Durante
Usuário está na home e interage com o ActivityGrid naturalmente.

### Depois (mini-card inline, ~5s)
> "Pronto. O Yaya começou a acompanhar o [nome]. Cada registro vai tornando os padrões mais claros."

---

## Passo `routine` — Ajuste para a rotina do [nome]

### Antes — `RoutineIntroSheet`

**Header:**
- Emoji: ⚙️
- Título: "A rotina [de/do] [nome]"
- Subtítulo: "Configure uma vez, o Yaya trabalha sempre"

**Corpo:**
> "Cada bebê tem um ritmo. Quando você conta esse ritmo para o Yaya, ele passa a entender o que é normal — e o que mudou."

**Itens:**
1. ⏱️ **Alertas no momento certo** — "O Yaya usa o intervalo que você definiu para avisar quando está chegando a hora — sem alarme fixo, sem interrupção desnecessária."
2. 📊 **Insights mais precisos** — "Com os intervalos configurados, o Yaya identifica quando algo está fora do padrão do bebê, não de um padrão genérico."
3. 😴 **Projeção de sono e acordar** — "A duração esperada da soneca ajuda o app a estimar quando o bebê vai acordar e quando deve dormir de novo."
4. 🛁 **Lembrete de banho** — "Você define o horário e recebe um alerta 15 minutos antes. Sem precisar lembrar."
5. 🌙 **Silêncio noturno** — "As notificações ficam pausadas durante o horário de sono — para você não ser acordado à toa."

**CTA:** "Personalizar a rotina [de/do] [nome]"

### Durante
Navega para `/routine`.

### Depois (mini-card inline, ~5s)
> "O Yaya agora conhece a rotina do [nome]. Você vai receber alertas na hora certa — não antes, não depois."

---

## Passo `insights` — Descubra os padrões do [nome] (bucket 0-3m)

### Antes — `InsightsIntroSheet` variante `insights`

**Header:**
- Emoji: ✨
- Título: "Os padrões do [nome]"

**Corpo:**
> "O Yaya analisa tudo que você registra e identifica padrões que passam despercebidos no dia a dia. Quanto tempo o [nome] fica acordado antes de ficar irritado. Em que hora do dia ele come mais. Quando o sono começa a mudar."

**Itens:**
1. 📈 **Padrões de sono** — "Horários, duração e fragmentação — o Yaya identifica o que é normal para o seu bebê."
2. 🍼 **Ritmo de alimentação** — "Frequência e volume ao longo do dia — ajuda a antecipar fome e agitação."
3. ⚠️ **Desvios do padrão** — "Quando algo muda em relação ao histórico, o app destaca antes que você perceba."

**CTA:** "Ver o que o Yaya descobriu"

### Durante
Navega para `/insights`.

### Depois (mini-card inline, ~5s)
> "Isso é o Yaya trabalhando para você. Quanto mais você registrar, mais precisos ficam os padrões do [nome]."

---

## Passo `milestones` — Acompanhe o desenvolvimento do [nome] (bucket 3-12m)

### Antes — `InsightsIntroSheet` variante `milestones`

**Header:**
- Emoji: 🌱
- Título: "O desenvolvimento do [nome]"

**Corpo:**
> "Cada coisa nova que o [nome] faz é um marco. Registrar aqui cria uma linha do tempo que você vai querer olhar para sempre — e que o pediatra usa para acompanhar o desenvolvimento."

**Itens:**
1. 📅 **Linha do tempo do bebê** — "Cada marco fica registrado com a data. Uma memória e uma ferramenta clínica ao mesmo tempo."
2. 🩺 **Dados para o pediatra** — "Os marcos aparecem no Super Relatório — o pediatra vê a evolução sem precisar perguntar."
3. 🎯 **Referências por faixa etária** — "O app mostra o que esperar de cada fase, com base nas diretrizes de desenvolvimento."

**CTA:** "Explorar os marcos"

### Durante
Navega para `/milestones`.

### Depois (mini-card inline, ~5s)
> "Marco registrado. Isso vai para a linha do tempo do [nome] — e para o relatório do pediatra."

---

## Passo `leaps` — Explore os saltos do [nome] (bucket 12m+)

### Antes — `InsightsIntroSheet` variante `leaps`

**Header:**
- Emoji: 🚀
- Título: "Os saltos do [nome]"

**Corpo:**
> "Entre 1 e 2 anos, o bebê passa por mudanças intensas no cérebro — os saltos de desenvolvimento. Cada salto explica semanas de choro, agitação e mudança de sono que, sem contexto, parecem do nada."

**Itens:**
1. 🧠 **O que muda em cada salto** — "O que o [nome] está aprendendo agora — e por que isso explica o comportamento das últimas semanas."
2. 😮‍💨 **Semanas difíceis com contexto** — "Quando você entende o salto, a agitação vira informação, não motivo de preocupação."
3. ⏳ **Quando passa** — "Cada salto tem duração estimada. O app mostra em que ponto vocês estão."

**CTA:** "Ver em que fase o [nome] está"

### Durante
Navega para `/saltos`.

### Depois (mini-card inline, ~5s)
> "Faz sentido, né? Quando você entende o salto, a agitação do [nome] vira informação, não mistério."

---

## Passo `yaia` — Tenha uma IA que conhece o [nome]

### Antes — `YaIATrailSheet`

**Header:**
- Emoji: 🤖
- Título: "A yaIA conhece o [nome]"
- Subtítulo: "Pode perguntar qualquer coisa, qualquer hora"

**Corpo:**
> "Ela tem acesso a tudo que você registrou — sono, alimentação, fraldas, marcos de desenvolvimento. Não é uma IA genérica: ela conhece a rotina do [nome]."

**Exemplos de perguntas (variam por faixa etária):**

*0-3m:*
- "Por que o [nome] está dormindo menos que o normal?"
- "Isso que ele está fazendo é normal para essa idade?"
- "Quanto tempo um bebê de [X] semanas fica acordado?"

*3-12m:*
- "O [nome] comeu bem essa semana?"
- "Quando devo introduzir alimentos sólidos?"
- "Por que ele está mais agitado essa semana?"

*12m+:*
- "O [nome] está dormindo o suficiente?"
- "O que esperar do próximo salto de desenvolvimento?"
- "Quais palavras ele deveria estar falando já?"

**Nota de privacidade (texto 10px discreto):**
> "Ao continuar, o Yaya usa os dados registrados para personalizar as respostas."

**CTA:** "Perguntar para a yaIA"

*Nota técnica: ao clicar no CTA, o consent LGPD é marcado automaticamente — `YaIAIntroModal` não aparece em sequência.*

### Durante
Navega para `/yaia`.

### Depois (mini-card inline, ~5s)
> "Agora você tem uma IA que conhece a rotina completa do [nome]. Pode voltar quando quiser perguntar qualquer coisa."

---

## Passo `invite` — Cuide junto com quem você confia

### Antes — `FamilyInviteSheet` (tela 1 de 2)

**Header:**
- Emoji: 👨‍👩‍👦
- Título: "Cuide junto de [nome]"
- Subtítulo: "Convide quem faz parte da rotina"

*(Copy completo está no componente FamilyInviteSheet — inclui 4 benefícios com emoji e o passo a passo de entrada.)*

### Durante
Tela 2 da sheet: código gerado + botão compartilhar (WhatsApp/Share nativo) + copiar.

### Depois (mini-card inline, ~5s)
> "Quando alguém aceitar, vai ver a rotina do [nome] em tempo real. Ninguém mais fica sem saber o que aconteceu."

---

## Passo `report` — Compartilhe a rotina com o pediatra

### Antes — `ReportIntroSheet`

**Header:**
- Emoji: 📋
- Título: "O pediatra vai chegar informado"
- Subtítulo: "Toda a rotina do [nome] em um link"

**Itens:**
1. 😰 **O problema** — "A maioria dos pais chega na consulta sem lembrar o que aconteceu na última semana. O pediatra examina sem contexto."
2. 🔗 **A solução** — "Você gera um link com toda a rotina registrada — sono, alimentação, fraldas, vacinas e marcos. Envia antes da consulta."
3. 🩺 **O pediatra chega informado** — "Ele acessa o relatório antes ou durante a consulta. A conversa começa com dados, não com memória."
4. 🔒 **Seguro e controlado** — "O link tem senha e expira em 30 dias. Você decide quem acessa e por quanto tempo."

**CTA:** "Gerar link para o pediatra"

### Durante
Navega para `/profile` (onde fica a seção Super Relatório).

### Depois (mini-card inline, ~5s)
> "Esse link tem toda a rotina registrada. Na próxima consulta, o pediatra vai chegar com contexto, não só com a balança."

---

## Celebração final — `TrailCompletionSheet`

Aparece uma vez ao completar todos os passos.

**Título:**
> "Você descobriu tudo que o Yaya tem para o [nome]."

**Subtítulo:**
> "A partir daqui, ele vai ficando mais inteligente a cada registro."

**Seção "O que muda a partir de agora":**
1. 📈 "Os insights ficam mais precisos conforme você registra"
2. 🤖 "A yaIA aprende com a rotina ao longo do tempo"
3. 👨‍👩‍👦 "Quem está no grupo vê tudo em tempo real, sem precisar perguntar"
4. 📋 "O relatório para o pediatra está sempre a um link de distância"
5. 🌱 "Cada marco registrado fica para sempre na história do bebê"

**CTA:** "Ótimo, vamos lá!"

---

## Contextual Nudges (aparecem após os 14 dias da trilha)

| ID | Emoji | Título | Subtítulo |
|---|---|---|---|
| `nudge_family` | 👨‍👩‍👦 | "[nome] tem mais gente que cuida, né?" | "Chame o pai, mãe ou avó — eles veem a rotina em tempo real." |
| `nudge_family_remind` | 👥 | "O convite ainda está aberto" | "Parece que ninguém entrou ainda. Quer mandar de novo?" |
| `nudge_insights` | ✨ | "Já dá pra ver um padrão" | "Quer ver o que o Yaya descobriu sobre a rotina [de/do] [nome]?" |
| `nudge_yaia` | 🤖 | "Pergunte sobre [nome]" | "A yaIA tem o contexto completo [de/do] [nome] — sono, alimentação, marcos e mais." |
| `nudge_report` | 📋 | "Quer compartilhar com o pediatra?" | "Crie um link com os marcos, vacinas e evolução [de/do] [nome]." |

*Nota: [de/do] varia com o gênero do bebê via `contractionDe()`.*

---

## Feature Spotlights (primeira visita a telas de alto valor)

### InsightsPage
**Chave:** `yaya_spotlight_insights_${babyId}`  
**Condição:** apenas se `logs.length > 0`

- Emoji: ✨
- Título: *(configurável via prop)*
- Descrição: *(configurável via prop)*

*(Implementado via `SpotlightOverlay` com props da InsightsPage)*

### SharedReports (Super Relatório)
**Chave:** `yaya_spotlight_reports_${babyId}`

- Emoji: 📋
- Título: *(configurável via prop)*
- Descrição: *(configurável via prop)*

*(Implementado via `SpotlightOverlay` com props do SharedReports)*

---

## Notas para o agente de copy

- **Tom geral:** companheiro que acompanha a rotina junto, não app se explicando. Foco no problema que resolve, não na feature.
- **"Antes":** responde "o que eu ganho?" — nunca "como funciona?". Concreto, não abstrato.
- **"Durante":** zero instrução verbal — o CTA é o caminho mais óbvio.
- **"Depois":** projeta o futuro ("a partir daqui..."), não confirma ação ("salvo com sucesso").
- **Proibido:** em-dash (—), gerúndio excessivo, linguagem de produto ("funcionalidade", "feature", "módulo").
- **Preferir:** frases curtas, ativas, com sujeito claro. "O Yaya sabe" > "é possível visualizar".
