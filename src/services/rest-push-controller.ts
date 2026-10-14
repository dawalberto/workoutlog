import type { ActiveRestTimer } from '../types';
import { buildRestPushMessage, planRestPush } from '../utils/restPush';
import type { PushServiceResult } from './push';

export interface RestPushSnapshot {
  userId: string | null;
  endpoint: string | null;
  subscriptionJson: PushSubscriptionJSON | null;
  timer: ActiveRestTimer | null;
}

export interface RestPushControllerDependencies {
  register: (
    subscription: PushSubscriptionJSON,
  ) => Promise<PushServiceResult<string>>;
  schedule: (
    endpoint: string,
    delayMs: number,
    message: ReturnType<typeof buildRestPushMessage>,
  ) => Promise<PushServiceResult<string>>;
  cancel: (endpoint: string) => Promise<PushServiceResult>;
  now: () => number;
  onArmedChange: (armed: boolean) => void;
  onScheduleIdChange?: (scheduleId: string | null) => void;
  onError?: (error: string | null) => void;
}

interface RegisteredIdentity {
  userId: string;
  endpoint: string;
}

interface ActiveSchedule {
  userId: string;
  endpoint: string;
  scheduleId: string | null;
  targetEndTime: number;
}

export interface RestPushController {
  update: (snapshot: RestPushSnapshot) => Promise<void>;
  dispose: () => void;
}

export function createRestPushController(
  dependencies: RestPushControllerDependencies,
): RestPushController {
  let latestSnapshot: RestPushSnapshot | null = null;
  let pendingSnapshot: RestPushSnapshot | null = null;
  let running = false;
  let disposed = false;
  let registeredIdentity: RegisteredIdentity | null = null;
  let activeSchedule: ActiveSchedule | null = null;
  let armed = false;
  let idleWaiters: Array<() => void> = [];

  const setArmed = (nextArmed: boolean) => {
    if (armed === nextArmed) return;
    armed = nextArmed;
    dependencies.onArmedChange(armed);
  };

  const isLatest = (snapshot: RestPushSnapshot) => latestSnapshot === snapshot;

  const reportResult = <T,>(result: PushServiceResult<T>): boolean => {
    dependencies.onError?.(result.success ? null : result.error ?? 'Push request failed.');
    return result.success;
  };

  const cancelEndpoint = async (endpoint: string): Promise<boolean> => {
    const result = await dependencies.cancel(endpoint);
    const succeeded = reportResult(result);
    if (succeeded && activeSchedule?.endpoint === endpoint) {
      activeSchedule = null;
      dependencies.onScheduleIdChange?.(null);
    }
    return succeeded;
  };

  const applySnapshot = async (snapshot: RestPushSnapshot): Promise<void> => {
    const identity = snapshot.userId && snapshot.endpoint && snapshot.subscriptionJson
      ? { userId: snapshot.userId, endpoint: snapshot.endpoint }
      : null;
    const identityChanged = registeredIdentity !== null &&
      (identity?.userId !== registeredIdentity.userId ||
        identity.endpoint !== registeredIdentity.endpoint);

    if (identityChanged && registeredIdentity) {
      await cancelEndpoint(registeredIdentity.endpoint);
      registeredIdentity = null;
      setArmed(false);
      if (!isLatest(snapshot)) return;
    }

    if (!identity) {
      if (registeredIdentity) {
        await cancelEndpoint(registeredIdentity.endpoint);
        registeredIdentity = null;
      }
      if (snapshot.userId === null && activeSchedule) {
        await cancelEndpoint(activeSchedule.endpoint);
      }
      setArmed(false);
      return;
    }

    if (
      !registeredIdentity ||
      registeredIdentity.userId !== identity.userId ||
      registeredIdentity.endpoint !== identity.endpoint
    ) {
      const registration = await dependencies.register(snapshot.subscriptionJson!);
      if (!reportResult(registration)) {
        setArmed(false);
        return;
      }
      registeredIdentity = identity;
      if (!isLatest(snapshot)) return;
    }

    const plan = planRestPush(snapshot.timer, dependencies.now());
    if (plan.kind === 'cancel') {
      if (activeSchedule?.endpoint === identity.endpoint) {
        await cancelEndpoint(identity.endpoint);
      }
      setArmed(false);
      return;
    }

    if (plan.kind === 'keep') {
      const stillRunning = snapshot.timer !== null &&
        snapshot.timer.pausedRemainingMs === undefined &&
        snapshot.timer.targetEndTime > dependencies.now();
      setArmed(
        stillRunning &&
        activeSchedule?.userId === identity.userId &&
        activeSchedule.endpoint === identity.endpoint,
      );
      return;
    }

    if (
      activeSchedule?.userId === identity.userId &&
      activeSchedule?.endpoint === identity.endpoint &&
      activeSchedule.targetEndTime === plan.targetEndTime
    ) {
      setArmed(true);
      return;
    }

    const result = await dependencies.schedule(
      identity.endpoint,
      plan.delayMs,
      buildRestPushMessage(snapshot.timer!),
    );
    if (!reportResult(result)) {
      setArmed(false);
      dependencies.onScheduleIdChange?.(null);
      return;
    }

    activeSchedule = {
      userId: identity.userId,
      endpoint: identity.endpoint,
      scheduleId: result.data,
      targetEndTime: plan.targetEndTime,
    };
    dependencies.onScheduleIdChange?.(activeSchedule.scheduleId);
    const latest = latestSnapshot;
    const latestPlan = latest ? planRestPush(latest.timer, dependencies.now()) : null;
    setArmed(
      latest?.userId === identity.userId &&
      latest.endpoint === identity.endpoint &&
      latestPlan?.kind === 'schedule' &&
      latestPlan.targetEndTime === plan.targetEndTime,
    );
  };

  const drain = async (): Promise<void> => {
    while (pendingSnapshot && !disposed) {
      const snapshot = pendingSnapshot;
      pendingSnapshot = null;
      try {
        await applySnapshot(snapshot);
      } catch (error) {
        dependencies.onError?.(
          error instanceof Error ? error.message : 'Push request failed.',
        );
        setArmed(false);
      }
    }
    running = false;
    const waiters = idleWaiters;
    idleWaiters = [];
    waiters.forEach((resolve) => resolve());
  };

  return {
    update: (snapshot) => {
      if (disposed) return Promise.resolve();
      latestSnapshot = snapshot;
      pendingSnapshot = snapshot;
      if (!running) {
        running = true;
        void drain();
      }
      return new Promise((resolve) => idleWaiters.push(resolve));
    },
    dispose: () => {
      disposed = true;
      pendingSnapshot = null;
      dependencies.onScheduleIdChange?.(null);
      setArmed(false);
    },
  };
}
