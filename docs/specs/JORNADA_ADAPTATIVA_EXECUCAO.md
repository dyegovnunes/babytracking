# Jornada Adaptativa 0–24 meses — Plano de Execução

**Branch:** `jornada-adaptativa`  
**Baseado em:** `docs/specs/JORNADA_ADAPTATIVA_SPEC.md` + revisão crítica do produto  
**Status:** Em planejamento  
**Tags:** `produto` `retenção` `roadmap` `execução`

---

## Contexto e diagnóstico

O app é forte em 0–6 meses porque a rotina do bebê nessa fase **é o produto**: registrar mamada, sono e fralda tem valor diário claro. Depois dos 6 meses a rotina muda, e o app não acompanha — o pai perde o hábito e o churn acontece.

O trabalho desta spec é transformar o Yaya de **tracker de rotina** em **companheiro da primeira infância**. O mecanismo de valor continua o mesmo (registrar → entender → saber o que fazer), mas as atividades, os insights e o contexto do yaIA precisam evoluir a cada fase.

**Princípio inegociável:** nenhuma mudança no grid sem confirmação explícita do pai. Sugestão sempre, imposição nunca.

---

## Fundação técnica (pré-requisito de tudo)

### Grid configurável por bebê

**Por que é bloqueador:** hoje o grid é hardcoded em `TrackerPage.tsx`. Qualquer adição ou remoção de atividade por fase depende de um grid dinâmico armazenado no banco.

**Schema proposto:**
```sql
CREATE TABLE baby_grid_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id      uuid REFERENCES babies(id) ON DELETE CASCADE,
  event_id     text NOT NULL,           -- 'meal', 'mood', 'potty', etc.
  enabled      boolean DEFAULT true,
  sort_order   integer DEFAULT 0,
  suggested_at timestamptz,             -- quando o app sugeriu
  accepted_at  timestamptz,             -- quando o pai aceitou
  dismissed_at timestamptz,             -- quando o pai recusou
  created_at   timestamptz DEFAULT now(),
  UNIQUE (baby_id, event_id)
);
```

**Comportamento:** ao criar o bebê, inserir os itens padrão (breast/bottle, diaper, sleep). Sugestões futuras inserem com `enabled = false` até o pai aceitar. O grid em `TrackerPage` lê desta tabela em vez de uma lista fixa.

**Estimativa:** 1–2 dias. É o maior risco de sequência — tudo de fase 2 em diante depende disso.

---

## Fase 1 — 0 a 6 meses

> Base sólida. Duas entregas cirúrgicas de alto impacto.

### 1.1 — Insight proativo de sono (P0)

**O que é:** o app detecta quando o intervalo entre sonecas aumenta consistentemente por 3+ dias e emite insight proativo na tela de Insights.

**Lógica:**
```
- Calcular média de intervalo entre sonecas dos últimos 7 dias
- Se média dos últimos 3 dias > média dos 7 dias anteriores em 20%+
  → emitir insight "janela de sono se abrindo"
- Se total de sono do dia < 80% da média esperada para a idade
  → emitir insight "sono abaixo do esperado"
```

**Exemplos de texto:**
- "O intervalo entre as sonecas da Sofia aumentou de 1h30 para 2h nos últimos 3 dias. Pode ser a janela de sono se abrindo — hora de testar sonecas mais espaçadas."
- "A Sofia dormiu 11h hoje — abaixo da média de 14–16h para essa idade. Se continuar por mais 2 dias, vale conversar com o pediatra."

**Arquivos a tocar:** `features/insights/insightRules.ts` — adicionar 2–3 novas regras na engine existente.  
**Esforço:** baixo-médio (2–3 dias). A engine de insights já existe.

---

### 1.2 — Regressões de sono antecipadas (NOVO — não estava na spec original)

**O que é:** aviso proativo baseado em idade, **antes** do problema aparecer. As regressões de sono acontecem em idades previsíveis (4m, 8–10m, 12m, 18m).

