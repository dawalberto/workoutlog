import { ExerciseDefinition, Routine } from '../types';

export interface WorkoutLogBackupFile {
  app: 'WorkoutLog';
  version: number;
  exportedAt: string;
  type: 'all' | 'exercises' | 'routines';
  catalog: ExerciseDefinition[];
  routines?: Routine[];
}

export interface ParsedBackupData {
  catalog: ExerciseDefinition[];
  routines: Routine[];
  hasExercises: boolean;
  hasRoutines: boolean;
}

/**
 * Normalizes an exercise title removing accents, extra spaces, and lowercase.
 * e.g., "Press de Banca Plana" -> "press de banca plana"
 * e.g., "Extensión Cuádriceps" -> "extension cuadriceps"
 */
export function normalizeExerciseTitle(title: string): string {
  return (title || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Parses and sanitizes imported JSON content, handling multiple formats.
 */
export function parseImportedData(rawJson: string): ParsedBackupData {
  const parsed = JSON.parse(rawJson);

  let catalog: ExerciseDefinition[] = [];
  let routines: Routine[] = [];

  // Case 1: Standard WorkoutLog backup object
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    if (Array.isArray(parsed.catalog)) {
      catalog = sanitizeCatalog(parsed.catalog);
    } else if (Array.isArray(parsed.exercises) && !parsed.exercises[0]?.sets) {
      // Sometimes called 'exercises' instead of 'catalog'
      catalog = sanitizeCatalog(parsed.exercises);
    }

    if (Array.isArray(parsed.routines)) {
      routines = sanitizeRoutines(parsed.routines);
    }
  }

  // Case 2: User uploaded raw array of exercises or routines
  if (Array.isArray(parsed)) {
    if (parsed.length > 0) {
      // Check first item to determine type
      const first = parsed[0];
      if (first && Array.isArray(first.exercises)) {
        // It's an array of routines
        routines = sanitizeRoutines(parsed);
      } else {
        // It's an array of exercise definitions
        catalog = sanitizeCatalog(parsed);
      }
    }
  }

  return {
    catalog,
    routines,
    hasExercises: catalog.length > 0,
    hasRoutines: routines.length > 0,
  };
}

function sanitizeCatalog(items: unknown[]): ExerciseDefinition[] {
  return items
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && typeof (item as { name?: unknown }).name === 'string')
    .map((item) => ({
      id: typeof item.id === 'string' && item.id.trim() ? item.id : 'def-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      name: String(item.name || '').trim(),
      category: typeof item.category === 'string' ? item.category : 'General',
      imageUrl: typeof item.imageUrl === 'string' ? item.imageUrl : '',
      videoUrl: typeof item.videoUrl === 'string' ? item.videoUrl : '',
      notes: typeof item.notes === 'string' ? item.notes : '',
      defaultSetsCount: typeof item.defaultSetsCount === 'number' ? item.defaultSetsCount : 3,
      defaultReps: typeof item.defaultReps === 'number' ? item.defaultReps : 10,
      defaultWeight: typeof item.defaultWeight === 'number' ? item.defaultWeight : 0,
      defaultRestSeconds: typeof item.defaultRestSeconds === 'number' ? item.defaultRestSeconds : 90,
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
    }));
}

