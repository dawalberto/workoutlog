import React, { useMemo, useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { selectActiveRoutine } from '../../store/selectors';
import type { Exercise, WorkoutSet } from '../../types';
import {
  formatExerciseSummary,
  getExerciseTotalSeconds,
} from '../../utils/timeCalculations';

export function useExerciseCard(
  exerciseId: string,
  propIsCollapsed?: boolean,
  onToggleCollapse?: () => void,
) {
  const routine = useAppStore(selectActiveRoutine);
  const exercise = routine?.exercises.find((item) => item.id === exerciseId);
  const exerciseIndex = routine?.exercises.findIndex((item) => item.id === exerciseId) ?? -1;
  const session = useAppStore((state) =>
    routine ? state.activeSessions[routine.id] : undefined,
  );
  const subMode = useAppStore((state) => state.routineSubMode);
  const rmLogs = useAppStore((state) => state.rmLogs);
  const exerciseDiary = useAppStore((state) => state.exerciseDiary);
  const saveRoutine = useAppStore((state) => state.saveRoutine);
  const checkRmWeight = useAppStore((state) => state.checkRmWeight);
  const openExerciseDiary = useAppStore((state) => state.openExerciseDiary);
  const [showVideoInput, setShowVideoInput] = useState(false);
  const [showImageInput, setShowImageInput] = useState(false);
  const [setDrafts, setSetDrafts] = useState<Record<string, string>>({});
  const [textDrafts, setTextDrafts] = useState<Record<string, string>>({});

  const completedSetIds = useMemo(
    () => new Set(session?.completedSetIds ?? []),
    [session?.completedSetIds],
  );
  const totalSetsCount = exercise?.sets.length ?? 0;
  const completedSetsCount =
    exercise?.sets.filter((set) => completedSetIds.has(set.id)).length ?? 0;
  const isAllCompleted = totalSetsCount > 0 && completedSetsCount === totalSetsCount;
  const isExecutionMode = subMode === 'execute';
  const [localCollapsed, setLocalCollapsed] = useState(
    () => isExecutionMode && isAllCompleted,
  );
  const isCollapsed = propIsCollapsed !== undefined ? propIsCollapsed : localCollapsed;
  const handleToggleCollapse = onToggleCollapse ?? (() => setLocalCollapsed(!localCollapsed));
  const totalExerciseSeconds = exercise ? getExerciseTotalSeconds(exercise) : 0;
  const summaryText = exercise ? formatExerciseSummary(exercise.sets) : '';

  const updateExercise = (updatedExercise: Exercise) => {
    if (!routine) return;
    saveRoutine({
      ...routine,
      exercises: routine.exercises.map((item) =>
        item.id === updatedExercise.id ? updatedExercise : item,
      ),
      updatedAt: new Date().toISOString(),
    });
  };

  const deleteExercise = () => {
    if (!routine || !exercise || !window.confirm('¿Seguro que deseas eliminar este ejercicio de la rutina?')) {
      return;
    }
    saveRoutine({
      ...routine,
      exercises: routine.exercises.filter((item) => item.id !== exercise.id),
      updatedAt: new Date().toISOString(),
    });
  };

  type TextField = 'name' | 'notes' | 'imageUrl' | 'videoUrl';
  const textFieldProps = (field: TextField) => {
    if (!exercise) return undefined;
    const currentExercise = exercise;
    const key = `${currentExercise.id}:${field}`;
    return {
      value: textDrafts[key] ?? currentExercise[field] ?? '',
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setTextDrafts((drafts) => ({ ...drafts, [key]: value }));
      },
      onBlur: (event: React.FocusEvent<HTMLInputElement>) => {
        if (!(key in textDrafts)) return;
        const value = event.currentTarget.value;
        setTextDrafts((drafts) => {
          const next = { ...drafts };
          delete next[key];
          return next;
        });
        if (value !== (currentExercise[field] ?? '')) {
          updateExercise({ ...currentExercise, [field]: value });
        }
      },
      onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') event.currentTarget.blur();
      },
    };
  };

  const handleUpdateSet = (
    setId: string,
    field: keyof WorkoutSet,
    value: number | string,
  ) => {
    if (!exercise) return;
    updateExercise({
      ...exercise,
      sets: exercise.sets.map((set) =>
        set.id === setId ? { ...set, [field]: value } : set,
      ),
    });
  };

  const setDraftKey = (setId: string, field: 'reps' | 'weight') => `${setId}:${field}`;
  const handleSetDraftChange = (
    setId: string,
    field: 'reps' | 'weight',
    value: string,
  ) => setSetDrafts((drafts) => ({ ...drafts, [setDraftKey(setId, field)]: value }));

  const clearSetDraft = (key: string) => setSetDrafts((drafts) => {
    const next = { ...drafts };
    delete next[key];
    return next;
  });

  const handleCommitReps = (set: WorkoutSet, inputValue: string) => {
    const key = setDraftKey(set.id, 'reps');
    if (!(key in setDrafts)) return;
    const value = !inputValue || isNaN(Number(inputValue)) || Number(inputValue) < 1
      ? 1
      : Number(inputValue);
    clearSetDraft(key);
    if (Number(set.reps) !== value) handleUpdateSet(set.id, 'reps', value);
  };

  const handleCommitWeight = (set: WorkoutSet, inputValue: string) => {
    const key = setDraftKey(set.id, 'weight');
    if (!(key in setDrafts)) return;
    const parsedValue = Number(inputValue);
    const value = inputValue === '' || isNaN(parsedValue) || parsedValue < 0
      ? 0
      : parsedValue;
    const changed = Number(set.weight) !== value;
    clearSetDraft(key);
    if (!changed) return;
    handleUpdateSet(set.id, 'weight', value);
    if (value > 0 && exercise) checkRmWeight(exercise.name, value, exercise.definitionId);
  };

  const handleApplyRestToAllSets = (newRest: number) => {
    if (!exercise) return;
    updateExercise({
      ...exercise,
      sets: exercise.sets.map((set) => ({ ...set, restSeconds: newRest })),
    });
  };

  const handleDuplicateSet = (indexToDuplicate: number) => {
    if (!exercise) return;
    const setToDuplicate = exercise.sets[indexToDuplicate];
    if (!setToDuplicate) return;
    const newSet: WorkoutSet = {
      ...setToDuplicate,
      id: `set-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      setNumber: exercise.sets.length + 1,
    };
    const sets = [
      ...exercise.sets.slice(0, indexToDuplicate + 1),
      newSet,
      ...exercise.sets.slice(indexToDuplicate + 1),
    ].map((set, index) => ({ ...set, setNumber: index + 1 }));
    updateExercise({ ...exercise, sets });
  };

  const handleAddSet = () => {
    if (!exercise) return;
    const lastSet = exercise.sets[exercise.sets.length - 1];
    const newSet: WorkoutSet = {
      id: `set-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      setNumber: exercise.sets.length + 1,
      reps: lastSet ? lastSet.reps : 10,
      weight: lastSet ? lastSet.weight : 0,
      restSeconds: lastSet ? lastSet.restSeconds : 60,
    };
    updateExercise({ ...exercise, sets: [...exercise.sets, newSet] });
  };

  const handleDeleteSet = (setId: string) => {
    if (!exercise || exercise.sets.length <= 1) return;
    const sets = exercise.sets
      .filter((set) => set.id !== setId)
      .map((set, index) => ({ ...set, setNumber: index + 1 }));
    updateExercise({ ...exercise, sets });
  };

  return {
    exercise,
    exerciseIndex,
    isExecutionMode,
    completedSetIds,
    rmLogs,
    exerciseDiary,
    updateExercise,
    deleteExercise,
    onCheckRmWeight: checkRmWeight,
    onOpenDiary: openExerciseDiary,
    showVideoInput,
    setShowVideoInput,
    showImageInput,
    setShowImageInput,
    setDrafts,
    textFieldProps,
    totalSetsCount,
    completedSetsCount,
    isAllCompleted,
    isCollapsed,
    handleToggleCollapse,
    totalExerciseSeconds,
    summaryText,
    handleUpdateSet,
    setDraftKey,
    handleSetDraftChange,
    handleCommitReps,
    handleCommitWeight,
    handleApplyRestToAllSets,
    handleDuplicateSet,
    handleAddSet,
    handleDeleteSet,
  };
}