**Comportamento:** 7–10 dias antes de cada regressão conhecida, o app exibe um card em Insights:
> "A Sofia vai completar 4 meses em 8 dias. Muitos bebês passam por uma regressão de sono nessa fase — o sono pode piorar temporariamente. É normal e passa."

**Por que importa:** reduz a ansiedade antes do problema aparecer. É o tipo de valor que faz o pai pensar "esse app sabe das coisas" — e contar para outros pais.

**Arquivos:** `insightRules.ts` + nova regra baseada em `baby.birth_date`.  
**Esforço:** baixo (1 dia).

---

### 1.3 — Push proativo de sono (P1)

**O que é:** notificação push no fim do dia quando o padrão de sono merece atenção.

**Pré-requisito:** Push Notifications já implementado.  
**Arquivos:** edge function `push-scheduler` + nova categoria de push `sleep_insight`.  
**Esforço:** baixo (1 dia, se push já estiver funcionando).

---

## Fase 2 — 6 a 12 meses (introdução alimentar)

> Principal ponto de churn. Sem registro de refeição, o pai não tem mais o que fazer no app.

### 2.1 — Registro de refeição (P0 CRÍTICO)

**O que é:** novo botão no grid "Refeição" — entra sugerido aos 6 meses.

**Campos:**
- O que comeu (texto livre ou seleção de alimentos comuns)
- Método: papinha / BLW / misto / peito + sólido
- Aceitação: adorou / aceitou / recusou / reação
- Alimento novo: sim/não (se sim, marca como "primeiro contato")
- Reação alérgica: sim/não + campo de observação

**Sugestão automática:** quando `baby.birth_date` indica 6 meses completados → card:
> "A Sofia está pronta para a introdução alimentar! 🥕 Quer adicionar 'Refeição' ao painel?"

**Depende de:** grid configurável (fundação técnica).  
**Esforço:** médio (3–4 dias). Novo event_id `meal`, nova UI no TrackerPage, schema de campos extras no payload de `logs`.

---

### 2.2 — Rastreio de alérgenos (NOVO — não estava na spec original)

**Por que é crítico:** a principal ansiedade da introdução alimentar não é "o que dar" mas "como introduzir com segurança." O protocolo recomendado é: introduzir cada alérgeno isolado, aguardar 3–4 dias antes do próximo alimento novo.

**O que é:** painel visual dos 8 alérgenos principais com status de cada um:
- ✅ Introduzido (data + reação registrada)
- ⏳ Janela ativa (introduzido há N dias — aguardar X dias)
- ⬜ Ainda não testado

**Lógica da janela:** quando um registro de refeição tem `alimento_novo = true`, abre uma janela de 3 dias. Durante a janela, o app exibe aviso discreto no tracker: "Janela de segurança: aguarde mais 2 dias antes de introduzir outro alimento novo."

**Alérgenos mapeados:** leite de vaca, ovo, amendoim, trigo, soja, oleaginosas, peixe, frutos do mar.

**Arquivos:** nova tela dentro de Histórico ou Perfil + lógica em `insightRules.ts`.  
**Esforço:** médio (2–3 dias).

---

### 2.3 — Histórico de alimentos introduzidos (P1)

**O que é:** visualização de todos os alimentos já introduzidos, com data, método e reação.

**Interface:** filtro "Refeição" no Histórico existente — sem tela nova.  
**Esforço:** baixo (1 dia, depende de 2.1).

---

### 2.4 — yaIA com contexto de introdução alimentar (P1)

**O que é:** quando o bebê tem 6m+, o payload do yaIA inclui os últimos N registros de refeição e a lista de alérgenos introduzidos.

**Perguntas que ficam melhores:**
- "Posso dar ovo hoje?" → yaIA sabe se ovo já foi testado
- "O bebê fez uma mancha depois do almoço" → yaIA vê o que foi registrado na refeição daquele dia
- "Quais alimentos ainda faltam introduzir?" → yaIA cruza com o histórico

