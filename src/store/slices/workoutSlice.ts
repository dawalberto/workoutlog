import type { StateCreator } from 'zustand/vanilla';
import type { WorkoutCompletionSummary, WorkoutHistoryLog } from '../../types';
import type { AppState } from '../appStore';

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
      return {
        activeSessions: {
          ...state.activeSessions,
          [routineId]: { ...current, completedSetIds },
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
