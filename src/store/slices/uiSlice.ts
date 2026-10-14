import type { StateCreator } from 'zustand/vanilla';
import { AppTab } from '../../types';
import type { AppState } from '../appStore';

export interface UiSlice {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  isMenuOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
  isBackupModalOpen: boolean;
  openBackupModal: () => void;
  closeBackupModal: () => void;
  feedbackMessage: string | null;
  notify: (message: string) => void;
  clearFeedback: () => void;
  isSignOutConfirmOpen: boolean;
  requestSignOutConfirmation: () => Promise<boolean>;
  resolveSignOutConfirmation: (confirmed: boolean) => void;
}

export const createUiSlice: StateCreator<AppState, [], [], UiSlice> = (set) => {
  let resolveConfirmation: ((confirmed: boolean) => void) | null = null;

  return {
    activeTab: AppTab.ROUTINES,
    setActiveTab: (activeTab) => set({ activeTab }),
    isMenuOpen: false,
    openMenu: () => set({ isMenuOpen: true }),
    closeMenu: () => set({ isMenuOpen: false }),
    isBackupModalOpen: false,
    openBackupModal: () => set({ isBackupModalOpen: true }),
    closeBackupModal: () => set({ isBackupModalOpen: false }),
    feedbackMessage: null,
    notify: (feedbackMessage) => set({ feedbackMessage }),
    clearFeedback: () => set({ feedbackMessage: null }),
    isSignOutConfirmOpen: false,
    requestSignOutConfirmation: () => new Promise((resolve) => {
      resolveConfirmation?.(false);
      resolveConfirmation = resolve;
      set({ isSignOutConfirmOpen: true });
    }),
    resolveSignOutConfirmation: (confirmed) => {
      const resolve = resolveConfirmation;
      resolveConfirmation = null;
      set({ isSignOutConfirmOpen: false });
      resolve?.(confirmed);
    },
  };
};
