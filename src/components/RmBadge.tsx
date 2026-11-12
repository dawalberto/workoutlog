import React from 'react';
import { Trophy } from 'lucide-react';
import { ExerciseRmLog } from '../types';
import {
  findRmLogForExercise,
  formatRmRecordValue,
  getHighestRmRecord,
  estimateOneRepMax,
} from '../utils/rmCalculations';

export interface RmBadgeProps {
  rmLogs?: ExerciseRmLog[];
  exerciseName: string;
  exerciseId?: string;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  estimatedSets?: Array<{ weight: number | string; reps: number | string }>;
}

export const RmBadge: React.FC<RmBadgeProps> = ({
  rmLogs,
  exerciseName,
  exerciseId,
  size = 'sm',
  className = '',
  estimatedSets = [],
}) => {
  const log = exerciseName ? findRmLogForExercise(rmLogs ?? [], exerciseName, exerciseId) : undefined;
  const record = getHighestRmRecord(log);
  const highestRecord = record && record.weight > 0 ? record : null;
  const estimate = highestRecord ? null : estimateOneRepMax(estimatedSets);
  if (!highestRecord && estimate === null) return null;

  let sizeClasses = 'text-[10px] sm:text-[11px] px-1.5 py-0.5';
  let iconClasses = 'w-3 h-3';

  if (size === 'xs') {
    sizeClasses = 'text-[9px] sm:text-[10px] px-1.5 py-0.2';
    iconClasses = 'w-2.5 h-2.5';
  } else if (size === 'md') {
    sizeClasses = 'text-xs px-2 py-0.5';
    iconClasses = 'w-3.5 h-3.5';
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-bold rounded-lg border shrink-0 select-none ${highestRecord ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.2)]' : 'bg-orange-500/10 text-orange-300 border-dashed border-orange-400/50'} ${sizeClasses} ${className}`}
      title={highestRecord ? `Mayor RM registrado: ${formatRmRecordValue(highestRecord)} (${highestRecord.date || 'Récord personal'})` : 'RM estimado con la fórmula de Epley; supone una serie cercana al fallo'}
    >
      <Trophy className={`${iconClasses} text-amber-400 fill-amber-400/40 shrink-0`} />
      <span>{highestRecord ? `RM: ${formatRmRecordValue(highestRecord)}` : `RM est.: ${estimate} kg`}</span>
    </span>
  );
};
