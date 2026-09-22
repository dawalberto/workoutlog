import React from 'react';
import { 
  Play, 
  Edit3, 
  Trash2, 
  Copy, 
  Plus, 
  Clock, 
  Dumbbell, 
  Layers, 
  Flame
} from 'lucide-react';
import { Routine } from '../types';
import { getRoutineTotalSeconds, formatSecondsToTime } from '../utils/timeCalculations';

interface RoutineListProps {
  routines: Routine[];
  onCreateRoutine: () => void;
  onSelectRoutine: (routineId: string, mode: 'edit' | 'execute') => void;
  onDuplicateRoutine: (routineId: string) => void;
  onDeleteRoutine: (routineId: string) => void;
}

export const RoutineList: React.FC<RoutineListProps> = ({
  routines,
  onCreateRoutine,
  onSelectRoutine,
  onDuplicateRoutine,
  onDeleteRoutine,
}) => {
  return (
    <div id="routine-list-page" className="min-h-screen bg-zinc-50 pb-20">
      {/* Sub-header */}
      <div className="bg-white border-b border-zinc-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
                Mis Rutinas
              </h1>
              <p className="text-xs sm:text-sm text-zinc-600 mt-0.5">
                Planifica tus series, descansos y registra cada repetición en directo.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-new-routine"
                type="button"
                onClick={onCreateRoutine}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-zinc-900 hover:bg-zinc-800 text-white shadow-sm transition-colors active:scale-95"
              >
                <Plus className="w-4 h-4" /> Nueva Rutina
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Routine Cards Grid */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        {routines.length === 0 ? (
          <div className="text-center py-16 px-6 bg-white rounded-2xl border border-zinc-200 shadow-sm max-w-md mx-auto">
            <div className="w-14 h-14 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-zinc-400">
              <Dumbbell className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-zinc-900">No hay rutinas guardadas</h2>
            <p className="text-xs sm:text-sm text-zinc-600 mt-1.5 mb-6">
              Empieza creando tu primera rutina de entrenamiento personalizada.
            </p>
            <div className="flex items-center justify-center">
              <button
                id="btn-create-first-routine"
                type="button"
                onClick={onCreateRoutine}
                className="px-5 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs active:scale-95"
              >
                + Crear Rutina
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-zinc-600 px-1">
              <span>{routines.length} {routines.length === 1 ? 'rutina disponible' : 'rutinas disponibles'}</span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {routines.map((routine) => {
                const totalSeconds = getRoutineTotalSeconds(routine);
                const exerciseCount = routine.exercises.length;
                const totalSets = routine.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);

                return (
                  <div
                    key={routine.id}
                    id={`routine-card-${routine.id}`}
                    className="bg-white rounded-2xl border border-zinc-200 hover:border-zinc-300 p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                  >
                    <div>
                      {/* Card Top */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h2 className="text-lg sm:text-xl font-bold text-zinc-900 tracking-tight truncate">
                            {routine.name || 'Rutina sin título'}
                          </h2>
                          {routine.notes && (
                            <p className="text-xs sm:text-sm text-zinc-600 mt-1 line-clamp-2">
                              {routine.notes}
                            </p>
                          )}
                        </div>

                        {/* Total Estimated Time Pill */}
                        <div
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-100 text-zinc-800 text-xs font-bold shrink-0"
                          title="Tiempo estimado total"
                        >
                          <Clock className="w-3.5 h-3.5 text-emerald-600" />
                          <span>~{formatSecondsToTime(totalSeconds)}</span>
                        </div>
                      </div>

                      {/* Exercises summary chips & cover previews */}
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-100 text-zinc-700">
                          <Dumbbell className="w-3 h-3 text-zinc-600" />
                          {exerciseCount} {exerciseCount === 1 ? 'ejercicio' : 'ejercicios'}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-100 text-zinc-700">
                          <Layers className="w-3 h-3 text-zinc-600" />
                          {totalSets} {totalSets === 1 ? 'serie' : 'series'}
                        </span>

                        {/* Exercise names preview */}
                        {exerciseCount > 0 && (
                          <span className="text-xs text-zinc-600 truncate max-w-xs">
                            ({routine.exercises.map((e) => e.name).filter(Boolean).join(', ')})
                          </span>
                        )}
                      </div>

                      {/* Visual covers row */}
                      {exerciseCount > 0 && (
                        <div className="flex items-center gap-1.5 mt-3 pt-2">
                          {routine.exercises.slice(0, 6).map((ex, idx) => (
                            <div
                              key={ex.id || idx}
                              title={ex.name}
                              className="w-8 h-8 rounded-lg border border-zinc-200 bg-zinc-100 overflow-hidden shrink-0 flex items-center justify-center relative shadow-2xs"
                            >
                              {ex.imageUrl ? (
                                <img
                                  src={ex.imageUrl}
                                  alt={ex.name}
                                  className="w-full h-full object-cover"
                                  onError={(ev) => {
                                    (ev.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <Dumbbell className="w-3.5 h-3.5 text-zinc-400" />
                              )}
                            </div>
                          ))}
                          {routine.exercises.length > 6 && (
                            <span className="text-[11px] font-semibold text-zinc-500 pl-1">
                              +{routine.exercises.length - 6} más
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Card Actions */}
                    <div className="mt-5 pt-4 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          id={`btn-edit-routine-${routine.id}`}
                          type="button"
                          onClick={() => onSelectRoutine(routine.id, 'edit')}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-zinc-700 bg-zinc-100 hover:bg-zinc-200 transition-colors active:scale-95"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Editar
                        </button>

                        <button
                          id={`btn-duplicate-routine-${routine.id}`}
                          type="button"
                          onClick={() => onDuplicateRoutine(routine.id)}
                          className="p-2 text-zinc-600 hover:text-zinc-800 hover:bg-zinc-100 rounded-xl transition-colors"
                          title="Duplicar rutina"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        <button
                          id={`btn-delete-routine-${routine.id}`}
                          type="button"
                          onClick={() => onDeleteRoutine(routine.id)}
                          className="p-2 text-zinc-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                          title="Eliminar rutina"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Primary Workout Play Button */}
                      <button
                        id={`btn-start-workout-${routine.id}`}
                        type="button"
                        onClick={() => onSelectRoutine(routine.id, 'execute')}
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all active:scale-95"
                      >
                        <Play className="w-4 h-4 fill-current" /> Entrenar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
