import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isPremiumEntitlementActive,
  loadAccountEntitlement,
  signInWithGoogle,
  signOut,
} from '../src/services/auth';
import type { AccountEntitlementResponse } from '../src/services/auth';
import { createSupabaseBrowserClient } from '../src/services/supabase';
import { hasAccountPremiumAccess } from '../src/hooks/useAuth';

const entitlementResponse: AccountEntitlementResponse = {
  userId: 'user-a',
  entitlement: {
    tier: 'premium',
    validUntil: '2030-01-01T00:00:00.000Z',
    activePlanIds: ['monthly'],
  },
  premium: true,
};

function routine(id: string, name: string) {
  return {
    id,
    name,
    notes: '',
    exercises: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

beforeEach(() => {
  vi.resetModules();
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      indexedDB: new IDBFactory(),
      localStorage: {
        getItem: () => null,
        setItem: () => undefined,
        removeItem: () => undefined,
        clear: () => undefined,
      },
    },
  });
});

afterEach(async () => {
  const storage = await import('../src/services/db');
  (await storage.getDatabase()).close();
  Reflect.deleteProperty(globalThis, 'window');
  vi.restoreAllMocks();
});

describe('account entitlement and Supabase auth', () => {
  it('grants Premium capabilities to signed-in accounts and keeps guests Free', () => {
    expect(
      hasAccountPremiumAccess({ id: 'user-a', email: 'user@example.test' }),
    ).toBe(true);
    expect(hasAccountPremiumAccess(null)).toBe(false);
  });

  it('requests the verified entitlement route with the session bearer token', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(entitlementResponse)));

    await expect(
      loadAccountEntitlement(
        'https://api.example.test/',
        'session-access-token',
        fetchMock as unknown as typeof fetch,
      ),
    ).resolves.toEqual(entitlementResponse);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.test/api/v1/account/entitlement',
      {
        headers: { Authorization: 'Bearer session-access-token' },
      },
    );
  });

  it('rejects entitlement responses that do not match the backend schema', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ ...entitlementResponse, userId: '', premium: 'yes' })),
    );

    await expect(
      loadAccountEntitlement(
        'https://api.example.test',
        'session-access-token',
        fetchMock as unknown as typeof fetch,
      ),
    ).rejects.toThrow('Invalid entitlement response');
  });

  it('treats legacy Premium entitlements without plan metadata as unclassified', async () => {
    const legacyResponse = {
      ...entitlementResponse,
      entitlement: { tier: 'premium', validUntil: null },
    };
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(legacyResponse)));

    await expect(
      loadAccountEntitlement(
        'https://api.example.test',
        'session-access-token',
        fetchMock as unknown as typeof fetch,
      ),
    ).resolves.toEqual({
      ...legacyResponse,
      entitlement: { ...legacyResponse.entitlement, activePlanIds: [] },
    });
  });

  it('does not make a request when the backend origin is missing', async () => {
    const fetchMock = vi.fn();

    await expect(
      loadAccountEntitlement('', 'session-access-token', fetchMock as typeof fetch),
    ).rejects.toThrow('Backend API origin is not configured.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('disables Premium eligibility after expiry and for Free entitlements', () => {
    const now = Date.parse('2028-01-01T00:00:00.000Z');
    expect(
      isPremiumEntitlementActive(
        {
          ...entitlementResponse,
          entitlement: {
            tier: 'premium',
            validUntil: '2027-12-31T23:59:59.000Z',
            activePlanIds: [],
          },
        },
        now,
      ),
    ).toBe(false);
    expect(
      isPremiumEntitlementActive(
        {
          ...entitlementResponse,
          entitlement: {
            tier: 'premium',
            validUntil: null,
            activePlanIds: [],
          },
        },
        now,
      ),
    ).toBe(true);
    expect(
      isPremiumEntitlementActive({ ...entitlementResponse, premium: false }, now),
    ).toBe(false);
  });

  it('keeps local use available when public Supabase configuration is missing', async () => {
    expect(createSupabaseBrowserClient({ url: '', publishableKey: '' })).toBeNull();
    expect(
      createSupabaseBrowserClient({ url: 'not-a-url', publishableKey: 'public-key' }),
    ).toBeNull();
    await expect(signInWithGoogle(null, 'http://localhost:3000')).resolves.toEqual({
      error: 'Supabase authentication is not configured. Local use remains available.',
    });
  });

  it('surfaces provider and sign-out failures without throwing', async () => {
    const client = {
      auth: {
        signInWithOAuth: vi.fn(async () => ({
          data: { provider: 'google', url: null },
          error: new Error('Google provider is unavailable'),
        })),
        signOut: vi.fn(async () => ({ error: new Error('Session could not be cleared') })),
      },
    };

    await expect(
      signInWithGoogle(client as never, 'http://localhost:3000'),
    ).resolves.toEqual({ error: 'Google provider is unavailable' });
    await expect(signOut(client as never)).resolves.toEqual({
      error: 'Session could not be cleared',
    });
    expect(client.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'http://localhost:3000' },
    });
  });
});

