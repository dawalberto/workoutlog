/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * An exercise can belong to several muscle groups. `categories` is the source of
 * truth when present; `category` mirrors the primary (first) value so older app
 * bundles, backups, and sync clients that only understand a single value keep
 * working. Legacy records that only carry `category` read as a one-element list.
 */
export interface ExerciseCategorySource {
  category?: string;
  categories?: string[];
}

export function getExerciseCategories(
  source: ExerciseCategorySource | null | undefined,
): string[] {
  if (!source) return [];
  if (Array.isArray(source.categories)) {
    return source.categories.filter(
      (value): value is string => typeof value === 'string' && value.length > 0,
    );
  }
  return typeof source.category === 'string' && source.category.length > 0
    ? [source.category]
    : [];
}

export function primaryExerciseCategory(
  source: ExerciseCategorySource | null | undefined,
): string | undefined {
  return getExerciseCategories(source)[0];
}

export function formatExerciseCategories(
  source: ExerciseCategorySource | null | undefined,
): string {
  return getExerciseCategories(source).join(', ');
}

/**
 * Compares two exercises by their group sets, ignoring order and duplicates.
 * Legacy records (only `category`) compare equal to their one-element array.
 */
export function sameExerciseCategories(
  left: ExerciseCategorySource | null | undefined,
  right: ExerciseCategorySource | null | undefined,
): boolean {
  const leftValues = getExerciseCategories(left);
  const rightValues = getExerciseCategories(right);
  if (leftValues.length !== rightValues.length) return false;
  return leftValues.every((value) => rightValues.includes(value));
}

/**
 * Normalizes a raw form value into a clean, deduplicated group list.
 */
export function normalizeExerciseCategories(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}
