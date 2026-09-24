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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-zinc-200 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 shadow-xs ring-4 ring-amber-50">
              <Trophy className="w-6 h-6 text-amber-500 fill-amber-500/20" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-600 uppercase tracking-wider">
                <Flame className="w-3.5 h-3.5 fill-current text-amber-500" />
                <span>Nuevo peso superior a tu RM</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-zinc-900 tracking-tight">
                {exerciseName}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-xl hover:bg-zinc-100 transition-colors"
            aria-label="Cerrar aviso"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comparison card */}
        <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
            <span>Último RM registrado</span>
            <span>Nuevo peso introducido</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-xl sm:text-2xl font-black text-zinc-700 font-mono">
                {previousRmWeight} kg
              </span>
              {previousRmDate && (
                <span className="block text-[11px] text-zinc-600 font-medium">
                  {formatRmDate(previousRmDate)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs bg-emerald-100/80 px-2 py-1 rounded-lg">
              <ArrowUpRight className="w-4 h-4" />
              <span>+{diffKg} kg</span>
            </div>

            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">
                {newWeight} kg
              </span>
              <span className="block text-[11px] text-emerald-700 font-bold">
                ¡Nuevo récord!
              </span>
            </div>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-zinc-600 mb-5 leading-relaxed">
          Has indicado un peso de <strong className="text-zinc-900">{newWeight} kg</strong> en{' '}
          <strong className="text-zinc-900">{exerciseName}</strong>, el cual supera el último RM que
          tenías registrado (<strong className="text-zinc-900">{previousRmWeight} kg</strong>).
        </p>

        {/* Checkbox option (checked by default) */}
        <div className="mb-6 p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              id="chk-update-rm-log"
              checked={shouldUpdateRm}
              onChange={(e) => setShouldUpdateRm(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-zinc-300"
            />
            <span className="text-xs font-semibold text-amber-950 leading-tight">
              Actualizar y añadir nuevo registro de RM con este peso (<strong>{newWeight} kg</strong>) a este ejercicio
            </span>
          </label>
        </div>

        {/* Action button */}
        <div className="flex items-center justify-end">
          <button
            id="btn-confirm-rm-alert"
            type="button"
            onClick={handleDone}
            className="w-full sm:w-auto px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Entendido</span>
          </button>
        </div>
      </div>
    </div>
  );
};
