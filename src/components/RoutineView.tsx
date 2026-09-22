import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Play, 
  Edit3, 
  Plus, 
  Clock, 
  RotateCcw, 
  Sparkles, 
  CheckCircle2, 
  Dumbbell,
  FileText,
  BookOpen,
  ArrowUpDown
} from 'lucide-react';
import { Exercise, ExerciseDefinition, Routine, RoutineSubMode, WorkoutSet } from '../types';
import { getRoutineTotalSeconds, formatSecondsToTime } from '../utils/timeCalculations';
import { ExerciseCard } from './ExerciseCard';
import { RestTimerBar } from './RestTimerBar';
import { AddExerciseModal } from './AddExerciseModal';
import { ReorderExercisesModal } from './ReorderExercisesModal';

interface RoutineViewProps {
  routine: Routine;
  catalog: ExerciseDefinition[];
  initialMode: RoutineSubMode;
  onSaveRoutine: (updatedRoutine: Routine) => void;
  onSaveToCatalog: (def: ExerciseDefinition) => void;
  onBack: () => void;
}

export const RoutineView: React.FC<RoutineViewProps> = ({
  routine,
  catalog,
  initialMode,
  onSaveRoutine,
  onSaveToCatalog,
  onBack,
}) => {
  const [subMode, setSubMode] = useState<RoutineSubMode>(initialMode);
  const [completedSetIds, setCompletedSetIds] = useState<Set<string>>(new Set());
  const [activeTimer, setActiveTimer] = useState<{
    initialSeconds: number;
    exerciseName?: string;
    setNumber?: number;
  } | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showReorderModal, setShowReorderModal] = useState(false);

  const totalWorkoutSeconds = getRoutineTotalSeconds(routine);

  // Overall workout completion calculation
  const allSetsInRoutine = routine.exercises.flatMap((ex) => ex.sets);
  const totalSetsCount = allSetsInRoutine.length;
  const completedSetsCount = allSetsInRoutine.filter((s) => completedSetIds.has(s.id)).length;
  const completionPercentage = totalSetsCount > 0 ? Math.round((completedSetsCount / totalSetsCount) * 100) : 0;
  const allExercisesCompleted = totalSetsCount > 0 && completedSetsCount === totalSetsCount;

  // Toggle set completion (Execution Mode only)
  const handleToggleSetComplete = (setId: string, restSeconds: number, exerciseName: string, setNumber: number) => {
    setCompletedSetIds((prev) => {
      const next = new Set(prev);
      const isNowCompleted = !next.has(setId);
      if (isNowCompleted) {
        next.add(setId);
        // Start rest timer if rest seconds > 0
        if (restSeconds > 0) {
          setActiveTimer({
            initialSeconds: restSeconds,
            exerciseName,
            setNumber,
          });
        }
      } else {
        next.delete(setId);
      }
      return next;
    });
  };

  const handleResetSession = () => {
    if (window.confirm('¿Reiniciar el progreso de la sesión actual?')) {
      setCompletedSetIds(new Set());
      setActiveTimer(null);
    }
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
      {/* Top sticky bar */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-zinc-200 shadow-2xs">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-3">
          <button
            id="btn-back-to-routines"
            type="button"
            onClick={onBack}
            className="shrink-0 inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg text-zinc-700 hover:bg-zinc-100 transition-colors active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" /> <span>Rutinas</span>
          </button>

          {/* Mode Switcher Tabs */}
          <div className="shrink-0 flex items-center p-1 bg-zinc-100 rounded-xl border border-zinc-200/80">
            <button
              id="tab-mode-edit"
              type="button"
              onClick={() => setSubMode('edit')}
              className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 ${
                subMode === 'edit'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" /> Editar
            </button>

            <button
              id="tab-mode-execute"
              type="button"
              onClick={() => setSubMode('execute')}
              className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 ${
                subMode === 'execute'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Entrenar
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

          {/* Progress bar in Execution Mode */}
          {subMode === 'execute' && (
            <div className="mt-5 pt-4 border-t border-zinc-100">
              <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                <span className="text-zinc-600">
                  Progreso: <strong className="text-zinc-900">{completedSetsCount}</strong> de {totalSetsCount} series completadas
                </span>
                <span className="text-emerald-600 font-bold">{completionPercentage}%</span>
              </div>

              <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200/60">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>

              {completedSetsCount > 0 && (
                <div className="mt-2.5 flex justify-end">
                  <button
                    id="btn-reset-session"
                    type="button"
                    onClick={handleResetSession}
                    className="inline-flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-800 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" /> Reiniciar progreso de hoy
                  </button>
                </div>
              )}
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
                onToggleSetComplete={handleToggleSetComplete}
                onUpdateExercise={(updated) => handleUpdateExercise(index, updated)}
                onDeleteExercise={() => handleDeleteExercise(index)}
                onMoveToPosition={(targetIndex) => handleMoveExercise(index, targetIndex)}
              />
            ))
          )}
        </div>
      </div>

      {/* Add Exercise Modal (From Library or Custom on-the-fly) */}
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

      {/* Floating Rest Timer Bar when active */}
      {activeTimer && (
        <RestTimerBar
          initialSeconds={activeTimer.initialSeconds}
          exerciseName={activeTimer.exerciseName}
          setNumber={activeTimer.setNumber}
          onClose={() => setActiveTimer(null)}
        />
      )}
    </div>
  );
};
