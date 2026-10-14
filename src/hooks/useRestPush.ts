import { useEffect } from 'react';
import {
  closeRestNotifications,
  detectPushSupport,
  getBrowserPushSubscription,
  primeServiceWorkerRegistration,
} from '../utils/pushBrowser';
import {
  cancelRestPush,
  registerPushSubscription,
  scheduleRestPush,
} from '../services/push';
import { createRestPushController } from '../services/rest-push-controller';
import { appStore, useAppStore } from '../store/appStore';

interface RestPushStoreSnapshot {
  userId: string | null;
  endpoint: string | null;
  subscriptionJson: PushSubscriptionJSON | null;
  timer: ReturnType<typeof appStore.getState>['activeRestTimer'];
}

function getPushSnapshot(): RestPushStoreSnapshot {
  const state = appStore.getState();
  return {
    userId: state.user?.id ?? null,
    endpoint: state.restPush.endpoint,
    subscriptionJson: state.restPush.subscription,
    timer: state.activeRestTimer,
  };
}

function getPushSnapshotSignature(snapshot: RestPushStoreSnapshot): string {
  return JSON.stringify(snapshot);
}

export function useRestPush(): void {
  const setRestPushState = useAppStore((state) => state.setRestPushState);

  useEffect(() => {
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim();
    if (!vapidKey) {
      setRestPushState({
        support: 'unsupported',
        permission: 'unsupported',
        endpoint: null,
        subscription: null,
        armed: false,
        error: null,
      });
      return;
    }

    const support = detectPushSupport();
    const permission = support === 'available'
      ? Notification.permission
      : 'unsupported';
    setRestPushState({ support, permission });
    if (support !== 'available') return;

    let mounted = true;
    let controller: ReturnType<typeof createRestPushController> | null = null;
    let unsubscribeStore: (() => void) | null = null;
    let previousTimer: RestPushStoreSnapshot['timer'] = null;

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      const message = event.data;
      if (
        typeof message === 'object' &&
        message !== null &&
        message.type === 'rest-push-delivered' &&
        typeof message.scheduleId === 'string'
      ) {
        setRestPushState({
          lastDeliveredScheduleId: message.scheduleId,
          lastDeliveredAt: Date.now(),
          lastDeliveredWhileVisible: document.visibilityState === 'visible',
        });
      }
    };

    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

    const closeNotificationsWhenVisible = () => {
      if (document.visibilityState === 'visible') void closeRestNotifications();
    };

    const handleOnline = () => {
      if (controller) void controller.update(getPushSnapshot());
    };

    const initialize = async () => {
      try {
        await primeServiceWorkerRegistration();
        const subscription = await getBrowserPushSubscription();
        if (!mounted) return;
        const subscriptionJson = subscription?.toJSON() ?? null;
        setRestPushState({
          support,
          permission: Notification.permission,
          endpoint: subscription?.endpoint ?? null,
          subscription: subscriptionJson,
          error: null,
        });

        controller = createRestPushController({
          register: registerPushSubscription,
          schedule: scheduleRestPush,
          cancel: cancelRestPush,
          now: Date.now,
          onArmedChange: (armed) => {
            if (mounted) setRestPushState({ armed });
          },
          onScheduleIdChange: (scheduleId) => {
            if (mounted) setRestPushState({ scheduleId });
          },
          onError: (error) => {
            if (mounted) {
              setRestPushState({
                error: error
                  ? 'No se pudo programar el aviso. Se usará la alerta local.'
                  : null,
              });
            }
          },
        });
        const initialSnapshot = getPushSnapshot();
        let previousSignature = getPushSnapshotSignature(initialSnapshot);
        previousTimer = initialSnapshot.timer;
        void controller.update(initialSnapshot);

        unsubscribeStore = appStore.subscribe((state) => {
          const nextSnapshot: RestPushStoreSnapshot = {
            userId: state.user?.id ?? null,
            endpoint: state.restPush.endpoint,
            subscriptionJson: state.restPush.subscription,
            timer: state.activeRestTimer,
          };
          const signature = getPushSnapshotSignature(nextSnapshot);
          if (signature !== previousSignature) {
            previousSignature = signature;
            void controller?.update(nextSnapshot);
          }
          if (previousTimer && !nextSnapshot.timer) void closeRestNotifications();
          previousTimer = nextSnapshot.timer;
        });
        window.addEventListener('online', handleOnline);
        document.addEventListener('visibilitychange', closeNotificationsWhenVisible);
        closeNotificationsWhenVisible();
      } catch {
        if (mounted) {
          setRestPushState({
            armed: false,
            error: 'No se pudo preparar el aviso del temporizador.',
          });
        }
      }
    };

    void initialize();
    return () => {
      mounted = false;
      unsubscribeStore?.();
      controller?.dispose();
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', closeNotificationsWhenVisible);
    };
  }, [setRestPushState]);
}
