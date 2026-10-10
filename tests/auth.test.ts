import { describe, expect, it, vi } from 'vitest';
import {
  loadSyncEligibility,
  signInWithGoogle,
  signOut,
} from '../src/services/auth';
import { createSupabaseBrowserClient } from '../src/services/supabase';

describe('Supabase authentication and sync eligibility', () => {
  it('loads sync eligibility through the typed Supabase RPC', async () => {
    const client = {
      rpc: vi.fn(async () => ({ data: { eligible: true }, error: null })),
    };

    await expect(loadSyncEligibility(client as never)).resolves.toBe(true);
    expect(client.rpc).toHaveBeenCalledWith('get_sync_entitlement');
  });

  it('treats a denied or malformed eligibility response as unavailable', async () => {
    await expect(
      loadSyncEligibility(
        { rpc: vi.fn(async () => ({ data: { eligible: false }, error: null })) } as never,
      ),
    ).resolves.toBe(false);
    await expect(
      loadSyncEligibility(
        { rpc: vi.fn(async () => ({ data: null, error: new Error('offline') })) } as never,
      ),
    ).rejects.toThrow('Sync eligibility request failed: offline');
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
