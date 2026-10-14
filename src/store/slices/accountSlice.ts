import type { StateCreator } from 'zustand/vanilla';
import type { SignOutFlowOptions } from '../../services/auth';
import { AppTab } from '../../types';
import type { AppState } from '../appStore';

export interface AccountUser {
  id: string;
  email: string | null;
}

export interface AccountSnapshot {
  user: AccountUser | null;
  isSyncEnabled: boolean;
  isLoading: boolean;
  isSyncEligibilityLoading: boolean;
  isSigningIn: boolean;
  isSigningOut: boolean;
  cleanupPending: boolean;
  error: string | null;
}

export interface AccountControls {
  signInWithGoogle: () => Promise<void>;
  signOut: (options: Pick<
    SignOutFlowOptions,
    'syncBeforeSignOut' | 'confirmPendingChanges' | 'stopSync' | 'resumeSync'
  >) => Promise<boolean>;
  retryLocalCleanup: () => Promise<boolean>;
  refreshSyncEligibility: () => Promise<boolean>;
}

export interface AccountSlice extends AccountSnapshot {
  publishAccountState: (snapshot: AccountSnapshot) => void;
  registerAccountControls: (controls: AccountControls | null) => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<boolean>;
  retryLocalCleanup: () => Promise<boolean>;
  refreshSyncEligibility: () => Promise<boolean>;
}

function resetAfterSignOut(
  get: Parameters<StateCreator<AppState, [], [], AccountSlice>>[1],
): void {
  const state = get();
  state.setActiveTab(AppTab.ROUTINES);
  state.closeMenu();
  state.closeBackupModal();
  state.closeRestTimer();
  state.clearDiaryNavigationState();
  state.closeRoutine();
  state.dismissWorkoutSummary();
  state.dismissRmAlert();
}

export const createAccountSlice: StateCreator<AppState, [], [], AccountSlice> =
  (set, get) => {
    let controls: AccountControls | null = null;

    return {
      user: null,
      isSyncEnabled: false,
      isLoading: true,
      isSyncEligibilityLoading: false,
      isSigningIn: false,
      isSigningOut: false,
      cleanupPending: false,
      error: null,
      publishAccountState: (snapshot) => set(snapshot),
      registerAccountControls: (nextControls) => {
        controls = nextControls;
      },
      signInWithGoogle: async () => {
        await controls?.signInWithGoogle();
      },
      signOut: async () => {
        if (!controls) return false;
        const signedOut = await controls.signOut({
          syncBeforeSignOut: async () => {
            const state = get();
            if (state.isSyncEnabled && state.isOnline) await state.syncNow();
          },
          confirmPendingChanges: () => get().requestSignOutConfirmation(),
          stopSync: () => get().stopSync(),
          resumeSync: () => get().resumeSync(),
        });
        if (signedOut) resetAfterSignOut(get);
        return signedOut;
      },
      retryLocalCleanup: async () => {
        const cleaned = await controls?.retryLocalCleanup();
        if (cleaned) resetAfterSignOut(get);
        return cleaned ?? false;
      },
      refreshSyncEligibility: async () => {
        return (await controls?.refreshSyncEligibility()) ?? false;
      },
    };
  };
