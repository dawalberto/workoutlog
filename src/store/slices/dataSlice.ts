import type { StateCreator } from 'zustand/vanilla';
import type { SetStateAction } from 'react';
import type {
  ActiveWorkoutSession,
  ExerciseDefinition,
  ExerciseDiary,
  ExerciseRmLog,
  Routine,
  WorkoutHistoryLog,
} from '../../types';
import {
  buildImportSummaryMessage,
  isRoutineCountAllowed,
  ROUTINE_LIMIT_ERROR_MESSAGE,
  type BackupImportData,
  type BackupImportSummary,
} from '../../utils/backup';
import type { AppState } from '../appStore';

export interface DataSlice {
  routines: Routine[];
  setRoutines: (value: SetStateAction<Routine[]>) => void;
  catalog: ExerciseDefinition[];
  setCatalog: (value: SetStateAction<ExerciseDefinition[]>) => void;
  activeSessions: Record<string, ActiveWorkoutSession>;
  setActiveSessions: (value: SetStateAction<Record<string, ActiveWorkoutSession>>) => void;
  rmLogs: ExerciseRmLog[];
  setRmLogs: (value: SetStateAction<ExerciseRmLog[]>) => void;
  workoutHistory: WorkoutHistoryLog[];
  setWorkoutHistory: (value: SetStateAction<WorkoutHistoryLog[]>) => void;
  exerciseDiary: ExerciseDiary[];
  setExerciseDiary: (value: SetStateAction<ExerciseDiary[]>) => void;
  isStorageLoaded: boolean;
  isGuestTransferComplete: boolean;
  storageError: string | null;
  activeScopeKey: string | null;
  hydratedScopeKey: string | null;
  importBackup: (data: BackupImportData, summary: BackupImportSummary) => void;
}

export const createDataSlice: StateCreator<AppState, [], [], DataSlice> = (set, get) => ({
  routines: [],
  setRoutines: (value) => set((state) => ({
    routines: typeof value === 'function' ? value(state.routines) : value,
  })),
  catalog: [],
  setCatalog: (value) => set((state) => ({
    catalog: typeof value === 'function' ? value(state.catalog) : value,
  })),
  activeSessions: {},
  setActiveSessions: (value) => set((state) => ({
    activeSessions: typeof value === 'function' ? value(state.activeSessions) : value,
  })),
  rmLogs: [],
  setRmLogs: (value) => set((state) => ({
    rmLogs: typeof value === 'function' ? value(state.rmLogs) : value,
  })),
  workoutHistory: [],
  setWorkoutHistory: (value) => set((state) => ({
    workoutHistory: typeof value === 'function' ? value(state.workoutHistory) : value,
  })),
  exerciseDiary: [],
  setExerciseDiary: (value) => set((state) => ({
    exerciseDiary: typeof value === 'function' ? value(state.exerciseDiary) : value,
  })),
  isStorageLoaded: false,
  isGuestTransferComplete: true,
  storageError: null,
  activeScopeKey: null,
  hydratedScopeKey: null,
  importBackup: (data, summary) => {
    if (!isRoutineCountAllowed(data.routines.length, get().isSyncEnabled)) {
      get().notify(ROUTINE_LIMIT_ERROR_MESSAGE);
      return;
    }
    set({
      catalog: data.catalog,
      routines: data.routines,
      rmLogs: data.rmLogs,
      workoutHistory: data.workoutHistory,
      exerciseDiary: data.exerciseDiary,
    });
    get().notify(buildImportSummaryMessage(summary, data));
  },
});
