import React from 'react';
import { Clock, Flag, Play, RotateCcw } from 'lucide-react';
import type { ActiveWorkoutSession, Routine } from '../../types';
import { formatWorkoutDuration } from '../../utils/timeCalculations';

interface WorkoutProgressPanelProps {
  routine: Routine;
  session?: ActiveWorkoutSession | null;
  elapsedSeconds: number;
  completedSetsCount: number;
  totalSetsCount: number;
  completionPercentage: number;
  onStartSession: (routineId: string) => void;
  onResetSession: () => void;
  onOpenFinishConfirm: () => void;
}

export const WorkoutProgressPanel: React.FC<WorkoutProgressPanelProps> = ({
  routine,
  session,
  elapsedSeconds,
  completedSetsCount,
  totalSetsCount,
  completionPercentage,
  onStartSession,
  onResetSession,
  onOpenFinishConfirm,
}) => (
  <>
    {/* Progress bar and Live Stopwatch in Execution Mode */}
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
                onClick={onResetSession}
                className="min-h-[44px] inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white px-3 py-2 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 border border-white/5 transition-colors active:scale-[0.97]"
                title="Reiniciar progreso"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reiniciar</span>
              </button>

              <button
                id="btn-finish-workout-session"
                type="button"
                onClick={onOpenFinishConfirm}
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
  </>
);
