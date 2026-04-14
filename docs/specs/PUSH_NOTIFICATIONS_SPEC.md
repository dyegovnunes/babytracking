# Yaya — Push Notifications Spec
**Versão:** 2.0 | **Data:** 2026-04-11

---

## Decisões de Produto

- **Tipo:** Alertas baseados na janela definida pelo usuário + sugestões inteligentes
- **Destinatários:** Configurável por perfil de cuidador
- **Escopo:** Amamentação, sono, fraldas + celebrações + saltos + streak + resumo diário

---

## Modelo: Janela do Usuário + Inteligência como Insight

### Princípio central:
O usuário define a janela de cada evento (ex: "amamentação a cada 3h", "sono a cada 2h").
O push respeita essa janela. O sistema inteligente roda em paralelo e, quando detecta divergência significativa, sugere ajuste via insight — não sobrescreve.

### Fluxo:

```
1. Usuário configura: "Amamentação a cada 3h"
2. Push: lembra a cada 3h após último registro
3. Sistema calcula média real dos últimos 3 dias: 2h30
4. Divergência > 20%? → Insight:
   "A média real de amamentação do Miguel nos últimos 3 dias é 2h30.
    Quer ajustar sua janela de 3h para 2h30?"
   [Ajustar] [Manter]
5. Se ajustar → push passa a usar 2h30
6. Se manter → sistema respeita, não insiste por 14 dias
```

### Configuração inicial (onboarding):
```
Defina a rotina do [nome]:

Amamentação: a cada [___] horas (sugestão: 3h para 0-3 meses)
Sono: janela de vigília de [___] horas (sugestão: 1h para 0-3 meses)
Fraldas: lembrar a cada [___] horas (sugestão: desativado)

💡 O Yaya vai aprender com seus registros e sugerir ajustes ao longo do tempo.
```

### Sugestões inteligentes de janela por idade:

| Idade | Amamentação sugerida | Wake window sugerido |
|---|---|---|
| 0–1 mês | 2–3h | 45–60 min |
| 1–3 meses | 2,5–3h | 60–90 min |
| 3–6 meses | 3–3,5h | 1,5–2,5h |
| 6–9 meses | 3,5–4h | 2,5–3h |
| 9–12 meses | 4–5h | 3–4h |
| 12–18 meses | — (refeições) | 4–6h |
| 18–24 meses | — (refeições) | 5–6h |

Quando a idade do bebê muda de faixa, gerar insight:
"Miguel entrou na faixa de 3–6 meses. A janela de vigília típica nessa fase é 1,5–2,5h. Sua config atual é 1h. Quer atualizar?"

---

## Tipos de Push

### 1. Alertas de Rotina (baseados na janela do usuário)

| Evento | Push | Quando | Exemplo |
|---|---|---|---|
| Amamentação | "Próxima amamentação em ~15min" | janela_usuario - 15min após último registro | "🍼 Miguel: próxima amamentação em ~15 min" |
| Sono | "Janela de sono se aproximando" | wake_window_usuario - 15min | "😴 Miguel pode estar ficando cansado" |
| Fralda | "Última fralda há Xh" | janela_usuario ultrapassada | "🧷 Última fralda do Miguel há 4h" |

### 2. Streak de registro (estilo Duolingo)

**Mecânica:**
- Contador visível na home: "🔥 12 dias seguidos"
- Reseta se 0 registros em um dia (antes das 23h59)
- Push de proteção: "🔥 Seu streak de 12 dias está em risco! Registre algo hoje."
  - Enviado às 20h se 0 registros no dia
- Push de celebração em marcos:

| Marco | Push | Visual no app |
|---|---|---|
| 7 dias | "🔥 1 semana seguida! Você é incrível." | Badge bronze |
| 14 dias | "🔥 2 semanas! O histórico do [nome] está ficando rico." | Badge prata |
| 30 dias | "🔥 1 mês seguido! Poucos pais chegam aqui." | Badge ouro |
| 60 dias | "🔥 60 dias! Você tem o histórico mais completo." | Badge platina |
| 100 dias | "🔥 100 dias! Lendário." | Badge diamante |

