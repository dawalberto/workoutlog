/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type {
  ActiveRestTimer,
  ActiveWorkoutSession,
  Exercise,
  ExerciseDefinition,
  ExerciseDiary,
  ExerciseRmLog,
  Routine,
  RoutineSubMode,
  WorkoutCompletionSummary,
} from '../types';
import {
  formatExerciseSummary,
  getRoutineTotalSeconds,
} from '../utils/timeCalculations';
import { getRoutineViewProgress } from '../utils/routineView';
import { initRestAudioContext } from '../utils/audioBeep';
import { useWorkoutTimer } from '../hooks/useWorkoutTimer';
import { useRoutineViewState } from '../hooks/useRoutineViewState';
import { RoutineHeader } from './routine/RoutineHeader';
import { WorkoutProgressPanel } from './routine/WorkoutProgressPanel';
import { RoutineExerciseList } from './routine/RoutineExerciseList';

interface RoutineViewProps {
  routine: Routine;
  catalog: ExerciseDefinition[];
  rmLogs?: ExerciseRmLog[];
  exerciseDiary?: ExerciseDiary[];
  initialMode: RoutineSubMode;
  session?: ActiveWorkoutSession | null;
  activeRestTimer?: ActiveRestTimer | null;
  onSaveRoutine: (updatedRoutine: Routine) => void;
  onSaveToCatalog: (def: ExerciseDefinition) => void;
  onBack: () => void;
  onStartSession: (routineId: string) => void;
  onToggleSetComplete: (routineId: string, setId: string) => void;
  onResetSession: (routineId: string) => void;
  onFinishSession: (summary: WorkoutCompletionSummary) => void;
  onCheckRmWeight?: (exerciseName: string, newWeight: number, exerciseId?: string) => void;
  onOpenDiary?: (exerciseName: string, exerciseId?: string) => void;
  onStartRestTimer?: (timer: ActiveRestTimer) => void;
  onCloseRestTimer?: () => void;
}

