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
        className={`relative p-2 rounded-xl text-zinc-400 hover:text-[#00FF87] hover:bg-zinc-800 active:scale-95 transition-all shrink-0 ${className}`}
      >
        <BookOpen className="w-4 h-4" />
        {hasEntries && (
          <span className="absolute -top-1 -right-1 px-1 min-w-[14px] h-[14px] leading-[14px] text-[9px] font-black rounded-full bg-[#00FF87] text-black flex items-center justify-center shadow-xs">
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
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all shrink-0 active:scale-95 select-none ${
        hasEntries
          ? 'bg-[#00FF87]/15 text-[#00FF87] border border-[#00FF87]/30 hover:bg-[#00FF87]/25 shadow-[0_0_8px_rgba(0,255,135,0.2)]'
          : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-white/10'
      } ${className}`}
    >
      <BookOpen className={`w-3.5 h-3.5 ${hasEntries ? 'text-[#00FF87]' : 'text-zinc-500'}`} />
      <span>Diario</span>
      {hasEntries && (
        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-[#00FF87] text-black ml-0.5">
          {count}
        </span>
      )}
    </button>
  );
};