function sanitizeRoutines(items: unknown[]): Routine[] {
  return items
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && typeof (item as { name?: unknown }).name === 'string')
    .map((item) => ({
      id: typeof item.id === 'string' && item.id.trim() ? item.id : 'routine-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      name: String(item.name || 'Rutina').trim(),
      notes: typeof item.notes === 'string' ? item.notes : '',
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
      updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString(),
      exercises: Array.isArray(item.exercises)
        ? item.exercises.map((ex, exIdx) => {
            const exObj = ex as Record<string, unknown>;
            return {
              id: typeof exObj?.id === 'string' ? exObj.id : `ex-${Date.now()}-${exIdx}-${Math.random().toString(36).substring(2, 6)}`,
              name: String(exObj?.name || 'Ejercicio').trim(),
              category: typeof exObj?.category === 'string' ? exObj.category : undefined,
              imageUrl: typeof exObj?.imageUrl === 'string' ? exObj.imageUrl : undefined,
              videoUrl: typeof exObj?.videoUrl === 'string' ? exObj.videoUrl : undefined,
              notes: typeof exObj?.notes === 'string' ? exObj.notes : undefined,
              sets: Array.isArray(exObj?.sets)
                ? exObj.sets.map((s, sIdx) => {
                    const sObj = s as Record<string, unknown>;
                    return {
                      id: typeof sObj?.id === 'string' ? sObj.id : `set-${Date.now()}-${sIdx}-${Math.random().toString(36).substring(2, 6)}`,
                      setNumber: typeof sObj?.setNumber === 'number' ? sObj.setNumber : sIdx + 1,
                      reps: typeof sObj?.reps === 'number' ? sObj.reps : 10,
                      weight: typeof sObj?.weight === 'number' ? sObj.weight : 0,
                      restSeconds: typeof sObj?.restSeconds === 'number' ? sObj.restSeconds : 90,
                    };
                  })
                : [],
            };
          })
        : [],
    }));
}

/**
 * Merges imported catalog with existing catalog following the duplicate rule.
 */
export function mergeCatalogs(
  existing: ExerciseDefinition[],
  imported: ExerciseDefinition[],
  replaceDuplicates: boolean
): { merged: ExerciseDefinition[]; addedCount: number; replacedCount: number; keptCount: number } {
  const result = [...existing];
  const titleToIndex = new Map<string, number>();

  result.forEach((item, index) => {
    titleToIndex.set(normalizeExerciseTitle(item.name), index);
  });

  let addedCount = 0;
  let replacedCount = 0;
  let keptCount = 0;

  imported.forEach((importedItem) => {
    const normalized = normalizeExerciseTitle(importedItem.name);
    if (!normalized) return;

    if (titleToIndex.has(normalized)) {
      if (replaceDuplicates) {
        // Replace existing exercise with the imported version
        const targetIndex = titleToIndex.get(normalized)!;
        const currentId = result[targetIndex].id;
        result[targetIndex] = {
          ...importedItem,
          id: currentId, // keep stable ID
        };
        replacedCount++;
      } else {
        // Keep the currently existing exercise
        keptCount++;
      }
    } else {
      // New exercise
      result.push(importedItem);
      titleToIndex.set(normalized, result.length - 1);
      addedCount++;
    }
  });

  return {
    merged: result,
    addedCount,
    replacedCount,
    keptCount,
  };
}

/**
 * Merges imported routines into existing routines, generating safe IDs to prevent clashes.
 * Note: Routines are merged even if they share titles, as requested.
 */
export function mergeRoutines(
  existing: Routine[],
  imported: Routine[]
): { merged: Routine[]; addedCount: number } {
  const existingIds = new Set(existing.map((r) => r.id));

  const safeImported = imported.map((routine) => {
    // If ID collision, assign a fresh ID and refresh set/exercise IDs
    let routineId = routine.id;
    if (existingIds.has(routineId)) {
      routineId = 'routine-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    }
    existingIds.add(routineId);

    return {
      ...routine,
      id: routineId,
      exercises: routine.exercises.map((ex, exIdx) => ({
        ...ex,
        id: `ex-${Date.now()}-${exIdx}-${Math.random().toString(36).substring(2, 6)}`,
        sets: ex.sets.map((s, sIdx) => ({
          ...s,
          id: `set-${Date.now()}-${sIdx}-${Math.random().toString(36).substring(2, 6)}`,
        })),
      })),
    };
  });

  return {
    merged: [...safeImported, ...existing],
    addedCount: safeImported.length,
  };
}

/**
 * Triggers a file download in the browser with JSON content.
 */
export function downloadJsonFile(filename: string, data: unknown) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
