import React from 'react';
import { BookOpen } from 'lucide-react';
import { ExerciseDiary } from '../types';
import { getDiaryEntriesCount } from '../utils/diaryCalculations';

export interface DiaryButtonProps {
  exerciseName: string;
  exerciseId?: string;
  diaries?: ExerciseDiary[];
  onOpenDiary: (exerciseName: string, exerciseId?: string) => void;
  variant?: 'icon' | 'badge' | 'compact';
  className?: string;
}

export const DiaryButton: React.FC<DiaryButtonProps> = ({
  exerciseName,
  exerciseId,
  diaries,
  onOpenDiary,
  variant = 'compact',
  className = '',
}) => {
  if (!exerciseName) return null;

  const count = getDiaryEntriesCount(diaries, exerciseName, exerciseId);
  const hasEntries = count > 0;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenDiary(exerciseName, exerciseId);
  };

  const tooltip = hasEntries
    ? `Diario: ${count} ${count === 1 ? 'registro' : 'registros'} guardados (clic para ver)`
    : 'Añadir primer registro al diario de este ejercicio';

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleClick}
        title={tooltip}
        aria-label={tooltip}
        className={`relative p-1.5 rounded-lg text-zinc-500 hover:text-emerald-700 hover:bg-emerald-50 active:scale-95 transition-all shrink-0 ${className}`}
      >
        <BookOpen className="w-3.5 h-3.5" />
        {hasEntries && (
          <span className="absolute -top-1 -right-1 px-1 min-w-[14px] h-[14px] leading-[14px] text-[9px] font-black rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
            {count}
          </span>
        )}
      </button>
    );
  }

  // 'compact' or 'badge' variant
  return (
    <button
      type="button"
      onClick={handleClick}
      title={tooltip}
      aria-label={tooltip}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold transition-all shrink-0 active:scale-95 select-none ${
        hasEntries
          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/90 hover:bg-emerald-100/80 shadow-2xs'
          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 border border-zinc-200/80 hover:text-zinc-900'
      } ${className}`}
    >
      <BookOpen className={`w-3 h-3 ${hasEntries ? 'text-emerald-600' : 'text-zinc-400'}`} />
      <span>Diario</span>
      {hasEntries && (
        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-600 text-white ml-0.5">
          {count}
        </span>
      )}
    </button>
  );
};
