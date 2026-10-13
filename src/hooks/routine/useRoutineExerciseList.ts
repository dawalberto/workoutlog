import { useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useAppStore } from '../../store/appStore';
import { selectActiveRoutine } from '../../store/selectors';
import { getRoutineViewProgress } from '../../utils/routineView';
import { initRestAudioContext } from '../../utils/audioBeep';

interface RoutineExerciseListViewState {
  setCollapsedExerciseIds: Dispatch<SetStateAction<Set<string>>>;
}

export function useRoutineExerciseList(viewState: RoutineExerciseListViewState) {
  const routine = useAppStore(selectActiveRoutine);
  const session = useAppStore((state) =>
    routine ? state.activeSessions[routine.id] : undefined,
  );
  const subMode = useAppStore((state) => state.routineSubMode);
  const startSession = useAppStore((state) => state.startSession);
  const toggleSetComplete = useAppStore((state) => state.toggleSetComplete);
  const startRestTimer = useAppStore((state) => state.startRestTimer);
  const progress = useMemo(
    () => routine ? getRoutineViewProgress(routine, session?.completedSetIds) : null,
    [routine, session?.completedSetIds],
  );

  const handleToggleSetComplete = (
    setId: string,
    restSeconds: number,
    exerciseName: string,
    setNumber: number,
  ) => {
    if (!routine) return;
    initRestAudioContext();
    if (!session?.startTime) startSession(routine.id);
    const wasCompleted = progress?.completedSetIds.has(setId) ?? false;
    toggleSetComplete(routine.id, setId);

    if (!wasCompleted) {
      if (restSeconds > 0) {
        startRestTimer({
          routineId: routine.id,
          initialSeconds: restSeconds,
          targetEndTime: Date.now() + restSeconds * 1000,
          exerciseName,
          setNumber,
          key: Date.now(),
        });
      }

      const exIndex = routine.exercises.findIndex((exercise) =>
        exercise.sets.some((set) => set.id === setId),
      );
      if (exIndex !== -1) {
        const targetExercise = routine.exercises[exIndex];
        const willBeAllCompleted = targetExercise.sets.every(
          (set) => set.id === setId || progress?.completedSetIds.has(set.id),
        );
        if (willBeAllCompleted) {
          viewState.setCollapsedExerciseIds((previous) => {
            const next = new Set(previous);
            next.add(targetExercise.id);
            const nextExercise = routine.exercises[exIndex + 1];
            if (nextExercise) next.delete(nextExercise.id);
            return next;
          });
        }
      }
    }
  };

  return {
    routine,
    session,
    subMode,
    completedSetIds: progress?.completedSetIds ?? EMPTY_SET,
    handleToggleSetComplete,
  };
}

const EMPTY_SET = new Set<string>();
