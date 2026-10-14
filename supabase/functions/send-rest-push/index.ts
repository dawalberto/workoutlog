import { createClient } from '@supabase/supabase-js';
import { createHandler, type DispatchRpc, type PushSchedule } from './handler.ts';
import { createWebPushSender, isValidVapidConfig } from './push.ts';

interface EdgeRuntime {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): unknown;
}

const edgeRuntime = (globalThis as typeof globalThis & { Deno: EdgeRuntime }).Deno;
const dispatchSecret = edgeRuntime.env.get('REST_PUSH_DISPATCH_SECRET');
const supabaseUrl = edgeRuntime.env.get('SUPABASE_URL');
const serviceRoleKey = edgeRuntime.env.get('SUPABASE_SERVICE_ROLE_KEY');
const vapid = {
  subject: edgeRuntime.env.get('VAPID_SUBJECT') ?? '',
  publicKey: edgeRuntime.env.get('VAPID_PUBLIC_KEY') ?? '',
  privateKey: edgeRuntime.env.get('VAPID_PRIVATE_KEY') ?? '',
};
const configured = Boolean(dispatchSecret && supabaseUrl && serviceRoleKey && isValidVapidConfig(vapid));
const supabase = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  : null;

const rpc: DispatchRpc = {
  async claim(limit) {
    if (!supabase) throw new Error('configuration_missing');
    const { data, error } = await supabase.rpc('claim_due_rest_pushes', { p_limit: limit });
    if (error) throw new Error('claim_failed');
    return (data ?? []) as PushSchedule[];
  },
  async isSending(scheduleId) {
    if (!supabase) throw new Error('configuration_missing');
    const { data, error } = await supabase.rpc('is_rest_push_sending', {
      p_schedule_id: scheduleId,
    });
    if (error) throw new Error('schedule_status_failed');
    return data as boolean;
  },
  async complete(scheduleId, status, errorMessage) {
    if (!supabase) throw new Error('configuration_missing');
    const { error } = await supabase.rpc('complete_rest_push', {
      p_schedule_id: scheduleId,
      p_status: status,
      p_error: errorMessage ?? null,
    });
    if (error) throw new Error('completion_failed');
  },
  async remove(endpoint) {
    if (!supabase) throw new Error('configuration_missing');
    const { error } = await supabase.rpc('remove_push_subscription_by_endpoint', {
      p_endpoint: endpoint,
    });
    if (error) throw new Error('subscription_removal_failed');
  },
};

const handler = createHandler({
  dispatchSecret,
  configured,
  rpc,
  sendPush: createWebPushSender(vapid),
});

if (import.meta.main) edgeRuntime.serve(handler);
