import React from 'react';
import { Calendar, Dumbbell, Edit3, Trash2 } from 'lucide-react';
import type { FlattenedDiaryEntry } from '../../utils/diaryCalculations';
import { formatDiaryDateDisplay, getFeelingConfig } from '../../utils/diaryCalculations';

interface DiaryEntryCardProps {
  item: FlattenedDiaryEntry;
  onFilterExercise: (exerciseName: string) => void;
  onEdit: (entry: FlattenedDiaryEntry) => void;
  onDelete: (diaryId: string, entryId: string, exerciseName: string) => void;
}

export const DiaryEntryCard: React.FC<DiaryEntryCardProps> = ({
  item,
  onFilterExercise,
  onEdit,
  onDelete,
}) => {
  const feelingCfg = getFeelingConfig(item.feeling);
  const dateInfo = formatDiaryDateDisplay(item.date);

  return (
    <article
      id={`diary-entry-card-${item.id}`}
      className="bg-[#1C1C1E] rounded-2xl border border-white/[0.08] hover:border-white/20 p-4 sm:p-6 shadow-lg transition-all flex flex-col justify-between group"
    >
      {/* Entry Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-extrabold text-xs sm:text-sm text-white flex items-center gap-1.5">
            <Dumbbell className="w-4 h-4 text-[#00FF87]" />
            {item.exerciseName}
          </span>

          {item.category && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/[0.06] text-zinc-400 uppercase tracking-wider border border-white/5">
              {item.category}
            </span>
          )}

          {item.feeling && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${feelingCfg.badgeClass}`}
            >
              <span>{feelingCfg.emoji}</span>
              <span>{feelingCfg.label}</span>
            </span>
          )}
        </div>

        {/* Date badge */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
          <Calendar className="w-3.5 h-3.5 text-zinc-500" />
          <span>{dateInfo.formatted}</span>
          {dateInfo.tag && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-[#00FF87]/15 text-[#00FF87] border border-[#00FF87]/30">
              {dateInfo.tag}
            </span>
          )}
        </div>
      </div>

      {/* Entry Note Body (Spacious & Comfortable) */}
      <div className="py-4 text-sm sm:text-base text-zinc-200 leading-relaxed sm:leading-loose whitespace-pre-wrap font-normal selection:bg-[#00FF87]/20">
        {item.note}
      </div>

      {/* Entry Footer / Actions */}
      <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onFilterExercise(item.exerciseName)}
            className="text-[11px] font-semibold text-zinc-400 hover:text-[#00FF87] transition-colors"
            title={`Ver todos los registros de ${item.exerciseName}`}
          >
            Filtrar solo este ejercicio
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-colors active:scale-95"
            title="Editar registro"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Editar</span>
          </button>

          <button
            type="button"
            onClick={() => onDelete(item.diaryId, item.id, item.exerciseName)}
            className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors active:scale-95"
            title="Eliminar registro"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
};
