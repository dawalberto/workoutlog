import { t } from '../utils/i18n';
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
    ? t('Diario: {0} {1} guardados (clic para ver)', count, count === 1 ? t('registro') : t('registros'))
    : t('Añadir primer registro al diario de este ejercicio');

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleClick}
        title={tooltip}
        aria-label={tooltip}
        className={`p-1 transition-colors shrink-0 ${
          hasEntries ? 'text-[#00FF87] hover:text-[#00FF87]/80' : 'text-zinc-500 hover:text-white'
        } ${className}`}
      >
        <BookOpen className="w-4 h-4" />
      </button>
    );
  }

  // 'compact' or 'badge' variant: text-only trigger, no button chrome
  return (
    <button
      type="button"
      onClick={handleClick}
      title={tooltip}
      aria-label={tooltip}
      className={`inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold transition-colors shrink-0 select-none ${
        hasEntries ? 'text-[#00FF87] hover:text-[#00FF87]/80' : 'text-zinc-400 hover:text-white'
      } ${className}`}
    >
      <BookOpen className="w-3.5 h-3.5" />
      <span>{t("Diario")}</span>
    </button>
  );
};
