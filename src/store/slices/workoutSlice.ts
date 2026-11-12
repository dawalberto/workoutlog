import type { StateCreator } from 'zustand/vanilla';
import type { WorkoutCompletionSummary, WorkoutHistoryLog } from '../../types';
import type { AppState } from '../appStore';
import { exerciseDurationConfiguration } from '../../utils/exerciseDuration';

export interface WorkoutSlice {
  workoutSummary: WorkoutCompletionSummary | null;
  startSession: (routineId: string) => void;
  toggleSetComplete: (routineId: string, setId: string) => void;
  resetSession: (routineId: string) => void;
  finishSession: (summary: WorkoutCompletionSummary) => void;
  dismissWorkoutSummary: () => void;
  deleteHistoryLog: (logId: string) => void;
}

export const createWorkoutSlice: StateCreator<AppState, [], [], WorkoutSlice> =
  (set, get) => ({
    workoutSummary: null,
    startSession: (routineId) => set((state) => ({
      activeSessions: {
        ...state.activeSessions,
        [routineId]: {
          routineId,
          startTime: state.activeSessions[routineId]?.startTime || Date.now(),
          completedSetIds: state.activeSessions[routineId]?.completedSetIds || [],
          exerciseTimings: state.activeSessions[routineId]?.exerciseTimings,
        },
      },
    })),
    toggleSetComplete: (routineId, setId) => set((state) => {
      const current = state.activeSessions[routineId] || {
        routineId,
        startTime: Date.now(),
        completedSetIds: [],
      };
      const completedSetIds = current.completedSetIds.includes(setId)
        ? current.completedSetIds.filter((id) => id !== setId)
        : [...current.completedSetIds, setId];
      const exercise = state.routines.find((routine) => routine.id === routineId)?.exercises.find((item) => item.sets.some((itemSet) => itemSet.id === setId));
      const exerciseTimings = { ...current.exerciseTimings };
      if (exercise) {
        const now = Date.now();
        const configuration = exerciseDurationConfiguration(exercise);
        const previous = exerciseTimings[exercise.id];
        const timing = previous?.configuration === configuration ? previous : undefined;
        if (previous && !timing) delete exerciseTimings[exercise.id];
        if (!current.completedSetIds.includes(setId) && (timing || !exercise.sets.some((itemSet) => current.completedSetIds.includes(itemSet.id)))) {
          const startedAt = timing?.startedAt ?? now;
          const complete = exercise.sets.length > 0 && exercise.sets.every((itemSet) => completedSetIds.includes(itemSet.id));
          const lastSet = exercise.sets.find((itemSet) => itemSet.id === setId);
          exerciseTimings[exercise.id] = { startedAt, configuration, ...(complete ? { completedAt: now, restSeconds: Math.max(0, Number(lastSet?.restSeconds) || 0) } : {}) };
        } else if (timing && current.completedSetIds.includes(setId)) {
          exerciseTimings[exercise.id] = { startedAt: timing.startedAt, configuration };
        }
      }
      return {
        activeSessions: {
          ...state.activeSessions,
          [routineId]: { ...current, completedSetIds, exerciseTimings },
        },
      };
    }),
    resetSession: (routineId) => {
      set((state) => {
        const activeSessions = { ...state.activeSessions };
        delete activeSessions[routineId];
        return { activeSessions };
      });
      get().closeRestTimer();
    },
    finishSession: (summary) => {
      set((state) => {
        const activeSessions = { ...state.activeSessions };
        delete activeSessions[summary.routineId];
        return { activeSessions, workoutSummary: summary };
      });

      const newLog: WorkoutHistoryLog = {
        ...summary,
        id: 'workout-log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        completedAt: new Date(summary.endTime || Date.now()).toISOString(),
      };
      set((state) => ({ workoutHistory: [newLog, ...state.workoutHistory] }));
      get().closeRestTimer();
    },
    dismissWorkoutSummary: () => set({ workoutSummary: null }),
    deleteHistoryLog: (logId) => set((state) => ({
      workoutHistory: state.workoutHistory.filter((log) => log.id !== logId),
    })),
  });
