import type { StateCreator } from 'zustand/vanilla';
import type { PushBrowserSupport } from '../../utils/pushBrowser';
import type { AppState } from '../appStore';

export interface RestPushSnapshot {
  support: PushBrowserSupport;
  permission: NotificationPermission | 'unsupported';
  endpoint: string | null;
  subscription: PushSubscriptionJSON | null;
  armed: boolean;
  error: string | null;
}

export interface RestPushSlice {
  restPush: RestPushSnapshot;
  setRestPushState: (snapshot: Partial<RestPushSnapshot>) => void;
}

export const createRestPushSlice: StateCreator<AppState, [], [], RestPushSlice> =
  (set) => ({
    restPush: {
      support: 'unsupported',
      permission: 'unsupported',
      endpoint: null,
      subscription: null,
      armed: false,
      error: null,
    },
    setRestPushState: (snapshot) => set((state) => ({
      restPush: { ...state.restPush, ...snapshot },
    })),
  });
