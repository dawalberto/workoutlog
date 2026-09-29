import { ExerciseDiary, ExerciseDiaryEntry, DiaryFeeling } from '../types';
import { normalizeExerciseTitle } from './backup';

export interface FlattenedDiaryEntry extends ExerciseDiaryEntry {
  diaryId: string;
  exerciseId?: string;
  exerciseName: string;
  category?: string;
}

/**
 * Finds a diary for an exercise by definition ID or normalized name.
 */
export function findDiaryForExercise(
  diaries: ExerciseDiary[],
  exerciseName: string,
  exerciseId?: string
): ExerciseDiary | undefined {
  if (!diaries || diaries.length === 0) return undefined;

  // 1. Match by exerciseId
  if (exerciseId) {
    const matchById = diaries.find((d) => d.exerciseId && d.exerciseId === exerciseId);
    if (matchById) return matchById;
  }

  // 2. Match by normalized name
  const targetNorm = normalizeExerciseTitle(exerciseName);
  if (!targetNorm) return undefined;

  const matchByName = diaries.find((d) => normalizeExerciseTitle(d.exerciseName) === targetNorm);
  if (matchByName) return matchByName;

  // 3. Fallback: stripped spaces or contains
  const strippedTarget = targetNorm.replace(/\s+/g, '');
  return diaries.find((d) => {
    const norm = normalizeExerciseTitle(d.exerciseName);
    const stripped = norm.replace(/\s+/g, '');
    return stripped === strippedTarget || norm.includes(targetNorm) || targetNorm.includes(norm);
  });
}

/**
 * Returns number of diary entries for an exercise.
 */
export function getDiaryEntriesCount(
  diaries: ExerciseDiary[] | undefined,
  exerciseName: string,
  exerciseId?: string
): number {
  if (!diaries) return 0;
  const diary = findDiaryForExercise(diaries, exerciseName, exerciseId);
  return diary?.entries?.length || 0;
}

/**
 * Returns total count of all diary entries across all exercises.
 */
export function getTotalDiaryEntriesCount(diaries: ExerciseDiary[] | undefined): number {
  if (!diaries || diaries.length === 0) return 0;
  return diaries.reduce((sum, d) => sum + (d.entries?.length || 0), 0);
}

/**
 * Flattens all diary entries across all exercises, sorted descending by date/creation.
 */
export function getAllFlattenedDiaryEntries(diaries: ExerciseDiary[]): FlattenedDiaryEntry[] {
  const result: FlattenedDiaryEntry[] = [];

  diaries.forEach((d) => {
    (d.entries || []).forEach((entry) => {
      result.push({
        ...entry,
        diaryId: d.id,
        exerciseId: d.exerciseId,
        exerciseName: d.exerciseName,
        category: d.category,
      });
    });
  });

  // Sort descending by date, then by creation
  result.sort((a, b) => {
    const timeA = new Date(a.date).getTime();
    const timeB = new Date(b.date).getTime();
    if (!isNaN(timeA) && !isNaN(timeB) && timeA !== timeB) {
      return timeB - timeA;
    }
    const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return createdB - createdA;
  });

  return result;
}

/**
 * Formats a feeling type into human-friendly label, emoji, and styling classes.
 */
export function getFeelingConfig(feeling?: DiaryFeeling): {
  label: string;
  emoji: string;
  badgeClass: string;
  dotColor: string;
} {
  switch (feeling) {
    case 'good':
      return {
        label: 'Bien',
        emoji: '🟢',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/90',
        dotColor: 'bg-emerald-500',
      };
    case 'neutral':
      return {
        label: 'Regular',
        emoji: '🟠',
        badgeClass: 'bg-amber-50 text-amber-900 border-amber-200/90',
        dotColor: 'bg-amber-500',
      };
    case 'bad':
      return {
        label: 'Mal / Difícil',
        emoji: '🔴',
        badgeClass: 'bg-rose-50 text-rose-800 border-rose-200/90',
        dotColor: 'bg-rose-500',
      };
    default:
      return {
        label: 'Sin sensación',
        emoji: '⚪',
        badgeClass: 'bg-zinc-100 text-zinc-600 border-zinc-200',
        dotColor: 'bg-zinc-400',
      };
  }
}
