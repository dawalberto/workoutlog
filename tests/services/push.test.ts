import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();

vi.mock('../../src/services/supabase', () => ({
  getSupabaseBrowserClient: () => ({ rpc }),
}));

describe('push RPC service', () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it('registers a browser subscription through the authenticated RPC', async () => {
    rpc.mockResolvedValue({ data: 'subscription-id', error: null });
    const { registerPushSubscription } = await import('../../src/services/push');
    const result = await registerPushSubscription({
      endpoint: 'https://push.example.test/endpoint',
      keys: { p256dh: 'public-key', auth: 'auth-key' },
    });
    expect(rpc).toHaveBeenCalledWith('upsert_push_subscription', {
      p_endpoint: 'https://push.example.test/endpoint',
      p_p256dh: 'public-key',
      p_auth: 'auth-key',
      p_user_agent: expect.any(String),
    });
    expect(result).toEqual({ success: true, data: 'subscription-id', error: null });
  });

  it('calls delete, schedule, and cancel with the database argument names', async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    const {
      cancelRestPush,
      deletePushSubscription,
      scheduleRestPush,
    } = await import('../../src/services/push');
    const message = { title: 'Descanso terminado', body: 'Toca la serie 3' };
    await deletePushSubscription('https://push.example.test/endpoint');
    await scheduleRestPush('https://push.example.test/endpoint', 30_000, message);
    await cancelRestPush('https://push.example.test/endpoint');
    expect(rpc.mock.calls).toEqual([
      ['delete_push_subscription', { p_endpoint: 'https://push.example.test/endpoint' }],
      ['schedule_rest_push', {
        p_endpoint: 'https://push.example.test/endpoint',
        p_delay_ms: 30_000,
        p_title: message.title,
        p_body: message.body,
      }],
      ['cancel_rest_push', { p_endpoint: 'https://push.example.test/endpoint' }],
    ]);
  });

  it('returns errors instead of throwing when the client or RPC fails', async () => {
    rpc.mockRejectedValue(new Error('offline'));
    const { cancelRestPush } = await import('../../src/services/push');
    await expect(cancelRestPush('https://push.example.test/endpoint')).resolves.toEqual({
      success: false,
      data: null,
      error: 'offline',
    });
  });
});
