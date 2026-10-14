import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearActiveRestTimer,
  extendRestTimer,
  getRestTimerRemainingMs,
  isRestTimerRunning,
  loadActiveRestTimer,
  pauseRestTimer,
  resumeRestTimer,
  saveActiveRestTimer,
} from '../../src/utils/restTimer';
import type { ActiveRestTimer } from '../../src/types';

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

  it('restores paused timers regardless of their target time and drops invalid pause values', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-13T12:00:00.000Z'));
    const timer = {
      ...createTimer(Date.now() - 30_000),
      pausedRemainingMs: 15_000,
    };
    const storage = createStorage(JSON.stringify(timer));

    expect(loadActiveRestTimer(storage)).toEqual(timer);

    storage.values.set(
      'current_rest_timer',
      JSON.stringify({ ...timer, pausedRemainingMs: Number.POSITIVE_INFINITY }),
    );
    expect(loadActiveRestTimer(storage)).toEqual(createTimer(Date.now() - 30_000));
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

function createTimer(targetEndTime: number, initialSeconds = 60): ActiveRestTimer {
  return {
    routineId: 'routine-1',
    initialSeconds,
    targetEndTime,
    exerciseName: 'Sentadilla',
    setNumber: 2,
    key: 101,
  };
}

describe('rest timer state helpers', () => {
  const now = 1_000_000;

  it('pauses with the exact remaining milliseconds and resumes from the current time', () => {
    const timer = createTimer(now + 12_345);
    const paused = pauseRestTimer(timer, now);

    expect(paused).toEqual({ ...timer, pausedRemainingMs: 12_345 });
    expect(pauseRestTimer(timer, now + 12_345)).toBe(timer);
    expect(resumeRestTimer(paused, now + 5_000)).toEqual({
      ...timer,
      targetEndTime: now + 17_345,
    });
  });

  it('extends running and paused timers without changing their initial duration', () => {
    const timer = createTimer(now + 12_345);

    expect(extendRestTimer(timer, 30, now)).toEqual({
      ...timer,
      targetEndTime: now + 42_345,
    });
    expect(extendRestTimer({ ...timer, pausedRemainingMs: 12_345 }, 30, now)).toEqual({
      ...timer,
      pausedRemainingMs: 42_345,
    });
  });

  it('starts a new countdown after finish and uses the extension as its initial duration', () => {
    const timer = createTimer(now);

    expect(extendRestTimer(timer, 30, now)).toEqual({
      ...timer,
      initialSeconds: 30,
      targetEndTime: now + 30_000,
    });
  });

  it('reports remaining time and running status from the persisted timer', () => {
    const running = createTimer(now + 1_234);
    const paused = { ...running, pausedRemainingMs: 321 };

    expect(getRestTimerRemainingMs(running, now)).toBe(1_234);
    expect(getRestTimerRemainingMs(paused, now)).toBe(321);
    expect(getRestTimerRemainingMs(running, now + 2_000)).toBe(0);
    expect(isRestTimerRunning(running, now)).toBe(true);
    expect(isRestTimerRunning(paused, now)).toBe(false);
    expect(isRestTimerRunning(running, now + 2_000)).toBe(false);
  });
});
