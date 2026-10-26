import type { StateCreator } from 'zustand/vanilla';
import type { ExerciseDefinition, Routine, RoutineSubMode } from '../../types';
import {
  canCreateRoutine,
  ROUTINE_LIMIT_ERROR_MESSAGE,
} from '../../utils/backup';
import { updateRoutinesForCatalogExercise } from '../../utils/exerciseCatalog';
import { updateRmLogsForCatalogExercise } from '../../utils/rmLogs';
import { updateDiariesForCatalogExercise } from '../../utils/diaryCalculations';
import { ANALYTICS_EVENTS } from '../../utils/analytics';
import type { AppState } from '../appStore';

export interface RoutineSlice {
  activeRoutineId: string | null;
  routineSubMode: RoutineSubMode;
  createRoutine: () => void;
  selectRoutine: (routineId: string, mode: RoutineSubMode) => void;
  closeRoutine: () => void;
  saveRoutine: (updatedRoutine: Routine) => void;
  duplicateRoutine: (routineId: string) => void;
  deleteRoutine: (routineId: string) => void;
  createCatalogExercise: (exercise: ExerciseDefinition) => void;
  updateCatalogExercise: (exercise: ExerciseDefinition) => void;
  deleteCatalogExercise: (id: string) => void;
}

export const createRoutineSlice: StateCreator<AppState, [], [], RoutineSlice> =
  (set, get) => ({
    activeRoutineId: null,
    routineSubMode: 'edit',
    createRoutine: () => {
      const state = get();
      if (!canCreateRoutine(state.routines.length, state.isSyncEnabled)) {
        state.notify(ROUTINE_LIMIT_ERROR_MESSAGE);
        return;
      }

      const newRoutine: Routine = {
        id: 'routine-' + Date.now(),
        name: 'Nueva Rutina ' + (state.routines.length + 1),
        notes: '',
        exercises: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      set({
        routines: [newRoutine, ...state.routines],
        activeRoutineId: newRoutine.id,
        routineSubMode: 'edit',
      });
    },
    selectRoutine: (activeRoutineId, routineSubMode) => set({
      activeRoutineId,
      routineSubMode,
    }),
    closeRoutine: () => set({ activeRoutineId: null }),
    saveRoutine: (updatedRoutine) => set((state) => ({
      routines: state.routines.map((routine) =>
        routine.id === updatedRoutine.id ? updatedRoutine : routine
      ),
    })),
    duplicateRoutine: (routineId) => {
      const state = get();
      const target = state.routines.find((routine) => routine.id === routineId);
      if (!target) return;
      if (!canCreateRoutine(state.routines.length, state.isSyncEnabled)) {
        state.notify(ROUTINE_LIMIT_ERROR_MESSAGE);
        return;
      }

      const cloned: Routine = {
        ...target,
        id: 'routine-' + Date.now(),
        name: `${target.name} (Copia)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        exercises: target.exercises.map((exercise) => ({
          ...exercise,
          id: 'ex-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          sets: exercise.sets.map((set) => ({
            ...set,
            id: 'set-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          })),
        })),
      };

      set((current) => ({ routines: [cloned, ...current.routines] }));
    },
    deleteRoutine: (routineId) => {
      if (!window.confirm('¿Seguro que deseas eliminar esta rutina?')) return;

      set((state) => ({
        routines: state.routines.filter((routine) => routine.id !== routineId),
        ...(state.activeRoutineId === routineId ? { activeRoutineId: null } : {}),
      }));
      get().resetSession(routineId);
    },
    createCatalogExercise: (exercise) => {
      const state = get();
      const exists = state.catalog.some((item) => item.id === exercise.id);
      set({
        catalog: exists
          ? state.catalog.map((item) => item.id === exercise.id ? exercise : item)
          : [exercise, ...state.catalog],
      });
      if (!exists) {
        state.recordAnalyticsEvent(ANALYTICS_EVENTS.EXERCISE_CREATE, {
          ...(exercise.category ? { category: exercise.category } : {}),
        });
      }
    },
    updateCatalogExercise: (exercise) => {
      const state = get();
      const oldDefinition = state.catalog.find((item) => item.id === exercise.id);

      const updatedCatalog = state.catalog.map((item) =>
        item.id === exercise.id ? exercise : item
      );

      const { routines, updatedRoutinesCount } = updateRoutinesForCatalogExercise(
        state.routines,
        exercise,
        oldDefinition?.name,
      );

      const { rmLogs, updatedLogsCount } = updateRmLogsForCatalogExercise(
        state.rmLogs,
        exercise,
        oldDefinition?.name,
      );

      const { diaries, updatedDiariesCount } = updateDiariesForCatalogExercise(
        state.exerciseDiary,
        exercise,
        oldDefinition?.name,
      );

      set({
        catalog: updatedCatalog,
        ...(updatedRoutinesCount > 0
          ? {
              routines: routines.map((routine, index) =>
                routine === state.routines[index]
                  ? routine
                  : { ...routine, updatedAt: new Date().toISOString() }
              ),
            }
          : {}),
        ...(updatedLogsCount > 0 ? { rmLogs } : {}),
        ...(updatedDiariesCount > 0 ? { exerciseDiary: diaries } : {}),
      });

      if (updatedRoutinesCount > 0) {
        get().notify(
          `"${exercise.name}" actualizado en biblioteca y en ${updatedRoutinesCount} rutina${updatedRoutinesCount > 1 ? 's' : ''}`,
        );
      }
    },
    deleteCatalogExercise: (id) => set((state) => ({
      catalog: state.catalog.filter((exercise) => exercise.id !== id),
    })),
  });