**Arquivos:** edge function `yaia-chat` — adicionar bloco de contexto alimentar no system prompt quando `baby_age_months >= 6`.  
**Esforço:** baixo (meio dia).

---

### 2.5 — Push de transição dos 6 meses (P1)

**Mensagem:** "A Sofia completou 6 meses! 🥕 É hora da introdução alimentar. Adicionamos uma sugestão de 'Refeição' ao seu painel."

**Esforço:** baixo (integra com push-scheduler existente).

---

### 2.6 — Amamentação simplificada (P2)

**Quando:** bebê com 8m+ E frequência de amamentação caiu 50%+ em relação à média dos primeiros meses.

**Sugestão:** "Notamos que as mamadas da Sofia diminuíram. Quer simplificar para 'Amamentação' em vez de registrar esquerda/direita separado?"

**Esforço:** baixo (1 dia).

---

## Fase 3 — 12 a 18 meses (toddler inicial)

> O app precisa se reposicionar: de tracker para companheiro de desenvolvimento.

### 3.1 — Registro de humor/comportamento (P2)

**O que é:** registro rápido "Como foi o dia" — escala de 3 níveis (😊 / 😐 / 😢) + observação opcional.

**Valor:** o app começa a mostrar padrões comportamentais. "Dias difíceis concentrados às terças — coincide com a creche nova?"

**Sugestão aos 12 meses:** card de boas-vindas à fase toddler.  
**Esforço:** médio (2 dias). Novo event_id `mood`, novo botão no grid.

---

### 3.2 — Modo "criança doente" (NOVO — não estava na spec original)

**Por que importa:** entre 6m e 2 anos os bebês ficam doentes com frequência crescente, especialmente na creche. Nesse momento os pais precisam registrar temperatura, sintomas e horários de remédio — e o app atual não tem um fluxo integrado para isso.

**O que é:** entry especial "Dia difícil / Doença" com:
- Temperatura (com horário — permite acompanhar evolução)
- Sintomas (lista de opções: febre, coriza, tosse, vômito, diarreia, outros)
- Campo de observação livre

**Integração:** quando registrado, o módulo de medicamentos fica destacado no tracker ("Lembretes de remédio ativos"). O relatório para o pediatra inclui a linha do tempo de sintomas e temperatura.

**Esforço:** médio (2–3 dias). Amplia o schema de `logs` ou tabela dedicada.

---

### 3.3 — Marco de linguagem (P2)

**O que é:** registro de primeira palavra, primeiras frases e vocabulário estimado — dentro de Marcos de Desenvolvimento.

**Campos:** palavra/frase, data, contexto (opcional), áudio curto (opcional, futuro).

**Valor:** clínico (pediatra pergunta na consulta de 12 e 15 meses) + emocional (memória da família).  
**Esforço:** baixo (1 dia, amplia Marcos existente).

---

### 3.4 — Dimensão do casal (NOVO — não estava na spec original)

**Por que importa:** depois de 6 meses muitos pais voltam ao trabalho e a carga muda. Uma das maiores fontes de conflito é a sensação de desequilíbrio — "quem está fazendo mais." O app já sabe isso porque tem multi-usuário com registros por autor.

**O que é:** seção discreta no Perfil/Relatório mostrando a distribuição de registros por membro:
> "Esta semana: Ana fez 68% dos registros, Marcos 32%."

**Não é** acusação — é dado, apresentado com contexto neutro. O objetivo é duplo:
1. Criar conversa dentro do casal
2. Incentivar o segundo pai a usar mais o app (o que dobra a retenção por família)

**Esforço:** baixo (1 dia, query sobre `logs.created_by`).

---

### 3.5 — Amamentação sai sugerida (P2)

**Quando:** bebê com 12m+ E sem registro de amamentação por 30+ dias.

**Mensagem:** "Não vemos registros de amamentação da Sofia há mais de um mês. Quer remover do painel para deixar mais limpo?"  
**Esforço:** baixo (meio dia).

---

