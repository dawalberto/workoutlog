import { describe, expect, it, vi } from 'vitest';
import { createRestPushController } from '../../src/services/rest-push-controller';
import type { PushServiceResult } from '../../src/services/push';
import type { ActiveRestTimer } from '../../src/types';

const subscription = {
  endpoint: 'https://fcm.googleapis.com/endpoint',
  keys: { p256dh: 'public-key', auth: 'auth-key' },
};

function timer(targetEndTime: number, pausedRemainingMs?: number): ActiveRestTimer {
  return {
    routineId: 'routine-1',
    initialSeconds: 60,
    targetEndTime,
    exerciseName: 'Sentadilla',
    setNumber: 2,
    ...(pausedRemainingMs === undefined ? {} : { pausedRemainingMs }),
  };
}

function deps() {
  return {
    register: vi.fn(async (): Promise<PushServiceResult<string>> => ({
      success: true, data: null, error: null,
    })),
    schedule: vi.fn(async (): Promise<PushServiceResult<string>> => ({
      success: true, data: 'schedule-id', error: null,
    })),
    cancel: vi.fn(async (): Promise<PushServiceResult> => ({
      success: true, data: null, error: null,
    })),
    now: () => 1_000,
    onArmedChange: vi.fn(),
    onScheduleIdChange: vi.fn(),
  };
}

describe('rest push controller', () => {
  it('registers once per user and endpoint and schedules the running timer', async () => {
    const dependencies = deps();
    const onScheduleIdChange = dependencies.onScheduleIdChange;
    const controller = createRestPushController(dependencies);
    const snapshot = {
      userId: 'user-1',
      endpoint: subscription.endpoint,
      subscriptionJson: subscription,
      timer: timer(61_000),
    };
    await controller.update(snapshot);
    await controller.update({ ...snapshot, timer: { ...snapshot.timer, key: 2 } });
    expect(dependencies.register).toHaveBeenCalledTimes(1);
    expect(dependencies.schedule).toHaveBeenCalledTimes(1);
    expect(dependencies.schedule).toHaveBeenCalledWith(
      subscription.endpoint,
      60_000,
      { title: 'Descanso terminado', body: 'Sentadilla · Toca la serie 2' },
    );
    expect(dependencies.onArmedChange).toHaveBeenLastCalledWith(true);
    expect(onScheduleIdChange).toHaveBeenLastCalledWith('schedule-id');
  });

  it('re-registers when the signed-in user changes', async () => {
    const dependencies = deps();
    const controller = createRestPushController(dependencies);
    await controller.update({
      userId: 'user-1', endpoint: subscription.endpoint, subscriptionJson: subscription,
      timer: timer(61_000),
    });
    await controller.update({
      userId: 'user-2', endpoint: subscription.endpoint, subscriptionJson: subscription,
      timer: timer(81_000),
    });
    expect(dependencies.cancel).toHaveBeenCalledWith(subscription.endpoint);
    expect(dependencies.register).toHaveBeenCalledTimes(2);
  });

  it('cancels a schedule on pause or close but preserves it on finish', async () => {
    const dependencies = deps();
    const controller = createRestPushController(dependencies);
    const base = {
      userId: 'user-1',
      endpoint: subscription.endpoint,
      subscriptionJson: subscription,
    };
    await controller.update({ ...base, timer: timer(61_000) });
    await controller.update({ ...base, timer: timer(61_000, 10_000) });
    expect(dependencies.cancel).toHaveBeenCalledTimes(1);
    await controller.update({ ...base, timer: timer(61_000) });
    await controller.update({ ...base, timer: timer(1_000) });
    expect(dependencies.cancel).toHaveBeenCalledTimes(1);
    await controller.update({ ...base, timer: null });
    expect(dependencies.cancel).toHaveBeenCalledTimes(2);
  });

  it('serializes RPCs and applies only the latest state after an in-flight call', async () => {
    const dependencies = deps();
    let finishRegistration!: () => void;
    dependencies.register.mockImplementationOnce(() => new Promise((resolve) => {
      finishRegistration = () => resolve({ success: true, data: null, error: null });
    }));
    const controller = createRestPushController(dependencies);
    const base = {
      userId: 'user-1',
      endpoint: subscription.endpoint,
      subscriptionJson: subscription,
    };
    const firstUpdate = controller.update({ ...base, timer: timer(61_000) });
    const latestUpdate = controller.update({ ...base, timer: timer(91_000) });
    expect(dependencies.register).toHaveBeenCalledTimes(1);
    finishRegistration();
    await Promise.all([firstUpdate, latestUpdate]);
    expect(dependencies.schedule).toHaveBeenCalledTimes(1);
    expect(dependencies.schedule).toHaveBeenCalledWith(
      subscription.endpoint,
      90_000,
      expect.any(Object),
    );
  });

  it('reports unarmed on an RPC error and retries on the next state change', async () => {
    const dependencies = deps();
    const controller = createRestPushController(dependencies);
    const snapshot = {
      userId: 'user-1',
      endpoint: subscription.endpoint,
      subscriptionJson: subscription,
      timer: timer(61_000),
    };
    await controller.update(snapshot);
    dependencies.schedule.mockResolvedValueOnce({
      success: false, data: null, error: 'offline',
    });
    await controller.update({
      ...snapshot,
      timer: { ...snapshot.timer, targetEndTime: 91_000 },
    });
    expect(dependencies.onArmedChange).toHaveBeenLastCalledWith(false);
    await controller.update({ ...snapshot, timer: { ...snapshot.timer, key: 3 } });
    expect(dependencies.schedule).toHaveBeenCalledTimes(2);
    expect(dependencies.onArmedChange).toHaveBeenLastCalledWith(true);
  });
});
