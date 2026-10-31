import type { StateCreator } from 'zustand/vanilla';
import type { AppState } from '../appStore';

export type SyncStatusState = 'idle' | 'syncing' | 'synced' | 'error';

export interface SyncSnapshot {
  status: SyncStatusState;
  error: string | null;
  isOnline: boolean;
  pendingCount: number;
  lastSyncedAt: number | null;
  updateRequired: boolean;
  initialSyncSettledOwnerId: string | null;
}

export interface SyncControls {
  retry: () => void;
  syncNow: () => Promise<void>;
  stopSync: () => Promise<void>;
  resumeSync: () => void;
}

export interface SyncSlice {
  syncStatus: SyncStatusState;
  syncError: string | null;
  isOnline: boolean;
  pendingCount: number;
  lastSyncedAt: number | null;
  updateRequired: boolean;
  initialSyncSettledOwnerId: string | null;
  publishSyncState: (snapshot: SyncSnapshot) => void;
  registerSyncControls: (controls: SyncControls | null) => void;
  retrySync: () => void;
  syncNow: () => Promise<void>;
  stopSync: () => Promise<void>;
  resumeSync: () => void;
}

export const createSyncSlice: StateCreator<AppState, [], [], SyncSlice> = (set) => {
  let controls: SyncControls | null = null;

  return {
    syncStatus: 'idle',
    syncError: null,
    isOnline: typeof navigator === 'undefined' || navigator.onLine,
    pendingCount: 0,
    lastSyncedAt: null,
    updateRequired: false,
    initialSyncSettledOwnerId: null,
    publishSyncState: (snapshot) => set({
      syncStatus: snapshot.status,
      syncError: snapshot.error,
      isOnline: snapshot.isOnline,
      pendingCount: snapshot.pendingCount,
      lastSyncedAt: snapshot.lastSyncedAt,
      updateRequired: snapshot.updateRequired,
      initialSyncSettledOwnerId: snapshot.initialSyncSettledOwnerId,
    }),
    registerSyncControls: (nextControls) => {
      controls = nextControls;
    },
    retrySync: () => controls?.retry(),
    syncNow: async () => {
      await controls?.syncNow();
    },
    stopSync: async () => {
      await controls?.stopSync();
    },
    resumeSync: () => controls?.resumeSync(),
  };
};
