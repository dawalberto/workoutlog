/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Routine, RoutineSubMode, ExerciseDefinition } from '../types';
import { normalizeExerciseTitle } from '../utils/backup';

export interface UseRoutinesProps {
  routines: Routine[];
  setRoutines: React.Dispatch<React.SetStateAction<Routine[]>>;
  catalog: ExerciseDefinition[];
  setCatalog: React.Dispatch<React.SetStateAction<ExerciseDefinition[]>>;
  onNotify?: (message: string) => void;
}

export interface UseRoutinesReturn {
  activeRoutineId: string | null;
  routineSubMode: RoutineSubMode;
  activeRoutine: Routine | undefined;
  createRoutine: () => void;
  selectRoutine: (routineId: string, mode: RoutineSubMode) => void;
  closeRoutine: () => void;
  saveRoutine: (updatedRoutine: Routine) => void;
  duplicateRoutine: (routineId: string) => void;
  deleteRoutine: (routineId: string, onResetSession?: (routineId: string) => void) => void;
  createCatalogExercise: (exercise: ExerciseDefinition) => void;
  updateCatalogExercise: (exercise: ExerciseDefinition) => void;
  deleteCatalogExercise: (id: string) => void;
}

export function useRoutines({
  routines,
  setRoutines,
  catalog,
  setCatalog,
  onNotify,
}: UseRoutinesProps): UseRoutinesReturn {
  const [activeRoutineId, setActiveRoutineId] = useState<string | null>(null);
  const [routineSubMode, setRoutineSubMode] = useState<RoutineSubMode>('edit');

  const activeRoutine = routines.find((r) => r.id === activeRoutineId);

  const createRoutine = () => {
    const newRoutine: Routine = {
      id: 'routine-' + Date.now(),
      name: 'Nueva Rutina ' + (routines.length + 1),
      notes: '',
      exercises: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setRoutines([newRoutine, ...routines]);
    setActiveRoutineId(newRoutine.id);
    setRoutineSubMode('edit');
  };

  const selectRoutine = (routineId: string, mode: RoutineSubMode) => {
    setActiveRoutineId(routineId);
    setRoutineSubMode(mode);
  };

  const closeRoutine = () => {
    setActiveRoutineId(null);
  };

  const saveRoutine = (updatedRoutine: Routine) => {
    setRoutines((prev) =>
      prev.map((r) => (r.id === updatedRoutine.id ? updatedRoutine : r))
    );
  };

  const duplicateRoutine = (routineId: string) => {
    const target = routines.find((r) => r.id === routineId);
    if (!target) return;

    const cloned: Routine = {
      ...target,
      id: 'routine-' + Date.now(),
      name: `${target.name} (Copia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      exercises: target.exercises.map((ex) => ({
        ...ex,
        id: 'ex-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        sets: ex.sets.map((s) => ({
          ...s,
          id: 'set-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        })),
      })),
    };

    setRoutines([cloned, ...routines]);
  };

  const deleteRoutine = (routineId: string, onResetSession?: (routineId: string) => void) => {
    if (window.confirm('¿Seguro que deseas eliminar esta rutina?')) {
      setRoutines((prev) => prev.filter((r) => r.id !== routineId));
      if (activeRoutineId === routineId) {
        setActiveRoutineId(null);
      }
      onResetSession?.(routineId);
    }
  };

  const createCatalogExercise = (exercise: ExerciseDefinition) => {
    setCatalog((prev) => {
      const exists = prev.some((e) => e.id === exercise.id);
      if (exists) {
        return prev.map((e) => (e.id === exercise.id ? exercise : e));
      }
      return [exercise, ...prev];
    });
  };

  const updateCatalogExercise = (exercise: ExerciseDefinition) => {
    const oldDef = catalog.find((e) => e.id === exercise.id);
    const oldNorm = oldDef ? normalizeExerciseTitle(oldDef.name) : '';
    const newNorm = normalizeExerciseTitle(exercise.name);

    setCatalog((prev) => prev.map((e) => (e.id === exercise.id ? exercise : e)));

    let updatedRoutinesCount = 0;
    setRoutines((prevRoutines) => {
      const updated = prevRoutines.map((routine) => {
        let routineChanged = false;

        const updatedExercises = routine.exercises.map((ex) => {
          const exNorm = normalizeExerciseTitle(ex.name);
          const matchesById = Boolean(ex.definitionId && ex.definitionId === exercise.id);
          const matchesByOldName = Boolean(oldNorm && exNorm === oldNorm);
          const matchesByNewName = Boolean(newNorm && exNorm === newNorm);

          if (matchesById || matchesByOldName || matchesByNewName) {
            routineChanged = true;
            return {
              ...ex,
              definitionId: exercise.id,
              name: exercise.name,
              category: exercise.category,
              imageUrl: exercise.imageUrl || '',
              videoUrl: exercise.videoUrl || '',
              notes: exercise.notes || '',
            };
          }
          return ex;
        });

        if (routineChanged) {
          updatedRoutinesCount++;
          return {
            ...routine,
            exercises: updatedExercises,
            updatedAt: new Date().toISOString(),
          };
        }
        return routine;
      });

      return updatedRoutinesCount > 0 ? updated : prevRoutines;
    });

    if (updatedRoutinesCount > 0 && onNotify) {
      onNotify(
        `"${exercise.name}" actualizado en biblioteca y en ${updatedRoutinesCount} rutina${updatedRoutinesCount > 1 ? 's' : ''}`
      );
    }
  };

  const deleteCatalogExercise = (id: string) => {
    setCatalog((prev) => prev.filter((e) => e.id !== id));
  };

  return {
    activeRoutineId,
    routineSubMode,
    activeRoutine,
    createRoutine,
    selectRoutine,
    closeRoutine,
    saveRoutine,
    duplicateRoutine,
    deleteRoutine,
    createCatalogExercise,
    updateCatalogExercise,
    deleteCatalogExercise,
  };
}
