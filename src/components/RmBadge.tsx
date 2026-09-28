import React from 'react';
import { Trophy } from 'lucide-react';
import { ExerciseRmLog } from '../types';
import { findRmLogForExercise, getHighestRmRecord } from '../utils/rmCalculations';

export interface RmBadgeProps {
  rmLogs?: ExerciseRmLog[];
  exerciseName: string;
  exerciseId?: string;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export const RmBadge: React.FC<RmBadgeProps> = ({
  rmLogs,
  exerciseName,
  exerciseId,
  size = 'sm',
  className = '',
}) => {
  if (!rmLogs || rmLogs.length === 0 || !exerciseName) return null;

  const log = findRmLogForExercise(rmLogs, exerciseName, exerciseId);
  if (!log || !log.records || log.records.length === 0) return null;

  const highestRecord = getHighestRmRecord(log);
  if (!highestRecord || highestRecord.weight <= 0) return null;

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
      className={`inline-flex items-center gap-1 font-bold rounded-md bg-amber-50 text-amber-900 border border-amber-200/90 shadow-2xs shrink-0 select-none ${sizeClasses} ${className}`}
      title={`Mayor RM registrado: ${highestRecord.weight} kg (${highestRecord.date || 'Récord personal'})`}
    >
      <Trophy className={`${iconClasses} text-amber-500 fill-amber-400/40 shrink-0`} />
      <span>RM: {highestRecord.weight} kg</span>
    </span>
  );
};
