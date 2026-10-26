import React from 'react';
import { BookOpen, Plus } from 'lucide-react';
import type { FlattenedDiaryEntry } from '../../utils/diaryCalculations';
import { DiaryEntryCard } from './DiaryEntryCard';

interface DiaryEntryListProps {
  entries: FlattenedDiaryEntry[];
  hasCatalog: boolean;
  hasActiveFilters: boolean;
  onCreate: () => void;
  onFilterExercise: (exerciseName: string) => void;
  onEdit: (entry: FlattenedDiaryEntry) => void;
  onDelete: (diaryId: string, entryId: string, exerciseName: string) => void;
}

export const DiaryEntryList: React.FC<DiaryEntryListProps> = ({
  entries,
  hasCatalog,
  hasActiveFilters,
  onCreate,
  onFilterExercise,
  onEdit,
  onDelete,
}) => (
  <>
    {/* Entries List or Empty State */}
    {entries.length === 0 ? (
      <div className="bg-[#1C1C1E] rounded-2xl border border-white/[0.08] p-8 sm:p-12 text-center shadow-xl">
        <div className="w-14 h-14 rounded-2xl bg-white/[0.05] border border-white/10 text-zinc-400 mx-auto flex items-center justify-center mb-3">
          <BookOpen className="w-7 h-7 text-[#00FF87]" />
        </div>
        <h3 className="text-base font-bold text-white mb-1">
          No hay registros en el diario
        </h3>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto mb-4">
          {hasActiveFilters
            ? 'No se encontraron notas que coincidan con los filtros seleccionados.'
            : 'Empieza a registrar tus entrenamientos, sensaciones y notas técnicas para cada ejercicio.'}
        </p>
        {hasCatalog && (
          <button
            type="button"
            onClick={() => onCreate()}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#00FF87] hover:bg-[#00e57a] text-black text-xs sm:text-sm font-extrabold shadow-[0_0_15px_rgba(0,255,135,0.3)] transition-all active:scale-[0.97]"
          >
            <Plus className="w-4 h-4 text-black stroke-[2.5]" />
            <span>Añadir primer registro</span>
          </button>
        )}
      </div>
    ) : (
      <div className="space-y-4">
        {entries.map((item) => (
          <DiaryEntryCard
            key={item.id}
            item={item}
            onFilterExercise={onFilterExercise}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    )}
  </>
);
