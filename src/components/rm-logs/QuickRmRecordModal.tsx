import React from 'react';
import { Plus, Trophy, X } from 'lucide-react';
import type { ExerciseRmLog } from '../../types';
import type { useQuickRmRecordForm } from '../../hooks/rm-logs/useQuickRmRecordForm';
import { formatWeightInput, parseWeightInput } from '../../utils/weightInput';

interface QuickRmRecordModalProps {
  target: ExerciseRmLog;
  onClose: () => void;
  form: ReturnType<typeof useQuickRmRecordForm>;
}

export const QuickRmRecordModal: React.FC<QuickRmRecordModalProps> = ({
  target,
  onClose,
  form,
}) => {
  return (
  <div
    id="modal-quick-add-rm"
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    onClick={onClose}
  >
    <div
      className="bg-[#1C1C1E] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-white/[0.08] animate-in zoom-in-95 duration-200 text-white"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/10 text-[#00FF87] flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
              Nuevo registro de RM
            </h3>
            <p className="text-xs text-[#A1A1AA] font-semibold">{target.exerciseName}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-3.5 mb-5">
        <div>
          <label className="block text-xs font-bold text-[#A1A1AA] uppercase tracking-wide mb-1">
            Peso Máximo (kg) *
          </label>
          <input
            type="text"
            inputMode="decimal"
            pattern="[0-9]*[.,]?[0-9]*"
            min="0"
            placeholder="Ej: 100"
            value={form.weight}
            onChange={(e) => form.setWeight(e.target.value)}
            onBlur={(e) => {
              const parsedWeight = parseWeightInput(e.currentTarget.value);
              if (parsedWeight !== null) form.setWeight(formatWeightInput(parsedWeight));
            }}
            autoFocus
            className="w-full min-h-[48px] px-3.5 py-2.5 text-base font-bold rounded-xl border border-white/10 bg-zinc-900 text-white focus:outline-none focus:border-[#00FF87] focus:ring-2 focus:ring-[#00FF87]/20"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-[#A1A1AA] uppercase tracking-wide mb-1">
            Fecha *
          </label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => form.setDate(e.target.value)}
            className="w-full min-h-[48px] px-3.5 py-2 text-xs font-semibold rounded-xl border border-white/10 bg-zinc-900 text-white focus:outline-none focus:border-[#00FF87] focus:ring-2 focus:ring-[#00FF87]/20"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-[#A1A1AA] uppercase tracking-wide mb-1">
            Notas / Observaciones (opcional)
          </label>
          <input
            type="text"
            placeholder="Ej: Nueva barra, RPE 10, técnica perfecta..."
            value={form.notes}
            onChange={(e) => form.setNotes(e.target.value)}
            className="w-full min-h-[48px] px-3.5 py-2 text-xs rounded-xl border border-white/10 bg-zinc-900 text-white focus:outline-none focus:border-[#00FF87] focus:ring-2 focus:ring-[#00FF87]/20"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2.5">
        <button
          type="button"
          onClick={onClose}
          className="px-4 min-h-[48px] text-xs sm:text-sm font-semibold text-zinc-400 hover:text-white rounded-xl"
        >
          Cancelar
        </button>
        <button
          id="btn-submit-quick-rm"
          type="button"
          onClick={form.handleSubmit}
          className="px-5 min-h-[48px] text-xs sm:text-sm font-extrabold text-black bg-[#00FF87] hover:bg-[#00e57a] rounded-xl shadow-[0_0_20px_rgba(0,255,135,0.35)] transition-all active:scale-[0.97] flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4 stroke-[3]" /> Guardar RM
        </button>
      </div>
    </div>
  </div>
  );
};
