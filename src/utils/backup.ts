import { ExerciseDefinition, Routine, ExerciseRmLog, RmRecord } from '../types';

export interface WorkoutLogBackupFile {
  app: 'WorkoutLog';
  version: number;
  exportedAt: string;
  type: 'all' | 'exercises' | 'routines' | 'rms';
  catalog: ExerciseDefinition[];
  routines?: Routine[];
  rmLogs?: ExerciseRmLog[];
}

export interface ParsedBackupData {
  catalog: ExerciseDefinition[];
  routines: Routine[];
  rmLogs: ExerciseRmLog[];
  hasExercises: boolean;
  hasRoutines: boolean;
  hasRmLogs: boolean;
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
  let rmLogs: ExerciseRmLog[] = [];

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

    if (Array.isArray(parsed.rmLogs)) {
      rmLogs = sanitizeRmLogs(parsed.rmLogs);
    } else if (Array.isArray(parsed.rms)) {
      rmLogs = sanitizeRmLogs(parsed.rms);
    }
  }

  // Case 2: User uploaded raw array of exercises, routines, or RM logs
  if (Array.isArray(parsed)) {
    if (parsed.length > 0) {
      const first = parsed[0] as Record<string, unknown>;
      if (first && Array.isArray(first.exercises)) {
        // It's an array of routines
        routines = sanitizeRoutines(parsed);
      } else if (first && Array.isArray(first.records) && typeof first.exerciseName === 'string') {
        // It's an array of RM logs
        rmLogs = sanitizeRmLogs(parsed);
      } else {
        // It's an array of exercise definitions
        catalog = sanitizeCatalog(parsed);
      }
    }
  }

  return {
    catalog,
    routines,
    rmLogs,
    hasExercises: catalog.length > 0,
    hasRoutines: routines.length > 0,
    hasRmLogs: rmLogs.length > 0,
  };
}

export function sanitizeRmLogs(items: unknown[]): ExerciseRmLog[] {
  return items
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && typeof (item as { exerciseName?: unknown }).exerciseName === 'string')
    .map((item) => {
      const recordsRaw = Array.isArray(item.records) ? item.records : [];
      const records: RmRecord[] = recordsRaw
        .filter((r): r is Record<string, unknown> => !!r && typeof r === 'object' && (typeof r.weight === 'number' || typeof r.weight === 'string'))
        .map((r, rIdx) => ({
          id: typeof r.id === 'string' && r.id.trim() ? r.id : `rm-rec-${Date.now()}-${rIdx}-${Math.random().toString(36).substring(2, 6)}`,
          weight: typeof r.weight === 'number' ? r.weight : parseFloat(String(r.weight)) || 0,
          date: typeof r.date === 'string' && r.date.trim() ? r.date.trim() : new Date().toISOString().split('T')[0],
          notes: typeof r.notes === 'string' ? r.notes : undefined,
        }));

      return {
        id: typeof item.id === 'string' && item.id.trim() ? item.id : 'rm-log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        exerciseId: typeof item.exerciseId === 'string' ? item.exerciseId : undefined,
        exerciseName: String(item.exerciseName || '').trim(),
        category: typeof item.category === 'string' ? item.category : undefined,
        records,
        createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
        updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString(),
      };
    });
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

export interface MergeRoutinesOptions {
  importedCatalog?: ExerciseDefinition[];
  existingCatalog?: ExerciseDefinition[];
  replaceDuplicates?: boolean;
}

/**
 * Synchronizes routine exercise metadata (name, category, images, video, notes)
 * with the exercise catalog definitions matching by normalized title,
 * preserving sets and numbers.
 */
export function syncRoutinesWithCatalog(routines: Routine[], catalog: ExerciseDefinition[]): Routine[] {
  const catMap = new Map<string, ExerciseDefinition>();
  catalog.forEach((def) => {
    const key = normalizeExerciseTitle(def.name);
    if (key) catMap.set(key, def);
  });

  return routines.map((r) => ({
    ...r,
    exercises: r.exercises.map((ex) => {
      const match = catMap.get(normalizeExerciseTitle(ex.name));
      if (!match) return ex;
      return {
        ...ex,
        name: match.name || ex.name,
        category: match.category && match.category.trim() ? match.category : ex.category,
        imageUrl: match.imageUrl !== undefined && match.imageUrl !== '' ? match.imageUrl : ex.imageUrl,
        videoUrl: match.videoUrl !== undefined && match.videoUrl !== '' ? match.videoUrl : ex.videoUrl,
        notes: match.notes !== undefined && match.notes !== '' ? match.notes : ex.notes,
        sets: ex.sets,
      };
    }),
  }));
}

