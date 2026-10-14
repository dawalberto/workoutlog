import type { ExerciseDefinition, Routine } from '../types';
import { normalizeExerciseTitle } from './backup';

export interface ExerciseCatalogFormValues {
  name: string;
  category: string;
  imageUrl: string;
  videoUrl: string;
  notes: string;
  defaultSets: number | string;
  defaultReps: number | string;
  defaultWeight: number | string;
  defaultRest: number | string;
}

export const filterExerciseCatalog = (
  exercises: ExerciseDefinition[],
  searchTerm: string,
  selectedCategory: string,
): ExerciseDefinition[] => exercises.filter((ex) => {
  const matchesSearch = ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (ex.notes && ex.notes.toLowerCase().includes(searchTerm.toLowerCase()));
  const matchesCat = selectedCategory === 'Todos' || ex.category === selectedCategory;
  return matchesSearch && matchesCat;
});

export function buildCatalogExercise(
  form: ExerciseCatalogFormValues,
  existing: ExerciseDefinition | null,
  id: string,
  createdAt: string,
): ExerciseDefinition {
  return {
    ...(existing ?? {}),
    id: existing?.id ?? id,
    name: form.name.trim(),
    category: form.category,
    imageUrl: form.imageUrl.trim(),
    videoUrl: form.videoUrl.trim(),
    notes: form.notes.trim(),
    defaultSetsCount: Number(form.defaultSets) || 3,
    defaultReps: Number(form.defaultReps) || 10,
    defaultWeight: Number(form.defaultWeight) || 0,
    defaultRestSeconds: Number(form.defaultRest) || 60,
    ...(!existing ? { createdAt } : {}),
  };
}

export function updateRoutinesForCatalogExercise(
  routines: Routine[],
  exercise: ExerciseDefinition,
  previousExerciseName?: string,
): { routines: Routine[]; updatedRoutinesCount: number } {
  const oldNormalizedName = previousExerciseName
    ? normalizeExerciseTitle(previousExerciseName)
    : '';
  const newNormalizedName = normalizeExerciseTitle(exercise.name);
  let updatedRoutinesCount = 0;

  const updatedRoutines = routines.map((routine) => {
    let routineChanged = false;
    const exercises = routine.exercises.map((routineExercise) => {
      const normalizedName = normalizeExerciseTitle(routineExercise.name);
      const matchesDefinitionId = Boolean(
        routineExercise.definitionId && routineExercise.definitionId === exercise.id,
      );
      const matchesOldName = Boolean(
        oldNormalizedName && normalizedName === oldNormalizedName,
      );
      const matchesNewName = Boolean(
        newNormalizedName && normalizedName === newNormalizedName,
      );
      if (!matchesDefinitionId && !matchesOldName && !matchesNewName) {
        return routineExercise;
      }

      routineChanged = true;
      return {
        ...routineExercise,
        definitionId: exercise.id,
        name: exercise.name,
        category: exercise.category,
        imageUrl: exercise.imageUrl || '',
        videoUrl: exercise.videoUrl || '',
        notes: exercise.notes || '',
      };
    });

    if (!routineChanged) return routine;
    updatedRoutinesCount++;
    return { ...routine, exercises };
  });

  return {
    routines: updatedRoutinesCount > 0 ? updatedRoutines : routines,
    updatedRoutinesCount,
  };
}
