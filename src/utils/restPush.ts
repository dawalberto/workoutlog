import type { ActiveRestTimer } from '../types';

const MIN_SCHEDULE_DELAY_MS = 1_500;
const MAX_SCHEDULE_DELAY_MS = 7_200_000;

export type RestPushPlan =
  | { kind: 'schedule'; delayMs: number; targetEndTime: number }
  | { kind: 'cancel' }
  | { kind: 'keep' };

export interface RestPushMessage {
  title: string;
  body: string;
}

export function planRestPush(timer: ActiveRestTimer | null, now: number): RestPushPlan {
  if (!timer || timer.pausedRemainingMs !== undefined) return { kind: 'cancel' };
  if (timer.targetEndTime <= now) return { kind: 'keep' };

  const remainingMs = timer.targetEndTime - now;
  if (remainingMs < MIN_SCHEDULE_DELAY_MS) return { kind: 'keep' };

  return {
    kind: 'schedule',
    delayMs: Math.min(MAX_SCHEDULE_DELAY_MS, Math.ceil(remainingMs)),
    targetEndTime: timer.targetEndTime,
  };
}

export function buildRestPushMessage(timer: ActiveRestTimer): RestPushMessage {
  const title = 'Descanso terminado'.slice(0, 120);
  const exerciseName = timer.exerciseName?.trim() ?? '';
  const hasExerciseAndSet = exerciseName && timer.setNumber !== undefined;
  const suffix = hasExerciseAndSet
    ? ` · Toca la serie ${timer.setNumber}`
    : ' · ¡A por la siguiente serie!';
  const body = exerciseName
    ? `${exerciseName.slice(0, Math.max(0, 240 - suffix.length))}${suffix}`
    : '¡A por la siguiente serie!';

  return { title, body: body.slice(0, 240) };
}

export function shouldPlayLocalRestAlert(
  currentScheduleId: string | null,
  deliveredScheduleId: string | null,
  deliveredWhileVisible = false,
): boolean {
  return currentScheduleId === null ||
    currentScheduleId !== deliveredScheduleId ||
    deliveredWhileVisible;
}