**Freeze (Yaya+):** 1 freeze por semana — dia sem registro não quebra o streak.

### 3. Saltos de desenvolvimento

Avisar quando um salto está se aproximando, baseado na idade do bebê.
Referência: Wonder Weeks (saltos mentais) + marcos CDC/SBP.

| Semana | Salto | Push (1 semana antes) |
|---|---|---|
| Semana 5 | Salto 1 — Sensações | "⚡ Salto de desenvolvimento se aproximando (~sem 5). Miguel pode ficar mais agitado. Normal!" |
| Semana 8 | Salto 2 — Padrões | "⚡ Salto 2 chegando. Pode haver mudança no sono e na amamentação." |
| Semana 12 | Salto 3 — Transições suaves | "⚡ Salto 3 se aproximando. Movimentos mais suaves e curiosidade aumentando." |
| Semana 19 | Salto 4 — Eventos | "⚡ Salto 4 é um dos maiores. Pode durar até 5 semanas. Paciência!" |
| Semana 26 | Salto 5 — Relações | "⚡ Salto 5. Miguel começa a entender distância e pode estranhar." |
| Semana 37 | Salto 6 — Categorias | "⚡ Salto 6. Agrupando objetos, reconhecendo padrões." |
| Semana 46 | Salto 7 — Sequências | "⚡ Salto 7. Sequências de ações e primeira 'conversa'." |
| Semana 55 | Salto 8 — Programas | "⚡ Salto 8. Birras, decisões próprias, personalidade aparecendo." |
| Semana 64 | Salto 9 — Princípios | "⚡ Salto 9. Negociação, humor, empatia emergindo." |
| Semana 75 | Salto 10 — Sistemas | "⚡ Salto 10. Pensamento abstrato, faz de conta, criatividade." |

**Aba informativa — "Desenvolvimento":**
Cada salto abre uma tela com:
- O que esperar (comportamento típico)
- Quanto dura
- O que fazer (dicas práticas)
- Como isso aparece nos registros do Yaya (ex: "sono pode diminuir 1-2h nessa fase")

**Alternativa mais intuitiva:** em vez de aba separada, mostrar como card destacado na home quando o salto está ativo:
```
┌──────────────────────────────────────┐
│ ⚡ Salto 4 — Eventos (sem 19–23)     │
│ Miguel pode estar mais agitado e     │
│ com sono irregular. É normal!        │
│                                      │
│ [Saiba mais]  [Entendi, dispensar]   │
└──────────────────────────────────────┘
```

### 4. Melhorias detectadas (insights inteligentes)

| Tipo | Gatilho | Push |
|---|---|---|
| Sono consolidando | Bloco noturno > 30min vs média 7 dias anteriores | "🌙 Sono noturno do Miguel aumentou! 5h20 vs 4h10 semana passada" |
| Amamentação espaçando | Intervalo médio aumentou > 20% vs 2 semanas atrás | "🍼 Amamentação do Miguel espaçando naturalmente: 3h10 vs 2h40" |
| Sono noturno > diurno | 3 dias consecutivos com sono noturno > diurno | "🌙 Ritmo circadiano do Miguel se formando! Sono noturno > diurno" |
| Fraldas estáveis | Desvio padrão < 15% por 7 dias | "🧷 Rotina de fraldas do Miguel está estável. Ótimo sinal." |

### 5. Celebrações e marcos

| Tipo | Push | Frequência |
|---|---|---|
| Aniversário de mês | "🎂 Miguel faz 3 meses hoje!" | Mensal |
| Marco de desenvolvimento | "Com 6 meses: introdução alimentar!" | Por idade |
| Vacina se aproximando | "💉 Vacina dos 3 meses se aproximando. Pentavalente + VIP + Rotavírus" | Por calendário PNI |

### 6. Resumo diário