### 3.6 — yaIA com foco em toddler (P2)

**Quando:** bebê com 12m+. System prompt adiciona seção de orientação para fase toddler: birra, seletividade alimentar, sono agitado, linguagem, creche.

**Princípio de calibragem:** o yaIA nessa fase deve **normalizar antes de informar**. Pais de toddler chegam ansiosos com conteúdo contraditório da internet. A primeira frase de qualquer resposta sobre comportamento deve começar pelo acolhimento: "Isso é comum nessa fase..." antes da orientação.

**Esforço:** baixo (ajuste no system prompt da edge function).

---

## Fase 4 — 18 a 24 meses (desfralde e linguagem)

### 4.1 — Registro de xixi/cocô no penico (P3)

**Sugestão aos 18 meses.** Novos event_ids `potty_pee` e `potty_poop`.

**Lógica de transição:** fralda permanece no grid enquanto coexiste com penico. Sugestão de remover fralda só quando penico aparecer em 80%+ dos registros por 7 dias seguidos.  
**Esforço:** médio (2 dias, depende de grid configurável).

---

### 4.2 — Painel de progresso do desfralde (P3)

**O que é:** visualização da proporção penico vs fralda ao longo do tempo — linha de progresso simples.

**Valor:** reduz ansiedade. Mostra que o progresso está acontecendo mesmo nos dias difíceis. Compartilhável com o pediatra.  
**Esforço:** médio (2 dias).

---

### 4.3 — Curvas de crescimento contextualizadas (NOVO — não estava na spec original)

**Por que importa:** o app já coleta medidas e já mostra o percentil. Mas mostrar "percentil 65" sem contexto gera mais dúvida do que clareza.

**O que é:** interpretação em linguagem humana junto ao gráfico de crescimento:
> "A Sofia está no percentil 65 de peso — significa que ela pesa mais do que 65% dos bebês da mesma idade. Está crescendo dentro do esperado."

**Implementação:** tabela de referência OMS por gênero/idade já usada nos insights (já existe parcialmente). Adicionar texto interpretativo na tela de crescimento do Perfil.  
**Esforço:** baixo (1 dia).

---

### 4.4 — Marcos de linguagem expandidos (P3)

**O que é:** além de primeira palavra, registrar primeiras frases, vocabulário estimado (10 palavras, 20 palavras, 50 palavras), comunicação gestual.  
**Esforço:** baixo (1 dia, amplia 3.3).

---

### 4.5 — Resumo visual da jornada — "Dois anos" (P3 — PRIORITÁRIO dentro desta fase)

**Atenção: este é o maior momento viral do produto inteiro.** Não pode ser apenas um push.

**O que é:** tela exclusiva gerada quando o bebê completa 24 meses — visualmente densa, emocional, compartilhável:

- Total de registros feitos
- Primeiro e último registro de cada categoria
- Datas dos marcos: primeiro sorriso, primeira risada, primeiro engatinhar, primeiras palavras
- Gráfico de crescimento do nascimento até agora (peso + altura)
- Streak máximo alcançado
- "X horas de sono acompanhadas" / "X fraldas trocadas"
- Botão de compartilhamento (imagem gerada, estilo Instagram Stories)

**Por que é viral:** é o tipo de coisa que outra mãe vê no WhatsApp e pergunta "que app é esse?" É também um momento de reconversão — pai que parou de usar o app no mês 14 volta para ver o resumo.

**Esforço:** alto (4–5 dias). Merece ser tratado como mini-produto, não como feature.

---

## Sequência de execução recomendada

