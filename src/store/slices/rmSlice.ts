import type { StateCreator } from 'zustand/vanilla';
import type { RmRecord } from '../../types';
import {
  findRmLogForExercise,
  getLatestRmRecord,
  getTodayDateString,
} from '../../utils/rmCalculations';
import { normalizeExerciseTitle } from '../../utils/backup';
import type { AppState } from '../appStore';

export interface PendingRmAlert {
  logId: string;
  exerciseName: string;
  newWeight: number;
  previousRmWeight: number;
  previousRmDate?: string;
}

export interface RmSlice {
  pendingRmAlert: PendingRmAlert | null;
  checkRmWeight: (exerciseName: string, newWeight: number, exerciseId?: string) => void;
  confirmRmAlert: (shouldUpdateRm: boolean) => void;
  dismissRmAlert: () => void;
}

export const createRmSlice: StateCreator<AppState, [], [], RmSlice> =
  (set, get) => ({
    pendingRmAlert: null,
    checkRmWeight: (exerciseName, newWeight, exerciseId) => {
      if (!exerciseName || !newWeight || newWeight <= 0) return;
      const state = get();
      if (state.pendingRmAlert) return;

      const matchingLog = findRmLogForExercise(state.rmLogs, exerciseName, exerciseId);
      if (!matchingLog || !matchingLog.records || matchingLog.records.length === 0) return;

      const latestRecord = getLatestRmRecord(matchingLog);
      if (!latestRecord || newWeight <= latestRecord.weight) return;

      set({
        pendingRmAlert: {
          logId: matchingLog.id,
          exerciseName: matchingLog.exerciseName,
          newWeight,
          previousRmWeight: latestRecord.weight,
          previousRmDate: latestRecord.date,
        },
      });
    },
    confirmRmAlert: (shouldUpdateRm) => {
      const pendingRmAlert = get().pendingRmAlert;
      if (!pendingRmAlert) return;

      if (shouldUpdateRm) {
        const newRecord: RmRecord = {
          id: `rm-rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          weight: pendingRmAlert.newWeight,
          date: getTodayDateString(),
          notes: 'Superado en rutina / ejercicio',
        };
        set((state) => ({
          rmLogs: state.rmLogs.map((log) => {
            if (
              log.id !== pendingRmAlert.logId &&
              normalizeExerciseTitle(log.exerciseName) !==
                normalizeExerciseTitle(pendingRmAlert.exerciseName)
            ) {
              return log;
            }
            const records = [newRecord, ...log.records].sort(
              (left, right) =>
                new Date(right.date).getTime() - new Date(left.date).getTime(),
            );
            return {
              ...log,
              records,
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
        get().notify(
          `🏆 ¡Nuevo RM de ${pendingRmAlert.newWeight} kg registrado en ${pendingRmAlert.exerciseName}!`,
        );
      }

      set({ pendingRmAlert: null });
    },
    dismissRmAlert: () => set({ pendingRmAlert: null }),
  });
