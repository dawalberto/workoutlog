import { describe, expect, it, vi } from 'vitest';
import {
  loadSyncEligibility,
  runSignOutFlow,
  signInWithGoogle,
  signOut,
} from '../src/services/auth';
import { getOAuthRedirectUrl } from '../src/hooks/useAuth';
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

  it('preserves a non-root Vite base path in the OAuth redirect URL', () => {
    expect(getOAuthRedirectUrl('https://dawalberto.github.io', '/workoutlog/')).toBe(
      'https://dawalberto.github.io/workoutlog/',
    );
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

  it('aborts sign-out and cleanup when pending changes are rejected', async () => {
    const sync = vi.fn(async () => {
      throw new Error('Network unavailable');
    });
    const pending = vi.fn(async () => 2);
    const confirm = vi.fn(async () => false);
    const endSession = vi.fn(async () => ({ error: null }));
    const clearLocalData = vi.fn(async () => undefined);

    await expect(runSignOutFlow({
      syncBeforeSignOut: sync,
      getPendingChanges: pending,
      confirmPendingChanges: confirm,
      endSession,
      clearLocalData,
    })).resolves.toEqual({
      cancelled: true,
      signedOut: false,
      cleanupFailed: false,
      error: null,
    });

    expect(sync).toHaveBeenCalledOnce();
    expect(confirm).toHaveBeenCalledWith(2);
    expect(endSession).not.toHaveBeenCalled();
    expect(clearLocalData).not.toHaveBeenCalled();
  });

  it.each([
    { pendingCount: 2, confirmed: true },
    { pendingCount: 0, confirmed: false },
  ])('signs out and clears local data when pending operations are $pendingCount', async ({
    pendingCount,
    confirmed,
  }) => {
    const endSession = vi.fn(async () => ({ error: null }));
    const clearLocalData = vi.fn(async () => undefined);
    const confirm = vi.fn(async () => confirmed);

    await expect(runSignOutFlow({
      syncBeforeSignOut: async () => undefined,
      getPendingChanges: async () => pendingCount,
      confirmPendingChanges: confirm,
      endSession,
      clearLocalData,
    })).resolves.toEqual({
      cancelled: false,
      signedOut: true,
      cleanupFailed: false,
      error: null,
    });

    expect(endSession).toHaveBeenCalledOnce();
    expect(clearLocalData).toHaveBeenCalledOnce();
    expect(confirm).toHaveBeenCalledTimes(pendingCount > 0 ? 1 : 0);
  });

  it('reports incomplete local cleanup as a failed sign-out with a clear recovery message', async () => {
    const result = await runSignOutFlow({
      syncBeforeSignOut: async () => undefined,
      getPendingChanges: async () => 0,
      confirmPendingChanges: async () => true,
      endSession: async () => ({ error: null }),
      clearLocalData: async () => {
        throw new Error('IndexedDB is unavailable');
      },
    });

    expect(result.signedOut).toBe(false);
    expect(result.cleanupFailed).toBe(true);
    expect(result.error).toContain('No se pudieron eliminar por completo los datos locales');
  });
});
