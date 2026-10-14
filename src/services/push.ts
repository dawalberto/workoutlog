import { getSupabaseBrowserClient } from './supabase';
import type { RestPushMessage } from '../utils/restPush';

export interface PushServiceResult<T = null> {
  success: boolean;
  data: T | null;
  error: string | null;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) return error.message;
  return 'Push request failed.';
}

async function callPushRpc<T>(
  name: string,
  args: Record<string, string | number | null>,
): Promise<PushServiceResult<T>> {
  try {
    const client = getSupabaseBrowserClient();
    if (!client) return { success: false, data: null, error: 'Supabase is unavailable.' };
    const { data, error } = await client.rpc(name as never, args as never);
    if (error) return { success: false, data: null, error: errorMessage(error) };
    return { success: true, data: (data ?? null) as T | null, error: null };
  } catch (error) {
    return { success: false, data: null, error: errorMessage(error) };
  }
}

export function registerPushSubscription(
  subscription: PushSubscriptionJSON,
): Promise<PushServiceResult<string>> {
  return callPushRpc<string>('upsert_push_subscription', {
    p_endpoint: subscription.endpoint ?? '',
    p_p256dh: subscription.keys?.p256dh ?? '',
    p_auth: subscription.keys?.auth ?? '',
    p_user_agent: typeof navigator === 'undefined' ? null : navigator.userAgent,
  });
}

export function deletePushSubscription(endpoint: string): Promise<PushServiceResult> {
  return callPushRpc('delete_push_subscription', { p_endpoint: endpoint });
}

export function scheduleRestPush(
  endpoint: string,
  delayMs: number,
  message: RestPushMessage,
): Promise<PushServiceResult<string>> {
  return callPushRpc<string>('schedule_rest_push', {
    p_endpoint: endpoint,
    p_delay_ms: delayMs,
    p_title: message.title,
    p_body: message.body,
  });
}

export function cancelRestPush(endpoint: string): Promise<PushServiceResult> {
  return callPushRpc('cancel_rest_push', { p_endpoint: endpoint });
}
