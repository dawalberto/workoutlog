import React, { useState } from 'react';
import { 
  Check, 
  Trash2, 
  Copy, 
  Plus, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Dumbbell, 
  Video,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import { Exercise, WorkoutSet } from '../types';
import { getExerciseTotalSeconds, getSetTotalSeconds, formatSecondsToTime } from '../utils/timeCalculations';
import { VideoPreview } from './VideoPreview';

interface ExerciseCardProps {
  exercise: Exercise;
  exerciseIndex: number;
  totalExercises?: number;
  isExecutionMode: boolean;
  completedSetIds: Set<string>;
  onToggleSetComplete: (setId: string, restSeconds: number, exerciseName: string, setNumber: number) => void;
  onUpdateExercise: (updated: Exercise) => void;
  onDeleteExercise: () => void;
  onMoveToPosition?: (targetIndex: number) => void;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  exercise,
  exerciseIndex,
  totalExercises = 1,
  isExecutionMode,
  completedSetIds,
  onToggleSetComplete,
  onUpdateExercise,
  onDeleteExercise,
  onMoveToPosition,
}) => {
  const [showVideoInput, setShowVideoInput] = useState(false);
  const [showImageInput, setShowImageInput] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Check if all sets of this exercise are completed in the current session
  const totalSetsCount = exercise.sets.length;
  const completedSetsCount = exercise.sets.filter((s) => completedSetIds.has(s.id)).length;
  const isAllCompleted = totalSetsCount > 0 && completedSetsCount === totalSetsCount;

  const totalExerciseSeconds = getExerciseTotalSeconds(exercise);

  // Handlers for Sets CRUD
  const handleUpdateSet = (setId: string, field: keyof WorkoutSet, value: number) => {
    const updatedSets = exercise.sets.map((s) => {
      if (s.id === setId) {
        return { ...s, [field]: value };
      }
      return s;
    });
    onUpdateExercise({ ...exercise, sets: updatedSets });
  };

  const handleDuplicateSet = (indexToDuplicate: number) => {
    const setToDuplicate = exercise.sets[indexToDuplicate];
    const newSet: WorkoutSet = {
      id: 'set-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      setNumber: exercise.sets.length + 1,
      reps: setToDuplicate.reps,
      weight: setToDuplicate.weight,
      restSeconds: setToDuplicate.restSeconds,
    };

    const newSets = [
      ...exercise.sets.slice(0, indexToDuplicate + 1),
      newSet,
      ...exercise.sets.slice(indexToDuplicate + 1),
    ].map((s, idx) => ({ ...s, setNumber: idx + 1 }));

    onUpdateExercise({ ...exercise, sets: newSets });
  };

  const handleAddSet = () => {
    const lastSet = exercise.sets[exercise.sets.length - 1];
    const newSet: WorkoutSet = {
      id: 'set-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      setNumber: exercise.sets.length + 1,
      reps: lastSet ? lastSet.reps : 10,
      weight: lastSet ? lastSet.weight : 20,
      restSeconds: lastSet ? lastSet.restSeconds : 90,
    };

    const newSets = [...exercise.sets, newSet].map((s, idx) => ({ ...s, setNumber: idx + 1 }));
    onUpdateExercise({ ...exercise, sets: newSets });
  };

  const handleDeleteSet = (setId: string) => {
    if (exercise.sets.length <= 1) {
      // Keep at least one set
      return;
    }
    const filtered = exercise.sets.filter((s) => s.id !== setId);
    const renumbered = filtered.map((s, idx) => ({ ...s, setNumber: idx + 1 }));
    onUpdateExercise({ ...exercise, sets: renumbered });
  };

  return (
    <div
      id={`exercise-card-${exercise.id}`}
      className={`rounded-2xl border transition-all duration-200 shadow-sm overflow-hidden ${
        isAllCompleted
          ? 'bg-emerald-50/50 border-emerald-400/80 shadow-emerald-500/10'
          : 'bg-white border-zinc-200 hover:border-zinc-300'
      }`}
    >
      {/* Exercise Header */}
      <div className={`p-3.5 sm:p-5 border-b transition-colors ${
        isAllCompleted
          ? 'bg-emerald-100/40 border-emerald-200'
          : 'bg-zinc-50/80 border-zinc-100'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          {/* Main Title & Notes Section */}
          <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
            {/* Position Select in Edit Mode / Static Badge in Execution */}
            {!isExecutionMode && totalExercises > 1 ? (
              <div className="relative group shrink-0 mt-0.5">
                <select
                  id={`select-exercise-position-${exercise.id}`}
                  aria-label={`Cambiar posición de ${exercise.name || 'ejercicio'}`}
                  value={exerciseIndex}
                  onChange={(e) => onMoveToPosition && onMoveToPosition(Number(e.target.value))}
                  className="cursor-pointer appearance-none w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center text-center bg-zinc-900 text-white hover:bg-emerald-600 border border-transparent focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-colors"
                  title={`Posición actual: ${exerciseIndex + 1} de ${totalExercises}. Clic para cambiar de lugar rápidamente.`}
                >
                  {Array.from({ length: totalExercises }, (_, idx) => (
                    <option key={idx} value={idx} className="bg-white text-zinc-900 font-semibold py-1">
                      #{idx + 1}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <span
                className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                  isAllCompleted
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-900 text-white'
                }`}
              >
                {exerciseIndex + 1}
              </span>
            )}

            {/* Visual Cover Thumbnail */}
            <div className="w-12 h-12 rounded-xl border border-zinc-200 bg-zinc-100 overflow-hidden shrink-0 flex items-center justify-center relative shadow-xs">
              {exercise.imageUrl ? (
                <img
                  src={exercise.imageUrl}
                  alt={exercise.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <Dumbbell className="w-5 h-5 text-zinc-400" />
              )}
              {exercise.videoUrl && (
                <span className="absolute bottom-0.5 right-0.5 p-0.5 rounded bg-black/75 text-white">
                  <Video className="w-2.5 h-2.5" />
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              {isExecutionMode ? (
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={`text-base sm:text-lg font-bold tracking-tight ${
                      isAllCompleted ? 'text-emerald-950 line-through opacity-85' : 'text-zinc-900'
                    }`}>
                      {exercise.name || 'Ejercicio sin nombre'}
                    </h3>

                    {isAllCompleted && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Completado ({completedSetsCount}/{totalSetsCount})
                      </span>
                    )}
                  </div>
                  {exercise.notes && (
                    <p className="text-xs sm:text-sm text-zinc-600 mt-1 flex items-start gap-1">
                      <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5 text-zinc-600" />
                      <span>{exercise.notes}</span>
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  <input
                    type="text"
                    value={exercise.name}
                    onChange={(e) => onUpdateExercise({ ...exercise, name: e.target.value })}
                    placeholder="Nombre del ejercicio (ej. Press banca, Sentadilla...)"
                    className="w-full text-base sm:text-lg font-bold text-zinc-900 bg-transparent border-b border-zinc-200/80 hover:border-zinc-300 focus:border-emerald-600 focus:bg-white/60 focus:outline-none px-1 py-0.5 rounded transition-colors"
                  />
                  <input
                    type="text"
                    value={exercise.notes || ''}
                    onChange={(e) => onUpdateExercise({ ...exercise, notes: e.target.value })}
                    placeholder="Notas de técnica o consejos (opcional)"
                    className="w-full text-xs sm:text-sm text-zinc-600 placeholder:text-zinc-600 bg-transparent border-b border-zinc-200/60 hover:border-zinc-300 focus:border-zinc-400 focus:bg-white/60 focus:outline-none px-1 py-0.5 rounded transition-colors"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Action Toolbar - Separate row on mobile, right-aligned on desktop */}
          <div className="flex items-center justify-between sm:justify-end gap-1.5 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-200/60 shrink-0">
            {/* Estimated Exercise Duration Badge */}
            <div
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                isAllCompleted
                  ? 'bg-emerald-200/70 text-emerald-900'
                  : 'bg-zinc-200/60 text-zinc-700'
              }`}
              title="Tiempo aproximado calculado para este ejercicio (series activas + descansos)"
            >
              <Clock className="w-3 h-3 text-zinc-600" />
              <span>~{formatSecondsToTime(totalExerciseSeconds)}</span>
            </div>

            <div className="flex items-center gap-1">
              {!isExecutionMode && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowImageInput(!showImageInput)}
                    title="Configurar imagen miniatura / preview"
                    className={`p-1.5 rounded-lg border text-xs transition-colors ${
                      exercise.imageUrl
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowVideoInput(!showVideoInput)}
                    title="Configurar enlace de video"
                    className={`p-1.5 rounded-lg border text-xs transition-colors ${
                      exercise.videoUrl
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                    }`}
                  >
                    <Video className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={onDeleteExercise}
                    title="Eliminar ejercicio"
                    className="p-1.5 rounded-lg border border-red-200 bg-white text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}

              {isExecutionMode && (
                <button
                  type="button"
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-200/60 transition-colors"
                  title={isCollapsed ? 'Desplegar ejercicio' : 'Plegar ejercicio'}
                >
                  {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Image input field in Edit mode */}
        {!isExecutionMode && showImageInput && (
          <div className="mt-3 pt-3 border-t border-zinc-200 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg border border-zinc-200 bg-zinc-100 shrink-0 overflow-hidden flex items-center justify-center">
              {exercise.imageUrl ? (
                <img
                  src={exercise.imageUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <ImageIcon className="w-4 h-4 text-zinc-400" />
              )}
            </div>
            <input
              type="url"
              value={exercise.imageUrl || ''}
              onChange={(e) => onUpdateExercise({ ...exercise, imageUrl: e.target.value })}
              placeholder="URL de imagen preview / cover (ej: https://...)..."
              className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-zinc-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            {exercise.imageUrl && (
              <button
                type="button"
                onClick={() => onUpdateExercise({ ...exercise, imageUrl: '' })}
                className="text-xs text-zinc-400 hover:text-red-500 px-1"
                title="Quitar imagen"
              >
                Quitar
              </button>
            )}
          </div>
        )}

        {/* Video input field in Edit mode */}
        {!isExecutionMode && showVideoInput && (
          <div className="mt-3 pt-3 border-t border-zinc-200 flex items-center gap-2">
            <Video className="w-4 h-4 text-zinc-500 shrink-0" />
            <input
              type="url"
              value={exercise.videoUrl || ''}
              onChange={(e) => onUpdateExercise({ ...exercise, videoUrl: e.target.value })}
              placeholder="Enlace de video (YouTube, Vimeo o enlace directo mp4)..."
              className="w-full text-xs px-3 py-1.5 rounded-lg border border-zinc-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        )}

        {/* Video Player / Toggle */}
        <VideoPreview url={exercise.videoUrl} exerciseName={exercise.name || 'ejercicio'} />
      </div>

      {/* Sets Section */}
      {!isCollapsed && (
        <div className="p-3 sm:p-5">
          <div className="overflow-x-auto -mx-1 px-1 scrollbar-none">
            <table className="w-full text-left border-collapse min-w-[310px] sm:min-w-full">
              <thead>
                <tr className="border-b border-zinc-200 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  <th className="py-2.5 px-1 sm:px-2 text-center w-10 sm:w-12">Serie</th>
                  <th className="py-2.5 px-1 sm:px-2 text-center min-w-[65px] sm:min-w-[80px]">Reps</th>
                  <th className="py-2.5 px-1 sm:px-2 text-center min-w-[65px] sm:min-w-[80px]">Peso</th>
                  <th className="py-2.5 px-1 sm:px-2 text-center min-w-[75px] sm:min-w-[90px]">Descanso</th>
                  <th className="py-2.5 px-1 sm:px-2 text-center hidden md:table-cell">Tiempo</th>
                  {isExecutionMode ? (
                    <th className="py-2.5 px-1 sm:px-2 text-center w-14 sm:w-16">Estado</th>
                  ) : (
                    <th className="py-2.5 px-1 sm:px-2 text-right w-18 sm:w-24">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {exercise.sets.map((set, setIndex) => {
                  const isCompleted = completedSetIds.has(set.id);
                  const setSeconds = getSetTotalSeconds(set);

                  return (
                    <tr
                      key={set.id}
                      className={`transition-colors ${
                        isCompleted
                          ? 'bg-emerald-100/30 font-medium'
                          : 'hover:bg-zinc-50/70'
                      }`}
                    >
                      {/* Set Index */}
                      <td className="py-2.5 px-1 sm:px-2 text-center">
                        <span
                          className={`inline-block w-6 h-6 leading-6 text-xs font-bold rounded-full ${
                            isCompleted
                              ? 'bg-emerald-600 text-white'
                              : 'bg-zinc-100 text-zinc-700'
                          }`}
                        >
                          {set.setNumber}
                        </span>
                      </td>

                      {/* Reps */}
                      <td className="py-2.5 px-1 sm:px-2 text-center">
                        {isExecutionMode ? (
                          <span className={`text-xs sm:text-sm font-semibold ${isCompleted ? 'text-zinc-500' : 'text-zinc-900'}`}>
                            {set.reps} <span className="text-[10px] sm:text-xs font-normal text-zinc-500">reps</span>
                          </span>
                        ) : (
                          <div className="flex items-center justify-center">
                            <input
                              type="number"
                              min="1"
                              max="999"
                              value={set.reps}
                              onChange={(e) => handleUpdateSet(set.id, 'reps', Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-14 sm:w-16 text-center text-xs sm:text-sm font-semibold py-1 px-1 rounded-lg border border-zinc-200 bg-zinc-50 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                            />
                          </div>
                        )}
                      </td>

                      {/* Weight */}
                      <td className="py-2.5 px-1 sm:px-2 text-center">
                        {isExecutionMode ? (
                          <span className={`text-xs sm:text-sm font-semibold ${isCompleted ? 'text-zinc-500' : 'text-zinc-900'}`}>
                            {set.weight} <span className="text-[10px] sm:text-xs font-normal text-zinc-500">kg</span>
                          </span>
                        ) : (
                          <div className="flex items-center justify-center">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max="999"
                              value={set.weight}
                              onChange={(e) => handleUpdateSet(set.id, 'weight', Math.max(0, parseFloat(e.target.value) || 0))}
                              className="w-14 sm:w-16 text-center text-xs sm:text-sm font-semibold py-1 px-1 rounded-lg border border-zinc-200 bg-zinc-50 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                            />
                          </div>
                        )}
                      </td>

                      {/* Rest */}
                      <td className="py-2.5 px-1 sm:px-2 text-center">
                        {isExecutionMode ? (
                          <span className={`text-[11px] sm:text-xs font-medium px-2 py-0.5 rounded-md ${
                            isCompleted ? 'text-zinc-400 bg-zinc-100' : 'text-zinc-700 bg-zinc-100'
                          }`}>
                            {set.restSeconds}s
                          </span>
                        ) : (
                          <div className="flex items-center justify-center">
                            <input
                              type="number"
                              step="5"
                              min="0"
                              max="600"
                              value={set.restSeconds}
                              onChange={(e) => handleUpdateSet(set.id, 'restSeconds', Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-13 sm:w-16 text-center text-xs sm:text-sm font-semibold py-1 px-1 rounded-lg border border-zinc-200 bg-zinc-50 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                            />
                            <span className="text-[11px] text-zinc-400 ml-0.5">s</span>
                          </div>
                        )}
                      </td>

                      {/* Estimated Set Time */}
                      <td className="py-2.5 px-1 sm:px-2 text-center hidden md:table-cell text-xs text-zinc-600">
                        ~{formatSecondsToTime(setSeconds)}
                      </td>

                      {/* Actions or Checkbox */}
                      <td className="py-2.5 px-1 sm:px-2 text-right">
                        {isExecutionMode ? (
                          <div className="flex justify-center">
                            <button
                              id={`btn-toggle-set-${set.id}`}
                              type="button"
                              onClick={() => onToggleSetComplete(set.id, set.restSeconds, exercise.name, set.setNumber)}
                              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-90 ${
                                isCompleted
                                  ? 'bg-emerald-500 text-white shadow-xs'
                                  : 'bg-zinc-100 border-2 border-zinc-300 text-transparent hover:border-emerald-500 hover:text-emerald-500/40'
                              }`}
                              title={isCompleted ? 'Desmarcar serie' : 'Marcar completada e iniciar descanso'}
                            >
                              <Check className={`w-4 h-4 stroke-[3] ${isCompleted ? 'text-white' : 'currentColor'}`} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            {/* Duplicate set row button */}
                            <button
                              id={`btn-duplicate-set-${set.id}`}
                              type="button"
                              onClick={() => handleDuplicateSet(setIndex)}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                              title="Duplicar serie (mismos valores)"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete set row button */}
                            <button
                              id={`btn-delete-set-${set.id}`}
                              type="button"
                              onClick={() => handleDeleteSet(set.id)}
                              disabled={exercise.sets.length <= 1}
                              className={`p-1.5 rounded-lg transition-colors ${
                                exercise.sets.length <= 1
                                  ? 'text-zinc-300 cursor-not-allowed'
                                  : 'text-zinc-400 hover:text-red-600 hover:bg-red-50'
                              }`}
                              title={exercise.sets.length <= 1 ? 'Mínimo 1 serie' : 'Eliminar serie'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom Set Controls in Edit Mode */}
          {!isExecutionMode && (
            <div className="mt-3.5 pt-3 border-t border-zinc-100 flex items-center justify-between gap-3">
              <button
                id={`btn-add-set-${exercise.id}`}
                type="button"
                onClick={handleAddSet}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition-colors active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" /> Añadir serie
              </button>

              <span className="text-[11px] text-zinc-600">
                {exercise.sets.length} {exercise.sets.length === 1 ? 'serie' : 'series'} en total
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
