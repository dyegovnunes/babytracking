# Yaya — Especificação de Insights por Faixa Etária
**Versão:** 1.0 | **Data:** 2026-04-10  
**Fonte:** AAP (American Academy of Pediatrics), SBP (Sociedade Brasileira de Pediatria), OMS

---

## Filosofia dos Insights

Insights no Yaya devem ser:
1. **Contextuais** — baseados nos dados reais registrados pelo usuário
2. **Acionáveis** — o pai/mãe consegue fazer algo com a informação
3. **Evoluídos por fase** — mudam conforme a criança cresce
4. **Não alarmistas** — informam, não assustam; sempre com tom de suporte

Cada insight tem:
- **Tipo**: padrão detectado | alerta suave | celebração | comparação com referência
- **Gatilho**: condição calculável a partir dos dados do Yaya
- **Ação esperada**: o que o pai/mãe deve fazer

---

## Faixa 0–1 mês (Recém-nascido)

> Foco: sobrevivência e estabelecimento de rotina. Pais exaustos, cada dado importa.

### Amamentação
| Insight | Gatilho | Tipo |
|---|---|---|
| "Média de X mamadas por dia nos últimos 3 dias — referência é 8–12x/dia" | Calcular média diária | Comparação com referência |
| "Intervalo médio entre mamadas: Xh — normal até 3h de dia e 4h de noite" | Intervalo entre registros | Padrão detectado |
| "Último lado registrado: direito. Próxima: esquerdo" | Último registro com lado | Acionável |
| "X dias de aleitamento exclusivo 🎉" | Contador desde primeiro registro | Celebração |
| "Mais de 6h sem mamar durante o dia" | Tempo desde último registro > 6h | Alerta suave |

### Sono
| Insight | Gatilho | Tipo |
|---|---|---|
| "Total de sono hoje: Xh — referência RN é 14–17h/dia (OMS)" | Soma dos registros de sono do dia | Comparação com referência |
| "Padrão: dormindo mais de dia que de noite — confusão dia/noite, comum nos primeiros meses" | Comparar sono 6h-22h vs 22h-6h | Padrão detectado |
| "Maior sequência de sono contínuo: Xh" | Maior bloco único de sono | Padrão detectado |

### Fralda
| Insight | Gatilho | Tipo |
|---|---|---|
| "X fraldas molhadas hoje — mínimo esperado é 6x/dia após dia 5 de vida" | Contador fraldas molhadas | Comparação com referência |
| "Última fralda há Xh" | Tempo desde último registro | Alerta suave |

### Peso / Crescimento
| Insight | Gatilho | Tipo |
|---|---|---|
| "Ganho de peso esta semana: Xg — esperado 150–200g/semana" | Diferença entre pesagens | Comparação com referência |
| "Recuperou o peso de nascimento 🎉" | Peso atual ≥ peso nascimento | Celebração |

---

## Faixa 1–3 meses

> Foco: padrões emergindo, primeiros sorrisos. Pais buscando previsibilidade.

### Amamentação
| Insight | Gatilho | Tipo |
|---|---|---|
| "Mamadas de dia mais espaçadas: intervalo médio de Xh — normaliza 2,5–3h" | Intervalo médio diurno | Padrão detectado |
| "Duração média por mamada: Xmin — entre 10–20min é esperado nessa fase" | Duração dos registros | Comparação com referência |
| "X dias seguidos com 8+ mamadas — consistência ótima 🎉" | Sequência de dias ≥ 8 mamadas | Celebração |

### Sono
| Insight | Gatilho | Tipo |
|---|---|---|
| "Janela de vigília: Xh entre sonecas — para essa idade: 45–90min" | Intervalo entre fins de sono | Comparação com referência |
| "Soneca mais longa do dia: Xh — comum essa fase ser a do fim da manhã" | Maior soneca diurna | Padrão detectado |
| "Dormindo mais à noite do que de dia nos últimos 3 dias 🎉 — ritmo circadiano se formando" | Sono noturno > diurno por 3 dias | Celebração |
| "Hora de dormir à noite variando muito (±Xh) — tentar horário mais fixo ajuda no futuro" | Desvio padrão horário de início sono noturno | Padrão detectado |

### Desenvolvimento
| Insight | Gatilho | Tipo |
|---|---|---|
| "Com 6 semanas, sorrisos sociais surgem — já anotou o primeiro?" | Idade = 42 dias, sem marco registrado | Lembrete de marco |

---

## Faixa 3–6 meses

> Foco: consolidação do sono, introdução alimentar se aproximando. Rotinas mais estáveis.

### Sono
| Insight | Gatilho | Tipo |
|---|---|---|
| "Janela de vigília: Xh — para essa fase: 1,5–2,5h" | Intervalo entre sonecas | Comparação com referência |
| "Número de sonecas por dia: X — esperado 3–4x nessa fase" | Contador de sonecas/dia | Comparação com referência |
| "Bloco de sono noturno mais longo: Xh — próximo passo é 6h+ contínuos" | Maior bloco noturno dos últimos 7 dias | Padrão detectado + meta |
| "Horário de dormir estável nos últimos 5 dias (entre Xh e Yh) — ótimo para regulação" | Desvio padrão < 30min por 5 dias | Celebração |
| "Regressão de sono: média de sono noturno caiu Xh vs semana passada" | Comparação semana a semana | Alerta suave (com contexto: "é normal nessa fase") |

