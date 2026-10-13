import type { ExerciseDefinition, ExerciseRmLog, RmRecord } from '../types';

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
