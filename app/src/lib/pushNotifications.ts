import { PushNotifications, type Token, type ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from './supabase';

// Flag para evitar adicionar listeners múltiplas vezes
let _listenersAdded = false;

/**
 * Inicializa push notifications.
 * Chamar APOS o primeiro registro do usuario (nao no onboarding).
 */
export async function initPushNotifications(userId: string, babyId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  // Verificar/solicitar permissao
  let permStatus = await PushNotifications.checkPermissions();

  if (permStatus.receive === 'prompt') {
    permStatus = await PushNotifications.requestPermissions();
  }

  if (permStatus.receive !== 'granted') {
    return;
  }

  // Adicionar listeners ANTES de register() — o evento 'registration' dispara
  // assim que register() completa; se o listener for adicionado depois, o token
  // chega e ninguém escuta → token nunca salvo no banco.
  if (!_listenersAdded) {
    _listenersAdded = true;

    PushNotifications.addListener('registration', async (token: Token) => {
      await saveToken(userId, babyId, token.value);
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('[Push] Registration error:', error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[Push] Received in foreground:', notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      handlePushAction(action);
    });
  }

  // Registrar no sistema nativo — dispara o evento 'registration' com o token
  await PushNotifications.register();
}

/**
 * Salva ou atualiza token no Supabase
 */
async function saveToken(userId: string, babyId: string, token: string): Promise<void> {
  const platform = Capacitor.getPlatform(); // 'android' | 'ios'

  const { error } = await supabase
    .from('push_tokens')
    .upsert(
      {
        user_id: userId,
        baby_id: babyId,
        token,
        platform,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,token' }
    );

  if (error) {
    console.error('[Push] Error saving token:', error);
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