### Amamentação
| Insight | Gatilho | Tipo |
|---|---|---|
| "Mamadas se consolidando: X vezes/dia nos últimos 3 dias" | Média mamadas/dia | Padrão detectado |
| "Fase de distração ao mamar é comum a partir dos 4 meses — se duração caiu, normal" | Queda na duração média | Contexto educativo |

### Introdução Alimentar (aproximação)
| Insight | Gatilho | Tipo |
|---|---|---|
| "Com 6 meses se aproximando, a introdução alimentar pode começar — OMS recomenda 6 meses completos" | Idade ≥ 5 meses e 2 semanas | Informativo |

---

## Faixa 6–9 meses

> Foco: introdução alimentar (BLW ou papinha), sono 2 sonecas, marcos motores.

### Alimentação (novo módulo)
| Insight | Gatilho | Tipo |
|---|---|---|
| "Introdução alimentar: X dias de registros — diversidade alimentar é a meta" | Contador de dias com registro de alimentação | Celebração progressiva |
| "Alimentos registrados esta semana: X — tentar novo alimento a cada 3 dias" | Variedade de alimentos/semana | Acionável |
| "Nenhum alimento registrado hoje — não esqueça de registrar as refeições" | 0 registros de alimentação no dia | Lembrete |
| "Reação registrada para X alimentos — atenção especial aos 9 alérgenos principais" | Registros com reação | Alerta suave |

### Sono
| Insight | Gatilho | Tipo |
|---|---|---|
| "Janela de vigília: Xh — para essa fase: 2,5–3h" | Intervalo entre sonecas | Comparação com referência |
| "Transição para 2 sonecas: se acordando consistentemente da 1ª soneca em 30min, pode ser sinal" | Duração 1ª soneca < 30min por 3+ dias | Padrão detectado |
| "Total de sono em 24h: Xh — esperado 12–16h nessa fase" | Soma sono 24h | Comparação com referência |

### Marcos
| Insight | Gatilho | Tipo |
|---|---|---|
| "Com 6 meses: sentar com apoio — já registrou esse marco?" | Idade ≥ 6 meses, marco não registrado | Lembrete |
| "Com 7 meses: transferir objetos entre as mãos — já anotou?" | Gatilho por idade | Lembrete |
| "Com 8–9 meses: engatinhar / sentar sem apoio — fique atento!" | Gatilho por idade | Lembrete |

---

## Faixa 9–12 meses

> Foco: 3 refeições + 2 lanches, 1–2 sonecas, primeiras palavras, andar chegando.

### Alimentação
| Insight | Gatilho | Tipo |
|---|---|---|
| "X refeições registradas hoje — objetivo: 3 principais + 2 lanches" | Contador refeições | Comparação com referência |
| "Ferro: alimentos ricos em ferro foram registrados X vezes esta semana — importante nessa fase" | Tag ferro nos alimentos | Acionável |
| "Amamentação: OMS recomenda manter até 2 anos ou mais como complemento" | Registros de amamentação ainda ativos | Informativo |

### Sono
| Insight | Gatilho | Tipo |
|---|---|---|
| "Janela de vigília: Xh — para essa fase: 3–4h" | Intervalo entre sonecas | Comparação com referência |
| "Transição para 1 soneca pode acontecer entre 12–18 meses — se resistindo à 2ª soneca, normal" | 2ª soneca < 30min ou recusada | Contexto educativo |

### Marcos
| Insight | Gatilho | Tipo |
|---|---|---|
| "Com 9–10 meses: primeiras palavras (mamã, papá, babá)" | Gatilho por idade | Lembrete |
| "Com 11–12 meses: andar com apoio, dar alguns passos" | Gatilho por idade | Lembrete |
| "Um ano chegando — prepare-se para a consulta de 12 meses! 🎂" | Idade ≥ 11 meses e 2 semanas | Celebração + alerta |

---

## Faixa 12–18 meses

> Foco: alimentação familiar, 1 soneca, vocabulário crescendo, independência.

### Alimentação
| Insight | Gatilho | Tipo |
|---|---|---|
| "X refeições em família registradas — compartilhar a mesa acelera aceitação de alimentos" | Tipo de refeição = família | Padrão detectado |
| "Neofobia alimentar é normal nessa fase — recusar alimentos novos não é birra" | Registros de recusa | Contexto educativo |
| "Leite: se desmamando, acompanhe ingestão de cálcio via alimentos" | Queda nos registros de amamentação | Informativo |