| Entrega | Fase | Impacto | Esforço | Prioridade |
|---|---|---|---|---|
| **Fundação: grid configurável** | Técnica | Desbloqueador | Médio | 🔴 P0 obrigatório |
| 1.1 — Insight janela de sono | 0–6m | Alto | Baixo-Médio | 🔴 P0 |
| 1.2 — Regressões antecipadas | 0–6m | Alto | Baixo | 🔴 P0 |
| 2.1 — Registro de refeição | 6–12m | Crítico anti-churn | Médio | 🔴 P0 |
| 2.2 — Rastreio de alérgenos | 6–12m | Alto (único no mercado) | Médio | 🟠 P1 |
| 1.3 — Push proativo de sono | 0–6m | Alto | Baixo | 🟠 P1 |
| 2.5 — Push transição 6 meses | 6–12m | Alto | Baixo | 🟠 P1 |
| 2.3 — Histórico de alimentos | 6–12m | Médio | Baixo | 🟠 P1 |
| 2.4 — yaIA com contexto de refeição | 6–12m | Alto | Baixo | 🟠 P1 |
| 4.3 — Crescimento contextualizado | Todas | Médio | Baixo | 🟠 P1 |
| 3.1 — Registro de humor | 12–18m | Alto | Médio | 🟡 P2 |
| 3.2 — Modo criança doente | 12–18m | Alto | Médio | 🟡 P2 |
| 3.4 — Dimensão do casal | Todas | Médio | Baixo | 🟡 P2 |
| 3.3 — Marco de linguagem | 12–18m | Médio | Baixo | 🟡 P2 |
| 2.6 — Amamentação simplificada | 6–12m | Médio | Baixo | 🟡 P2 |
| 3.5 — Amamentação sai sugerida | 12–18m | Médio | Baixo | 🟡 P2 |
| 3.6 — yaIA foco toddler | 12–18m | Alto | Baixo | 🟡 P2 |
| 4.1 — Penico no grid | 18–24m | Alto | Médio | 🟢 P3 |
| 4.2 — Painel desfralde | 18–24m | Médio | Médio | 🟢 P3 |
| 4.4 — Marcos linguagem expandidos | 18–24m | Médio | Baixo | 🟢 P3 |
| **4.5 — Resumo visual 2 anos** | 24m | **Viral** | Alto | 🟢 P3 prioritário |

---

## Notas técnicas

### Schema de `logs` precisa de payload flexível para fase 2
Os registros de refeição têm campos diferentes dos registros de sono/fralda. Opções:
1. Coluna `payload jsonb` na tabela `logs` — mais flexível, já tem `ml` e `duration` como campos específicos
2. Tabela `meal_logs` separada com FK para `logs`

**Recomendação:** adicionar coluna `payload jsonb` em `logs` e armazenar campos extras (alimento, método, aceitação, reação, alimento_novo) ali. Mantém a engine de histórico unificada funcionando.

### Event IDs novos a registrar
- `meal` — refeição
- `mood` — humor do dia
- `potty_pee` — xixi no penico
- `potty_poop` — cocô no penico
- `temp` — temperatura (modo doença)

### yaIA — evolução do system prompt por fase
O system prompt atual já recebe `baby.birth_date`. Estruturar em blocos condicionais:
```
if age < 6m  → contexto neonatal/lactente
if age 6–12m → + contexto introdução alimentar + histórico de alimentos
if age 12–18m → + contexto toddler, normalização de comportamento
if age 18–24m → + contexto desfralde, linguagem, creche
```

---

## O que não fazer agora

- **Integração entre dois bebês:** o app já suporta multi-bebê tecnicamente. A experiência de dois filhos em fases diferentes é uma oportunidade futura, não agora.
- **Audio de marcos de linguagem:** técnicamente possível via Capacitor, mas não prioritário.
- **Plataforma Pediatra:** fica para roadmap futuro — mas o relatório do pediatra deve ser preparado para absorver dados de refeição e comportamento à medida que chegam.

---

## Próximos passos imediatos

1. **Estimar o grid configurável** — antes de tudo, entender o custo real da fundação
2. **Implementar 1.1 + 1.2** — insights de sono (baixo esforço, alto impacto imediato, não depende do grid)
3. **Implementar grid configurável**
4. **Implementar 2.1 — registro de refeição** (principal anti-churn)
5. **Implementar 2.2 — rastreio de alérgenos** (diferencial de mercado)
