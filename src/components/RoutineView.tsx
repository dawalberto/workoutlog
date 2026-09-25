import React, { useState, useEffect, useRef } from 'react';
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
  Flag
} from 'lucide-react';
import { 
  Exercise, 
  ExerciseDefinition, 
  Routine, 
  RoutineSubMode, 
  ActiveWorkoutSession,
  WorkoutCompletionSummary 
} from '../types';
import { 
  getRoutineTotalSeconds, 
  formatSecondsToTime, 
  formatWorkoutDuration 
} from '../utils/timeCalculations';
import { useWorkoutTimer } from '../hooks/useWorkoutTimer';
import { ExerciseCard } from './ExerciseCard';
import { RestTimerBar } from './RestTimerBar';
import { AddExerciseModal } from './AddExerciseModal';
import { ReorderExercisesModal } from './ReorderExercisesModal';
import { WorkoutFinishConfirmModal } from './WorkoutFinishConfirmModal';
import { initRestAudioContext } from '../utils/audioBeep';

interface RoutineViewProps {
  routine: Routine;
  catalog: ExerciseDefinition[];
  initialMode: RoutineSubMode;
  session?: ActiveWorkoutSession | null;
  onSaveRoutine: (updatedRoutine: Routine) => void;
  onSaveToCatalog: (def: ExerciseDefinition) => void;
  onBack: () => void;
  onStartSession: (routineId: string) => void;
  onToggleSetComplete: (routineId: string, setId: string) => void;
  onResetSession: (routineId: string) => void;
  onFinishSession: (summary: WorkoutCompletionSummary) => void;
  onCheckRmWeight?: (exerciseName: string, newWeight: number) => void;
}

