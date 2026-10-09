/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
  Flame,
  Zap
} from 'lucide-react';
import { Routine, ActiveWorkoutSession } from '../types';
import { getRoutineTotalSeconds, formatSecondsToTime } from '../utils/timeCalculations';

interface RoutineListProps {
  routines: Routine[];
  activeSessions?: Record<string, ActiveWorkoutSession>;
  onCreateRoutine: () => void;
  onSelectRoutine: (routineId: string, mode: 'edit' | 'execute') => void;
  onDuplicateRoutine: (routineId: string) => void;
  onDeleteRoutine: (routineId: string) => void;
}

export const RoutineList: React.FC<RoutineListProps> = ({
  routines,
  activeSessions = {},
  onCreateRoutine,
  onSelectRoutine,
  onDuplicateRoutine,
  onDeleteRoutine,
}) => {
  // Aggregate stats for the Bento Grid Dashboard
  const totalRoutines = routines.length;
  const totalSetsOverall = routines.reduce(
    (acc, r) => acc + r.exercises.reduce((sAcc, ex) => sAcc + ex.sets.length, 0),
    0
  );
  const activeSessionsCount = Object.values(activeSessions).filter((s) => s.startTime).length;
  const totalEstSecondsOverall = routines.reduce((acc, r) => acc + getRoutineTotalSeconds(r), 0);

  return (
    <div id="routine-list-page" className="min-h-screen bg-[#0D0D0D] text-white pb-28 pt-4 sm:pt-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-[#00FF87]">
                <Zap className="w-3.5 h-3.5" /> Performance Hub
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Mis Rutinas
            </h1>
            <p className="text-xs sm:text-sm text-[#A1A1AA] mt-0.5">
              Planifica tus series, controla descansos y supera tus récords en tiempo real.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-new-routine"
              type="button"
              onClick={onCreateRoutine}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 min-h-[48px] rounded-2xl text-sm font-extrabold bg-[#00FF87] hover:bg-[#00e57a] text-black shadow-[0_0_20px_rgba(0,255,135,0.35)] transition-all active:scale-[0.97]"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
              <span>Nueva Rutina</span>
            </button>
          </div>
        </div>

        {/* Bento Grid Summary Cards (only if routines exist) */}
        {routines.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 my-6">
            {/* Bento Card 1: Total Rutinas */}
            <div className="bg-[#1C1C1E] border border-white/[0.08] rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-white/20 transition-colors shadow-lg">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#A1A1AA]">
                  Rutinas Activas
                </span>
                <Flame className="w-4 h-4 text-[#00FF87]" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-white">
                  {totalRoutines}
                </span>
                <span className="text-xs text-[#A1A1AA]">creadas</span>
              </div>
            </div>

            {/* Bento Card 2: Total Series */}
            <div className="bg-[#1C1C1E] border border-white/[0.08] rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-white/20 transition-colors shadow-lg">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#A1A1AA]">
                  Volumen Total
                </span>
                <Layers className="w-4 h-4 text-[#00E5FF]" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-white">
                  {totalSetsOverall}
                </span>
                <span className="text-xs text-[#A1A1AA]">series listas</span>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {routines.length === 0 ? (
          <div className="text-center py-20 px-6 bg-[#1C1C1E] rounded-2xl border border-white/[0.08] max-w-md mx-auto my-8 shadow-xl">
            <div className="w-16 h-16 bg-zinc-900 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#00FF87] shadow-[0_0_20px_rgba(0,255,135,0.2)]">
              <Dumbbell className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white">No tienes rutinas todavía</h2>
            <p className="text-xs sm:text-sm text-[#A1A1AA] mt-1.5 mb-6">
              Comienza creando tu primera rutina de entrenamiento para empezar a registrar series, pesos y descansos.
            </p>
            <div className="flex items-center justify-center">
              <button
                id="btn-create-first-routine"
                type="button"
                onClick={onCreateRoutine}
                className="min-h-[48px] px-6 text-sm font-extrabold rounded-2xl bg-[#00FF87] text-black hover:bg-[#00e57a] transition-all shadow-[0_0_20px_rgba(0,255,135,0.35)] active:scale-[0.97]"
              >
                + Crear Mi Primera Rutina
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-[#A1A1AA] px-1 font-semibold">
              <span>{routines.length} {routines.length === 1 ? 'rutina configurada' : 'rutinas configuradas'}</span>
              <span>Disposición Bento</span>
            </div>

            {/* Bento Grid Routine Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
              {routines.map((routine) => {
                const totalSeconds = getRoutineTotalSeconds(routine);
                const exerciseCount = routine.exercises.length;
                const totalSets = routine.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
                const session = activeSessions[routine.id];
                const isSessionActive = Boolean(session && session.startTime);
                const completedSessionSets = session?.completedSetIds?.length || 0;

                return (
                  <div
                    key={routine.id}
                    id={`routine-card-${routine.id}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectRoutine(routine.id, 'execute')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectRoutine(routine.id, 'execute');
                      }
                    }}
                    className={`bg-[#1C1C1E] rounded-2xl border p-5 sm:p-6 transition-all duration-200 flex flex-col justify-between shadow-lg relative overflow-hidden group cursor-pointer hover:border-[#00FF87]/50 hover:shadow-[0_0_30px_rgba(0,255,135,0.12)] active:scale-[0.99] select-none ${
                      isSessionActive
                        ? 'border-[#00FF87] ring-1 ring-[#00FF87]/40 bg-[#1C1C1E]/95 shadow-[0_0_30px_rgba(0,255,135,0.15)]'
                        : 'border-white/[0.08]'
                    }`}
                  >
                    {/* Top Active Workout Glow Stripe */}
                    {isSessionActive && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#00FF87] to-[#00E5FF]" />
                    )}

                    <div>
                      {/* Card Top: Title, Time & Active indicator */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {isSessionActive && (
                            <div className="mb-2">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-[#00FF87]/15 text-[#00FF87] border border-[#00FF87]/30 shadow-[0_0_10px_rgba(0,255,135,0.2)]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#00FF87] animate-ping" />
                                En Curso ({completedSessionSets}/{totalSets} series)
                              </span>
                            </div>
                          )}

                          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate group-hover:text-[#00FF87] transition-colors">
                            {routine.name || 'Rutina sin título'}
                          </h2>
                          {routine.notes && (
                            <p className="text-xs sm:text-sm text-[#A1A1AA] mt-1 line-clamp-2 leading-relaxed">
                              {routine.notes}
                            </p>
                          )}
                        </div>

                        {/* Estimated Time Badge */}
                        <div
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs font-mono font-bold shrink-0 shadow-inner"
                          title="Tiempo estimado total"
                        >
                          <Clock className="w-3.5 h-3.5 text-[#00FF87]" />
                          <span>~{formatSecondsToTime(totalSeconds)}</span>
                        </div>
                      </div>

                      {/* Exercises & Sets Metadata (Zero-Pill clean typography) */}
                      <div className="mt-4 flex items-center gap-3 text-xs text-[#A1A1AA] font-semibold">
                        <span className="flex items-center gap-1 text-white">
                          <Dumbbell className="w-3.5 h-3.5 text-[#00FF87]" />
                          {exerciseCount} {exerciseCount === 1 ? 'ejercicio' : 'ejercicios'}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1 text-white">
                          <Layers className="w-3.5 h-3.5 text-[#00E5FF]" />
                          {totalSets} {totalSets === 1 ? 'serie' : 'series'}
                        </span>
                      </div>

                      {/* Cover Thumbnails */}
                      {exerciseCount > 0 && (
                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/[0.06]">
                          {routine.exercises.slice(0, 5).map((ex, idx) => (
                            <div
                              key={ex.id || idx}
                              title={ex.name}
                              className="w-9 h-9 rounded-xl border border-white/10 bg-zinc-900 overflow-hidden shrink-0 flex items-center justify-center relative shadow-sm"
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
                                <Dumbbell className="w-4 h-4 text-zinc-500" />
                              )}
                            </div>
                          ))}
                          {routine.exercises.length > 5 && (
                            <span className="text-xs font-bold text-zinc-400 pl-1">
                              +{routine.exercises.length - 5}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Card Actions (Actions have stopPropagation so clicking them does not trigger execute) */}
                    <div 
                      className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between gap-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          id={`btn-edit-routine-${routine.id}`}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectRoutine(routine.id, 'edit');
                          }}
                          className="min-h-[44px] px-3.5 inline-flex items-center gap-1.5 text-xs font-bold rounded-xl text-zinc-200 bg-zinc-800/80 hover:bg-zinc-700/80 hover:text-white border border-white/5 transition-all active:scale-[0.97]"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>

                        <button
                          id={`btn-duplicate-routine-${routine.id}`}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDuplicateRoutine(routine.id);
                          }}
                          className="min-h-[44px] min-w-[44px] p-2.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-all active:scale-[0.97] flex items-center justify-center"
                          title="Duplicar rutina"
                          aria-label="Duplicar rutina"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        <button
                          id={`btn-delete-routine-${routine.id}`}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteRoutine(routine.id);
                          }}
                          className="min-h-[44px] min-w-[44px] p-2.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all active:scale-[0.97] flex items-center justify-center"
                          title="Eliminar rutina"
                          aria-label="Eliminar rutina"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Right Indicator: Clean status / chevron */}
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#A1A1AA] group-hover:text-[#00FF87] transition-colors">
                        {isSessionActive ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-black text-[#00FF87]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00FF87] animate-ping" />
                            Continuar
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-zinc-400 group-hover:text-[#00FF87] transition-colors">
                            <span>Ver rutina</span>
                            <Play className="w-3 h-3 fill-current ml-0.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