### Sono
| Insight | Gatilho | Tipo |
|---|---|---|
| "1 soneca consolidada: média de Xh — esperado 1,5–3h de soneca única nessa fase" | Contagem e duração de sonecas | Comparação com referência |
| "Sono noturno: Xh — esperado 10–12h nessa fase" | Soma sono noturno | Comparação com referência |
| "Regressão dos 18 meses é real — queda de sono e resistência para dormir é normal por 2–6 semanas" | Queda > 1h no sono noturno após meses de estabilidade | Alerta suave com contexto |

### Desenvolvimento
| Insight | Gatilho | Tipo |
|---|---|---|
| "Com 12–15 meses: 5–10 palavras esperadas — como está o vocabulário?" | Gatilho por idade | Lembrete de marco |
| "Com 15–18 meses: andar sozinho bem estabelecido" | Gatilho por idade | Lembrete |
| "Com 18 meses: combinar 2 palavras, apontar para objetos" | Gatilho por idade | Lembrete |

---

## Faixa 18–24 meses

> Foco: autonomia crescente, birras, linguagem explodindo, desfralde no horizonte.

### Alimentação
| Insight | Gatilho | Tipo |
|---|---|---|
| "Porções menores que adulto são normais — estômago de criança de 2 anos = 1/4 do adulto" | Sem gatilho de dados, insight educativo fixo | Contexto educativo |
| "X legumes/verduras diferentes registrados esta semana — variedade é mais importante que quantidade" | Contagem de categorias | Acionável |

### Sono
| Insight | Gatilho | Tipo |
|---|---|---|
| "Sono total: Xh — esperado 11–14h (incluindo soneca) para essa faixa" | Soma sono 24h | Comparação com referência |
| "Soneca: se recusando com frequência, pode ser sinal de transição para sem soneca (acontece entre 2–4 anos)" | Soneca registrada < 3x na semana | Contexto educativo |
| "Resistência para dormir à noite é comum nessa fase — rotina consistente é a chave" | Horário de dormir variando muito | Contexto educativo |

### Desenvolvimento
| Insight | Gatilho | Tipo |
|---|---|---|
| "Com 18–24 meses: vocabulário de 50+ palavras, frases de 2 palavras" | Gatilho por idade | Lembrete |
| "Desfralde: a maioria das crianças está pronta entre 2–3 anos — sinais: avisar, esconder pra fazer, imitar adultos" | Idade ≥ 22 meses | Informativo |
| "2 anos chegando — a consulta dos 24 meses é importante! Traga o caderneto de vacinação 📋" | Idade ≥ 23 meses | Lembrete |

---

## Insights Transversais (qualquer faixa etária)

Esses insights aparecem ao longo de toda a jornada, sempre calculados com os dados do usuário:

| Insight | Gatilho | Faixa |
|---|---|---|
| "X dias consecutivos de registro — você está construindo o histórico mais completo do [nome]!" | Streak de dias com ≥ 1 registro | Todas |
| "Consulta com pediatra em breve? Use o botão 'Preparar relatório'" | Marco de consulta recorrente (1, 2, 4, 6, 9, 12, 18, 24 meses) | Todas |
| "Semana mais completa: X registros em 7 dias — recorde pessoal 🎉" | Máximo histórico de registros/semana | Todas |
| "Última pesagem há X dias — atualizar peso mantém os gráficos precisos" | Último peso > 30 dias | Todas |
| "[Nome] tem X dias de vida 🎂" | Aniversário de mês | Todas |

---

## Insights que NÃO devem ser exibidos

Para manter qualidade e evitar ruído:

- **Sem dados suficientes**: nunca exibir insight que precisa de 7 dias de dados se tem menos de 3
- **Sem comparações alarmistas**: jamais "seu bebê está dormindo menos que a média" sem contexto de variação normal
- **Sem julgamento de método**: BLW vs papinha, amamentação vs fórmula — o app é neutro
- **Sem diagnóstico médico**: insights nunca substituem pediatra, sempre com rodapé "consulte seu pediatra se tiver dúvidas"
- **Sem repetição**: insight que o usuário já viu há menos de 48h não deve reaparecer

---

## Prioridade de Implementação

| Fase | Insights | Critério |
|---|---|---|
| **MVP Insights** | Amamentação (contagem, intervalo, lado), Sono (total, maior bloco), Fraldas (contagem), Streak de registro | Dados já existem no app |
| **v1.1** | Janela de vigília, comparação com referência OMS/AAP, alertas suaves | Lógica de cálculo simples |
| **v1.2** | Lembretes de marcos por idade, insights de desenvolvimento, sazonais por faixa | Requer tabela de marcos no banco |
| **v2.0** | Previsão de próxima soneca (ML), detecção de regressão, análise de tendência alimentar | Dados históricos suficientes |

---

## Referências

- OMS: Padrões de crescimento infantil (https://www.who.int/tools/child-growth-standards)
- AAP: Recommendations for Pediatric Preventive Health Care
- SBP: Manual de Nutrição na Infância, Guia Prático de Atualização
- Huckleberry: Wake windows e janelas de sono por faixa etária
- CDC: Developmental Milestones (https://www.cdc.gov/ncbddd/actearly/milestones)