| Push | Quando | Exemplo |
|---|---|---|
| Resumo do dia | 21h (ou horário configurado) | "📊 Dia do Miguel: 8 amamentações · 6 fraldas · 14h sono. Dentro do esperado." |

---

## Configuração por cuidador

```
Configurações de notificação:

JANELAS DE ROTINA
  Amamentação: a cada [3h] ← editável
  Sono (wake window): [1h30] ← editável
  Fraldas: a cada [desativado] ← editável
  Antecedência do alerta: [15 min] ← editável

TIPOS DE ALERTA
  ☑ Alertas de rotina
  ☑ Sugestões inteligentes de ajuste
  ☑ Saltos de desenvolvimento
  ☑ Celebrações e marcos
  ☑ Streak de registro
  ☑ Resumo diário
  ☐ Notificar quando outro cuidador registra

HORÁRIO DE SILÊNCIO
  De: [22:00]  Até: [06:00]
  (nenhum push neste período)
```

**Regra:** pushes NUNCA acordam o pai. Horário de silêncio é absoluto.

### Default por tipo de cuidador:

| Tipo | Default | Observação |
|---|---|---|
| Pais (donos) | Tudo ativado | Controle total |
| Babá | Alertas de rotina ON, resto OFF | Operacional |
| Avó/Avô | Celebrações + marcos ON, resto OFF | Afetivo |
| Pediatra (futuro) | Nenhum push | Acesso via painel web |

---

## UX das Configurações

A tela de Settings já tem muita coisa. Proposta de organização:

```
Settings
├── 👶 Bebê (nome, nascimento, sexo)
├── 🔔 Notificações ← nova seção dedicada
│   ├── Janelas de rotina
│   ├── Tipos de alerta (toggles)
│   └── Horário de silêncio
├── 👥 Cuidadores
├── 💎 Yaya+ (assinatura)
├── 🔒 Privacidade
└── ℹ️ Sobre
```

Cada seção é uma tela separada (não tudo na mesma scroll). Tap → entra na seção → configurações específicas.

---

## Arquitetura Técnica

### Stack:
```
App (Capacitor) → Firebase Cloud Messaging (Android) + APNs (iOS)
                         ↑
              Supabase Edge Function (scheduler)
                         ↑
              Supabase DB (eventos + preferências + tokens)
```

### Tabelas necessárias no Supabase:

```sql
-- Tokens de push por dispositivo
CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  baby_id UUID REFERENCES babies(id),
  token TEXT NOT NULL,
  platform TEXT CHECK (platform IN ('android', 'ios', 'web')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, token)
);

-- Preferências de notificação por cuidador (atualizado v2)
CREATE TABLE push_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  baby_id UUID REFERENCES babies(id),
  -- Janelas definidas pelo usuário (em minutos)
  feeding_interval_min INTEGER DEFAULT 180,  -- 3h
  sleep_wake_window_min INTEGER DEFAULT 90,  -- 1h30
  diaper_interval_min INTEGER,               -- NULL = desativado
  alert_advance_min INTEGER DEFAULT 15,      -- antecedência
  -- Tipos de alerta
  routine_alerts BOOLEAN DEFAULT true,
  smart_suggestions BOOLEAN DEFAULT true,
  development_leaps BOOLEAN DEFAULT true,
  celebrations BOOLEAN DEFAULT true,
  streak_alerts BOOLEAN DEFAULT true,
  daily_summary BOOLEAN DEFAULT true,
  caregiver_activity BOOLEAN DEFAULT false,
  -- Horário de silêncio
  quiet_start TIME DEFAULT '22:00',
  quiet_end TIME DEFAULT '06:00',
  UNIQUE(user_id, baby_id)
);

-- Streak de registro
CREATE TABLE streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID REFERENCES babies(id),
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_active_date DATE,
  freeze_used_this_week BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(baby_id)
);

-- Log de pushes enviados
CREATE TABLE push_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  baby_id UUID REFERENCES babies(id),
  type TEXT NOT NULL,
  title TEXT,
  body TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  delivered BOOLEAN DEFAULT false
);
```