describe('owner-scoped guest migration', () => {
  it('atomically merges guest collections once and keeps each account partitioned', async () => {
    const storage = await import('../src/services/db');
    const guest = storage.GUEST_STORAGE_SCOPE;
    const ownerA = { ownerId: 'user-a' };
    const ownerB = { ownerId: 'user-b' };

    await storage.initAndMigrateStorage(guest);
    await storage.setScopedStoredItem(
      storage.DB_KEYS.ROUTINES,
      [
        routine('shared-routine', 'Guest version'),
        routine('guest-routine', 'Guest routine'),
      ],
      guest,
    );
    await storage.setScopedStoredItem(
      storage.DB_KEYS.CATALOG,
      [{ id: 'guest-exercise', name: 'Guest exercise' }],
      guest,
    );
    await storage.setScopedStoredItem(
      storage.DB_KEYS.ACTIVE_SESSIONS,
      { 'guest-routine': { routineId: 'guest-routine' } },
      guest,
    );
    await storage.setScopedStoredItem(
      storage.DB_KEYS.RM_LOGS,
      [
        {
          id: 'guest-rm',
          exerciseName: 'Guest lift',
          records: [],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      guest,
    );
    await storage.setScopedStoredItem(
      storage.DB_KEYS.WORKOUT_HISTORY,
      [
        {
          id: 'guest-history',
          routineId: 'guest-routine',
          routineName: 'Guest routine',
          startTime: 1,
          endTime: 2,
          completedAt: '2026-01-01T00:00:00.000Z',
          durationSeconds: 1,
          completedSetsCount: 0,
          exercisesSummary: [],
        },
      ],
      guest,
    );
    await storage.setScopedStoredItem(
      storage.DB_KEYS.EXERCISE_DIARY,
      [
        {
          id: 'guest-diary',
          exerciseName: 'Guest lift',
          entries: [],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      guest,
    );
    await storage.setScopedStoredItem(
      storage.DB_KEYS.ROUTINES,
      [routine('shared-routine', 'Account version')],
      ownerA,
    );

    await expect(storage.transferGuestDataToOwnerOnce(ownerA.ownerId)).resolves.toBe(true);
    await expect(
      storage.getScopedStoredItem(storage.DB_KEYS.ROUTINES, [], ownerA),
    ).resolves.toContainEqual(routine('guest-routine', 'Guest routine'));

    const ownerData = await storage.initAndMigrateStorage(ownerA);
    expect(ownerData.routines).toContainEqual(routine('shared-routine', 'Account version'));
    expect(ownerData.routines).toContainEqual(routine('guest-routine', 'Guest routine'));
    expect(ownerData.routines).toHaveLength(2);
    expect(ownerData.catalog).toContainEqual({ id: 'guest-exercise', name: 'Guest exercise' });
    expect(ownerData.activeSessions).toEqual({
      'guest-routine': { routineId: 'guest-routine' },
    });
    expect(ownerData.rmLogs).toEqual([
      expect.objectContaining({ id: 'guest-rm', exerciseName: 'Guest lift' }),
    ]);
    expect(ownerData.workoutHistory).toEqual([
      expect.objectContaining({ id: 'guest-history', routineId: 'guest-routine' }),
    ]);
    expect(ownerData.exerciseDiary).toEqual([
      expect.objectContaining({ id: 'guest-diary', exerciseName: 'Guest lift' }),
    ]);
    await expect(storage.getPendingSyncOperations(ownerA)).resolves.not.toHaveLength(0);
    await expect(storage.getPendingSyncOperations(guest)).resolves.toEqual([]);
    await expect(
      storage.getScopedStoredItem(storage.DB_KEYS.ROUTINES, [], guest),
    ).resolves.toEqual([]);
    await expect(
      storage.getScopedStoredItem(storage.DB_KEYS.CATALOG, [], guest),
    ).resolves.toEqual([]);
    await expect(
      storage.getScopedStoredItem(storage.DB_KEYS.ACTIVE_SESSIONS, {}, guest),
    ).resolves.toEqual({});
    await expect(
      storage.getScopedStoredItem(storage.DB_KEYS.RM_LOGS, [], guest),
    ).resolves.toEqual([]);
    await expect(
      storage.getScopedStoredItem(storage.DB_KEYS.WORKOUT_HISTORY, [], guest),
    ).resolves.toEqual([]);
    await expect(
      storage.getScopedStoredItem(storage.DB_KEYS.EXERCISE_DIARY, [], guest),
    ).resolves.toEqual([]);

    await storage.setScopedStoredItem(
      storage.DB_KEYS.ROUTINES,
      [routine('later-guest-routine', 'New guest data')],
      guest,
    );
    await expect(storage.transferGuestDataToOwnerOnce(ownerA.ownerId)).resolves.toBe(false);
    await expect(
      storage.getScopedStoredItem(storage.DB_KEYS.ROUTINES, [], ownerA),
    ).resolves.not.toContainEqual({
      ...routine('later-guest-routine', 'New guest data'),
    });
    await expect(
      storage.getScopedStoredItem(storage.DB_KEYS.ROUTINES, [], guest),
    ).resolves.toContainEqual(routine('later-guest-routine', 'New guest data'));

    await storage.setScopedStoredItem(
      storage.DB_KEYS.ROUTINES,
      [routine('user-b-routine', 'Account B routine')],
      ownerB,
    );
    const ownerBData = await storage.initAndMigrateStorage(ownerB);
    expect(ownerBData.routines).toEqual([routine('user-b-routine', 'Account B routine')]);
    expect(ownerBData.routines).not.toContainEqual(
      expect.objectContaining({ id: 'shared-routine' }),
    );
    expect(ownerBData.routines).not.toContainEqual(
      expect.objectContaining({ id: 'guest-routine' }),
    );
  });
});
