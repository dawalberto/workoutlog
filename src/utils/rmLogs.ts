import type { ExerciseDefinition, ExerciseRmLog, RmRecord } from '../types';
import { normalizeExerciseTitle } from './backup';

export function filterRmLogs(logs: ExerciseRmLog[], searchTerm: string): ExerciseRmLog[] {
  const term = normalizeExerciseTitle(searchTerm);
  if (!term) return logs;
  return logs.filter((log) =>
    normalizeExerciseTitle(log.exerciseName).includes(term) ||
    Boolean(log.category && normalizeExerciseTitle(log.category).includes(term))
  );
}

export function getAvailableRmCatalog(
  catalog: ExerciseDefinition[],
  rmLogs: ExerciseRmLog[],
  searchTerm: string,
): ExerciseDefinition[] {
  const trackedNames = new Set(rmLogs.map((log) => normalizeExerciseTitle(log.exerciseName)));
  const trackedIds = new Set(rmLogs.map((log) => log.exerciseId).filter(Boolean));
  const term = normalizeExerciseTitle(searchTerm);
  return catalog.filter((definition) => {
    if (definition.id && trackedIds.has(definition.id)) return false;
    const normalizedName = normalizeExerciseTitle(definition.name);
    if (trackedNames.has(normalizedName)) return false;
    if (!term) return true;
    return normalizedName.includes(term) ||
      Boolean(definition.category && normalizeExerciseTitle(definition.category).includes(term));
  });
}

export function createRmRecord(
  id: string,
  weight: number,
  date: string,
  notes?: string,
): RmRecord {
  return { id, weight, date, notes };
}

export function createRmLog(
  exercise: ExerciseDefinition,
  record: RmRecord,
  id: string,
  createdAt: string,
  updatedAt: string,
): ExerciseRmLog {
  return {
    id,
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    category: exercise.category,
    records: [record],
    createdAt,
    updatedAt,
  };
}

export function sortRmRecordsByDate(records: RmRecord[]): RmRecord[] {
  return [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function addRmRecordToLogs(
  logs: ExerciseRmLog[],
  logId: string,
  record: RmRecord,
  updatedAt: string,
): ExerciseRmLog[] {
  return logs.map((log) => {
    if (log.id !== logId) return log;
    return {
      ...log,
      records: sortRmRecordsByDate([record, ...log.records]),
      updatedAt,
    };
  });
}

export function editRmRecordInLogs(
  logs: ExerciseRmLog[],
  logId: string,
  recordId: string,
  weight: number,
  date: string,
  notes?: string,
  updatedAt?: string,
): ExerciseRmLog[] {
  return logs.map((log) => {
    if (log.id !== logId) return log;
    const records = log.records.map((record) => {
      if (record.id !== recordId) return record;
      return {
        ...record,
        weight,
        date: date || record.date,
        notes,
      };
    });
    return {
      ...log,
      records: sortRmRecordsByDate(records),
      updatedAt: updatedAt ?? log.updatedAt,
    };
  });
}

export function deleteRmRecordFromLogs(
  logs: ExerciseRmLog[],
  logId: string,
  recordId: string,
  updatedAt: string,
): ExerciseRmLog[] {
  return logs.map((log) => {
    if (log.id !== logId) return log;
    return {
      ...log,
      records: log.records.filter((record) => record.id !== recordId),
      updatedAt,
    };
  });
}

export function updateRmLogsForCatalogExercise(
  logs: ExerciseRmLog[],
  exercise: ExerciseDefinition,
  previousExerciseName?: string,
): { rmLogs: ExerciseRmLog[]; updatedLogsCount: number } {
  const oldNorm = previousExerciseName ? normalizeExerciseTitle(previousExerciseName) : '';
  const newNorm = normalizeExerciseTitle(exercise.name);

  const isMatch = (log: ExerciseRmLog) => {
    if (log.exerciseId && log.exerciseId === exercise.id) return true;
    const logNorm = normalizeExerciseTitle(log.exerciseName);
    if (oldNorm && logNorm === oldNorm) return true;
    if (newNorm && logNorm === newNorm) return true;
    return false;
  };

  const matchingLogs = logs.filter(isMatch);
  if (matchingLogs.length === 0) {
    return { rmLogs: logs, updatedLogsCount: 0 };
  }

  const needsUpdate =
    matchingLogs.length > 1 ||
    matchingLogs.some(
      (log) =>
        log.exerciseName !== exercise.name ||
        log.exerciseId !== exercise.id ||
        (exercise.category && log.category !== exercise.category),
    );

  if (!needsUpdate) {
    return { rmLogs: logs, updatedLogsCount: 0 };
  }

  const nowIso = new Date().toISOString();

  // Merge records from all matching logs
  const allRecords: RmRecord[] = [];
  const recordSignatures = new Set<string>();

  for (const log of matchingLogs) {
    for (const record of log.records || []) {
      const sig = `${record.date}_${record.weight}`;
      if (!recordSignatures.has(sig)) {
        recordSignatures.add(sig);
        allRecords.push(record);
      }
    }
  }

  const sortedRecords = sortRmRecordsByDate(allRecords);

  const primaryLog =
    matchingLogs.find((log) => log.exerciseId === exercise.id) || matchingLogs[0];

  const mergedLog: ExerciseRmLog = {
    id: primaryLog.id,
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    category: exercise.category || primaryLog.category,
    records: sortedRecords,
    createdAt: primaryLog.createdAt,
    updatedAt: nowIso,
  };

  let primaryReplaced = false;
  const updatedLogs: ExerciseRmLog[] = [];

  for (const log of logs) {
    if (isMatch(log)) {
      if (!primaryReplaced) {
        updatedLogs.push(mergedLog);
        primaryReplaced = true;
      }
    } else {
      updatedLogs.push(log);
    }
  }

  return {
    rmLogs: updatedLogs,
    updatedLogsCount: matchingLogs.length,
  };
}

