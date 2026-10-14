import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppStore } from '../../src/store/appStore';
import type { ActiveRestTimer } from '../../src/types';

function createSessionStorage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
    removeItem(key: string) {
      values.delete(key);
    },
  };
}

function createTimer(targetEndTime: number): ActiveRestTimer {
  return {
    routineId: 'routine-1',
    initialSeconds: 60,
    targetEndTime,
    exerciseName: 'Sentadilla',
    setNumber: 2,
    key: 101,
  };
}

describe('rest timer store slice', () => {
  let storage: ReturnType<typeof createSessionStorage>;

  beforeEach(() => {
    storage = createSessionStorage();
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: storage,
    });
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-13T12:00:00.000Z'));
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'sessionStorage');
    vi.useRealTimers();
  });

  it('persists pause, resume, and extension through the active timer storage path', () => {
    const store = createAppStore();
    const timer = createTimer(Date.now() + 12_000);
    store.getState().startRestTimer(timer);

    store.getState().pauseRestTimer();
    expect(store.getState().activeRestTimer).toEqual({
      ...timer,
      pausedRemainingMs: 12_000,
    });
    expect(JSON.parse(storage.values.get('current_rest_timer') ?? 'null')).toEqual(
      store.getState().activeRestTimer,
    );

    vi.advanceTimersByTime(5_000);
    store.getState().resumeRestTimer();
    expect(store.getState().activeRestTimer).toEqual({
      ...timer,
      targetEndTime: Date.now() + 12_000,
    });

    store.getState().extendRestTimer(30);
    expect(store.getState().activeRestTimer).toEqual({
      ...timer,
      targetEndTime: Date.now() + 42_000,
    });
    expect(JSON.parse(storage.values.get('current_rest_timer') ?? 'null')).toEqual(
      store.getState().activeRestTimer,
    );
  });

  it('extends a finished timer into a fresh countdown', () => {
    const store = createAppStore();
    store.getState().startRestTimer(createTimer(Date.now()));

    store.getState().extendRestTimer(30);

    expect(store.getState().activeRestTimer).toMatchObject({
      initialSeconds: 30,
      targetEndTime: Date.now() + 30_000,
    });
  });
});
