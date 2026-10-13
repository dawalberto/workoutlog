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
}

export const createDataSlice: StateCreator<DataSlice, [], [], DataSlice> = (set) => ({
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
});
