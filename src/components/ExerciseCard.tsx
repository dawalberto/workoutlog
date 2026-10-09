/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
import { Exercise, WorkoutSet, ExerciseRmLog, ExerciseDiary } from '../types';
import { 
  getExerciseTotalSeconds, 
  getSetTotalSeconds, 
  formatSecondsToTime,
  formatExerciseSummary 
} from '../utils/timeCalculations';
import { VideoPreview } from './VideoPreview';
import { RmBadge } from './RmBadge';
import { DiaryButton } from './DiaryButton';
import { TimePickerField } from './TimePickerField';

interface ExerciseCardProps {
  exercise: Exercise;
  exerciseIndex: number;
  totalExercises?: number;
  isExecutionMode: boolean;
  completedSetIds: Set<string>;
  isCollapsed?: boolean;
  rmLogs?: ExerciseRmLog[];
  exerciseDiary?: ExerciseDiary[];
  onToggleCollapse?: () => void;
  onToggleSetComplete: (setId: string, restSeconds: number, exerciseName: string, setNumber: number) => void;
  onUpdateExercise: (updated: Exercise) => void;
  onDeleteExercise: () => void;
  onMoveToPosition?: (targetIndex: number) => void;
  onCheckRmWeight?: (exerciseName: string, newWeight: number, exerciseId?: string) => void;
  onOpenDiary?: (exerciseName: string, exerciseId?: string) => void;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  exercise,
  exerciseIndex,
  totalExercises = 1,
  isExecutionMode,
  completedSetIds,
  isCollapsed: propIsCollapsed,
  rmLogs = [],
  exerciseDiary = [],
  onToggleCollapse,
  onToggleSetComplete,
  onUpdateExercise,
  onDeleteExercise,
  onMoveToPosition,
  onCheckRmWeight,
  onOpenDiary,
}) => {
  const [showVideoInput, setShowVideoInput] = useState(false);
  const [showImageInput, setShowImageInput] = useState(false);

  // Check if all sets of this exercise are completed in the current session
  const totalSetsCount = exercise.sets.length;
  const completedSetsCount = exercise.sets.filter((s) => completedSetIds.has(s.id)).length;
  const isAllCompleted = totalSetsCount > 0 && completedSetsCount === totalSetsCount;

  // Collapse state (controlled from RoutineView or local fallback)
  const [localCollapsed, setLocalCollapsed] = useState<boolean>(() => isExecutionMode && isAllCompleted);
  const isCollapsed = propIsCollapsed !== undefined ? propIsCollapsed : localCollapsed;
  const handleToggleCollapse = onToggleCollapse || (() => setLocalCollapsed(!localCollapsed));

  const totalExerciseSeconds = getExerciseTotalSeconds(exercise);
  const summaryText = formatExerciseSummary(exercise.sets);

  // Handlers for Sets CRUD
  const handleUpdateSet = (setId: string, field: keyof WorkoutSet, value: number | string) => {
    const updatedSets = exercise.sets.map((s) => {
      if (s.id === setId) {
        return { ...s, [field]: value };
      }
      return s;
    });
    onUpdateExercise({ ...exercise, sets: updatedSets });
  };

  const handleApplyRestToAllSets = (newRest: number) => {
    const updatedSets = exercise.sets.map((s) => ({ ...s, restSeconds: newRest }));
    onUpdateExercise({ ...exercise, sets: updatedSets });
  };

  const handleDuplicateSet = (indexToDuplicate: number) => {
    const setToDuplicate = exercise.sets[indexToDuplicate];
    if (!setToDuplicate) return;

    const newSet: WorkoutSet = {
      ...setToDuplicate,
      id: 'set-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      setNumber: exercise.sets.length + 1,
    };

    const nextSets = [
      ...exercise.sets.slice(0, indexToDuplicate + 1),
      newSet,
      ...exercise.sets.slice(indexToDuplicate + 1),
    ].map((s, idx) => ({ ...s, setNumber: idx + 1 }));

    onUpdateExercise({ ...exercise, sets: nextSets });
  };

  const handleAddSet = () => {
    const lastSet = exercise.sets[exercise.sets.length - 1];
    const newSet: WorkoutSet = {
      id: 'set-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      setNumber: exercise.sets.length + 1,
      reps: lastSet ? lastSet.reps : 10,
      weight: lastSet ? lastSet.weight : 0,
      restSeconds: lastSet ? lastSet.restSeconds : 60,
    };
    onUpdateExercise({ ...exercise, sets: [...exercise.sets, newSet] });
  };

  const handleDeleteSet = (setId: string) => {
    if (exercise.sets.length <= 1) return;
    const filtered = exercise.sets
      .filter((s) => s.id !== setId)
      .map((s, idx) => ({ ...s, setNumber: idx + 1 }));
    onUpdateExercise({ ...exercise, sets: filtered });
  };

  return (
    <div
      id={`exercise-card-${exercise.id}`}
      className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-lg ${
        isAllCompleted
          ? 'bg-[#1C1C1E] border-[#00FF87]/40 shadow-[0_0_25px_rgba(0,255,135,0.08)]'
          : 'bg-[#1C1C1E] border-white/[0.08] hover:border-white/20'
      }`}
    >
      {/* Exercise Card Header */}
      <div className="p-4 sm:p-5 border-b border-white/[0.06] bg-[#18181A]/50">
        <div className="flex items-start sm:items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Exercise Thumbnail or Index Badge */}
            {exercise.imageUrl ? (
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-zinc-900 relative shadow-sm">
                <img
                  src={exercise.imageUrl}
                  alt={exercise.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            ) : (
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border ${
                  isAllCompleted
                    ? 'bg-[#00FF87] text-black border-[#00FF87] shadow-[0_0_12px_rgba(0,255,135,0.4)]'
                    : 'bg-zinc-900 border-white/10 text-white'
                }`}
              >
                {exerciseIndex + 1}
              </div>
            )}

            {/* Exercise Title & Badges */}
            <div className="min-w-0 flex-1">
              {isExecutionMode ? (
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-black text-white tracking-tight truncate">
                      {exercise.name || 'Ejercicio sin nombre'}
                    </h3>
                    <RmBadge
                      rmLogs={rmLogs}
                      exerciseName={exercise.name}
                      exerciseId={exercise.definitionId}
                    />
                    {onOpenDiary && (
                      <DiaryButton
                        exerciseName={exercise.name}
                        exerciseId={exercise.definitionId}
                        diaries={exerciseDiary}
                        onOpenDiary={onOpenDiary}
                        variant="compact"
                      />
                    )}

                    {isAllCompleted && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-[#00FF87]/20 text-[#00FF87] border border-[#00FF87]/40 shadow-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Completado ({completedSetsCount}/{totalSetsCount})
                      </span>
                    )}
                  </div>
                  {exercise.notes && (
                    <p className="text-xs sm:text-sm text-[#A1A1AA] mt-1 flex items-start gap-1">
                      <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5 text-zinc-500" />
                      <span>{exercise.notes}</span>
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={exercise.name}
                      onChange={(e) => onUpdateExercise({ ...exercise, name: e.target.value })}
                      placeholder="Nombre del ejercicio (ej. Press banca, Sentadilla...)"
                      className="flex-1 text-base sm:text-lg font-black text-white bg-transparent border-b border-white/10 hover:border-white/30 focus:border-[#00FF87] focus:outline-none px-1 py-1 rounded transition-colors min-w-0"
                    />
                    <RmBadge rmLogs={rmLogs} exerciseName={exercise.name} exerciseId={exercise.definitionId} />
                    {onOpenDiary && (
                      <DiaryButton
                        exerciseName={exercise.name}
                        exerciseId={exercise.definitionId}
                        diaries={exerciseDiary}
                        onOpenDiary={onOpenDiary}
                        variant="compact"
                      />
                    )}
                  </div>
                  <input
                    type="text"
                    value={exercise.notes || ''}
                    onChange={(e) => onUpdateExercise({ ...exercise, notes: e.target.value })}
                    placeholder="Notas de técnica o consejos (opcional)"
                    className="w-full text-xs sm:text-sm text-[#A1A1AA] placeholder:text-zinc-600 bg-transparent border-b border-white/5 hover:border-white/20 focus:border-[#00FF87] focus:outline-none px-1 py-1 rounded transition-colors"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Dedicated Top-Right Chevron Toggle Button - ALWAYS visible, fixed position on mobile & desktop */}
          <button
            type="button"
            onClick={handleToggleCollapse}
            className="p-2 sm:p-2.5 rounded-xl text-zinc-300 hover:text-white bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 transition-colors active:scale-95 shrink-0 ml-1.5 shadow-sm"
            title={isCollapsed ? 'Desplegar ejercicio' : 'Plegar ejercicio'}
            aria-label={isCollapsed ? 'Desplegar ejercicio' : 'Plegar ejercicio'}
          >
            {isCollapsed ? <ChevronDown className="w-5 h-5 text-[#00FF87]" /> : <ChevronUp className="w-5 h-5 text-zinc-300" />}
          </button>
        </div>

        {/* Action & Metadata Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-white/[0.06] mt-3">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            {isCollapsed && summaryText && (
              <span
                className="inline-flex items-center px-2.5 py-1 rounded-xl text-[10px] sm:text-[11px] font-mono font-semibold bg-zinc-900 text-zinc-300 border border-white/10 shadow-inner max-w-[200px] sm:max-w-none truncate"
                title="Resumen: series x repeticiones · peso - descanso"
              >
                {summaryText}
              </span>
            )}

            {/* Estimated Duration Badge */}
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold shrink-0 border ${
                isAllCompleted
                  ? 'bg-[#00FF87]/15 text-[#00FF87] border-[#00FF87]/30'
                  : 'bg-zinc-900 text-zinc-300 border-white/10'
              }`}
              title="Tiempo aproximado calculado"
            >
              <Clock className="w-3.5 h-3.5 text-[#00FF87]" />
              <span>~{formatSecondsToTime(totalExerciseSeconds)}</span>
            </div>
          </div>

          {!isExecutionMode && (
            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
              <button
                type="button"
                onClick={() => setShowImageInput(!showImageInput)}
                title="Configurar imagen miniatura / preview"
                className={`p-2 rounded-xl border text-xs transition-colors active:scale-95 ${
                  exercise.imageUrl
                    ? 'bg-[#00FF87]/20 text-[#00FF87] border-[#00FF87]/40'
                    : 'bg-zinc-900 text-zinc-400 border-white/10 hover:text-white hover:border-white/20'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setShowVideoInput(!showVideoInput)}
                title="Configurar enlace de video"
                className={`p-2 rounded-xl border text-xs transition-colors active:scale-95 ${
                  exercise.videoUrl
                    ? 'bg-[#00FF87]/20 text-[#00FF87] border-[#00FF87]/40'
                    : 'bg-zinc-900 text-zinc-400 border-white/10 hover:text-white hover:border-white/20'
                }`}
              >
                <Video className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onDeleteExercise}
                title="Eliminar ejercicio"
                className="p-2 rounded-xl border border-red-500/20 bg-zinc-900 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Media Inputs in Edit Mode */}
        {!isExecutionMode && showImageInput && (
          <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center gap-2.5">
            <input
              type="url"
              value={exercise.imageUrl || ''}
              onChange={(e) => onUpdateExercise({ ...exercise, imageUrl: e.target.value })}
              placeholder="URL de imagen preview (https://...)"
              className="flex-1 text-xs px-3 py-2 rounded-xl border border-white/10 bg-zinc-900 text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#00FF87]"
            />
            {exercise.imageUrl && (
              <button
                type="button"
                onClick={() => onUpdateExercise({ ...exercise, imageUrl: '' })}
                className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded-lg bg-zinc-900 border border-red-500/20"
              >
                Quitar
              </button>
            )}
          </div>
        )}

        {!isExecutionMode && showVideoInput && (
          <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center gap-2">
            <Video className="w-4 h-4 text-zinc-400 shrink-0" />
            <input
              type="url"
              value={exercise.videoUrl || ''}
              onChange={(e) => onUpdateExercise({ ...exercise, videoUrl: e.target.value })}
              placeholder="Enlace de video (YouTube, Vimeo, mp4)..."
              className="w-full text-xs px-3 py-2 rounded-xl border border-white/10 bg-zinc-900 text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#00FF87]"
            />
          </div>
        )}

        <VideoPreview url={exercise.videoUrl} exerciseName={exercise.name || 'ejercicio'} />
      </div>

      {/* Sets Section */}
      {!isCollapsed && (
        <div className="p-3 sm:p-5">
          <div className="overflow-x-auto -mx-1 px-1 scrollbar-none">
            <table className="w-full text-left border-collapse min-w-[310px] sm:min-w-full">
              <thead>
                <tr className="border-b border-white/[0.08] text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-[#A1A1AA]">
                  <th className="py-3 px-2 text-center w-12">Serie</th>
                  <th className="py-3 px-2 text-center min-w-[70px] sm:min-w-[85px]">Reps</th>
                  <th className="py-3 px-2 text-center min-w-[70px] sm:min-w-[85px]">Peso</th>
                  <th className="py-3 px-2 text-center min-w-[80px] sm:min-w-[95px]">Descanso</th>
                  <th className="py-3 px-2 text-center hidden md:table-cell text-zinc-500">Tiempo</th>
                  {isExecutionMode ? (
                    <th className="py-3 px-2 text-center w-16">Estado</th>
                  ) : (
                    <th className="py-3 px-2 text-right w-20 sm:w-24">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {exercise.sets.map((set, setIndex) => {
                  const isCompleted = completedSetIds.has(set.id);
                  const setSeconds = getSetTotalSeconds(set);

                  return (
                    <tr
                      key={set.id}
                      className={`transition-all duration-200 ${
                        isCompleted
                          ? 'bg-[#00FF87]/[0.08] border-l-4 border-l-[#00FF87]'
                          : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      {/* Set Index */}
                      <td className="py-3 px-2 text-center">
                        <span
                          className={`inline-block w-7 h-7 leading-7 text-xs font-black rounded-xl transition-all ${
                            isCompleted
                              ? 'bg-[#00FF87] text-black shadow-[0_0_10px_rgba(0,255,135,0.4)]'
                              : 'bg-zinc-800 text-zinc-300 border border-white/10'
                          }`}
                        >
                          {set.setNumber}
                        </span>
                      </td>

                      {/* Reps */}
                      <td className="py-3 px-2 text-center">
                        {isExecutionMode ? (
                          <span
                            className={`text-sm sm:text-base font-black transition-colors ${
                              isCompleted ? 'text-[#00FF87]' : 'text-white'
                            }`}
                          >
                            {set.reps}{' '}
                            <span className="text-[10px] sm:text-xs font-semibold text-[#A1A1AA]">
                              reps
                            </span>
                          </span>
                        ) : (
                          <div className="flex items-center justify-center">
                            <input
                              type="number"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              min="1"
                              max="999"
                              value={set.reps}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => handleUpdateSet(set.id, 'reps', e.target.value)}
                              onBlur={() => {
                                if (!set.reps || isNaN(Number(set.reps)) || Number(set.reps) < 1) {
                                  handleUpdateSet(set.id, 'reps', 1);
                                }
                              }}
                              className="w-16 sm:w-20 min-h-[48px] text-center text-sm font-extrabold py-2 px-1 rounded-xl border border-white/10 bg-zinc-900 text-white focus:border-[#00FF87] focus:ring-2 focus:ring-[#00FF87]/30 focus:outline-none transition-all shadow-inner"
                            />
                          </div>
                        )}
                      </td>

                      {/* Weight */}
                      <td className="py-3 px-2 text-center">
                        {isExecutionMode ? (
                          <span
                            className={`text-sm sm:text-base font-black transition-colors ${
                              isCompleted ? 'text-[#00FF87]' : 'text-white'
                            }`}
                          >
                            {set.weight}{' '}
                            <span className="text-[10px] sm:text-xs font-semibold text-[#A1A1AA]">
                              kg
                            </span>
                          </span>
                        ) : (
                          <div className="flex items-center justify-center">
                            <input
                              type="number"
                              inputMode="decimal"
                              pattern="[0-9]*[.,]?[0-9]*"
                              step="0.5"
                              min="0"
                              max="999"
                              value={set.weight}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => handleUpdateSet(set.id, 'weight', e.target.value)}
                              onBlur={(e) => {
                                const inputVal = e.target.value;
                                const val = Number(inputVal);
                                if (inputVal === '' || isNaN(val) || val < 0) {
                                  handleUpdateSet(set.id, 'weight', 0);
                                } else {
                                  handleUpdateSet(set.id, 'weight', val);
                                  if (val > 0 && onCheckRmWeight) {
                                    onCheckRmWeight(exercise.name, val, exercise.definitionId);
                                  }
                                }
                              }}
                              className="w-16 sm:w-20 min-h-[48px] text-center text-sm font-extrabold py-2 px-1 rounded-xl border border-white/10 bg-zinc-900 text-white focus:border-[#00FF87] focus:ring-2 focus:ring-[#00FF87]/30 focus:outline-none transition-all shadow-inner"
                            />
                          </div>
                        )}
                      </td>

                      {/* Rest */}
                      <td className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center">
                          <TimePickerField
                            variant="table"
                            value={set.restSeconds}
                            onChange={(secs) => handleUpdateSet(set.id, 'restSeconds', secs)}
                            onApplyToAllSets={(secs) => handleApplyRestToAllSets(secs)}
                            allowApplyToAll={exercise.sets.length > 1}
                            modalTitle={`Descanso Serie ${set.setNumber} · ${exercise.name}`}
                            className="min-w-[70px]"
                          />
                        </div>
                      </td>

                      {/* Estimated Set Time */}
                      <td className="py-3 px-2 text-center hidden md:table-cell text-xs font-mono text-zinc-500">
                        ~{formatSecondsToTime(setSeconds)}
                      </td>

                      {/* Actions or Checkbox */}
                      <td className="py-3 px-2 text-center">
                        {isExecutionMode ? (
                          <div className="flex justify-center">
                            <button
                              id={`btn-toggle-set-${set.id}`}
                              type="button"
                              onClick={() => {
                                const isCompleting = !isCompleted;
                                if (isCompleting && onCheckRmWeight) {
                                  const val = Number(set.weight);
                                  if (val > 0) {
                                    onCheckRmWeight(exercise.name, val);
                                  }
                                }
                                onToggleSetComplete(set.id, Number(set.restSeconds) || 0, exercise.name, set.setNumber);
                              }}
                              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 active:scale-90 ${
                                isCompleted
                                  ? 'bg-[#00FF87] text-black shadow-[0_0_18px_rgba(0,255,135,0.5)] border-0 scale-105'
                                  : 'bg-zinc-900 border-2 border-white/20 text-transparent hover:border-[#00FF87] hover:text-[#00FF87]/40'
                              }`}
                              title={isCompleted ? 'Desmarcar serie' : 'Marcar completada e iniciar descanso'}
                            >
                              <Check className={`w-5 h-5 stroke-[3] ${isCompleted ? 'text-black' : 'currentColor'}`} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              id={`btn-duplicate-set-${set.id}`}
                              type="button"
                              onClick={() => handleDuplicateSet(setIndex)}
                              className="min-h-[40px] min-w-[40px] p-2 rounded-xl text-zinc-400 hover:text-[#00FF87] hover:bg-zinc-800 transition-colors flex items-center justify-center active:scale-95"
                              title="Duplicar serie"
                              aria-label="Duplicar serie"
                            >
                              <Copy className="w-4 h-4" />
                            </button>

                            <button
                              id={`btn-delete-set-${set.id}`}
                              type="button"
                              onClick={() => handleDeleteSet(set.id)}
                              disabled={exercise.sets.length <= 1}
                              className={`min-h-[40px] min-w-[40px] p-2 rounded-xl transition-colors flex items-center justify-center active:scale-95 ${
                                exercise.sets.length <= 1
                                  ? 'text-zinc-600 cursor-not-allowed opacity-50'
                                  : 'text-zinc-400 hover:text-red-400 hover:bg-red-500/10'
                              }`}
                              title={exercise.sets.length <= 1 ? 'Mínimo 1 serie' : 'Eliminar serie'}
                              aria-label="Eliminar serie"
                            >
                              <Trash2 className="w-4 h-4" />
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
            <div className="mt-4 pt-3.5 border-t border-white/[0.08] flex items-center justify-between gap-3">
              <button
                id={`btn-add-set-${exercise.id}`}
                type="button"
                onClick={handleAddSet}
                className="min-h-[44px] inline-flex items-center gap-2 px-4 text-xs font-bold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition-all active:scale-[0.97] border border-white/10"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Añadir Serie</span>
              </button>

              <span className="text-xs font-semibold text-[#A1A1AA]">
                {exercise.sets.length} {exercise.sets.length === 1 ? 'serie' : 'series'} en total
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
