import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { useAppHeader } from '../src/hooks/shell/useAppHeader';
import { useGlobalOverlays } from '../src/hooks/shell/useGlobalOverlays';
import { useLocalCleanupPending } from '../src/hooks/shell/useLocalCleanupPending';
import { useRestTimerBar } from '../src/hooks/shell/useRestTimerBar';
import { useSidebarMenu } from '../src/hooks/shell/useSidebarMenu';
import { appStore } from '../src/store/appStore';
import {
  resetAppStore,
  seedAppStore,
  useCurrentStateAsServerSnapshot,
} from './store-test-utils';
import { AppTab } from '../src/types';
import type { AccountControls } from '../src/store/slices/accountSlice';

vi.mock('../src/hooks/useAppBootstrap', () => ({
  useAppBootstrap: vi.fn(),
}));

describe('App shell composition', () => {
  beforeEach(() => {
    resetAppStore();
    seedAppStore({
      isLoading: false,
      isStorageLoaded: true,
      activeScopeKey: 'guest',
      hydratedScopeKey: 'guest',
    });
    useCurrentStateAsServerSnapshot();
  });

  afterEach(() => {
    appStore.getState().registerAccountControls(null);
    resetAppStore();
  });

  const renderApp = () => renderToStaticMarkup(<App />);

  it('renders the tab view selected by the header action', () => {
    let headerActions: ReturnType<typeof useAppHeader>;
    const CaptureHeaderActions: React.FC = () => {
      headerActions = useAppHeader();
      return null;
    };

    renderToStaticMarkup(<CaptureHeaderActions />);
    headerActions!.onSelectTab(AppTab.EXERCISES);

    expect(renderApp()).toContain('id="exercise-catalog-page"');
  });

  it('opens and closes the sidebar and backup modal through shell actions', () => {
    let headerActions: ReturnType<typeof useAppHeader>;
    const CaptureHeaderActions: React.FC = () => {
      headerActions = useAppHeader();
      return null;
    };
    let sidebarActions: ReturnType<typeof useSidebarMenu>;
    const CaptureSidebarActions: React.FC = () => {
      sidebarActions = useSidebarMenu();
      return null;
    };
    let overlayActions: ReturnType<typeof useGlobalOverlays>;
    const CaptureOverlayActions: React.FC = () => {
      overlayActions = useGlobalOverlays();
      return null;
    };

    renderToStaticMarkup(<CaptureHeaderActions />);
    headerActions!.onOpenMenu();
    renderToStaticMarkup(<CaptureSidebarActions />);
    sidebarActions!.onClose();
    expect(appStore.getState().isMenuOpen).toBe(false);

    headerActions!.onOpenMenu();
    renderToStaticMarkup(<CaptureSidebarActions />);
    sidebarActions!.handleBackup();

    expect(appStore.getState().isMenuOpen).toBe(false);
    expect(appStore.getState().isBackupModalOpen).toBe(true);
    expect(renderApp()).toContain('Exportar');

    renderToStaticMarkup(<CaptureOverlayActions />);
    overlayActions!.closeBackupModal();
    expect(appStore.getState().isBackupModalOpen).toBe(false);

    headerActions!.onOpenMenu();
    renderToStaticMarkup(<CaptureSidebarActions />);
    sidebarActions!.handleNav(AppTab.DIARY);
    expect(appStore.getState().activeTab).toBe(AppTab.DIARY);
    expect(appStore.getState().isMenuOpen).toBe(false);
  });

  it('renders the active rest timer and clears it through its shell action', () => {
    appStore.getState().startRestTimer({
      exerciseName: 'Sentadilla',
      initialSeconds: 60,
      key: 21,
      routineId: 'routine-1',
      setNumber: 2,
      targetEndTime: Date.now() + 60_000,
    });
    expect(renderApp()).toContain('id="floating-mini-rest-timer"');

    let timerActions: ReturnType<typeof useRestTimerBar>;
    const CaptureRestTimerActions: React.FC = () => {
      timerActions = useRestTimerBar();
      return null;
    };
    renderToStaticMarkup(<CaptureRestTimerActions />);
    timerActions!.onClose();

    expect(renderApp()).not.toContain('id="floating-mini-rest-timer"');
  });

  it('renders cleanup pending and invokes the registered cleanup control on retry', () => {
    const retryLocalCleanup = vi.fn(async () => false);
    const controls: AccountControls = {
      signInWithGoogle: vi.fn(async () => {}),
      signOut: vi.fn(async () => true),
      retryLocalCleanup,
      refreshSyncEligibility: vi.fn(async () => true),
    };
    appStore.getState().registerAccountControls(controls);
    seedAppStore({ cleanupPending: true, error: 'Cleanup failed' });

    const markup = renderApp();
    expect(markup).toContain('Limpieza local incompleta');
    expect(markup).toContain('Cleanup failed');

    let cleanupActions: ReturnType<typeof useLocalCleanupPending>;
    const CaptureCleanupActions: React.FC = () => {
      cleanupActions = useLocalCleanupPending();
      return null;
    };
    renderToStaticMarkup(<CaptureCleanupActions />);
    cleanupActions!.onRetry();
    expect(retryLocalCleanup).toHaveBeenCalledOnce();
  });

  it('shows the loading screen only while signing out without an open confirmation', () => {
    seedAppStore({ isSigningOut: true, isSignOutConfirmOpen: false });
    expect(renderApp()).toContain('Iniciando WorkoutLog...');

    seedAppStore({ isSignOutConfirmOpen: true });
    expect(renderApp()).not.toContain('Iniciando WorkoutLog...');
    expect(renderApp()).toContain('¿Cerrar sesión?');
  });
});
