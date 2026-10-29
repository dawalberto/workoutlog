import type { Exercise, ExerciseDefinition, WorkoutSet } from '../../types';
import { useAppStore } from '../../store/appStore';
import { selectActiveRoutine } from '../../store/selectors';
import { parseWeightInput } from '../../utils/weightInput';
import {
  getExerciseCategories,
  normalizeExerciseCategories,
  primaryExerciseCategory,
} from '../../utils/exerciseCategories';

export interface CustomExerciseInput {
  name: string;
  categories: string[];
  imageUrl: string;
  videoUrl: string;
  notes: string;
  setsCount: number | string;
  reps: number | string;
  weight: number | string;
  restSeconds: number | string;
  saveToLibrary: boolean;
}

export function useAddExerciseModal() {
  const routine = useAppStore(selectActiveRoutine);
  const catalog = useAppStore((state) => state.catalog);
  const rmLogs = useAppStore((state) => state.rmLogs);
  const exerciseDiary = useAppStore((state) => state.exerciseDiary);
  const saveRoutine = useAppStore((state) => state.saveRoutine);
  const createCatalogExercise = useAppStore((state) => state.createCatalogExercise);
  const openExerciseDiary = useAppStore((state) => state.openExerciseDiary);

  const addExercise = (
    exercise: Exercise,
    templateToSave?: ExerciseDefinition,
  ) => {
    if (routine) {
      saveRoutine({
        ...routine,
        exercises: [...routine.exercises, exercise],
        updatedAt: new Date().toISOString(),
      });
    }
    if (templateToSave) createCatalogExercise(templateToSave);
  };

  const createSets = (
    count: number,
    reps: number | string,
    weight: number | string,
    restSeconds: number | string,
  ): WorkoutSet[] => Array.from({ length: count }, (_, index) => ({
    id: `set-${Date.now()}-${index + 1}-${Math.random().toString(36).substring(2, 5)}`,
    setNumber: index + 1,
    reps,
    weight,
    restSeconds,
  }));

  const addCatalogExercise = (item: ExerciseDefinition) => {
    const sets = createSets(
      item.defaultSetsCount || 3,
      item.defaultReps || 10,
      item.defaultWeight || 0,
      item.defaultRestSeconds || 90,
    );
    const categories = getExerciseCategories(item);
    const exercise: Exercise = {
      id: `ex-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      definitionId: item.id,
      name: item.name,
      category: primaryExerciseCategory(item),
      categories,
      imageUrl: item.imageUrl || '',
      videoUrl: item.videoUrl || '',
      notes: item.notes || '',
      sets,
    };
    addExercise(exercise);
    return item.id;
  };

  const addCustomExercise = (input: CustomExerciseInput) => {
    if (!input.name.trim()) return null;
    const count = Math.max(1, Number(input.setsCount) || 1);
    const reps = Math.max(1, Number(input.reps) || 1);
    const weight = Math.max(0, parseWeightInput(String(input.weight)) ?? 0);
    const restSeconds = Math.max(0, Number(input.restSeconds) || 0);
    const definitionId = input.saveToLibrary
      ? `def-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
      : undefined;
    const name = input.name.trim();
    const categories = normalizeExerciseCategories(input.categories);
    const primaryCategory = primaryExerciseCategory({ categories });
    const imageUrl = input.imageUrl.trim();
    const videoUrl = input.videoUrl.trim();
    const notes = input.notes.trim();
    const exercise: Exercise = {
      id: `ex-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      definitionId,
      name,
      category: primaryCategory,
      categories,
      imageUrl,
      videoUrl,
      notes,
      sets: createSets(count, reps, weight, restSeconds),
    };
    const template: ExerciseDefinition | undefined = definitionId
      ? {
          id: definitionId,
          name,
          category: primaryCategory,
          categories,
          imageUrl,
          videoUrl,
          notes,
          defaultSetsCount: count,
          defaultReps: reps,
          defaultWeight: weight,
          defaultRestSeconds: restSeconds,
          createdAt: new Date().toISOString(),
        }
      : undefined;
    addExercise(exercise, template);
    return name;
  };

  return {
    catalog,
    rmLogs,
    exerciseDiary,
    onOpenDiary: openExerciseDiary,
    addCatalogExercise,
    addCustomExercise,
  };
}
