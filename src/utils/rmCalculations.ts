import { currentLocale } from './i18n';
import { displayedWeightUnit } from './i18n';
import { ExerciseRmLog, RmMetric, RmRecord } from '../types';
import { normalizeExerciseTitle } from './backup';

/**
 * Resolves the metric of a record, treating legacy records without a metric as
 * weight so older persisted and synced data keeps working.
 */
export function getRmRecordMetric(record: RmRecord): RmMetric {
  return record.metric === 'reps' ? 'reps' : 'weight';
}

/**
 * Returns the display unit for a metric (e.g. "kg" or "reps").
 */
export function getRmMetricUnit(metric: RmMetric): string {
  return metric === 'reps' ? 'reps' : displayedWeightUnit();
}

/**
 * Formats a record value with its unit (e.g. "82.5 kg" or "120 reps").
 */
export function formatRmRecordValue(record: RmRecord): string {
  return `${record.weight} ${getRmMetricUnit(getRmRecordMetric(record))}`;
}

/**
 * Returns the most recent RM record for an exercise log (by date descending).
 */
export function getLatestRmRecord(rmLog: ExerciseRmLog | undefined | null): RmRecord | null {
  if (!rmLog || !rmLog.records || rmLog.records.length === 0) return null;
  
  // Sort by date descending; if same date, compare by weight descending
  const sorted = [...rmLog.records].sort((a, b) => {
    const timeDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (!isNaN(timeDiff) && timeDiff !== 0) return timeDiff;
    return b.weight - a.weight;
  });

  return sorted[0] || null;
}

/**
 * Returns the highest historical RM record for an exercise log. Comparison only
 * happens within the metric of the latest record, because kg and repetitions are
 * not comparable.
 */
export function getHighestRmRecord(rmLog: ExerciseRmLog | undefined | null): RmRecord | null {
  if (!rmLog || !rmLog.records || rmLog.records.length === 0) return null;

  const latest = getLatestRmRecord(rmLog);
  const metric = latest ? getRmRecordMetric(latest) : 'weight';
  const comparable = rmLog.records.filter((record) => getRmRecordMetric(record) === metric);

  return comparable.reduce((highest, current) => {
    return current.weight > highest.weight ? current : highest;
  }, comparable[0]);
}

/**
 * Finds an RM log for an exercise by definition ID or normalized name.
 */
export function findRmLogForExercise(
  rmLogs: ExerciseRmLog[],
  exerciseName: string,
  exerciseId?: string
): ExerciseRmLog | undefined {
  if (!rmLogs || rmLogs.length === 0) return undefined;

  // 1. Try matching by exerciseId
  if (exerciseId) {
    const matchById = rmLogs.find((log) => log.exerciseId && log.exerciseId === exerciseId);
    if (matchById) return matchById;
  }

  // 2. Try matching by normalized name (exact)
  const targetNorm = normalizeExerciseTitle(exerciseName);
  if (!targetNorm) return undefined;

  const matchByName = rmLogs.find((log) => normalizeExerciseTitle(log.exerciseName) === targetNorm);
  if (matchByName) return matchByName;

  // 3. Fallback: match by stripped whitespace or contains (e.g., "press banca" and "press de banca")
  const strippedTarget = targetNorm.replace(/\s+/g, '');
  const fallbackMatch = rmLogs.find((log) => {
    const norm = normalizeExerciseTitle(log.exerciseName);
    const stripped = norm.replace(/\s+/g, '');
    return stripped === strippedTarget || norm.includes(targetNorm) || targetNorm.includes(norm);
  });

  return fallbackMatch;
}

/**
 * Formats a date string into a friendly localized Spanish format (e.g. "24 sep 2026").
 */
export function formatRmDate(dateString: string): string {
  if (!dateString) return '';
  try {
    const [year, month, day] = dateString.split('-').map(Number);
    if (year && month && day) {
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString(currentLocale(), {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
  } catch {
    // fallback
  }
  return dateString;
}

/**
 * Gets today's date formatted as YYYY-MM-DD.
 */
export function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Estimates 1RM from the strongest configured set using Epley's equation.
 * The estimate assumes repetitions are close to muscular failure.
 */
export function estimateOneRepMax(sets: Array<{ weight: number | string; reps: number | string }>): number | null {
  const estimates = sets.flatMap(({ weight, reps }) => {
    const load = Number(weight);
    const repetitions = Number(reps);
    if (!Number.isFinite(load) || load <= 0 || !Number.isInteger(repetitions) || repetitions < 1) return [];
    return [repetitions === 1 ? load : load * (1 + repetitions / 30)];
  });
  return estimates.length ? Math.round(Math.max(...estimates) * 10) / 10 : null;
}
