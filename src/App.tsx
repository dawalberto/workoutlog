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
import { selectIsStorageReady } from './store/selectors';

export default function App() {
  useAppBootstrap();
  const cleanupPending = useAppStore((state) => state.cleanupPending);
  const isLoading = useAppStore((state) => state.isLoading);
  const isSignedIn = useAppStore((state) => Boolean(state.user?.id));
  const isStorageLoaded = useAppStore(selectIsStorageReady);
  const isSigningOut = useAppStore((state) => state.isSigningOut);
  const isSignOutConfirmOpen = useAppStore((state) => state.isSignOutConfirmOpen);
  const isOwnerStorageLoading = isSignedIn && !isStorageLoaded;

  if (cleanupPending) return <LocalCleanupPendingScreen />;
  if (isLoading || isOwnerStorageLoading || (isSigningOut && !isSignOutConfirmOpen)) {
    return <AppLoadingScreen message={isOwnerStorageLoading ? 'Cargando datos...' : undefined} />;
  }

  return (
    <AppShell>
      <GlobalOverlays />
    </AppShell>
  );
}
