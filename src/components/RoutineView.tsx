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
  FileText
} from 'lucide-react';
import { Exercise, Routine, RoutineSubMode, WorkoutSet } from '../types';
import { getRoutineTotalSeconds, formatSecondsToTime } from '../utils/timeCalculations';
import { ExerciseCard } from './ExerciseCard';
import { RestTimerBar } from './RestTimerBar';

interface RoutineViewProps {
  routine: Routine;
  initialMode: RoutineSubMode;
  onSaveRoutine: (updatedRoutine: Routine) => void;
  onBack: () => void;
}

const COMMON_EXERCISE_SUGGESTIONS = [
  'Press de Banca Plano con Barra',
  'Sentadilla Trasera con Barra',
  'Peso Muerto Convencional',
  'Remo con Barra',
  'Press Militar Mancuernas',
  'Jalón al Pecho',
  'Fondos en Paralelas',
  'Dominadas',
  'Prensa Inclinada 45°',
  'Elevaciones Laterales',
  'Curl de Bíceps con Barra',
  'Extensiones de Tríceps en Polea',
];

export const RoutineView: React.FC<RoutineViewProps> = ({
  routine,
  initialMode,
  onSaveRoutine,
  onBack,
}) => {
  const [subMode, setSubMode] = useState<RoutineSubMode>(initialMode);
  const [completedSetIds, setCompletedSetIds] = useState<Set<string>>(new Set());
  const [activeTimer, setActiveTimer] = useState<{
    initialSeconds: number;
    exerciseName?: string;
    setNumber?: number;
  } | null>(null);

  const [newExerciseName, setNewExerciseName] = useState('');
  const [showAddExerciseForm, setShowAddExerciseForm] = useState(false);

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
    if (toIndex < 0 || toIndex >= routine.exercises.length) return;
    const updatedExercises = [...routine.exercises];
    const [moved] = updatedExercises.splice(fromIndex, 1);
    updatedExercises.splice(toIndex, 0, moved);
    onSaveRoutine({
      ...routine,
      exercises: updatedExercises,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleCreateExercise = (nameToUse?: string) => {
    const name = (nameToUse || newExerciseName).trim();
    if (!name) return;

    const newExercise: Exercise = {
      id: 'ex-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      name,
      notes: '',
      videoUrl: '',
      sets: [
        { id: 'set-' + Date.now() + '-1', setNumber: 1, reps: 10, weight: 40, restSeconds: 90 },
        { id: 'set-' + Date.now() + '-2', setNumber: 2, reps: 10, weight: 40, restSeconds: 90 },
        { id: 'set-' + Date.now() + '-3', setNumber: 3, reps: 8, weight: 45, restSeconds: 90 },
      ],
    };

    onSaveRoutine({
      ...routine,
      exercises: [...routine.exercises, newExercise],
      updatedAt: new Date().toISOString(),
    });

    setNewExerciseName('');
    setShowAddExerciseForm(false);
  };

  return (
    <div id="routine-view-container" className="min-h-screen bg-zinc-50 pb-28">
      {/* Top sticky bar */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-zinc-200 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <button
            id="btn-back-to-routines"
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-zinc-700 hover:bg-zinc-100 transition-colors active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" /> Rutinas
          </button>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center p-1 bg-zinc-100 rounded-xl border border-zinc-200/80">
            <button
              id="tab-mode-edit"
              type="button"
              onClick={() => setSubMode('edit')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
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
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">
        {/* Routine Meta Card */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 sm:p-6 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
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
            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center p-3 rounded-xl bg-zinc-100 border border-zinc-200/80 shrink-0">
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
              <button
                id="btn-show-add-exercise"
                type="button"
                onClick={() => setShowAddExerciseForm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 transition-colors active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" /> Añadir Ejercicio
              </button>
            )}
          </div>

          {/* Add Exercise Modal/Inline Form */}
          {subMode === 'edit' && showAddExerciseForm && (
            <div className="p-4 sm:p-5 rounded-2xl border-2 border-emerald-500 bg-white shadow-md">
              <h3 className="text-sm font-bold text-zinc-900 mb-2">Nuevo Ejercicio</h3>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newExerciseName}
                  onChange={(e) => setNewExerciseName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateExercise();
                  }}
                  placeholder="Escribe el nombre del ejercicio..."
                  autoFocus
                  className="flex-1 px-3.5 py-2 rounded-xl border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCreateExercise()}
                    disabled={!newExerciseName.trim()}
                    className="flex-1 sm:flex-initial px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    Crear
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddExerciseForm(false)}
                    className="px-3 py-2 text-xs font-semibold rounded-xl text-zinc-600 hover:bg-zinc-100 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>

              {/* Suggestions */}
              <div className="mt-3 pt-3 border-t border-zinc-100">
                <span className="text-[11px] font-semibold text-zinc-600 block mb-1.5">Sugerencias rápidas:</span>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_EXERCISE_SUGGESTIONS.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => handleCreateExercise(sug)}
                      className="px-2.5 py-1 text-xs rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors text-left"
                    >
                      + {sug}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Exercise cards list */}
          {routine.exercises.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-zinc-200 bg-white">
              <Dumbbell className="w-10 h-10 text-zinc-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-zinc-600">Esta rutina no tiene ejercicios todavía.</p>
              <button
                type="button"
                onClick={() => setShowAddExerciseForm(true)}
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
                isExecutionMode={subMode === 'execute'}
                completedSetIds={completedSetIds}
                onToggleSetComplete={handleToggleSetComplete}
                onUpdateExercise={(updated) => handleUpdateExercise(index, updated)}
                onDeleteExercise={() => handleDeleteExercise(index)}
                onMoveUp={index > 0 ? () => handleMoveExercise(index, index - 1) : undefined}
                onMoveDown={index < routine.exercises.length - 1 ? () => handleMoveExercise(index, index + 1) : undefined}
              />
            ))
          )}
        </div>
      </div>

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
