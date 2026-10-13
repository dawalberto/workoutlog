import React, { type ReactNode } from 'react';
import { ArrowLeft, Clock, Edit3, FileText, Play } from 'lucide-react';
import type { RoutineSubMode } from '../../types';
import { formatSecondsToTime, formatWorkoutDuration } from '../../utils/timeCalculations';
import { useRoutineHeader } from '../../hooks/routine/useRoutineHeader';

type RoutineFieldProps = {
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  onBlur: React.FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  onKeyDown: React.KeyboardEventHandler<HTMLInputElement | HTMLTextAreaElement>;
};

interface RoutineHeaderProps {
  subMode: RoutineSubMode;
  elapsedSeconds: number;
  routineFieldProps: (field: 'name' | 'notes') => RoutineFieldProps | undefined;
  progress?: ReactNode;
  children: ReactNode;
}

export const RoutineHeader: React.FC<RoutineHeaderProps> = ({
  subMode,
  elapsedSeconds,
  routineFieldProps,
  progress,
  children,
}) => {
  const {
    routine,
    session,
    totalWorkoutSeconds,
    allExercisesCompleted,
    onBack,
    onModeChange,
  } = useRoutineHeader();
  if (!routine) return null;

  return (
  <>
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
            onClick={() => onModeChange('edit')}
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
            onClick={() => onModeChange('execute')}
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
                  {...routineFieldProps('name')}
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
                    {...routineFieldProps('notes')}
                    placeholder="Objetivos del día, notas sobre descansos, peso objetivo..."
                    className="w-full text-base sm:text-sm text-zinc-200 bg-zinc-900 border border-white/10 rounded-xl p-3 focus:bg-black focus:border-[#00FF87] focus:outline-none transition-all"
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

        {progress}
      </div>
      {children}
    </div>
  </>
  );
};
