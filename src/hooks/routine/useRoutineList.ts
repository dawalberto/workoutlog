import { useMemo } from 'react';
import { useAppStore } from '../../store/appStore';

export function useRoutineList() {
  const routines = useAppStore((state) => state.routines);
  const activeSessions = useAppStore((state) => state.activeSessions);
  const createRoutine = useAppStore((state) => state.createRoutine);
  const selectRoutine = useAppStore((state) => state.selectRoutine);
  const duplicateRoutine = useAppStore((state) => state.duplicateRoutine);
  const deleteRoutine = useAppStore((state) => state.deleteRoutine);

  const summary = useMemo(() => ({
    totalRoutines: routines.length,
    totalSetsOverall: routines.reduce(
      (total, routine) => total + routine.exercises.reduce(
        (sets, exercise) => sets + exercise.sets.length,
        0,
      ),
      0,
    ),
  }), [routines, activeSessions]);

  return {
    routines,
    activeSessions,
    ...summary,
    onCreateRoutine: createRoutine,
    onSelectRoutine: selectRoutine,
    onDuplicateRoutine: duplicateRoutine,
    onDeleteRoutine: deleteRoutine,
  };
}
