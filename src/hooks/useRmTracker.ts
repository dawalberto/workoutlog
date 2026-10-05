/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { ExerciseRmLog, RmRecord } from '../types';
import {
  findRmLogForExercise,
  getLatestRmRecord,
  getTodayDateString,
} from '../utils/rmCalculations';
import { normalizeExerciseTitle } from '../utils/backup';

export interface PendingRmAlert {
  logId: string;
  exerciseName: string;
  newWeight: number;
  previousRmWeight: number;
  previousRmDate?: string;
}

export interface UseRmTrackerProps {
  rmLogs: ExerciseRmLog[];
  setRmLogs: React.Dispatch<React.SetStateAction<ExerciseRmLog[]>>;
  onNotify?: (message: string) => void;
}

export interface UseRmTrackerReturn {
  pendingRmAlert: PendingRmAlert | null;
  checkRmWeight: (exerciseName: string, newWeight: number, exerciseId?: string) => void;
  confirmRmAlert: (shouldUpdateRm: boolean) => void;
  dismissRmAlert: () => void;
}

export function useRmTracker({
  rmLogs,
  setRmLogs,
  onNotify,
}: UseRmTrackerProps): UseRmTrackerReturn {
  const [pendingRmAlert, setPendingRmAlert] = useState<PendingRmAlert | null>(null);

  const checkRmWeight = (exerciseName: string, newWeight: number, exerciseId?: string) => {
    if (!exerciseName || !newWeight || newWeight <= 0) return;
    if (pendingRmAlert) return; // Prevent duplicate popup if already open

    const matchingLog = findRmLogForExercise(rmLogs, exerciseName, exerciseId);
    if (!matchingLog || !matchingLog.records || matchingLog.records.length === 0) return;

    const latestRecord = getLatestRmRecord(matchingLog);
    if (!latestRecord) return;

    if (newWeight > latestRecord.weight) {
      setPendingRmAlert({
        logId: matchingLog.id,
        exerciseName: matchingLog.exerciseName,
        newWeight,
        previousRmWeight: latestRecord.weight,
        previousRmDate: latestRecord.date,
      });
    }
  };

  const confirmRmAlert = (shouldUpdateRm: boolean) => {
    if (!pendingRmAlert) return;

    if (shouldUpdateRm) {
      const newRecord: RmRecord = {
        id: `rm-rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        weight: pendingRmAlert.newWeight,
        date: getTodayDateString(),
        notes: 'Superado en rutina / ejercicio',
      };

      setRmLogs((prev) =>
        prev.map((log) => {
          if (
            log.id === pendingRmAlert.logId ||
            normalizeExerciseTitle(log.exerciseName) === normalizeExerciseTitle(pendingRmAlert.exerciseName)
          ) {
            const newRecords = [newRecord, ...log.records].sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            );
            return {
              ...log,
              records: newRecords,
              updatedAt: new Date().toISOString(),
            };
          }
          return log;
        })
      );

      if (onNotify) {
        onNotify(`🏆 ¡Nuevo RM de ${pendingRmAlert.newWeight} kg registrado en ${pendingRmAlert.exerciseName}!`);
      }
    }

    setPendingRmAlert(null);
  };

  const dismissRmAlert = () => {
    setPendingRmAlert(null);
  };

  return {
    pendingRmAlert,
    checkRmWeight,
    confirmRmAlert,
    dismissRmAlert,
  };
}
