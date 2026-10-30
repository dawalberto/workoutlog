import React from 'react';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Trophy,
  X,
} from 'lucide-react';
import {
  getHighestRmRecord,
  getLatestRmRecord,
  formatRmDate,
} from '../../utils/rmCalculations';
import { normalizeExerciseTitle } from '../../utils/backup';
import { formatExerciseCategories } from '../../utils/exerciseCategories';
import { RmRecordHistory } from './RmRecordHistory';
import { ExerciseThumbnail } from '../ExerciseThumbnail';
import type { useRmLogActions } from '../../hooks/useRmLogActions';
import { useRmExerciseList } from '../../hooks/rm-logs/useRmExerciseList';
import { AddExerciseToRmModal } from './AddExerciseToRmModal';
import { QuickRmRecordModal } from './QuickRmRecordModal';

interface RmExerciseListProps {
  actions: ReturnType<typeof useRmLogActions>;
}

export const RmExerciseList: React.FC<RmExerciseListProps> = ({
  actions,
}) => {
  const { catalog, rmLogs, filteredRmLogs, catalogImageMap } =
    useRmExerciseList(actions.searchTerm);
  const { searchTerm, setSearchTerm, expandedExerciseId, setExpandedExerciseId } = actions;
  return (
  <>
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-[#00FF87]">
            <Trophy className="w-3.5 h-3.5" /> Registro de RMs
          </h1>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#00FF87]/15 text-[#00FF87] border border-[#00FF87]/30">
            {rmLogs.length} ejercicios
          </span>
        </div>
        <p className="text-xs sm:text-sm text-[#A1A1AA] mt-0.5">
          Historial de pesos máximos (1RM) y récords en ejercicios de tu biblioteca.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          id="btn-open-add-rm-exercise"
          type="button"
          onClick={actions.handleOpenAddModal}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 min-h-[48px] rounded-2xl bg-[#00FF87] hover:bg-[#00e57a] text-black font-extrabold text-sm shadow-[0_0_20px_rgba(0,255,135,0.35)] transition-all active:scale-[0.97]"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Añadir Ejercicio</span>
        </button>
      </div>
    </div>

    {rmLogs.length > 0 && (
      <div className="my-6">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="search-rm-exercises"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por ejercicio o grupo muscular..."
            className="w-full min-h-[48px] pl-11 pr-10 py-2.5 text-sm rounded-2xl border border-white/10 bg-[#1C1C1E] text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#00FF87] focus:ring-2 focus:ring-[#00FF87]/20 transition-all shadow-inner"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    )}

    {rmLogs.length === 0 ? (
      <div className="text-center py-16 px-6 rounded-2xl border border-white/[0.08] bg-[#1C1C1E] shadow-xl max-w-md mx-auto my-6">
        <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/10 text-[#00FF87] mx-auto flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(0,255,135,0.2)]">
          <Trophy className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-white mb-1">
          Aún no tienes ejercicios con RM registrado
        </h2>
        <p className="text-xs sm:text-sm text-[#A1A1AA] max-w-md mx-auto mb-6 leading-relaxed">
          Lleva el control de tus marcas personales (1RM). Selecciona cualquier ejercicio de tu
          biblioteca y anota tus progresos a lo largo del tiempo.
        </p>

        {catalog.length > 0 ? (
          <button
            id="btn-empty-add-rm"
            type="button"
            onClick={actions.handleOpenEmptyAddModal}
            className="inline-flex items-center gap-2 px-6 min-h-[48px] rounded-2xl bg-[#00FF87] hover:bg-[#00e57a] text-black font-extrabold text-sm shadow-[0_0_20px_rgba(0,255,135,0.35)] transition-all active:scale-[0.97]"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Añadir primer ejercicio</span>
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-amber-300 font-semibold bg-amber-500/10 p-3 rounded-xl max-w-sm mx-auto border border-amber-500/30">
              Tu biblioteca de ejercicios está vacía. Añade ejercicios primero en la Biblioteca para poder registrar su RM.
            </p>
            <button
              type="button"
              onClick={actions.onGoToCatalog}
              className="inline-flex items-center gap-2 px-5 min-h-[44px] rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs border border-white/10 transition-all active:scale-95"
            >
              <span>Ir a la Biblioteca</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    ) : filteredRmLogs.length === 0 ? (
      <div className="text-center py-12 px-4 rounded-2xl bg-[#1C1C1E] border border-white/[0.08]">
        <Search className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
        <p className="text-sm font-semibold text-zinc-300">
          No se encontraron ejercicios que coincidan con &quot;{searchTerm}&quot;
        </p>
        <button
          type="button"
          onClick={() => setSearchTerm('')}
          className="mt-3 text-xs text-[#00FF87] font-bold hover:underline"
        >
          Limpiar búsqueda
        </button>
      </div>
    ) : (
      <div className="space-y-4">
        {filteredRmLogs.map((log) => {
          const isExpanded = expandedExerciseId === log.id;
          const latestRecord = getLatestRmRecord(log);
          const highestRecord = getHighestRmRecord(log);
          const normName = normalizeExerciseTitle(log.exerciseName);
          const imageUrl =
            (log.exerciseId && catalogImageMap.get(log.exerciseId)) ||
            catalogImageMap.get(normName);
          const openQuickLog = () => actions.handleOpenQuickLog(log);

          return (
            <div
              key={log.id}
              id={`rm-exercise-card-${log.id}`}
              className="bg-[#1C1C1E] rounded-2xl border border-white/[0.08] shadow-lg hover:border-white/20 transition-all overflow-hidden"
            >
              <div className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-zinc-900 border border-white/10 overflow-hidden shrink-0">
                      <ExerciseThumbnail
                        name={log.exerciseName}
                        imageUrl={imageUrl}
                        className="w-full h-full"
                        iconClassName="w-7 h-7 text-zinc-500"
                        initialsClassName="text-sm"
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        {formatExerciseCategories(log) && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-400 border border-white/5">
                            {formatExerciseCategories(log)}
                          </span>
                        )}
                        <span className="text-[11px] text-[#A1A1AA] font-medium">
                          {log.records.length} {log.records.length === 1 ? 'registro' : 'registros'}
                        </span>
                      </div>
                      <h2 className="text-base sm:text-lg font-black text-white tracking-tight truncate">
                        {log.exerciseName}
                      </h2>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/[0.06]">
                    <div className="bg-zinc-900/80 border border-[#00FF87]/30 rounded-xl px-3 py-1.5 text-center min-w-[90px] shadow-inner">
                      <span className="block text-[10px] font-bold text-[#00FF87] uppercase tracking-wide">
                        Último RM
                      </span>
                      <span className="text-base sm:text-lg font-black text-white font-mono">
                        {latestRecord ? `${latestRecord.weight} kg` : '--'}
                      </span>
                      {latestRecord && (
                        <span className="block text-[10px] text-zinc-400 font-medium">
                          {formatRmDate(latestRecord.date)}
                        </span>
                      )}
                    </div>

                    <div className="bg-zinc-900/80 border border-[#00E5FF]/30 rounded-xl px-3 py-1.5 text-center min-w-[90px] hidden xs:block shadow-inner">
                      <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-[#00E5FF] uppercase tracking-wide">
                        <Sparkles className="w-3 h-3 text-[#00E5FF]" />
                        <span>Récord Max</span>
                      </div>
                      <span className="text-base sm:text-lg font-black text-white font-mono">
                        {highestRecord ? `${highestRecord.weight} kg` : '--'}
                      </span>
                      {highestRecord && (
                        <span className="block text-[10px] text-zinc-400 font-medium">
                          {formatRmDate(highestRecord.date)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        id={`btn-quick-log-${log.id}`}
                        type="button"
                        onClick={openQuickLog}
                        className="px-3 min-h-[44px] rounded-xl bg-[#00FF87] hover:bg-[#00e57a] text-black font-extrabold text-xs transition-all active:scale-[0.97] flex items-center gap-1 shadow-[0_0_15px_rgba(0,255,135,0.25)]"
                        title="Añadir nuevo registro rápido"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span className="hidden sm:inline">Nuevo RM</span>
                      </button>

                      <button
                        id={`btn-toggle-history-${log.id}`}
                        type="button"
                        onClick={() => setExpandedExerciseId(isExpanded ? null : log.id)}
                        className={`min-h-[44px] min-w-[44px] p-2.5 rounded-xl border transition-all active:scale-95 flex items-center justify-center ${
                          isExpanded
                            ? 'bg-zinc-800 text-white border-white/20'
                            : 'bg-zinc-900 text-zinc-400 border-white/10 hover:text-white hover:border-white/20'
                        }`}
                        title={isExpanded ? 'Ocultar historial' : 'Ver historial'}
                        aria-label={isExpanded ? 'Ocultar historial' : 'Ver historial'}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        id={`btn-delete-rm-exercise-${log.id}`}
                        type="button"
                        onClick={() => actions.handleDeleteExercise(log.id, log.exerciseName)}
                        className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl border border-red-500/20 bg-zinc-900 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all active:scale-95 flex items-center justify-center"
                        title="Eliminar ejercicio de RMs"
                        aria-label="Eliminar ejercicio de RMs"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <RmRecordHistory
                  log={log}
                  recordForm={actions.recordForm}
                  onOpenQuickLog={openQuickLog}
                />
              )}
            </div>
          );
        })}
      </div>
    )}
    {actions.quickLogTarget && (
      <QuickRmRecordModal
        target={actions.quickLogTarget}
        onClose={() => actions.setQuickLogTarget(null)}
        form={actions.quickForm}
      />
    )}
    <AddExerciseToRmModal
      isOpen={actions.isAddModalOpen}
      onClose={() => actions.setIsAddModalOpen(false)}
      form={actions.addForm}
    />
  </>
  );
};
