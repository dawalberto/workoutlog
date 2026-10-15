import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  loadSyncEligibility,
  runSignOutFlow,
  signInWithGoogle,
  signOut,
} from '../src/services/auth';
import { getOAuthRedirectUrl } from '../src/hooks/useAuth';
import { createSupabaseBrowserClient } from '../src/services/supabase';

type AuthSession = {
  access_token: string;
  user: { id: string; email: string };
} | null;

function createHookHarness() {
  const slots: Array<{
    value?: unknown;
    deps?: readonly unknown[];
    cleanup?: () => void;
    initialized?: boolean;
  }> = [];
  const pendingEffects: Array<{
    index: number;
    callback: () => void | (() => void);
  }> = [];
  let cursor = 0;

  return {
    render<T>(callback: () => T): T {
      cursor = 0;
      return callback();
    },
    useState<T>(initial: T | (() => T)): [T, (next: T | ((previous: T) => T)) => void] {
      const index = cursor++;
      const slot = (slots[index] ??= {});
      if (!slot.initialized) {
        slot.value = typeof initial === 'function'
          ? (initial as () => T)()
          : initial;
        slot.initialized = true;
      }
      return [
        slot.value as T,
        (next) => {
          slot.value = typeof next === 'function'
            ? (next as (previous: T) => T)(slot.value as T)
            : next;
        },
      ];
    },
    useRef<T>(initial: T) {
      const index = cursor++;
      const slot = (slots[index] ??= {});
      if (!slot.initialized) {
        slot.value = { current: initial };
        slot.initialized = true;
      }
      return slot.value as { current: T };
    },
    useEffect(callback: () => void | (() => void), deps?: readonly unknown[]) {
      const index = cursor++;
      const slot = (slots[index] ??= {});
      const changed =
        deps === undefined ||
        !slot.initialized ||
        !slot.deps ||
        deps.some((value, depIndex) => !Object.is(value, slot.deps?.[depIndex]));
      if (changed) {
        pendingEffects.push({ index, callback });
        slot.deps = deps;
        slot.initialized = true;
      }
    },
    async runEffects() {
      while (pendingEffects.length > 0) {
        const effects = pendingEffects.splice(0);
        for (const effect of effects) {
          const slot = slots[effect.index]!;
          slot.cleanup?.();
          const cleanup = effect.callback();
          slot.cleanup = typeof cleanup === 'function' ? cleanup : undefined;
        }
      }
    },
    dispose() {
      slots.forEach((slot) => slot.cleanup?.());
    },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

async function setupAuthHook(sessionPromise: Promise<{
  data: { session: AuthSession };
  error: unknown;
}>) {
  vi.resetModules();
  const harness = createHookHarness();
  const published: Array<{ user: unknown; isLoading: boolean }> = [];
  const authActions = {
    publishAccountState: vi.fn((snapshot: { user: unknown; isLoading: boolean }) => {
      published.push(snapshot);
    }),
    registerAccountControls: vi.fn(),
  };
  let notifyAuthEvent: ((event: string, session: AuthSession) => void) | undefined;
  const client = {
    auth: {
      onAuthStateChange: vi.fn((callback: (event: string, session: AuthSession) => void) => {
        notifyAuthEvent = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
      getSession: vi.fn(() => sessionPromise),
    },
  };

  vi.doMock('react', async (importOriginal) => ({
    ...await importOriginal<typeof import('react')>(),
    useState: harness.useState,
    useRef: harness.useRef,
    useEffect: harness.useEffect,
    useLayoutEffect: harness.useEffect,
  }));
  vi.doMock('../src/services/auth', () => ({
    loadSyncEligibility: vi.fn(async () => true),
    runSignOutFlow: vi.fn(),
    signInWithGoogle: vi.fn(async () => ({ error: null })),
    signOut: vi.fn(),
  }));
  vi.doMock('../src/services/db', () => ({
    clearGuestLocalData: vi.fn(),
    clearOwnerLocalData: vi.fn(),
    flushScopedStorageWrites: vi.fn(),
    getPendingSyncOperations: vi.fn(async () => []),
  }));
  vi.doMock('../src/services/supabase', () => ({
    getSupabaseBrowserClient: () => client,
  }));
  vi.doMock('../src/store/appStore', () => ({
    useAppStore: (selector: (state: typeof authActions) => unknown) =>
      selector(authActions),
  }));

  const { useAuth } = await import('../src/hooks/useAuth');
  const render = () => harness.render(() => useAuth());
  return {
    client,
    harness,
    notifyAuthEvent: (event: string, session: AuthSession) =>
      notifyAuthEvent?.(event, session),
    published,
    render,
  };
}

afterEach(() => {
  vi.doUnmock('react');
  vi.doUnmock('../src/services/auth');
  vi.doUnmock('../src/services/db');
  vi.doUnmock('../src/services/supabase');
  vi.doUnmock('../src/store/appStore');
  vi.resetModules();
  vi.restoreAllMocks();
});

describe('Supabase authentication and sync eligibility', () => {
  it('waits for getSession before resolving a preliminary null auth event', async () => {
    const getSession = deferred<{
      data: { session: AuthSession };
      error: unknown;
    }>();
    const { client, harness, notifyAuthEvent, published, render } =
      await setupAuthHook(getSession.promise);

    render();
    await harness.runEffects();
    expect(client.auth.getSession).toHaveBeenCalledOnce();

    notifyAuthEvent('INITIAL_SESSION', null);
    expect(render().isLoading).toBe(true);
    await harness.runEffects();
    expect(published.some((snapshot) => !snapshot.isLoading && snapshot.user === null)).toBe(false);

    const ownerSession = {
      access_token: 'test-access-token',
      user: { id: 'owner-1', email: 'owner@example.test' },
    };
    getSession.resolve({ data: { session: ownerSession }, error: null });
    for (let attempt = 0; attempt < 10; attempt += 1) await Promise.resolve();
    expect(render()).toMatchObject({
      isLoading: false,
      user: { id: 'owner-1', email: 'owner@example.test' },
    });
    await harness.runEffects();
    expect(published.at(-1)).toMatchObject({
      isLoading: false,
      user: { id: 'owner-1', email: 'owner@example.test' },
    });

    notifyAuthEvent('SIGNED_OUT', null);
    expect(render()).toMatchObject({ isLoading: false, user: null });
    await harness.runEffects();
    expect(published.at(-1)).toMatchObject({ isLoading: false, user: null });
    harness.dispose();
  });

  it('prefers a user auth event over a null getSession result', async () => {
    const getSession = deferred<{
      data: { session: AuthSession };
      error: unknown;
    }>();
    const { harness, notifyAuthEvent, render } = await setupAuthHook(getSession.promise);

    render();
    await harness.runEffects();
    const ownerSession = {
      access_token: 'test-access-token',
      user: { id: 'owner-1', email: 'owner@example.test' },
    };
    notifyAuthEvent('SIGNED_IN', ownerSession);
    getSession.resolve({ data: { session: null }, error: null });
    for (let attempt = 0; attempt < 10; attempt += 1) await Promise.resolve();

    expect(render()).toMatchObject({
      isLoading: false,
      user: { id: 'owner-1', email: 'owner@example.test' },
    });
    harness.dispose();
  });

  it('keeps the signing-in gate active after OAuth starts successfully', async () => {
    const getSession = Promise.resolve({ data: { session: null }, error: null });
    const { harness, render } = await setupAuthHook(getSession);
    render();
    await harness.runEffects();
    for (let attempt = 0; attempt < 5; attempt += 1) await Promise.resolve();

    const auth = render();
    await auth.signInWithGoogle();
    expect(render().isSigningIn).toBe(true);
    harness.dispose();
  });

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
