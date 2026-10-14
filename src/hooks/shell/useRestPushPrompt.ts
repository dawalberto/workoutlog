import { useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import { subscribeBrowserPush } from '../../utils/pushBrowser';

export function useRestPushPrompt() {
  const user = useAppStore((state) => state.user);
  const restPush = useAppStore((state) => state.restPush);
  const setRestPushState = useAppStore((state) => state.setRestPushState);

  const enablePush = useCallback(() => {
    let subscriptionPromise: Promise<PushSubscription>;
    try {
      subscriptionPromise = subscribeBrowserPush(
        import.meta.env.VITE_VAPID_PUBLIC_KEY ?? '',
      );
    } catch {
      setRestPushState({
        error: 'No se pudieron activar las notificaciones. Inténtalo de nuevo.',
      });
      return;
    }

    setRestPushState({ error: null });
    void subscriptionPromise.then((subscription) => {
      setRestPushState({
        endpoint: subscription.endpoint,
        subscription: subscription.toJSON(),
        permission: Notification.permission,
        error: null,
      });
    }).catch(() => {
      setRestPushState({
        permission: typeof Notification === 'undefined'
          ? 'unsupported'
          : Notification.permission,
        error: 'No se pudieron activar las notificaciones. Revisa los permisos del navegador.',
      });
    });
  }, [setRestPushState]);

  return { user, restPush, enablePush };
}
