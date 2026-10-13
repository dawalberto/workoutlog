import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearActiveRestTimer,
  loadActiveRestTimer,
  saveActiveRestTimer,
} from '../../src/utils/restTimer';

function createStorage(initial?: string) {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set('current_rest_timer', initial);
  let shouldFail = false;
  const storage = {
    values,
    setFailure(value: boolean) {
      shouldFail = value;
    },
    getItem(key: string) {
      if (shouldFail) throw new Error('Storage operation failed');
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      if (shouldFail) throw new Error('Storage operation failed');
      values.set(key, value);
    },
    removeItem(key: string) {
      if (shouldFail) throw new Error('Storage operation failed');
      values.delete(key);
    },
  };
  return storage;
}

describe('rest timer storage helpers', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('hydrates timers through the 60-second expiry grace period', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-13T12:00:00.000Z'));
    const timer = {
      routineId: 'routine-1',
      initialSeconds: 60,
      targetEndTime: Date.now() - 59_999,
      exerciseName: 'Sentadilla',
    };
    const storage = createStorage(JSON.stringify(timer));

    expect(loadActiveRestTimer(storage)).toEqual(timer);
    expect(loadActiveRestTimer(storage, Date.now() + 1)).toBeNull();
  });

  it('returns null for malformed, expired, or inaccessible stored values', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-13T12:00:00.000Z'));
    expect(loadActiveRestTimer(createStorage('{invalid json'))).toBeNull();
    expect(loadActiveRestTimer(createStorage(JSON.stringify({
      routineId: 'routine-1',
      initialSeconds: 60,
      targetEndTime: Date.now() - 60_000,
    })))).toBeNull();

    const storage = createStorage();
    storage.setFailure(true);
    expect(loadActiveRestTimer(storage)).toBeNull();
  });

  it('saves and clears timers while tolerating storage errors', () => {
    const storage = createStorage();
    const timer = {
      routineId: 'routine-1',
      initialSeconds: 60,
      targetEndTime: Date.now() + 60_000,
    };
    saveActiveRestTimer(timer, storage);
    expect(storage.values.get('current_rest_timer')).toBe(JSON.stringify(timer));
    clearActiveRestTimer(storage);
    expect(storage.values.has('current_rest_timer')).toBe(false);

    storage.setFailure(true);
    expect(() => saveActiveRestTimer(timer, storage)).not.toThrow();
    expect(() => clearActiveRestTimer(storage)).not.toThrow();
  });
});
