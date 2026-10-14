import type { ActiveRestTimer } from '../types';

const STORAGE_KEY = 'current_rest_timer';

type RestTimerStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function pauseRestTimer(timer: ActiveRestTimer, now: number): ActiveRestTimer {
  if (timer.pausedRemainingMs !== undefined || timer.targetEndTime <= now) return timer;
  return {
    ...timer,
    pausedRemainingMs: Math.max(0, timer.targetEndTime - now),
  };
}

export function resumeRestTimer(timer: ActiveRestTimer, now: number): ActiveRestTimer {
  if (timer.pausedRemainingMs === undefined) return timer;
  const { pausedRemainingMs, ...runningTimer } = timer;
  return {
    ...runningTimer,
    targetEndTime: now + pausedRemainingMs,
  };
}

export function extendRestTimer(
  timer: ActiveRestTimer,
  seconds: number,
  now: number,
): ActiveRestTimer {
  if (!Number.isFinite(seconds) || seconds <= 0) return timer;
  const extensionMs = seconds * 1000;

  if (timer.pausedRemainingMs !== undefined) {
    return {
      ...timer,
      pausedRemainingMs: timer.pausedRemainingMs + extensionMs,
    };
  }

  if (timer.targetEndTime <= now) {
    return {
      ...timer,
      initialSeconds: seconds,
      targetEndTime: now + extensionMs,
    };
  }

  return {
    ...timer,
    targetEndTime: timer.targetEndTime + extensionMs,
  };
}

export function getRestTimerRemainingMs(timer: ActiveRestTimer, now: number): number {
  if (timer.pausedRemainingMs !== undefined) return timer.pausedRemainingMs;
  return Math.max(0, timer.targetEndTime - now);
}

export function isRestTimerRunning(timer: ActiveRestTimer, now: number): boolean {
  return timer.pausedRemainingMs === undefined && timer.targetEndTime > now;
}

function getSessionStorage(): RestTimerStorage | null {
  try {
    return sessionStorage;
  } catch {
    return null;
  }
}

export function loadActiveRestTimer(
  storage: RestTimerStorage | null = getSessionStorage(),
  now = Date.now(),
): ActiveRestTimer | null {
  if (!storage) return null;
  try {
    const saved = storage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed: ActiveRestTimer = JSON.parse(saved);
      let timer = parsed;
      if (
        'pausedRemainingMs' in parsed &&
        (typeof parsed.pausedRemainingMs !== 'number' ||
          !Number.isFinite(parsed.pausedRemainingMs) ||
          parsed.pausedRemainingMs < 0)
      ) {
        timer = { ...parsed };
        delete timer.pausedRemainingMs;
      }
      if (
        timer.pausedRemainingMs !== undefined ||
        (timer.targetEndTime && timer.targetEndTime > now - 60_000)
      ) {
        return timer;
      }
    }
  } catch {}
  return null;
}

export function saveActiveRestTimer(
  timer: ActiveRestTimer,
  storage: RestTimerStorage | null = getSessionStorage(),
): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(timer));
  } catch {}
}

export function clearActiveRestTimer(
  storage: RestTimerStorage | null = getSessionStorage(),
): void {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {}
}
