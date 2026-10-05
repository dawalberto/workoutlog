/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowRight } from 'lucide-react';
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
      className="bg-emerald-700 text-white px-3 sm:px-6 py-2 shadow-md flex items-center justify-between gap-3 text-xs sm:text-sm animate-in fade-in"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-ping shrink-0" />
        <span className="font-bold truncate">Entrenamiento en curso: {routine.name}</span>
        <span className="hidden sm:inline text-emerald-200">
          ({completedCount}/{totalSets} series)
        </span>
        <span className="font-mono bg-emerald-800/90 border border-emerald-600/60 px-2 py-0.5 rounded-md font-bold text-white shrink-0 text-xs">
          ⏱️ {formatWorkoutDuration(elapsed)}
        </span>
      </div>
      <button
        id="btn-return-to-active-routine"
        type="button"
        onClick={onOpenRoutine}
        title="Volver a la rutina"
        aria-label="Volver a la rutina"
        className="shrink-0 p-1.5 sm:p-2 bg-white text-emerald-950 rounded-xl hover:bg-emerald-50 active:scale-95 transition-all shadow-xs flex items-center justify-center"
      >
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};
