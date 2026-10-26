import React from 'react';
import {
  ArrowRight,
  BookOpen,
  Dumbbell,
  Plus,
  Search,
  X,
} from 'lucide-react';
import type { ExerciseDefinition } from '../../types';
import { normalizeExerciseTitle } from '../../utils/backup';
import type { DiaryFiltersState } from '../../hooks/useExerciseDiary';

interface DiaryFiltersProps {
  catalog: ExerciseDefinition[];
  totalEntriesCount: number;
  allEntriesCount: number;
  exercisesWithDiary: { def: ExerciseDefinition; count: number }[];
  filters: DiaryFiltersState;
  onCreate: () => void;
  onGoToCatalog: () => void;
}

export const DiaryFilters: React.FC<DiaryFiltersProps> = ({
  catalog,
  totalEntriesCount,
  allEntriesCount,
  exercisesWithDiary,
  filters,
  onCreate,
  onGoToCatalog,
}) => (
  <>
    {/* Top Header Card */}
    <div className="bg-[#1C1C1E] rounded-2xl border border-white/[0.08] p-5 sm:p-6 shadow-xl mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-xl bg-zinc-900 border border-white/10 text-[#00FF87]">
              <BookOpen className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Diario de Ejercicios
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-[#00FF87]/15 text-[#00FF87] border border-[#00FF87]/30">
              {totalEntriesCount} {totalEntriesCount === 1 ? 'registro' : 'registros'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#A1A1AA]">
            Anota sensaciones, progresiones técnicas y detalles de tus levantamientos.
          </p>
        </div>

        <button
          id="btn-new-diary-entry"
          type="button"
          onClick={() => onCreate()}
          disabled={catalog.length === 0}
          className="inline-flex items-center justify-center gap-2 px-5 min-h-[48px] rounded-2xl bg-[#00FF87] hover:bg-[#00e57a] disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-extrabold text-sm shadow-[0_0_20px_rgba(0,255,135,0.35)] active:scale-[0.97] transition-all shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Nuevo Registro</span>
        </button>
      </div>

      {/* Catalog Empty Warning */}
      {catalog.length === 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center mt-4">
          <Dumbbell className="w-6 h-6 text-amber-400 mx-auto mb-1.5" />
          <h3 className="text-sm font-bold text-amber-300 mb-0.5">
            Tu biblioteca de ejercicios está vacía
          </h3>
          <p className="text-xs text-amber-200/80 max-w-md mx-auto mb-3">
            Para registrar notas en el diario, primero debes añadir ejercicios a tu biblioteca.
          </p>
          <button
            type="button"
            onClick={onGoToCatalog}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 transition-colors"
          >
            Ir a la Biblioteca de Ejercicios <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="mt-5 pt-4 border-t border-white/[0.08] space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => filters.setSearchQuery(e.target.value)}
              placeholder="Buscar en las notas, ejercicios o fechas..."
              className="w-full min-h-[48px] pl-11 pr-10 py-2.5 text-sm rounded-2xl border border-white/10 bg-zinc-900/90 text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#00FF87] focus:ring-2 focus:ring-[#00FF87]/20 transition-all shadow-inner"
            />
            {filters.searchQuery && (
              <button
                type="button"
                onClick={() => filters.setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white rounded-md"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Feeling Filter Pills */}
          <div className="flex items-center gap-1 p-1 bg-zinc-900/80 rounded-2xl border border-white/10 shrink-0 overflow-x-auto min-h-[48px]">
            <button
              type="button"
              onClick={() => filters.setSelectedFeelingFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all ${
                filters.selectedFeelingFilter === 'ALL'
                  ? 'bg-[#00FF87] text-black shadow-[0_0_10px_rgba(0,255,135,0.4)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => filters.setSelectedFeelingFilter('good')}
              className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all ${
                filters.selectedFeelingFilter === 'good'
                  ? 'bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Filtrar por sensación: Bien"
            >
              <span>🟢</span>
              <span className="hidden sm:inline">Bien</span>
            </button>
            <button
              type="button"
              onClick={() => filters.setSelectedFeelingFilter('neutral')}
              className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all ${
                filters.selectedFeelingFilter === 'neutral'
                  ? 'bg-amber-400 text-black shadow-[0_0_10px_rgba(251,191,36,0.4)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Filtrar por sensación: Regular"
            >
              <span>🟠</span>
              <span className="hidden sm:inline">Regular</span>
            </button>
            <button
              type="button"
              onClick={() => filters.setSelectedFeelingFilter('bad')}
              className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all ${
                filters.selectedFeelingFilter === 'bad'
                  ? 'bg-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.4)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Filtrar por sensación: Mal"
            >
              <span>🔴</span>
              <span className="hidden sm:inline">Mal</span>
            </button>
          </div>
        </div>

        {/* Exercise Quick-Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs pt-1">
          <button
            type="button"
            onClick={() => filters.setSelectedExerciseName('ALL')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all shrink-0 ${
              filters.selectedExerciseName === 'ALL'
                ? 'bg-[#00FF87] text-black shadow-[0_0_10px_rgba(0,255,135,0.4)]'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/10'
            }`}
          >
            <span>Todos los ejercicios</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                filters.selectedExerciseName === 'ALL'
                  ? 'bg-black/20 text-black'
                  : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {allEntriesCount}
            </span>
          </button>

          {exercisesWithDiary.map(({ def, count }) => {
            const isSelected =
              normalizeExerciseTitle(filters.selectedExerciseName) === normalizeExerciseTitle(def.name);
            return (
              <button
                key={def.id}
                type="button"
                onClick={() => filters.setSelectedExerciseName(def.name)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all shrink-0 ${
                  isSelected
                    ? 'bg-[#00FF87] text-black shadow-[0_0_10px_rgba(0,255,135,0.4)]'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/10'
                }`}
              >
                <span>{def.name}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    isSelected
                      ? 'bg-black/20 text-black'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  </>
);
