import { ExerciseRmLog, RmRecord } from '../types';
import { normalizeExerciseTitle } from './backup';

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
 * Returns the highest historical RM record for an exercise log.
 */
export function getHighestRmRecord(rmLog: ExerciseRmLog | undefined | null): RmRecord | null {
  if (!rmLog || !rmLog.records || rmLog.records.length === 0) return null;

  return rmLog.records.reduce((highest, current) => {
    return current.weight > highest.weight ? current : highest;
  }, rmLog.records[0]);
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
      return date.toLocaleDateString('es-ES', {
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
