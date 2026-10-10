import { describe, expect, it, vi } from 'vitest';
import {
  isPremiumEntitlementActive,
  loadAccountEntitlement,
  signInWithGoogle,
  signOut,
} from '../src/services/auth';
import { createSupabaseBrowserClient } from '../src/services/supabase';
import { hasAccountPremiumAccess } from '../src/hooks/useAuth';

describe('account entitlement and Supabase auth', () => {
  it('loads sync eligibility through the typed Supabase RPC', async () => {
    const client = {
      rpc: vi.fn(async () => ({ data: { eligible: true }, error: null })),
    };

    await expect(
      loadAccountEntitlement(client as never, 'user-a'),
    ).resolves.toEqual({
      userId: 'user-a',
      premium: true,
      entitlement: {
        tier: 'sync',
        validUntil: null,
        activePlanIds: [],
      },
    });
    expect(client.rpc).toHaveBeenCalledWith('get_sync_entitlement');
  });

  it('rejects an unavailable or malformed entitlement RPC response', async () => {
    await expect(
      loadAccountEntitlement(
        { rpc: vi.fn(async () => ({ data: { eligible: false }, error: null })) } as never,
        'user-a',
      ),
    ).rejects.toThrow('Invalid sync entitlement response');
    await expect(
      loadAccountEntitlement(
        { rpc: vi.fn(async () => ({ data: null, error: new Error('offline') })) } as never,
        'user-a',
      ),
    ).rejects.toThrow('Sync entitlement request failed: offline');
  });

  it('grants signed-in accounts sync access without Stripe plan metadata', () => {
    expect(hasAccountPremiumAccess({ id: 'user-a', email: 'user@example.test' })).toBe(true);
    expect(hasAccountPremiumAccess(null)).toBe(false);
    expect(
      isPremiumEntitlementActive({
        userId: 'user-a',
        premium: true,
        entitlement: { tier: 'sync', validUntil: null, activePlanIds: [] },
      }),
    ).toBe(true);
  });

  it('keeps local use available without public Supabase configuration', async () => {
    expect(createSupabaseBrowserClient({ url: '', publishableKey: '' })).toBeNull();
    await expect(signInWithGoogle(null, 'http://localhost:3000')).resolves.toEqual({
      error: 'Supabase authentication is not configured. Local use remains available.',
    });
  });

  it('surfaces Supabase OAuth and sign-out failures without throwing', async () => {
    const client = {
      auth: {
        signInWithOAuth: vi.fn(async () => ({
          data: { provider: 'google', url: null },
          error: new Error('Google provider is unavailable'),
        })),
        signOut: vi.fn(async () => ({ error: new Error('Session could not be cleared') })),
      },
    };

    await expect(signInWithGoogle(client as never, 'http://localhost:3000')).resolves.toEqual({
      error: 'Google provider is unavailable',
    });
    await expect(signOut(client as never)).resolves.toEqual({
      error: 'Session could not be cleared',
    });
  });
});
