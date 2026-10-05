/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import {
  Routine,
  ActiveWorkoutSession,
  WorkoutCompletionSummary,
  WorkoutHistoryLog,
} from '../types';

export interface UseWorkoutSessionProps {
  routines: Routine[];
  activeSessions: Record<string, ActiveWorkoutSession>;
  setActiveSessions: React.Dispatch<React.SetStateAction<Record<string, ActiveWorkoutSession>>>;
  setWorkoutHistory: React.Dispatch<React.SetStateAction<WorkoutHistoryLog[]>>;
  activeRoutineId: string | null;
}

export interface UseWorkoutSessionReturn {
  workoutSummary: WorkoutCompletionSummary | null;
  startSession: (routineId: string) => void;
  toggleSetComplete: (routineId: string, setId: string) => void;
  resetSession: (routineId: string) => void;
  finishSession: (summary: WorkoutCompletionSummary) => void;
  dismissWorkoutSummary: () => void;
  deleteHistoryLog: (logId: string) => void;
  inProgressSessionEntry: ActiveWorkoutSession | undefined;
  inProgressRoutine: Routine | null;
}

export function useWorkoutSession({
  routines,
  activeSessions,
  setActiveSessions,
  setWorkoutHistory,
  activeRoutineId,
}: UseWorkoutSessionProps): UseWorkoutSessionReturn {
  const [workoutSummary, setWorkoutSummary] = useState<WorkoutCompletionSummary | null>(null);

  const startSession = (routineId: string) => {
    setActiveSessions((prev) => ({
      ...prev,
      [routineId]: {
        routineId,
        startTime: prev[routineId]?.startTime || Date.now(),
        completedSetIds: prev[routineId]?.completedSetIds || [],
      },
    }));
  };

  const toggleSetComplete = (routineId: string, setId: string) => {
    setActiveSessions((prev) => {
      const current = prev[routineId] || {
        routineId,
        startTime: Date.now(),
        completedSetIds: [],
      };

      const setExists = current.completedSetIds.includes(setId);
      const nextCompleted = setExists
        ? current.completedSetIds.filter((id) => id !== setId)
        : [...current.completedSetIds, setId];

      return {
        ...prev,
        [routineId]: {
          ...current,
          completedSetIds: nextCompleted,
        },
      };
    });
  };

  const resetSession = (routineId: string) => {
    setActiveSessions((prev) => {
      const next = { ...prev };
      delete next[routineId];
      return next;
    });
  };

  const finishSession = (summary: WorkoutCompletionSummary) => {
    // 1. Remove active session
    setActiveSessions((prev) => {
      const next = { ...prev };
      delete next[summary.routineId];
      return next;
    });

    // 2. Open summary celebration modal
    setWorkoutSummary(summary);

    // 3. Save automatically to workout history
    const newLog: WorkoutHistoryLog = {
      ...summary,
      id: 'workout-log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      completedAt: new Date(summary.endTime || Date.now()).toISOString(),
    };
    setWorkoutHistory((prev) => [newLog, ...prev]);
  };

  const dismissWorkoutSummary = () => {
    setWorkoutSummary(null);
  };

  const deleteHistoryLog = (logId: string) => {
    setWorkoutHistory((prev) => prev.filter((l) => l.id !== logId));
  };

  // Find any workout session running while the user is outside that routine's view
  const inProgressSessionEntry = Object.values(activeSessions).find(
    (s) => s.startTime && s.routineId !== activeRoutineId
  );
  const inProgressRoutine = inProgressSessionEntry
    ? routines.find((r) => r.id === inProgressSessionEntry.routineId) || null
    : null;

  return {
    workoutSummary,
    startSession,
    toggleSetComplete,
    resetSession,
    finishSession,
    dismissWorkoutSummary,
    deleteHistoryLog,
    inProgressSessionEntry,
    inProgressRoutine,
  };
}
