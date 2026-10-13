import { useEffect } from 'react';
import { appStore } from '../store/appStore';
import { hydrateStorage, startPersistence } from '../store/persistence';

export function useStorageLifecycle(
  ownerId?: string,
  transferGuestData = false,
): void {
  useEffect(() => startPersistence(appStore), []);
  useEffect(
    () => hydrateStorage(appStore, ownerId, transferGuestData),
    [ownerId, transferGuestData],
  );
}
