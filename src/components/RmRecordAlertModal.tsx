import React, { useState, useEffect } from 'react';
import { Trophy, Check, X, ArrowUpRight, Flame } from 'lucide-react';
import { formatRmDate } from '../utils/rmCalculations';

interface RmRecordAlertModalProps {
  isOpen: boolean;
  exerciseName: string;
  newWeight: number;
  previousRmWeight: number;
  previousRmDate?: string;
  onConfirm: (shouldUpdateRm: boolean) => void;
  onClose: () => void;
}

export const RmRecordAlertModal: React.FC<RmRecordAlertModalProps> = ({
  isOpen,
  exerciseName,
  newWeight,
  previousRmWeight,
  previousRmDate,
  onConfirm,
  onClose,
}) => {
  const [shouldUpdateRm, setShouldUpdateRm] = useState(true);

  // Reset to true whenever modal opens for a new weight
  useEffect(() => {
    if (isOpen) {
      setShouldUpdateRm(true);
    }
  }, [isOpen, newWeight, exerciseName]);

  if (!isOpen) return null;

  const diffKg = Number((newWeight - previousRmWeight).toFixed(2));

  const handleDone = () => {
    onConfirm(shouldUpdateRm);
  };

  return (
    <div
      id="modal-rm-alert"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#1C1C1E] rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-white/[0.1] animate-in zoom-in-95 duration-200 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <Trophy className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-black text-amber-400 uppercase tracking-wider">
                <Flame className="w-3.5 h-3.5 fill-current text-amber-400" />
                <span>Nuevo peso superior a tu RM</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                {exerciseName}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-white/[0.08] transition-colors"
            aria-label="Cerrar aviso"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comparison card */}
        <div className="bg-black/30 border border-white/[0.08] rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
            <span>Último RM registrado</span>
            <span>Nuevo peso introducido</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-xl sm:text-2xl font-black text-zinc-400 font-mono">
                {previousRmWeight} kg
              </span>
              {previousRmDate && (
                <span className="block text-[11px] text-zinc-500 font-medium">
                  {formatRmDate(previousRmDate)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 text-[#00FF87] font-black text-xs bg-[#00FF87]/15 border border-[#00FF87]/30 px-2.5 py-1 rounded-lg">
              <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
              <span>+{diffKg} kg</span>
            </div>

            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-black text-[#00FF87] font-mono">
                {newWeight} kg
              </span>
              <span className="block text-[11px] text-[#00FF87] font-extrabold">
                ¡Nuevo récord!
              </span>
            </div>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-zinc-300 mb-5 leading-relaxed">
          Has indicado un peso de <strong className="text-[#00FF87]">{newWeight} kg</strong> en{' '}
          <strong className="text-white">{exerciseName}</strong>, el cual supera el último RM que
          tenías registrado (<strong className="text-zinc-400">{previousRmWeight} kg</strong>).
        </p>

        {/* Checkbox option (checked by default) */}
        <div className="mb-6 p-4 rounded-2xl bg-black/30 border border-amber-500/30">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              id="chk-update-rm-log"
              checked={shouldUpdateRm}
              onChange={(e) => setShouldUpdateRm(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded accent-[#00FF87]"
            />
            <span className="text-xs font-semibold text-zinc-200 leading-snug">
              Actualizar y añadir nuevo registro de RM con este peso (<strong>{newWeight} kg</strong>) a este ejercicio
            </span>
          </label>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 min-h-[44px] text-xs sm:text-sm font-semibold text-zinc-400 hover:text-white rounded-xl hover:bg-white/[0.06] transition-colors"
          >
            Cancelar
          </button>

          <button
            id="btn-confirm-rm-alert"
            type="button"
            onClick={handleDone}
            className="w-full sm:w-auto px-6 py-2.5 min-h-[48px] text-xs sm:text-sm font-extrabold text-black bg-[#00FF87] hover:bg-[#00e57a] rounded-xl transition-all shadow-[0_0_15px_rgba(0,255,135,0.3)] active:scale-[0.97] flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4 text-black stroke-[3]" />
            <span>Aceptar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
