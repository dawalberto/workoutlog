import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { selectActiveRoutine } from '../store/selectors';
import { findActiveRoutineExerciseId } from '../utils/routineView';
import { useWorkoutTimer } from './useWorkoutTimer';

export function useRoutineViewState() {
  const routine = useAppStore(selectActiveRoutine);
  const session = useAppStore((state) =>
    routine ? state.activeSessions[routine.id] : undefined,
  );
  const activeRestTimer = useAppStore((state) => state.activeRestTimer);
  const subMode = useAppStore((state) => state.routineSubMode);
  const elapsedSeconds = useWorkoutTimer(session?.startTime);
  const saveRoutine = useAppStore((state) => state.saveRoutine);
  const [textDrafts, setTextDrafts] = useState<Record<string, string>>({});

  const routineFieldProps = (field: 'name' | 'notes') => {
    if (!routine) return undefined;
    const currentRoutine = routine;
    const key = `${currentRoutine.id}:${field}`;
    return {
      value: textDrafts[key] ?? currentRoutine[field] ?? '',
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const value = event.target.value;
        setTextDrafts((drafts) => ({ ...drafts, [key]: value }));
      },
      onBlur: (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (!(key in textDrafts)) return;
        const value = event.currentTarget.value;
        setTextDrafts((drafts) => {
          const next = { ...drafts };
          delete next[key];
          return next;
        });
        if (value !== (currentRoutine[field] ?? '')) {
          saveRoutine({
            ...currentRoutine,
            [field]: value,
            updatedAt: new Date().toISOString(),
          });
        }
      },
      onKeyDown: (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && (field === 'name' || event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          event.currentTarget.blur();
        }
      },
    };
  };

  const findActiveExerciseId = useCallback(
    () => routine ? findActiveRoutineExerciseId(routine, session, activeRestTimer) : '',
    [routine, session, activeRestTimer],
  );

  const computeInitialCollapsed = useCallback((): Set<string> => {
    const collapsed = new Set<string>();
    if (!routine) return collapsed;

    const isSessionActive = Boolean(
      session?.startTime || (session?.completedSetIds && session.completedSetIds.length > 0),
    );
    if (isSessionActive && routine.exercises.length > 0) {
      const activeId = findActiveExerciseId();
      routine.exercises.forEach((exercise) => {
        if (exercise.id !== activeId) collapsed.add(exercise.id);
      });
    } else {
      routine.exercises.forEach((exercise, index) => {
        if (index > 0) collapsed.add(exercise.id);
      });
    }
    return collapsed;
  }, [routine, session?.startTime, session?.completedSetIds, findActiveExerciseId]);

  const [collapsedExerciseIds, setCollapsedExerciseIds] = useState<Set<string>>(
    computeInitialCollapsed,
  );
  const prevRoutineIdRef = useRef(routine?.id);
  useEffect(() => {
    if (prevRoutineIdRef.current !== routine?.id) {
      prevRoutineIdRef.current = routine?.id;
      setCollapsedExerciseIds(computeInitialCollapsed());
    }
  }, [routine?.id, computeInitialCollapsed]);

  const scrollContextRef = useRef({ findActiveExerciseId, session, routine });
  scrollContextRef.current = { findActiveExerciseId, session, routine };
  const activeExerciseId = findActiveExerciseId();
  useEffect(() => {
    const {
      findActiveExerciseId: getActiveExerciseId,
      session: currentSession,
      routine: currentRoutine,
    } = scrollContextRef.current;
    const isSessionActive = Boolean(
      currentSession?.startTime ||
        (currentSession?.completedSetIds && currentSession.completedSetIds.length > 0),
    );

    if (currentRoutine && isSessionActive && currentRoutine.exercises.length > 0) {
      const activeId = getActiveExerciseId();
      if (activeId) {
        const timer = setTimeout(() => {
          const cardEl = document.getElementById(`exercise-card-${activeId}`);
          if (cardEl) cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 120);
        return () => clearTimeout(timer);
      }
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [routine?.id, session?.startTime, activeExerciseId]);

  const handleToggleCollapseExercise = (exerciseId: string) => {
    setCollapsedExerciseIds((previous) => {
      const next = new Set(previous);
      if (next.has(exerciseId)) next.delete(exerciseId);
      else next.add(exerciseId);
      return next;
    });
  };

  return {
    routine,
    session,
    subMode,
    elapsedSeconds,
    routineFieldProps,
    collapsedExerciseIds,
    setCollapsedExerciseIds,
    handleToggleCollapseExercise,
  };
}
