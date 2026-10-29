import React from 'react';
import { BookOpen, Check, X } from 'lucide-react';
import type { ExerciseDefinition, ExerciseDiaryEntry } from '../../types';
import type { DiaryEntryFormState } from '../../hooks/useExerciseDiary';
import { formatExerciseCategories } from '../../utils/exerciseCategories';

interface DiaryEntryModalProps {
  isOpen: boolean;
  editingEntry: { diaryId: string; entry: ExerciseDiaryEntry } | null;
  catalog: ExerciseDefinition[];
  form: DiaryEntryFormState;
  onClose: () => void;
  onSave: (event?: React.FormEvent) => void;
}

export const DiaryEntryModal: React.FC<DiaryEntryModalProps> = ({
  isOpen,
  editingEntry,
  catalog,
  form,
  onClose,
  onSave,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="modal-diary-form"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-[#1C1C1E] rounded-2xl border border-white/[0.1] shadow-2xl max-w-xl w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-white/[0.08] shrink-0 bg-[#1C1C1E] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-[#00FF87]/15 text-[#00FF87] border border-[#00FF87]/30">
              <BookOpen className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                {editingEntry ? 'Editar Registro del Diario' : 'Nuevo Registro en el Diario'}
              </h2>
              <span className="text-[11px] text-zinc-400 font-medium">
                Añade tus observaciones y sensaciones
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-white/[0.08] transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={onSave} className="flex-1 flex flex-col overflow-hidden">
          <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
            {form.formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 font-semibold animate-in fade-in">
                {form.formError}
              </div>
            )}

            {/* Exercise Selector */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                Ejercicio de la Biblioteca <span className="text-rose-500">*</span>
              </label>
              <select
                value={form.formExerciseName}
                disabled={Boolean(editingEntry)}
                onChange={(e) => form.setFormExerciseName(e.target.value)}
                className="w-full min-h-[48px] px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-white/10 bg-black/40 text-white font-semibold focus:outline-none focus:border-[#00FF87] focus:ring-1 focus:ring-[#00FF87] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {catalog.map((c) => (
                  <option key={c.id} value={c.name} className="bg-[#1C1C1E] text-white">
                    {c.name} {formatExerciseCategories(c) ? `(${formatExerciseCategories(c)})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Picker */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                Fecha del Registro <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={form.formDate}
                onChange={(e) => form.setFormDate(e.target.value)}
                className="w-full min-h-[48px] px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-white/10 bg-black/40 text-white font-semibold focus:outline-none focus:border-[#00FF87] focus:ring-1 focus:ring-[#00FF87] transition-all"
              />
            </div>

            {/* Sensation / Feeling Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Sensación en la sesión
                </label>
                {form.formFeeling && (
                  <button
                    type="button"
                    onClick={() => form.setFormFeeling(undefined)}
                    className="text-[11px] text-zinc-400 hover:text-white"
                  >
                    Quitar sensación
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => form.setFormFeeling('good')}
                  className={`min-h-[48px] p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.97] ${
                    form.formFeeling === 'good'
                      ? 'bg-emerald-500 text-black border-emerald-400 font-black shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                      : 'bg-emerald-950/20 text-emerald-300 border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-950/40'
                  }`}
                >
                  <span className="text-base">🟢</span>
                  <span>Bien</span>
                </button>

                <button
                  type="button"
                  onClick={() => form.setFormFeeling('neutral')}
                  className={`min-h-[48px] p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.97] ${
                    form.formFeeling === 'neutral'
                      ? 'bg-amber-500 text-black border-amber-400 font-black shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                      : 'bg-amber-950/20 text-amber-300 border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-950/40'
                  }`}
                >
                  <span className="text-base">🟠</span>
                  <span>Regular</span>
                </button>

                <button
                  type="button"
                  onClick={() => form.setFormFeeling('bad')}
                  className={`min-h-[48px] p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.97] ${
                    form.formFeeling === 'bad'
                      ? 'bg-rose-500 text-white border-rose-400 font-black shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                      : 'bg-rose-950/20 text-rose-300 border-rose-500/20 hover:border-rose-500/40 hover:bg-rose-950/40'
                  }`}
                >
                  <span className="text-base">🔴</span>
                  <span>Mal</span>
                </button>
              </div>
            </div>

            {/* Note / Journal Entry Textarea (Spacious & Comfortable) */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                Nota y Observaciones <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={6}
                value={form.formNote}
                onChange={(e) => form.setFormNote(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    onSave();
                  }
                }}
                placeholder="Ej: Hoy ha tocado en la parte de fuera 6s x 4r al 80% del RM y me he puesto 55kg y casi peto..."
                className="w-full p-3.5 text-xs sm:text-sm rounded-xl border border-white/10 bg-black/40 text-white focus:outline-none focus:border-[#00FF87] focus:ring-1 focus:ring-[#00FF87] resize-y min-h-[140px] leading-relaxed placeholder-zinc-500 transition-all selection:bg-[#00FF87]/20"
              />
              <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-1">
                <span>Espacio amplio para notas largas y técnicas</span>
                <span>Ctrl + Enter para guardar</span>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-5 sm:px-6 py-4 border-t border-white/[0.08] bg-black/30 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 min-h-[44px] text-xs sm:text-sm font-semibold text-zinc-400 hover:text-white rounded-xl hover:bg-white/[0.06] transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-5 py-2.5 min-h-[48px] text-xs sm:text-sm font-extrabold text-black bg-[#00FF87] hover:bg-[#00e57a] rounded-xl shadow-[0_0_15px_rgba(0,255,135,0.3)] transition-all active:scale-[0.97] flex items-center gap-2"
            >
              <Check className="w-4 h-4 text-black stroke-[3]" />
              <span>{editingEntry ? 'Actualizar Registro' : 'Guardar en el Diario'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
