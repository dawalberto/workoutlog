/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ArrowLeft, 
  Play, 
  Edit3, 
  Plus, 
  Clock, 
  RotateCcw, 
  CheckCircle2, 
  Dumbbell, 
  FileText, 
  ArrowUpDown, 
  Flag,
  Zap,
  Activity
} from 'lucide-react';
import { 
  Exercise, 
  ExerciseDefinition, 
  Routine, 
  RoutineSubMode, 
  ActiveWorkoutSession, 
  WorkoutCompletionSummary, 
  ExerciseRmLog, 
  ExerciseDiary,
  ActiveRestTimer
} from '../types';
import { 
  getRoutineTotalSeconds, 
  formatSecondsToTime, 
  formatWorkoutDuration,
  formatExerciseSummary
} from '../utils/timeCalculations';
import { useWorkoutTimer } from '../hooks/useWorkoutTimer';
import { ExerciseCard } from './ExerciseCard';
import { AddExerciseModal } from './AddExerciseModal';
import { ReorderExercisesModal } from './ReorderExercisesModal';
import { WorkoutFinishConfirmModal } from './WorkoutFinishConfirmModal';
import { initRestAudioContext } from '../utils/audioBeep';

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
  const [subMode, setSubMode] = useState<RoutineSubMode>(initialMode);
  const [isFinishConfirmOpen, setIsFinishConfirmOpen] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showReorderModal, setShowReorderModal] = useState(false);

  // Helper to find the active exercise ID when returning to an in-progress workout session
  const findActiveExerciseId = useCallback((): string => {
    if (routine.exercises.length === 0) return '';

    // 1. If rest timer is active for this routine, match the exercise name
    if (activeRestTimer?.routineId === routine.id && activeRestTimer.exerciseName) {
      const match = routine.exercises.find(
        (ex) => ex.name.trim().toLowerCase() === activeRestTimer.exerciseName?.trim().toLowerCase()
      );
      if (match) return match.id;
    }

    // 2. If sets were completed in this session, check backwards from the last touched set
    if (session?.completedSetIds && session.completedSetIds.length > 0) {
      const completedSetIdSet = new Set(session.completedSetIds);
      for (let i = session.completedSetIds.length - 1; i >= 0; i--) {
        const setId = session.completedSetIds[i];
        const ex = routine.exercises.find((e) => e.sets.some((s) => s.id === setId));
        if (ex) {
          // If this exercise is in progress (some sets done, but not all), this is the active one!
          const isComplete = ex.sets.every((s) => completedSetIdSet.has(s.id));
          if (!isComplete) {
            return ex.id;
          }
        }
      }

      // If the last touched exercise is completed, find the next incomplete exercise
      const nextIncomplete = routine.exercises.find(
        (e) => !e.sets.every((s) => completedSetIdSet.has(s.id))
      );
      if (nextIncomplete) {
        return nextIncomplete.id;
      }
    }

    // 3. Fallback: first incomplete exercise in routine, or the first exercise
    const completedSetIdSet = new Set(session?.completedSetIds || []);
    const firstIncomplete = routine.exercises.find(
      (e) => !e.sets.every((s) => completedSetIdSet.has(s.id))
    );
    return firstIncomplete ? firstIncomplete.id : routine.exercises[0]?.id || '';
  }, [routine.exercises, routine.id, activeRestTimer, session?.completedSetIds]);

  // Compute initial collapsed state:
  // - If workout is in progress: ONLY the active exercise is uncollapsed; all others collapsed.
  // - If workout not started: only exercise 0 is uncollapsed; all others collapsed.
  const computeInitialCollapsed = useCallback((): Set<string> => {
    const isSessionActive = Boolean(
      session?.startTime || (session?.completedSetIds && session.completedSetIds.length > 0)
    );

    const set = new Set<string>();

    if (isSessionActive && routine.exercises.length > 0) {
      const activeId = findActiveExerciseId();
      routine.exercises.forEach((ex) => {
        if (ex.id !== activeId) {
          set.add(ex.id);
        }
      });
    } else {
      // Default: index 0 uncollapsed, others collapsed
      routine.exercises.forEach((ex, idx) => {
        if (idx > 0) {
          set.add(ex.id);
        }
      });
    }
    return set;
  }, [routine.exercises, session?.startTime, session?.completedSetIds, findActiveExerciseId]);

  // Collapse state
  const [collapsedExerciseIds, setCollapsedExerciseIds] = useState<Set<string>>(computeInitialCollapsed);

  // Sync collapsed state and automatically scroll to active exercise on routine mount/change
  const prevRoutineIdRef = useRef(routine.id);
  useEffect(() => {
    if (prevRoutineIdRef.current !== routine.id) {
      prevRoutineIdRef.current = routine.id;
      setCollapsedExerciseIds(computeInitialCollapsed());
    }
  }, [routine.id, computeInitialCollapsed]);

  // Auto-scroll effect:
  // If workout session is active in this routine, scroll smoothly to the current exercise.
  // Otherwise, reset scroll to top of window.
  useEffect(() => {
    const isSessionActive = Boolean(
      session?.startTime || (session?.completedSetIds && session.completedSetIds.length > 0)
    );

    if (isSessionActive && routine.exercises.length > 0) {
      const activeId = findActiveExerciseId();
      if (activeId) {
        const timer = setTimeout(() => {
          const cardEl = document.getElementById(`exercise-card-${activeId}`);
          if (cardEl) {
            cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 120);
        return () => clearTimeout(timer);
      }
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [routine.id, session?.startTime, findActiveExerciseId]);

  const handleToggleCollapseExercise = (exerciseId: string) => {
    setCollapsedExerciseIds((prev) => {
      const next = new Set(prev);
      if (next.has(exerciseId)) {
        next.delete(exerciseId);
      } else {
        next.add(exerciseId);
      }
      return next;
    });
  };

  // Stopwatch timer for workout duration
  const elapsedSeconds = useWorkoutTimer(session?.startTime || null);

  // Total calculated time of the routine
  const totalWorkoutSeconds = getRoutineTotalSeconds(routine);

  // Session set completions
  const completedSetIds = new Set<string>(session?.completedSetIds || []);
  const totalSetsCount = routine.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const completedSetsCount = routine.exercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => completedSetIds.has(s.id)).length,
    0
  );
  const allExercisesCompleted = totalSetsCount > 0 && completedSetsCount === totalSetsCount;
  const completionPercentage = totalSetsCount > 0 ? Math.round((completedSetsCount / totalSetsCount) * 100) : 0;

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

      const exIndex = routine.exercises.findIndex((ex) => ex.sets.some((s) => s.id === setId));
      if (exIndex !== -1) {
        const targetEx = routine.exercises[exIndex];
        const willBeAllCompleted = targetEx.sets.every((s) => s.id === setId || completedSetIds.has(s.id));
        if (willBeAllCompleted) {
          setCollapsedExerciseIds((prev) => {
            const next = new Set(prev);
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
      exercisesSummary: routine.exercises.map((ex) => ({
        name: ex.name,
        completedSets: ex.sets.filter((s) => completedSetIds.has(s.id)).length,
        totalSets: ex.sets.length,
        summaryText: formatExerciseSummary(ex.sets),
        sets: ex.sets,
      })),
    };

    onCloseRestTimer?.();
    onFinishSession(summary);
  };

  // Routine Updates
  const handleNameChange = (name: string) => {
    onSaveRoutine({
      ...routine,
      name,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleNotesChange = (notes: string) => {
    onSaveRoutine({
      ...routine,
      notes,
      updatedAt: new Date().toISOString(),
    });
  };

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
      const updatedExercises = routine.exercises.filter((_, i) => i !== index);
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

    if (templateToSave) {
      onSaveToCatalog(templateToSave);
    }
  };

  return (
    <div id="routine-view-container" className="min-h-screen bg-[#0D0D0D] text-white pb-32">
      {/* Top sticky bar */}
      <div className="sticky top-0 z-40 bg-[#121214]/90 backdrop-blur-xl border-b border-white/[0.08] shadow-lg pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              id="btn-back-to-routines"
              type="button"
              onClick={onBack}
              className="shrink-0 min-h-[44px] inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl text-zinc-300 hover:text-white bg-zinc-900 border border-white/10 hover:border-white/20 transition-all active:scale-[0.97]"
            >
              <ArrowLeft className="w-4 h-4" /> <span>Rutinas</span>
            </button>

            {/* In-header live workout stopwatch */}
            {subMode === 'execute' && session?.startTime && (
              <div 
                className="hidden xs:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-[#00FF87]/30 text-[#00FF87] font-mono font-bold text-xs shrink-0 shadow-inner"
                title="Tiempo de entrenamiento transcurrido"
              >
                <span className="w-2 h-2 rounded-full bg-[#00FF87] animate-ping" />
                <Clock className="w-3.5 h-3.5" />
                <span>{formatWorkoutDuration(elapsedSeconds)}</span>
              </div>
            )}
          </div>

          {/* Mode Switcher Tabs */}
          <div className="shrink-0 flex items-center p-1 bg-zinc-900/90 rounded-2xl border border-white/[0.08] shadow-inner">
            <button
              id="tab-mode-edit"
              type="button"
              onClick={() => setSubMode('edit')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all shrink-0 active:scale-95 ${
                subMode === 'edit'
                  ? 'bg-zinc-800 text-white border border-white/10 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" /> <span>Editar</span>
            </button>

            <button
              id="tab-mode-execute"
              type="button"
              onClick={() => setSubMode('execute')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold rounded-xl transition-all shrink-0 active:scale-95 ${
                subMode === 'execute'
                  ? 'bg-[#00FF87] text-black shadow-[0_0_12px_rgba(0,255,135,0.4)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" /> <span>Entrenar</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
        {/* Routine Meta Card */}
        <div className="bg-[#1C1C1E] rounded-2xl border border-white/[0.08] p-5 sm:p-6 shadow-xl mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {subMode === 'edit' ? (
                <div>
                  <label htmlFor="routine-name-input" className="block text-[11px] font-extrabold text-[#A1A1AA] uppercase tracking-wider mb-1">
                    Nombre de la Rutina
                  </label>
                  <input
                    id="routine-name-input"
                    type="text"
                    value={routine.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Ej: Torso Hipertrofia, Pierna Fuerza..."
                    className="w-full text-xl sm:text-2xl font-black text-white bg-transparent border-b border-white/10 focus:border-[#00FF87] focus:outline-none pb-1 transition-colors"
                  />
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 text-[10px] font-black rounded-lg bg-[#00FF87]/15 text-[#00FF87] border border-[#00FF87]/30 uppercase tracking-wider">
                      Modo Entrenamiento
                    </span>
                    {allExercisesCompleted && (
                      <span className="px-2.5 py-0.5 text-[10px] font-black rounded-lg bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40 uppercase tracking-wider">
                        ¡Entrenamiento Completo!
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
                    {routine.name || 'Rutina sin nombre'}
                  </h1>
                </div>
              )}

              {/* Routine Notes */}
              <div className="mt-3">
                {subMode === 'edit' ? (
                  <div>
                    <label htmlFor="routine-notes-input" className="block text-[11px] font-extrabold text-[#A1A1AA] uppercase tracking-wider mb-1">
                      Notas / Objetivos
                    </label>
                    <textarea
                      id="routine-notes-input"
                      rows={2}
                      value={routine.notes || ''}
                      onChange={(e) => handleNotesChange(e.target.value)}
                      placeholder="Objetivos del día, notas sobre descansos, peso objetivo..."
                      className="w-full text-xs sm:text-sm text-zinc-200 bg-zinc-900 border border-white/10 rounded-xl p-3 focus:bg-black focus:border-[#00FF87] focus:outline-none transition-all"
                    />
                  </div>
                ) : (
                  routine.notes && (
                    <p className="text-xs sm:text-sm text-[#A1A1AA] flex items-start gap-2 bg-zinc-900/60 p-3 rounded-xl border border-white/5 leading-relaxed">
                      <FileText className="w-4 h-4 text-[#00FF87] shrink-0 mt-0.5" />
                      <span>{routine.notes}</span>
                    </p>
                  )
                )}
              </div>
            </div>

            {/* Estimated Workout Duration Badge */}
            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center p-3 sm:p-4 rounded-xl bg-zinc-900 border border-white/10 shrink-0 w-full sm:w-auto shadow-inner">
              <span className="text-[10px] font-extrabold text-[#A1A1AA] uppercase tracking-wider">
                Tiempo Estimado
              </span>
              <div className="flex items-center gap-1.5 text-white font-black font-mono text-lg sm:text-xl">
                <Clock className="w-5 h-5 text-[#00FF87]" />
                <span>~{formatSecondsToTime(totalWorkoutSeconds)}</span>
              </div>
              <span className="text-[10px] text-zinc-500 hidden sm:block">
                (series + descansos)
              </span>
            </div>
          </div>

          {/* Progress bar and Live Stopwatch in Execution Mode */}
          {subMode === 'execute' && (
            <div className="mt-6 pt-5 border-t border-white/[0.08]">
              <div className="flex items-center justify-between text-xs font-semibold mb-2 flex-wrap gap-2">
                <span className="text-[#A1A1AA]">
                  Progreso: <strong className="text-white font-black">{completedSetsCount}</strong> de {totalSetsCount} series completadas
                </span>

                <div className="flex items-center gap-2 sm:gap-3">
                  {session?.startTime ? (
                    <div
                      id="workout-live-stopwatch"
                      className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-900 border border-[#00FF87]/30 text-[#00FF87] font-mono font-black text-xs shadow-inner"
                      title="Tiempo transcurrido desde el inicio de la rutina"
                    >
                      <span className="w-2 h-2 rounded-full bg-[#00FF87] animate-ping" />
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatWorkoutDuration(elapsedSeconds)}</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-zinc-500 italic">No iniciada</span>
                  )}
                  <span className="text-[#00FF87] font-black text-sm">{completionPercentage}%</span>
                </div>
              </div>

              {/* Glowing Progress Bar */}
              <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden border border-white/10 p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-[#00FF87] to-[#00E5FF] rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(0,255,135,0.5)]"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>

              {/* Workout Session Controls (Ergonomic Touch Targets >= 48px) */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-zinc-900/80 border border-white/[0.08]">
                {!session?.startTime ? (
                  <>
                    <div className="text-xs text-[#A1A1AA] flex items-center gap-2">
                      <Play className="w-4 h-4 text-[#00FF87] shrink-0" />
                      <span>Pulsa iniciar o marca cualquier serie para comenzar el entrenamiento.</span>
                    </div>
                    <button
                      id="btn-start-workout-session"
                      type="button"
                      onClick={() => onStartSession(routine.id)}
                      className="min-h-[48px] inline-flex items-center gap-2 px-6 text-sm font-extrabold rounded-2xl bg-[#00FF87] hover:bg-[#00e57a] text-black shadow-[0_0_20px_rgba(0,255,135,0.35)] transition-all active:scale-[0.97]"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Iniciar Rutina</span>
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#00FF87] animate-ping shrink-0 shadow-[0_0_8px_#00FF87]" />
                      <span className="font-extrabold text-white">Entrenamiento en Curso</span>
                      <span className="text-[#00FF87] font-mono font-bold">
                        ({formatWorkoutDuration(elapsedSeconds)})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        id="btn-reset-session"
                        type="button"
                        onClick={handleResetSession}
                        className="min-h-[44px] inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white px-3 py-2 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 border border-white/5 transition-colors active:scale-[0.97]"
                        title="Reiniciar progreso"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reiniciar</span>
                      </button>

                      <button
                        id="btn-finish-workout-session"
                        type="button"
                        onClick={() => setIsFinishConfirmOpen(true)}
                        className="min-h-[48px] inline-flex items-center gap-2 px-5 text-sm font-extrabold rounded-2xl bg-[#00E5FF] hover:bg-[#00cbe2] text-black shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all active:scale-[0.97]"
                      >
                        <Flag className="w-4 h-4 stroke-[2.5]" />
                        <span>Finalizar Rutina</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Exercises List Header & Buttons */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-1">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#A1A1AA] flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-[#00FF87]" />
              <span>Ejercicios ({routine.exercises.length})</span>
            </h2>

            {subMode === 'edit' && (
              <div className="flex items-center gap-2">
                {routine.exercises.length > 1 && (
                  <button
                    id="btn-show-reorder-exercises"
                    type="button"
                    onClick={() => setShowReorderModal(true)}
                    className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl border border-white/10 bg-[#1C1C1E] text-zinc-300 hover:text-white hover:border-[#00FF87]/40 transition-all active:scale-[0.97] flex items-center justify-center shadow-md"
                    title="Ordenar ejercicios"
                    aria-label="Ordenar ejercicios"
                  >
                    <ArrowUpDown className="w-4 h-4 text-[#00FF87]" />
                  </button>
                )}

                <button
                  id="btn-show-add-exercise"
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="min-h-[44px] inline-flex items-center gap-2 px-4 text-xs font-extrabold rounded-xl bg-[#00FF87] text-black hover:bg-[#00e57a] shadow-[0_0_15px_rgba(0,255,135,0.25)] transition-all active:scale-[0.97]"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Añadir Ejercicio</span>
                </button>
              </div>
            )}
          </div>

          {/* Exercise cards list */}
          {routine.exercises.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-2xl border-2 border-dashed border-white/10 bg-[#1C1C1E]">
              <Dumbbell className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <p className="text-sm font-bold text-white">Esta rutina no tiene ejercicios todavía.</p>
              <p className="text-xs text-[#A1A1AA] mt-1 mb-4">Añade ejercicios de tu biblioteca o crea uno nuevo.</p>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="min-h-[48px] inline-flex items-center gap-2 px-5 text-xs font-extrabold rounded-2xl bg-[#00FF87] text-black hover:bg-[#00e57a] transition-all shadow-[0_0_15px_rgba(0,255,135,0.3)] active:scale-[0.97]"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Añadir Primer Ejercicio</span>
              </button>
            </div>
          ) : (
            routine.exercises.map((exercise, index) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                exerciseIndex={index}
                totalExercises={routine.exercises.length}
                isExecutionMode={subMode === 'execute'}
                completedSetIds={completedSetIds}
                isCollapsed={collapsedExerciseIds.has(exercise.id)}
                rmLogs={rmLogs}
                exerciseDiary={exerciseDiary}
                onOpenDiary={onOpenDiary}
                onToggleCollapse={() => handleToggleCollapseExercise(exercise.id)}
                onToggleSetComplete={handleToggleSetComplete}
                onUpdateExercise={(updated) => handleUpdateExercise(index, updated)}
                onDeleteExercise={() => handleDeleteExercise(index)}
                onMoveToPosition={(targetIndex) => handleMoveExercise(index, targetIndex)}
                onCheckRmWeight={onCheckRmWeight}
              />
            ))
          )}
        </div>
      </div>

      {/* Add Exercise Modal */}
      <AddExerciseModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        catalog={catalog}
        rmLogs={rmLogs}
        exerciseDiary={exerciseDiary}
        onOpenDiary={onOpenDiary}
        onAddExercise={handleAddExerciseFromModal}
      />

      {/* Reorder Exercises Modal */}
      <ReorderExercisesModal
        isOpen={showReorderModal}
        onClose={() => setShowReorderModal(false)}
        exercises={routine.exercises}
        onSaveOrder={handleReorderAllExercises}
      />

      {/* Confirmation Modal before finishing workout */}
      <WorkoutFinishConfirmModal
        isOpen={isFinishConfirmOpen}
        routineName={routine.name}
        elapsedSeconds={elapsedSeconds}
        completedSetsCount={completedSetsCount}
        totalSetsCount={totalSetsCount}
        onConfirm={handleConfirmFinish}
        onCancel={() => setIsFinishConfirmOpen(false)}
      />
    </div>
  );
};
