import { useEffect } from 'react';
import { appStore } from '../store/appStore';
import { hydrateStorage, startPersistence } from '../store/persistence';

export function useStorageLifecycle(
  ownerId?: string,
  transferGuestData = Boolean(ownerId),
  authResolved = true,
): void {
  useEffect(() => startPersistence(appStore), []);
  useEffect(
    () => {
      if (!authResolved) return;
      return hydrateStorage(appStore, ownerId, transferGuestData);
    },
    [authResolved, ownerId, transferGuestData],
  );
}