export const RoutineView: React.FC<RoutineViewProps> = ({
  routine,
  catalog,
  rmLogs = [],
  exerciseDiary = [],
  initialMode,
  session,
  activeRestTimer,
  onSaveRoutine,
  onSaveToCatalog,
  onBack,
  onStartSession,
  onToggleSetComplete,
  onResetSession,
  onFinishSession,
  onCheckRmWeight,
  onOpenDiary,
  onStartRestTimer,
  onCloseRestTimer,
}) => {
  const viewState = useRoutineViewState({
    routine,
    initialMode,
    session,
    activeRestTimer,
    onSaveRoutine,
  });
  const {
    subMode,
    setSubMode,
    isFinishConfirmOpen,
    setIsFinishConfirmOpen,
    showAddModal,
    setShowAddModal,
    showReorderModal,
    setShowReorderModal,
    routineFieldProps,
    collapsedExerciseIds,
    setCollapsedExerciseIds,
    handleToggleCollapseExercise,
  } = viewState;

  // Stopwatch timer for workout duration
  const elapsedSeconds = useWorkoutTimer(session?.startTime || null);

  // Total calculated time of the routine
  const totalWorkoutSeconds = getRoutineTotalSeconds(routine);

  // Session set completions
  const {
    completedSetIds,
    totalSetsCount,
    completedSetsCount,
    allExercisesCompleted,
    completionPercentage,
  } = getRoutineViewProgress(routine, session?.completedSetIds);

  // Handler when user toggles a set check
  const handleToggleSetComplete = (setId: string, restSeconds: number, exerciseName: string, setNumber: number) => {
    initRestAudioContext();

    if (!session?.startTime) {
      onStartSession(routine.id);
    }

    const wasCompleted = completedSetIds.has(setId);
    onToggleSetComplete(routine.id, setId);

    if (!wasCompleted) {
      if (restSeconds > 0) {
        onStartRestTimer?.({
          routineId: routine.id,
          initialSeconds: restSeconds,
          targetEndTime: Date.now() + restSeconds * 1000,
          exerciseName,
          setNumber,
          key: Date.now(),
        });
      }

      const exIndex = routine.exercises.findIndex((ex) => ex.sets.some((set) => set.id === setId));
      if (exIndex !== -1) {
        const targetEx = routine.exercises[exIndex];
        const willBeAllCompleted = targetEx.sets.every(
          (set) => set.id === setId || completedSetIds.has(set.id),
        );
        if (willBeAllCompleted) {
          setCollapsedExerciseIds((previous) => {
            const next = new Set(previous);
            next.add(targetEx.id);
            if (exIndex + 1 < routine.exercises.length) {
              const nextEx = routine.exercises[exIndex + 1];
              next.delete(nextEx.id);
            }
            return next;
          });
        }
      }
    }
  };

  const handleResetSession = () => {
    if (window.confirm('¿Reiniciar el progreso de la sesión actual?')) {
      onCloseRestTimer?.();
      onResetSession(routine.id);
    }
  };

  const handleConfirmFinish = () => {
    setIsFinishConfirmOpen(false);
    const now = Date.now();
    const startTime = session?.startTime || now;
    const durationSeconds = Math.max(0, Math.floor((now - startTime) / 1000));

    const summary: WorkoutCompletionSummary = {
      routineId: routine.id,
      routineName: routine.name || 'Rutina de entrenamiento',
      startTime,
      endTime: now,
      durationSeconds,
      completedSetsCount,
      totalSetsCount,
      completionPercentage,
      exercisesSummary: routine.exercises.map((exercise) => ({
        name: exercise.name,
        completedSets: exercise.sets.filter((set) => completedSetIds.has(set.id)).length,
        totalSets: exercise.sets.length,
        summaryText: formatExerciseSummary(exercise.sets),
        sets: exercise.sets,
      })),
    };

    onCloseRestTimer?.();
    onFinishSession(summary);
  };

  // Routine Updates
  const handleUpdateExercise = (index: number, updatedExercise: Exercise) => {
    const updatedExercises = [...routine.exercises];
    updatedExercises[index] = updatedExercise;
    onSaveRoutine({
      ...routine,
      exercises: updatedExercises,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleDeleteExercise = (index: number) => {
    if (window.confirm('¿Seguro que deseas eliminar este ejercicio de la rutina?')) {
      const updatedExercises = routine.exercises.filter((_, currentIndex) => currentIndex !== index);
      onSaveRoutine({
        ...routine,
        exercises: updatedExercises,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const handleMoveExercise = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= routine.exercises.length || fromIndex === toIndex) return;
    const updatedExercises = [...routine.exercises];
    const [moved] = updatedExercises.splice(fromIndex, 1);
    updatedExercises.splice(toIndex, 0, moved);
    onSaveRoutine({
      ...routine,
      exercises: updatedExercises,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleReorderAllExercises = (newOrderedExercises: Exercise[]) => {
    onSaveRoutine({
      ...routine,
      exercises: newOrderedExercises,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleAddExerciseFromModal = (newExercise: Exercise, templateToSave?: ExerciseDefinition) => {
    onSaveRoutine({
      ...routine,
      exercises: [...routine.exercises, newExercise],
      updatedAt: new Date().toISOString(),
    });

    if (templateToSave) onSaveToCatalog(templateToSave);
  };

  return (
    <div id="routine-view-container" className="min-h-screen bg-[#0D0D0D] text-white pb-32">
      <RoutineHeader
        routine={routine}
        subMode={subMode}
        session={session}
        elapsedSeconds={elapsedSeconds}
        totalWorkoutSeconds={totalWorkoutSeconds}
        allExercisesCompleted={allExercisesCompleted}
        onBack={onBack}
        onModeChange={setSubMode}
        routineFieldProps={routineFieldProps}
        progress={subMode === 'execute' ? (
          <WorkoutProgressPanel
            routine={routine}
            session={session}
            elapsedSeconds={elapsedSeconds}
            completedSetsCount={completedSetsCount}
            totalSetsCount={totalSetsCount}
            completionPercentage={completionPercentage}
            onStartSession={onStartSession}
            onResetSession={handleResetSession}
            onOpenFinishConfirm={() => setIsFinishConfirmOpen(true)}
          />
        ) : null}
      >
        <RoutineExerciseList
          routine={routine}
          catalog={catalog}
          rmLogs={rmLogs}
          exerciseDiary={exerciseDiary}
          subMode={subMode}
          completedSetIds={completedSetIds}
          collapsedExerciseIds={collapsedExerciseIds}
          showAddModal={showAddModal}
          showReorderModal={showReorderModal}
          isFinishConfirmOpen={isFinishConfirmOpen}
          elapsedSeconds={elapsedSeconds}
          completedSetsCount={completedSetsCount}
          totalSetsCount={totalSetsCount}
          onToggleCollapseExercise={handleToggleCollapseExercise}
          onToggleSetComplete={handleToggleSetComplete}
          onUpdateExercise={handleUpdateExercise}
          onDeleteExercise={handleDeleteExercise}
          onMoveExercise={handleMoveExercise}
          onAddExercise={handleAddExerciseFromModal}
          onSaveOrder={handleReorderAllExercises}
          onOpenDiary={onOpenDiary}
          onCheckRmWeight={onCheckRmWeight}
          onCloseAddModal={() => setShowAddModal(false)}
          onCloseReorderModal={() => setShowReorderModal(false)}
          onOpenAddModal={() => setShowAddModal(true)}
          onOpenReorderModal={() => setShowReorderModal(true)}
          onCancelFinish={() => setIsFinishConfirmOpen(false)}
          onConfirmFinish={handleConfirmFinish}
        />
      </RoutineHeader>
    </div>
  );
};
