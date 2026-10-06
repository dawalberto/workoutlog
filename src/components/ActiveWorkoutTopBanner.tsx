/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowRight, Flame } from 'lucide-react';
import { Routine, ActiveWorkoutSession } from '../types';
import { useWorkoutTimer } from '../hooks/useWorkoutTimer';
import { formatWorkoutDuration } from '../utils/timeCalculations';

export interface ActiveWorkoutTopBannerProps {
  routine: Routine;
  session: ActiveWorkoutSession;
  onOpenRoutine: () => void;
}

/**
 * Banner shown when a workout session is currently active and the user
 * is browsing outside the routine screen. Allows quick 1-tap return.
 */
export const ActiveWorkoutTopBanner: React.FC<ActiveWorkoutTopBannerProps> = ({
  routine,
  session,
  onOpenRoutine,
}) => {
  const elapsed = useWorkoutTimer(session.startTime);
  const totalSets = routine.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const completedCount = session.completedSetIds.length;

  return (
    <div
      id="active-workout-top-banner"
      className="bg-[#121214]/95 backdrop-blur-xl text-white px-4 sm:px-6 py-2.5 border-b border-[#00FF87]/40 shadow-[0_4px_25px_rgba(0,255,135,0.15)] flex items-center justify-between gap-3 text-xs sm:text-sm animate-in fade-in"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="w-2.5 h-2.5 rounded-full bg-[#00FF87] animate-ping shrink-0 shadow-[0_0_8px_#00FF87]" />
        <span className="font-extrabold text-white truncate">
          Entrenamiento en curso: <span className="text-[#00FF87]">{routine.name}</span>
        </span>
        <span className="hidden sm:inline text-zinc-400 font-semibold">
          ({completedCount}/{totalSets} series)
        </span>
        <span className="font-mono bg-zinc-900 border border-[#00FF87]/30 px-2.5 py-0.5 rounded-lg font-bold text-[#00FF87] shrink-0 text-xs shadow-inner">
          ⏱️ {formatWorkoutDuration(elapsed)}
        </span>
      </div>
      <button
        id="btn-return-to-active-routine"
        type="button"
        onClick={onOpenRoutine}
        title="Volver a la rutina"
        aria-label="Volver a la rutina"
        className="shrink-0 px-3 py-1.5 bg-[#00FF87] text-black font-extrabold rounded-xl hover:bg-[#00e57a] active:scale-95 transition-all shadow-[0_0_15px_rgba(0,255,135,0.4)] flex items-center gap-1 text-xs"
      >
        <span>Volver</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
