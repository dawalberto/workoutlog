import { describe, expect, it } from 'vitest';
import {
  buildRestPushMessage,
  planRestPush,
  shouldPlayLocalRestAlert,
} from '../../src/utils/restPush';
import type { ActiveRestTimer } from '../../src/types';

const runningTimer: ActiveRestTimer = {
  routineId: 'routine-1',
  initialSeconds: 60,
  targetEndTime: 61_000,
  exerciseName: 'Press banca',
  setNumber: 3,
};

describe('rest push planning', () => {
  it('cancels when there is no timer or the timer is paused', () => {
    expect(planRestPush(null, 1_000)).toEqual({ kind: 'cancel' });
    expect(planRestPush({ ...runningTimer, pausedRemainingMs: 10_000 }, 1_000))
      .toEqual({ kind: 'cancel' });
  });

  it('keeps the existing server schedule when the timer has finished', () => {
    expect(planRestPush({ ...runningTimer, targetEndTime: 1_000 }, 1_000))
      .toEqual({ kind: 'keep' });
  });

  it('keeps local feedback for timers too close to schedule reliably', () => {
    expect(planRestPush({ ...runningTimer, targetEndTime: 2_499 }, 1_000))
      .toEqual({ kind: 'keep' });
  });

  it('schedules a running timer and clamps delays to the two-hour server limit', () => {
    expect(planRestPush(runningTimer, 1_000)).toEqual({
      kind: 'schedule',
      delayMs: 60_000,
      targetEndTime: 61_000,
    });
    expect(planRestPush({ ...runningTimer, targetEndTime: 9_000_000 }, 1_000))
      .toEqual({
        kind: 'schedule',
        delayMs: 7_200_000,
        targetEndTime: 9_000_000,
      });
  });
});

describe('rest push messages', () => {
  it('names the exercise and series in Spanish', () => {
    expect(buildRestPushMessage(runningTimer)).toEqual({
      title: 'Descanso terminado',
      body: 'Press banca · Toca la serie 3',
    });
  });

  it('uses a Spanish fallback and respects database length limits', () => {
    const message = buildRestPushMessage({
      ...runningTimer,
      exerciseName: 'Ejercicio '.repeat(40),
      setNumber: undefined,
    });
    expect(message.title).toBe('Descanso terminado');
    expect(message.body).toContain('¡A por la siguiente serie!');
    expect(message.title.length).toBeLessThanOrEqual(120);
    expect(message.body.length).toBeLessThanOrEqual(240);
    expect(buildRestPushMessage({ ...runningTimer, exerciseName: undefined }))
      .toEqual({
        title: 'Descanso terminado',
        body: '¡A por la siguiente serie!',
      });
  });

});

describe('local rest alert fallback', () => {
  it('plays locally when no current schedule or matching delivery is known', () => {
    expect(shouldPlayLocalRestAlert(null, null)).toBe(true);
    expect(shouldPlayLocalRestAlert('schedule-current', null)).toBe(true);
    expect(shouldPlayLocalRestAlert('schedule-current', 'schedule-previous')).toBe(true);
  });

  it('suppresses the local alert only after the current schedule is delivered', () => {
    expect(shouldPlayLocalRestAlert('schedule-current', 'schedule-current', false)).toBe(false);
  });

  it('keeps local feedback when a matching foreground push is silent', () => {
    expect(shouldPlayLocalRestAlert('schedule-current', 'schedule-current', true)).toBe(true);
  });
});
