# Push Notifications — Yaya Baby

## Visao Geral

O sistema de push notifications do Yaya Baby usa **Firebase Cloud Messaging (FCM)** para enviar notificacoes aos dispositivos Android e iOS. Todo o processamento acontece no backend via **Supabase Edge Functions** acionadas por **pg_cron**.

**Custo: R$ 0** — FCM e pg_cron sao gratuitos.

---

## Arquitetura

```
[App Nativo]                    [Supabase Backend]
    |                                  |
    |-- registra token FCM ---------->| push_tokens (tabela)
    |-- salva preferencias ---------->| notification_prefs (tabela)
    |-- atualiza last_seen ---------->| push_tokens.last_seen_at
    |                                  |
    |                           [pg_cron a cada 5 min]
    |                                  |
    |                           push-scheduler (Edge Function)
    |                                  |
    |                           - Le logs, intervalos, prefs
    |                           - Calcula quais usuarios precisam de push
    |                           - Envia via FCM V1 API
    |                           - Registra em push_log
    |                                  |
    |<---- push notification ---------|
    |                                  |
    |                           [pg_cron 1x/dia 20h BRT]
    |                                  |
    |                           streak-checker (Edge Function)
    |                           - Verifica streaks em risco
    |                           - Envia alerta se nao registrou hoje
```

---

## Componentes

### 1. Client-Side (App)

**Arquivo:** `app/src/lib/pushNotifications.ts`

| Funcao | Descricao |
|--------|-----------|
| `initPushNotifications(userId, babyId)` | Solicita permissao, registra no FCM, salva token no Supabase |
| `saveToken(userId, babyId, token)` | Upsert do token na tabela `push_tokens` |
| `updateLastSeen(userId)` | Atualiza `last_seen_at` (anti-spam) |
| `removePushToken(userId)` | Remove token (logout/desativar) |
| `handlePushAction(action)` | Roteamento ao clicar no push |

**Quando e chamado:**
- `initPushNotifications`: Automaticamente no `AppContext` apos carregar dados (se usuario tem logs) e no primeiro registro (`addLog`)
- `updateLastSeen`: Automaticamente quando o app volta do background (via `appStateChange` / `visibilitychange`)

### 2. Tabelas Supabase

#### `push_tokens`
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | PK |
| user_id | uuid | FK auth.users |
| baby_id | uuid | FK babies |
| token | text | Token FCM do dispositivo |
| platform | text | 'android' ou 'ios' |
| last_seen_at | timestamptz | Ultima vez que o app foi aberto |
| created_at | timestamptz | Quando o token foi criado |
| updated_at | timestamptz | Ultima atualizacao |

**Unique constraint:** `(user_id, token)`

#### `notification_prefs`
| Coluna | Tipo | Default | Descricao |
|--------|------|---------|-----------|
| id | uuid | gen | PK |
| user_id | uuid | - | FK auth.users |
| baby_id | uuid | - | FK babies |
| enabled | boolean | true | Master toggle |
| cat_feed | boolean | true | Amamentacao |
| cat_diaper | boolean | true | Fraldas |
| cat_sleep | boolean | true | Sono |
| cat_bath | boolean | true | Banho |
| quiet_enabled | boolean | false | Horario silencioso |
| quiet_start | integer | 22 | Inicio (hora) |
| quiet_end | integer | 7 | Fim (hora) |
| pause_during_sleep | boolean | false | Pausa feed/diaper durante sono |
| streak_alerts | boolean | true | Alerta de streak em risco |
| development_leaps | boolean | true | Alertas de saltos |
| smart_suggestions | boolean | true | Sugestoes inteligentes |
| daily_summary | boolean | true | Resumo diario |
| caregiver_activity | boolean | true | Atividade de outro cuidador |

**Unique constraint:** `(user_id, baby_id)`

#### `push_log`
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | PK |
| user_id | uuid | Destinatario |
| baby_id | uuid | Bebe relacionado |
| type | text | Tipo do push (ex: `feed_expired`, `streak_risk`) |
| title | text | Titulo enviado |
| body | text | Corpo enviado |
| sent_at | timestamptz | Quando foi enviado |
| delivered | boolean | Se o FCM confirmou entrega |

### 3. Edge Functions

#### `push-scheduler` (a cada 5 minutos)

**Logica:**
1. Busca todos os tokens ativos
2. Filtra usuarios com app aberto (last_seen < 2min)
3. Para cada bebe, verifica:
   - **Amamentacao**: ultimo log de `breast_*` ou `bottle` vs intervalo configurado
   - **Fralda**: ultimo log de `diaper_*` vs intervalo
   - **Soneca**: ultimo `sleep_start` vs duracao configurada
   - **Janela de sono**: ultimo `sleep_end` vs janela configurada
   - **Banho**: horario agendado - 15 min
4. Aplica filtros anti-spam
5. Envia via FCM V1 API
6. Registra em `push_log`

**Tipos de push:**
| type | Quando |
|------|--------|
| `feed_warn` | Intervalo atingiu 80% |
| `feed_expired` | Intervalo atingiu 100% |
| `diaper_warn` | Idem |
| `diaper_expired` | Idem |
| `sleep_nap_warn` | Soneca quase no limite |
| `sleep_nap_expired` | Soneca passou do limite |
| `sleep_awake_warn` | Janela de sono quase atingida |
| `sleep_awake_expired` | Janela de sono passou |
| `bath_[hora]` | 15 min antes do banho agendado |

#### `streak-checker` (1x/dia as 23:00 UTC = 20:00 BRT)

