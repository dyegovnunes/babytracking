import { PushNotifications, type Token, type ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from './supabase';

// Flag para evitar adicionar listeners múltiplas vezes
let _listenersAdded = false;

const SUPABASE_URL = (import.meta as { env?: Record<string, string> }).env?.VITE_SUPABASE_URL ?? 'https://kgfjfdizxziacblgvplh.supabase.co';
const SUPABASE_ANON = (import.meta as { env?: Record<string, string> }).env?.VITE_SUPABASE_ANON_KEY ?? '';

/**
 * Manda diagnóstico pra edge function push-debug.
 * Fire-and-forget — nunca bloqueia o fluxo principal.
 * Usado pra rastrear cada passo do registration no iOS sem precisar de Mac.
 */
function debugLog(userId: string | null, step: string, data?: unknown) {
  try {
    const platform = Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'web';
    void fetch(`${SUPABASE_URL}/functions/v1/push-debug`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON },
      body: JSON.stringify({ user_id: userId, platform, step, data }),
    }).catch(() => {});
  } catch {
    // ignore
  }
}

/**
 * Inicializa push notifications.
 * Chamar APOS o primeiro registro do usuario (nao no onboarding).
 */
export async function initPushNotifications(userId: string, babyId: string): Promise<void> {
  debugLog(userId, 'init_called', { babyId, isNative: Capacitor.isNativePlatform() });

  if (!Capacitor.isNativePlatform()) {
    debugLog(userId, 'init_skipped_not_native');
    return;
  }

  // Verificar/solicitar permissao
  let permStatus;
  try {
    permStatus = await PushNotifications.checkPermissions();
    debugLog(userId, 'perm_check', { receive: permStatus.receive });
  } catch (e) {
    debugLog(userId, 'perm_check_error', { error: String(e) });
    return;
  }

  if (permStatus.receive === 'prompt') {
    try {
      permStatus = await PushNotifications.requestPermissions();
      debugLog(userId, 'perm_requested', { receive: permStatus.receive });
    } catch (e) {
      debugLog(userId, 'perm_request_error', { error: String(e) });
      return;
    }
  }

  if (permStatus.receive !== 'granted') {
    debugLog(userId, 'perm_not_granted', { receive: permStatus.receive });
    return;
  }

  // Adicionar listeners ANTES de register() — o evento 'registration' dispara
  // assim que register() completa; se o listener for adicionado depois, o token
  // chega e ninguém escuta → token nunca salvo no banco.
  if (!_listenersAdded) {
    _listenersAdded = true;
    debugLog(userId, 'listeners_adding');

    PushNotifications.addListener('registration', async (token: Token) => {
      debugLog(userId, 'event_registration_fired', { token_preview: token.value.slice(0, 20) });
      await saveToken(userId, babyId, token.value);
    });

    PushNotifications.addListener('registrationError', (error) => {
      debugLog(userId, 'event_registrationError_fired', { error: JSON.stringify(error) });
      console.error('[Push] Registration error:', error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      debugLog(userId, 'event_received', { title: notification.title });
      console.log('[Push] Received in foreground:', notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      handlePushAction(action);
    });

    debugLog(userId, 'listeners_added');
  } else {
    debugLog(userId, 'listeners_skip_already_added');
  }

  // Registrar no sistema nativo — dispara o evento 'registration' com o token
  try {
    debugLog(userId, 'register_calling');
    await PushNotifications.register();
    debugLog(userId, 'register_resolved');
  } catch (e) {
    debugLog(userId, 'register_threw', { error: String(e) });
  }
}

/**
 * Salva ou atualiza token via edge function (service_role — bypassa RLS)
 */
async function saveToken(userId: string, babyId: string, token: string): Promise<void> {
  const platform = Capacitor.getPlatform(); // 'android' | 'ios'
  debugLog(userId, 'saveToken_start', { platform });

  try {
    // Usa supabase.functions.invoke para herdar o JWT da sessão atual
    const { error } = await supabase.functions.invoke('register-token', {
      body: { token, babyId, platform },
    });

    if (error) {
      debugLog(userId, 'saveToken_edge_failed', { error: String(error) });
      // Fallback: tenta upsert direto
      console.error('[Push] Edge function error, trying direct upsert:', error);
      const { error: upsertError } = await supabase.from('push_tokens').upsert(
        { user_id: userId, baby_id: babyId, token, platform, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,token' }
      );
      if (upsertError) {
        debugLog(userId, 'saveToken_fallback_failed', { error: String(upsertError) });
      } else {
        debugLog(userId, 'saveToken_fallback_ok');
      }
    } else {
      debugLog(userId, 'saveToken_edge_ok');
    }
  } catch (e) {
    debugLog(userId, 'saveToken_threw', { error: String(e) });
    console.error('[Push] saveToken error:', e);
  }
}

/**
 * Atualiza last_seen_at no token (para anti-spam: nao enviar se app aberto)
 */
export async function updateLastSeen(userId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  await supabase
    .from('push_tokens')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('user_id', userId);
}

/**
 * Remove token (logout ou desativar push)
 */
export async function removePushToken(userId: string): Promise<void> {
  const { error } = await supabase
    .from('push_tokens')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('[Push] Error removing token:', error);
  }
}

/**
 * Trata acao quando usuario clica no push
 */
function handlePushAction(action: ActionPerformed): void {
  const data = action.notification.data;
  let route = '/';

  switch (data?.type) {
    case 'routine_alert':
    case 'streak_risk':
    case 'no_record_5h':
    case 'reactivation':
      route = '/';
      break;
    case 'development_leap':
      route = '/insights';
      break;
    case 'daily_summary':
      route = '/history';
      break;
    default:
      route = '/';
  }

  // Dispatch custom event for React Router navigation
  window.dispatchEvent(new CustomEvent('push-navigate', { detail: { route, data } }));
}