export const RoutineView: React.FC<RoutineViewProps> = ({
  routine,
  catalog,
  initialMode,
  session,
  onSaveRoutine,
  onSaveToCatalog,
  onBack,
  onStartSession,
  onToggleSetComplete,
  onResetSession,
  onFinishSession,
  onCheckRmWeight,
}) => {
  const [subMode, setSubMode] = useState<RoutineSubMode>(initialMode);
  const [isFinishConfirmOpen, setIsFinishConfirmOpen] = useState(false);
  const [activeTimer, setActiveTimer] = useState<{
    initialSeconds: number;
    exerciseName?: string;
    setNumber?: number;
    key?: number;
  } | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showReorderModal, setShowReorderModal] = useState(false);

  // Collapse state: By default, all exercises collapsed except the first one (index > 0)
  const [collapsedExerciseIds, setCollapsedExerciseIds] = useState<Set<string>>(() => {
    const set = new Set<string>();
    routine.exercises.forEach((ex, idx) => {
      if (idx > 0) {
        set.add(ex.id);
      }
    });
    return set;
  });

  const prevRoutineIdRef = useRef(routine.id);
  useEffect(() => {
    if (prevRoutineIdRef.current !== routine.id) {
      prevRoutineIdRef.current = routine.id;
      const initialSet = new Set<string>();
      routine.exercises.forEach((ex, idx) => {
        if (idx > 0) {
          initialSet.add(ex.id);
        }
      });
      setCollapsedExerciseIds(initialSet);
    }
  }, [routine.id, routine.exercises]);

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

  // Infallible absolute live elapsed time (based on epoch ms Date.now() - session.startTime)
  const elapsedSeconds = useWorkoutTimer(session?.startTime);

  const totalWorkoutSeconds = getRoutineTotalSeconds(routine);

  // Overall workout completion calculation based on persistent session state
  const completedSetIds = new Set(session?.completedSetIds || []);
  const allSetsInRoutine = routine.exercises.flatMap((ex) => ex.sets);
  const totalSetsCount = allSetsInRoutine.length;
  const completedSetsCount = allSetsInRoutine.filter((s) => completedSetIds.has(s.id)).length;
  const completionPercentage = totalSetsCount > 0 ? Math.round((completedSetsCount / totalSetsCount) * 100) : 0;
  const allExercisesCompleted = totalSetsCount > 0 && completedSetsCount === totalSetsCount;

  // Toggle set completion (Execution Mode only)
  const handleToggleSetComplete = (setId: string, restSeconds: number, exerciseName: string, setNumber: number) => {
    const isNowCompleted = !completedSetIds.has(setId);

    // Rule: "Si el usuario no le da a iniciar manualmente se activará automáticamente en cuanto marque cualquier serie como completada."
    if (isNowCompleted && (!session || !session.startTime)) {
      onStartSession(routine.id);
    }

    onToggleSetComplete(routine.id, setId);

    if (isNowCompleted) {
      // Ensure ambient audio context is initialized on user gesture without interrupting music
      initRestAudioContext();

      // Start rest timer if rest seconds > 0
      if (restSeconds > 0) {
        setActiveTimer({
          initialSeconds: restSeconds,
          exerciseName,
          setNumber,
          key: Date.now(),
        });
      }

      // Check if this completion finishes all sets of the exercise:
      const exIndex = routine.exercises.findIndex((ex) => ex.sets.some((s) => s.id === setId));
      if (exIndex !== -1) {
        const targetEx = routine.exercises[exIndex];
        const willBeAllCompleted = targetEx.sets.every((s) => s.id === setId || completedSetIds.has(s.id));
        if (willBeAllCompleted) {
          // Collapse current exercise and uncollapse the next exercise
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
      setActiveTimer(null);
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
      })),
    };

    setActiveTimer(null);
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
    <div id="routine-view-container" className="min-h-screen bg-zinc-50 pb-28">
      {/* Top sticky bar - Always visible while scrolling */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-zinc-200/90 shadow-2xs pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              id="btn-back-to-routines"
              type="button"
              onClick={onBack}
              className="shrink-0 inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 text-xs font-semibold rounded-lg text-zinc-700 hover:bg-zinc-100 transition-colors active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" /> <span>Rutinas</span>
            </button>

            {/* In-header live workout timer indicator when scrolled down in training mode */}
            {subMode === 'execute' && session?.startTime && (
              <div 
                className="hidden xs:flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-800 font-mono font-bold text-xs shrink-0 shadow-2xs"
                title="Tiempo de entrenamiento transcurrido"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <Clock className="w-3 h-3 text-emerald-600" />
                <span>{formatWorkoutDuration(elapsedSeconds)}</span>
              </div>
            )}
          </div>

          {/* Mode Switcher Tabs - Always visible at hand */}
          <div className="shrink-0 flex items-center p-1 bg-zinc-100 rounded-xl border border-zinc-200/80 shadow-2xs">
            <button
              id="tab-mode-edit"
              type="button"
              onClick={() => setSubMode('edit')}
              className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 active:scale-95 ${
                subMode === 'edit'
                  ? 'bg-white text-zinc-950 shadow-xs ring-1 ring-black/5'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" /> <span>Editar</span>
            </button>

            <button
              id="tab-mode-execute"
              type="button"
              onClick={() => setSubMode('execute')}
              className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 active:scale-95 ${
                subMode === 'execute'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" /> <span>Entrenar</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6">
        {/* Routine Meta Card */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 sm:p-6 shadow-xs mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              {subMode === 'edit' ? (
                <div>
                  <label htmlFor="routine-name-input" className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1">
                    Nombre de la Rutina
                  </label>
                  <input
                    id="routine-name-input"
                    type="text"
                    value={routine.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Ej: Torso Hipertrofia, Pierna Fuerza..."
                    className="w-full text-xl sm:text-2xl font-black text-zinc-900 bg-transparent border-b border-zinc-300 focus:border-emerald-600 focus:outline-none pb-1 transition-colors"
                  />
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                      Modo Entrenamiento
                    </span>
                    {allExercisesCompleted && (
                      <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-emerald-600 text-white">
                        ¡Entrenamiento Completo!
                      </span>
                    )}
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight mt-1">
                    {routine.name || 'Rutina sin nombre'}
                  </h1>
                </div>
              )}

              {/* Routine Notes */}
              <div className="mt-3">
                {subMode === 'edit' ? (
                  <div>
                    <label htmlFor="routine-notes-input" className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1">
                      Notas / Descripción
                    </label>
                    <textarea
                      id="routine-notes-input"
                      rows={2}
                      value={routine.notes || ''}
                      onChange={(e) => handleNotesChange(e.target.value)}
                      placeholder="Objetivos del día, notas sobre descansos, peso objetivo..."
                      className="w-full text-sm text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 focus:bg-white focus:border-emerald-500 focus:outline-none transition-colors"
                    />
                  </div>
                ) : (
                  routine.notes && (
                    <p className="text-xs sm:text-sm text-zinc-600 flex items-start gap-1.5 bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                      <FileText className="w-4 h-4 text-zinc-600 shrink-0 mt-0.5" />
                      <span>{routine.notes}</span>
                    </p>
                  )
                )}
              </div>
            </div>

            {/* Calculated Total Workout Duration Badge */}
            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center p-2.5 sm:p-3 rounded-xl bg-zinc-100 border border-zinc-200/80 shrink-0 w-full sm:w-auto">
              <span className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wide">
                Tiempo Estimado Total
              </span>
              <div className="flex items-center gap-1.5 text-zinc-900 font-extrabold text-lg sm:text-xl">
                <Clock className="w-5 h-5 text-emerald-600" />
                <span>~{formatSecondsToTime(totalWorkoutSeconds)}</span>
              </div>
              <span className="text-[10px] text-zinc-600 hidden sm:block">
                (series + descansos + transiciones)
              </span>
            </div>
          </div>

          {/* Progress bar and Live Elapsed Stopwatch in Execution Mode */}
          {subMode === 'execute' && (
            <div className="mt-5 pt-4 border-t border-zinc-100">
              <div className="flex items-center justify-between text-xs font-semibold mb-1.5 flex-wrap gap-2">
                <span className="text-zinc-600">
                  Progreso: <strong className="text-zinc-900">{completedSetsCount}</strong> de {totalSetsCount} series completadas
                </span>

                <div className="flex items-center gap-2 sm:gap-3">
                  {session?.startTime ? (
                    <div
                      id="workout-live-stopwatch"
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 font-mono font-bold text-xs shadow-2xs"
                      title="Tiempo transcurrido desde el inicio de la rutina"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{formatWorkoutDuration(elapsedSeconds)}</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-zinc-500 italic">No iniciada</span>
                  )}
                  <span className="text-emerald-600 font-bold">{completionPercentage}%</span>
                </div>
              </div>

              <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200/60">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>

              {/* Workout Session Controls: Start / Finish / Reset */}
              <div className={`mt-3.5 flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl border transition-colors ${
                session?.startTime
                  ? 'bg-emerald-50/40 border-emerald-200/80'
                  : 'bg-zinc-50 border-zinc-200/80'
              }`}>
                {!session?.startTime ? (
                  <>
                    <div className="text-xs text-zinc-600 flex items-center gap-1.5">
                      <Play className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Pulsa iniciar o marca cualquier serie para comenzar automáticamente.</span>
                    </div>
                    <button
                      id="btn-start-workout-session"
                      type="button"
                      onClick={() => onStartSession(routine.id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> Iniciar rutina
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                      <span className="font-bold text-zinc-900">Entrenamiento en curso</span>
                      <span className="text-emerald-700 font-mono font-bold">
                        ({formatWorkoutDuration(elapsedSeconds)})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        id="btn-reset-session"
                        type="button"
                        onClick={handleResetSession}
                        className="inline-flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-800 px-2.5 py-1.5 rounded-lg hover:bg-zinc-200/60 transition-colors"
                        title="Reiniciar progreso"
                      >
                        <RotateCcw className="w-3 h-3" /> Reiniciar
                      </button>

                      <button
                        id="btn-finish-workout-session"
                        type="button"
                        onClick={() => setIsFinishConfirmOpen(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white shadow-xs transition-all active:scale-95"
                      >
                        <Flag className="w-3.5 h-3.5 text-emerald-400" /> Finalizar rutina
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Exercises List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-600 flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-emerald-600" />
              Ejercicios ({routine.exercises.length})
            </h2>

            {subMode === 'edit' && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                {routine.exercises.length > 1 && (
                  <button
                    id="btn-show-reorder-exercises"
                    type="button"
                    onClick={() => setShowReorderModal(true)}
                    className="p-1.5 sm:p-2 rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition-colors active:scale-95 shadow-2xs"
                    title="Ordenar ejercicios"
                    aria-label="Ordenar ejercicios"
                  >
                    <ArrowUpDown className="w-4 h-4 text-emerald-600" />
                  </button>
                )}

                <button
                  id="btn-show-add-exercise"
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 transition-colors active:scale-95 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Ejercicio
                </button>
              </div>
            )}
          </div>

          {/* Exercise cards list */}
          {routine.exercises.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-zinc-200 bg-white">
              <Dumbbell className="w-10 h-10 text-zinc-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-zinc-600">Esta rutina no tiene ejercicios todavía.</p>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              >
                <Plus className="w-4 h-4" /> Añadir primer ejercicio
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

      {/* Floating Rest Timer Bar when active */}
      {activeTimer && (
        <RestTimerBar
          key={activeTimer.key || `${activeTimer.exerciseName}-${activeTimer.setNumber}`}
          initialSeconds={activeTimer.initialSeconds}
          exerciseName={activeTimer.exerciseName}
          setNumber={activeTimer.setNumber}
          onClose={() => setActiveTimer(null)}
        />
      )}
    </div>
  );
};