**Logica:**
1. Busca streaks ativos (current_streak > 0)
2. Filtra os que NAO registraram nada hoje
3. Envia push: "Seu streak de X dias esta em risco!"
4. Maximo 1 push/dia por usuario

### 4. Cron Jobs (pg_cron)

```sql
-- Push scheduler: a cada 5 minutos
SELECT cron.schedule('push-scheduler', '*/5 * * * *', ...);

-- Streak checker: 1x/dia as 20h BRT (23h UTC)
SELECT cron.schedule('streak-checker', '0 23 * * *', ...);
```

---

## Anti-Spam

O sistema implementa 7 camadas de protecao contra spam:

1. **Deduplicacao temporal**: Verifica `push_log` dos ultimos 30 min. Nao envia o mesmo tipo de push mais de 1x a cada 30 min
2. **App ativo**: Se `last_seen_at` < 2 minutos, nao envia (usuario esta com app aberto)
3. **Master toggle**: Respeita `notification_prefs.enabled`
4. **Categoria toggle**: Respeita `cat_feed`, `cat_diaper`, `cat_sleep`, `cat_bath`
5. **Horario silencioso**: Respeita `quiet_start`/`quiet_end` (ex: 22h-07h)
6. **Pausa durante sono**: Se `pause_during_sleep = true`, nao envia alertas de feed/diaper enquanto bebe dorme
7. **Streak**: Maximo 1 alerta de streak por dia

---

## Configuracao (Secrets)

As Edge Functions usam 3 secrets do Supabase:

| Secret | Descricao | Configuracao |
|--------|-----------|-------------|
| `SUPABASE_URL` | URL do projeto | Automatico |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | Automatico |
| `FCM_SERVICE_ACCOUNT` | Firebase Service Account JSON (FCM V1 API) | **Manual** |

### Como configurar FCM_SERVICE_ACCOUNT:

> **IMPORTANTE:** O sistema usa a **FCM V1 API** (a Legacy API foi descontinuada pelo Google).
> A autenticacao usa Service Account com JWT (RS256) + OAuth2 token exchange.

1. Firebase Console → Project Settings → Service Accounts
2. Gere ou baixe o JSON da Service Account (`firebase-adminsdk-*`)
3. No Supabase Dashboard → Project Settings → Edge Functions → Secrets:
   - Name: `FCM_SERVICE_ACCOUNT`
   - Value: (cole o conteudo JSON inteiro do arquivo)

**Arquivo de referencia:** `Stores/Play/babytracking-492412-297ad9141dfc.json`

### Como funciona a autenticacao FCM V1:

1. Edge Function le o JSON do secret `FCM_SERVICE_ACCOUNT`
2. Cria um JWT assinado com RS256 usando a `private_key` do service account
3. Troca o JWT por um access token OAuth2 em `https://oauth2.googleapis.com/token`
4. Usa o access token como Bearer token para enviar mensagens via `https://fcm.googleapis.com/v1/projects/babytracking-492412/messages:send`
5. Access token e cacheado por ~1h para performance

---

## Configuracao Firebase (Ja Feita)

### Android
- `app/android/app/google-services.json` ✅
- Gradle plugin `com.google.gms:google-services` ✅
- Firebase project: `babytracking-492412`

### iOS
- `app/ios/App/App/GoogleService-Info.plist` ✅
- APNs Authentication Key (.p8) uploaded no Firebase ✅

---

## Preferencias do Usuario (UI)

A tela de configuracoes (`SettingsPage.tsx`) ja tem UI completa para:

- ✅ Toggle master on/off
- ✅ Toggle por categoria (amamentacao, fralda, sono, banho)
- ✅ Horario silencioso (inicio/fim)
- ✅ Pausar alertas durante sono

Dados salvos na tabela `notification_prefs` via upsert.

---

## Fluxo Completo

### Primeiro uso:
1. Usuario instala o app e faz onboarding
2. Primeiro registro (`addLog`) → chama `initPushNotifications()`
3. App solicita permissao de notificacao
4. Se aceito → registra no FCM → recebe token → salva no `push_tokens`
5. A partir de agora, o cron `push-scheduler` inclui este usuario

### Uso normal:
1. Usuario registra amamentacao as 14h
2. Intervalo configurado: 3h
3. As 16h24 (80% de 3h = 2h24): push "Amamentacao se aproximando"
4. As 17h (100%): push "Hora da amamentacao!"
5. Usuario abre o app → `updateLastSeen()` → proximo push so depois de 2min fechado
6. As 20h: se nao registrou nada, push "Seu streak esta em risco!"

### Logout:
1. `signOut()` pode chamar `removePushToken(userId)`
2. Token removido do `push_tokens` → nao recebe mais pushes

---

## Monitoramento

### Verificar pushes enviados:
```sql
SELECT type, title, sent_at, delivered
FROM push_log
ORDER BY sent_at DESC
LIMIT 20;
```

### Verificar tokens ativos:
```sql
SELECT user_id, platform, last_seen_at, updated_at
FROM push_tokens
ORDER BY updated_at DESC;
```

### Verificar cron jobs:
```sql
SELECT jobid, jobname, schedule, active
FROM cron.job;
```

### Logs das Edge Functions:
Supabase Dashboard → Edge Functions → push-scheduler → Logs

---

## Futuro (nao implementado ainda)

- [ ] **Daily summary**: Resumo diario as 21h com totais do dia
- [ ] **Development leaps**: Push quando bebe entra em novo salto
- [ ] **Caregiver activity**: Notificar quando outro cuidador registra algo
- [ ] **Smart suggestions**: "Bebe mamou 2x menos que ontem" etc.
- [ ] **Timezone do usuario**: Atualmente usa hora do servidor
