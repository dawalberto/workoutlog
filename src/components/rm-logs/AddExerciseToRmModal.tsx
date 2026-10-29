import React from 'react';
import { Dumbbell, Plus, Search, Trophy, X } from 'lucide-react';
import type { useAddExerciseToRmModal } from '../../hooks/rm-logs/useAddExerciseToRmModal';
import { formatWeightInput, parseWeightInput } from '../../utils/weightInput';
import { formatExerciseCategories } from '../../utils/exerciseCategories';

interface AddExerciseToRmModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: ReturnType<typeof useAddExerciseToRmModal>;
}

export const AddExerciseToRmModal: React.FC<AddExerciseToRmModalProps> = ({
  isOpen,
  onClose,
  form,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="modal-add-rm-from-catalog"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-hidden"
      onClick={onClose}
    >
      <div
        className="bg-[#1C1C1E] rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-white/[0.08] animate-in zoom-in-95 duration-200 overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-white/10 text-[#00FF87] flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">
                Añadir ejercicio a RMs
              </h3>
              <p className="text-xs text-[#A1A1AA] font-medium">
                Selecciona un ejercicio de tu biblioteca
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {!form.selectedCatalogExercise ? (
            <>
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar en tu biblioteca de ejercicios..."
                  value={form.catalogSearch}
                  onChange={(e) => form.setCatalogSearch(e.target.value)}
                  className="w-full min-h-[48px] pl-10 pr-3 py-2 text-xs rounded-xl border border-white/10 bg-zinc-900 text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#00FF87]"
                />
              </div>

              <div className="space-y-2 max-h-64 sm:max-h-72 overflow-y-auto pr-1">
                {form.availableCatalog.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500 text-xs">
                    {form.catalog.length === 0 ? (
                      <span>No hay ejercicios creados en la biblioteca.</span>
                    ) : (
                      <span>Todos los ejercicios de tu biblioteca ya están añadidos al seguimiento de RMs.</span>
                    )}
                  </div>
                ) : (
                  form.availableCatalog.map((exercise) => (
                    <button
                      key={exercise.id}
                      type="button"
                      onClick={() => form.handleSelectCatalogExercise(exercise)}
                      className="w-full flex items-center justify-between p-3 rounded-2xl border border-white/10 hover:border-[#00FF87] hover:bg-[#00FF87]/10 text-left transition-all group active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                          {exercise.imageUrl ? (
                            <img
                              src={exercise.imageUrl}
                              alt={exercise.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Dumbbell className="w-5 h-5 text-zinc-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="block font-bold text-xs sm:text-sm text-white truncate group-hover:text-[#00FF87]">
                            {exercise.name}
                          </span>
                          {formatExerciseCategories(exercise) && (
                            <span className="text-[10px] text-zinc-400 font-semibold">
                              {formatExerciseCategories(exercise)}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-bold text-[#00FF87] shrink-0 ml-2">
                        Elegir &rarr;
                      </span>
                    </button>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900 border border-white/10">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-black border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                    {form.selectedCatalogExercise.imageUrl ? (
                      <img
                        src={form.selectedCatalogExercise.imageUrl}
                        alt={form.selectedCatalogExercise.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Dumbbell className="w-4 h-4 text-zinc-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white block truncate">
                      {form.selectedCatalogExercise.name}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-medium">
                      {formatExerciseCategories(form.selectedCatalogExercise) || 'General'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={form.handleClearSelectedExercise}
                  className="text-xs font-bold text-[#00FF87] hover:underline"
                >
                  Cambiar
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#A1A1AA] uppercase tracking-wide mb-1">
                  Peso Máximo (1RM) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.,]?[0-9]*"
                    min="0"
                    placeholder="Ej: 100"
                    value={form.initialWeight}
                    onChange={(e) => form.setInitialWeight(e.target.value)}
                    onBlur={(e) => {
                      const parsedWeight = parseWeightInput(e.currentTarget.value);
                      if (parsedWeight !== null) form.setInitialWeight(formatWeightInput(parsedWeight));
                    }}
                    autoFocus
                    className="w-full min-h-[48px] px-3.5 py-2.5 text-base font-bold rounded-xl border border-white/10 bg-zinc-900 text-white focus:outline-none focus:border-[#00FF87] focus:ring-2 focus:ring-[#00FF87]/20 pr-10"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                    kg
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#A1A1AA] uppercase tracking-wide mb-1">
                  Fecha del registro *
                </label>
                <input
                  type="date"
                  value={form.initialDate}
                  onChange={(e) => form.setInitialDate(e.target.value)}
                  className="w-full min-h-[48px] px-3.5 py-2 text-xs font-semibold rounded-xl border border-white/10 bg-zinc-900 text-white focus:outline-none focus:border-[#00FF87] focus:ring-2 focus:ring-[#00FF87]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#A1A1AA] uppercase tracking-wide mb-1">
                  Notas / Observaciones (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Marca conseguida en competición, RPE 10..."
                  value={form.initialNotes}
                  onChange={(e) => form.setInitialNotes(e.target.value)}
                  className="w-full min-h-[48px] px-3.5 py-2 text-xs rounded-xl border border-white/10 bg-zinc-900 text-white focus:outline-none focus:border-[#00FF87] focus:ring-2 focus:ring-[#00FF87]/20"
                />
              </div>
            </div>
          )}
        </div>

        {form.selectedCatalogExercise && (
          <div className="p-4 border-t border-white/[0.08] bg-zinc-900/80 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={form.handleClearSelectedExercise}
              className="px-4 min-h-[48px] text-xs font-semibold text-zinc-400 hover:text-white rounded-xl"
            >
              Volver
            </button>
            <button
              id="btn-confirm-add-rm"
              type="button"
              onClick={form.handleConfirm}
              className="px-5 min-h-[48px] text-xs sm:text-sm font-extrabold text-black bg-[#00FF87] hover:bg-[#00e57a] rounded-xl shadow-[0_0_20px_rgba(0,255,135,0.35)] transition-all active:scale-[0.97] flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> Guardar en RMs
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
