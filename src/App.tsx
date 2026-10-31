/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppLoadingScreen } from './components/AppLoadingScreen';
import { AppShell } from './components/AppShell';
import { GlobalOverlays } from './components/GlobalOverlays';
import { LocalCleanupPendingScreen } from './components/LocalCleanupPendingScreen';
import { useAppBootstrap } from './hooks/useAppBootstrap';
import { useAppStore } from './store/appStore';
import { selectIsInitialSyncSettled, selectIsStorageReady } from './store/selectors';

export default function App() {
  useAppBootstrap();
  const cleanupPending = useAppStore((state) => state.cleanupPending);
  const isLoading = useAppStore((state) => state.isLoading);
  const isSignedIn = useAppStore((state) => Boolean(state.user?.id));
  const isStorageLoaded = useAppStore(selectIsStorageReady);
  const isSigningIn = useAppStore((state) => state.isSigningIn);
  const isSigningOut = useAppStore((state) => state.isSigningOut);
  const isSignOutConfirmOpen = useAppStore((state) => state.isSignOutConfirmOpen);
  const isOnline = useAppStore((state) => state.isOnline);
  const isSyncEnabled = useAppStore((state) => state.isSyncEnabled);
  const isSyncEligibilityLoading = useAppStore((state) => state.isSyncEligibilityLoading);
  const isOwnerHydrationComplete = useAppStore((state) => state.isGuestTransferComplete);
  const isInitialSyncSettled = useAppStore(selectIsInitialSyncSettled);
  const isAwaitingCloudData =
    isSignedIn &&
    isOnline &&
    (isSyncEligibilityLoading ||
      (isSyncEnabled && isOwnerHydrationComplete && !isInitialSyncSettled));
  const isOwnerLoading = isSignedIn && (!isStorageLoaded || isAwaitingCloudData);

  if (cleanupPending) return <LocalCleanupPendingScreen />;
  if (isLoading || isSigningIn || isOwnerLoading || (isSigningOut && !isSignOutConfirmOpen)) {
    return (
      <AppLoadingScreen
        message={isOwnerLoading || isSigningIn ? 'Cargando datos...' : undefined}
      />
    );
  }

  return (
    <AppShell>
      <GlobalOverlays />
    </AppShell>
  );
}