### Edge Function — push-scheduler

Roda a cada 5 minutos (pg_cron):

```
1. Para cada bebê ativo:
   a. Buscar janelas configuradas pelo usuário (push_preferences)
   b. Buscar último registro por tipo de evento
   c. Calcular horario_previsto = ultimo_registro + janela_usuario
   d. Se agora >= horario_previsto - antecedencia E push não enviado:
      - Buscar cuidadores com preferência ativada
      - Verificar horário de silêncio
      - Enviar push via FCM/APNs
      - Registrar no push_log

2. Inteligência (roda 1x/dia às 10h):
   a. Calcular média real dos últimos 3 dias por tipo
   b. Se divergência > 20% vs janela do usuário:
      - Gerar insight (não push) com sugestão de ajuste
      - Salvar na tabela de insights para exibir no app
```

### Edge Function — streak-checker

Roda 1x/dia às 23h55:

```
1. Para cada bebê com streak ativo:
   a. Se 0 registros hoje E freeze não usado:
      - Streak = 0
      - Push: "🔥 Seu streak foi zerado. Comece de novo amanhã!"
   b. Se 0 registros hoje E freeze disponível (Yaya+):
      - Não zerar, marcar freeze_used_this_week = true
      - Push: "🔥 Streak protegido pelo freeze! Amanhã volte a registrar."
```

### Edge Function — daily-summary

Roda 1x/dia às 21h (ou personalizado):

```
1. Para cada bebê ativo:
   a. Agregar eventos do dia
   b. Comparar com média dos 7 dias anteriores
   c. Verificar se há salto de desenvolvimento ativo
   d. Gerar texto do resumo
   e. Enviar para cuidadores com daily_summary = true
```

---

## Anti-spam

| Regra | Implementação |
|---|---|
| Max 8 pushes/dia por cuidador | Contar no push_log |
| Não repetir mesmo tipo em < 30min | Checar push_log |
| Horário de silêncio absoluto | quiet_start/quiet_end |
| Não enviar se app aberto | last_seen_at < 2min |
| Cool-down após dismiss | 3 ignored → reduzir frequência |
| Sugestão inteligente rejeitada | Não resugerir por 14 dias |

---

## Textos dos Pushes

Tom: curto, acolhedor, útil. Max 1 emoji por push.

**Rotina:**
- "🍼 Próxima amamentação do [nome] em ~15 min"
- "😴 [nome] está acordado há 1h30 — hora de preparar o sono"
- "🧷 Última fralda do [nome] há 4h"

**Streak:**
- "🔥 [X] dias seguidos registrando!"
- "🔥 Seu streak de [X] dias está em risco! Registre algo hoje."

**Saltos:**
- "⚡ Salto de desenvolvimento se aproximando (~semana [X]). [nome] pode ficar mais agitado."

**Melhorias:**
- "🌙 Sono noturno do [nome] aumentou: 5h20 vs 4h10 semana passada"
- "🍼 Amamentação do [nome] espaçando: 3h10 vs 2h40"

**Celebrações:**
- "🎂 [nome] completa [X] meses hoje!"
- "💉 Vacina dos [X] meses se aproximando"

**Resumo:**
- "📊 Dia do [nome]: [X] amamentações · [Y] fraldas · [Z]h sono."

---

## Feature Gate

| Feature | Free | Yaya+ |
|---|---|---|
| Alertas de rotina (janela do usuário) | ✅ | ✅ |
| Streak de registro + badges | ✅ | ✅ |
| Celebrações e marcos | ✅ | ✅ |
| Sugestões inteligentes de ajuste | ✅ | ✅ |
| Saltos de desenvolvimento | ❌ | ✅ |
| Resumo diário | ❌ | ✅ |
| Config avançada (silêncio, por cuidador) | ❌ | ✅ |
| Streak freeze (1/semana) | ❌ | ✅ |
