import type { ActiveRestTimer } from '../types';

const STORAGE_KEY = 'current_rest_timer';

type RestTimerStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

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
      if (parsed.targetEndTime && parsed.targetEndTime > now - 60_000) {
        return parsed;
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