/**
 * Merges imported routines into existing routines, generating safe IDs to prevent clashes.
 * Note: Routines are merged even if they share titles, as requested.
 * When replaceDuplicates is true, exercises in existing routines that match imported exercises
 * by title (case-insensitive & accent-insensitive) are updated with the imported exercise's
 * metadata (name, category, image, video, notes) while keeping all recorded sets intact.
 */
export function mergeRoutines(
  existing: Routine[],
  imported: Routine[],
  options?: MergeRoutinesOptions
): { merged: Routine[]; addedCount: number; updatedExercisesCount: number } {
  const replaceDuplicates = options?.replaceDuplicates ?? false;
  const importedCatalog = options?.importedCatalog ?? [];
  const existingCatalog = options?.existingCatalog ?? [];

  // Map of imported exercise metadata
  const importedExMap = new Map<string, {
    name: string;
    category?: string;
    imageUrl?: string;
    videoUrl?: string;
    notes?: string;
  }>();

  // Populate from imported routines first
  imported.forEach((r) => {
    r.exercises.forEach((ex) => {
      const norm = normalizeExerciseTitle(ex.name);
      if (norm && !importedExMap.has(norm)) {
        importedExMap.set(norm, {
          name: ex.name,
          category: ex.category,
          imageUrl: ex.imageUrl,
          videoUrl: ex.videoUrl,
          notes: ex.notes,
        });
      }
    });
  });

  // Populate from imported catalog definitions (higher priority)
  importedCatalog.forEach((def) => {
    const norm = normalizeExerciseTitle(def.name);
    if (norm) {
      importedExMap.set(norm, {
        name: def.name,
        category: def.category,
        imageUrl: def.imageUrl,
        videoUrl: def.videoUrl,
        notes: def.notes,
      });
    }
  });

  // Map of existing exercise metadata (from current catalog & existing routines)
  const existingExMap = new Map<string, {
    name: string;
    category?: string;
    imageUrl?: string;
    videoUrl?: string;
    notes?: string;
  }>();

  existing.forEach((r) => {
    r.exercises.forEach((ex) => {
      const norm = normalizeExerciseTitle(ex.name);
      if (norm && !existingExMap.has(norm)) {
        existingExMap.set(norm, {
          name: ex.name,
          category: ex.category,
          imageUrl: ex.imageUrl,
          videoUrl: ex.videoUrl,
          notes: ex.notes,
        });
      }
    });
  });

  existingCatalog.forEach((def) => {
    const norm = normalizeExerciseTitle(def.name);
    if (norm) {
      existingExMap.set(norm, {
        name: def.name,
        category: def.category,
        imageUrl: def.imageUrl,
        videoUrl: def.videoUrl,
        notes: def.notes,
      });
    }
  });

  let updatedExercisesCount = 0;

  // Process existing routines
  const updatedExisting = existing.map((routine) => {
    const updatedExercises = routine.exercises.map((ex) => {
      const norm = normalizeExerciseTitle(ex.name);
      // If user chose to replace duplicates with imported exercise and match found
      if (replaceDuplicates && importedExMap.has(norm)) {
        const match = importedExMap.get(norm)!;
        updatedExercisesCount++;
        return {
          ...ex,
          name: match.name || ex.name,
          category: match.category && match.category.trim() ? match.category : ex.category,
          imageUrl: match.imageUrl !== undefined && match.imageUrl !== '' ? match.imageUrl : ex.imageUrl,
          videoUrl: match.videoUrl !== undefined && match.videoUrl !== '' ? match.videoUrl : ex.videoUrl,
          notes: match.notes !== undefined && match.notes !== '' ? match.notes : ex.notes,
          sets: ex.sets, // Preserve workout sets!
        };
      }
      return ex;
    });

    return {
      ...routine,
      exercises: updatedExercises,
    };
  });

  // Process imported routines
  const existingIds = new Set(existing.map((r) => r.id));

  const safeImported = imported.map((routine) => {
    // If ID collision, assign a fresh ID
    let routineId = routine.id;
    if (existingIds.has(routineId)) {
      routineId = 'routine-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    }
    existingIds.add(routineId);

    return {
      ...routine,
      id: routineId,
      exercises: routine.exercises.map((ex, exIdx) => {
        const norm = normalizeExerciseTitle(ex.name);
        let finalMeta = {
          name: ex.name,
          category: ex.category,
          imageUrl: ex.imageUrl,
          videoUrl: ex.videoUrl,
          notes: ex.notes,
        };

        // If user chose to keep existing app exercise when duplicate exists
        if (!replaceDuplicates && existingExMap.has(norm)) {
          const match = existingExMap.get(norm)!;
          finalMeta = {
            name: match.name || ex.name,
            category: match.category && match.category.trim() ? match.category : ex.category,
            imageUrl: match.imageUrl !== undefined && match.imageUrl !== '' ? match.imageUrl : ex.imageUrl,
            videoUrl: match.videoUrl !== undefined && match.videoUrl !== '' ? match.videoUrl : ex.videoUrl,
            notes: match.notes !== undefined && match.notes !== '' ? match.notes : ex.notes,
          };
        } else if (replaceDuplicates && importedExMap.has(norm)) {
          // Sync with the latest definition from imported catalog if available
          const match = importedExMap.get(norm)!;
          finalMeta = {
            name: match.name || ex.name,
            category: match.category && match.category.trim() ? match.category : ex.category,
            imageUrl: match.imageUrl !== undefined && match.imageUrl !== '' ? match.imageUrl : ex.imageUrl,
            videoUrl: match.videoUrl !== undefined && match.videoUrl !== '' ? match.videoUrl : ex.videoUrl,
            notes: match.notes !== undefined && match.notes !== '' ? match.notes : ex.notes,
          };
        }

        return {
          ...ex,
          id: `ex-${Date.now()}-${exIdx}-${Math.random().toString(36).substring(2, 6)}`,
          name: finalMeta.name,
          category: finalMeta.category,
          imageUrl: finalMeta.imageUrl,
          videoUrl: finalMeta.videoUrl,
          notes: finalMeta.notes,
          sets: ex.sets.map((s, sIdx) => ({
            ...s,
            id: `set-${Date.now()}-${sIdx}-${Math.random().toString(36).substring(2, 6)}`,
          })),
        };
      }),
    };
  });

  return {
    merged: [...safeImported, ...updatedExisting],
    addedCount: safeImported.length,
    updatedExercisesCount,
  };
}

/**
 * Merges imported RM logs with existing RM logs.
 * Matches exercises by normalized title or ID.
 */
export function mergeRmLogs(
  existing: ExerciseRmLog[],
  imported: ExerciseRmLog[],
  replaceDuplicates: boolean
): { merged: ExerciseRmLog[]; addedCount: number; updatedCount: number } {
  const result: ExerciseRmLog[] = [...existing];
  const nameToIndex = new Map<string, number>();

  result.forEach((item, index) => {
    nameToIndex.set(normalizeExerciseTitle(item.exerciseName), index);
  });

  let addedCount = 0;
  let updatedCount = 0;

  imported.forEach((importedLog) => {
    const norm = normalizeExerciseTitle(importedLog.exerciseName);
    if (!norm) return;

    if (nameToIndex.has(norm)) {
      const targetIndex = nameToIndex.get(norm)!;
      const target = result[targetIndex];

      if (replaceDuplicates) {
        // Replace records or merge unique date records
        const existingRecordSignatures = new Set(target.records.map((r) => `${r.date}_${r.weight}`));
        const newRecords = [...target.records];

        importedLog.records.forEach((rec) => {
          const sig = `${rec.date}_${rec.weight}`;
          if (!existingRecordSignatures.has(sig)) {
            newRecords.push(rec);
            existingRecordSignatures.add(sig);
          }
        });

        // Sort by date descending
        newRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        result[targetIndex] = {
          ...target,
          category: importedLog.category || target.category,
          exerciseId: importedLog.exerciseId || target.exerciseId,
          records: newRecords,
          updatedAt: new Date().toISOString(),
        };
        updatedCount++;
      }
    } else {
      // New exercise RM log
      result.push({
        ...importedLog,
        id: 'rm-log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      });
      nameToIndex.set(norm, result.length - 1);
      addedCount++;
    }
  });

  return {
    merged: result,
    addedCount,
    updatedCount,
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
