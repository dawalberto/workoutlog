import React from 'react';
import { CheckCircle2, Flag, X } from 'lucide-react';

interface AllSetsCompleteFinishModalProps {
  isOpen: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
}

export const AllSetsCompleteFinishModal: React.FC<AllSetsCompleteFinishModalProps> = ({
  isOpen,
  onDismiss,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="modal-all-sets-complete"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onDismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="all-sets-complete-title"
        className="bg-[#1C1C1E] rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-white/[0.08] animate-in zoom-in-95 duration-200 text-white"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#00FF87]/15 border border-[#00FF87]/30 text-[#00FF87] flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 id="all-sets-complete-title" className="text-lg font-black text-white tracking-tight">
                Rutina completada
              </h2>
              <p className="text-sm text-zinc-400">Has completado todas las series.</p>
            </div>
          </div>
          <button
            id="btn-dismiss-all-sets-complete"
            type="button"
            onClick={onDismiss}
            aria-label="Seguir entrenando"
            className="min-h-[48px] min-w-[48px] inline-flex items-center justify-center text-zinc-400 hover:text-white rounded-xl hover:bg-white/[0.08] transition-colors active:scale-[0.97]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-zinc-300 leading-relaxed mb-6">
          ¿Quieres finalizar el entrenamiento y guardar el resumen de esta rutina?
        </p>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            onClick={onDismiss}
            className="w-full sm:w-auto px-4 py-2.5 min-h-[48px] text-sm font-semibold text-zinc-300 hover:text-white rounded-xl hover:bg-white/[0.06] transition-colors active:scale-[0.97]"
          >
            Seguir entrenando
          </button>
          <button
            id="btn-confirm-all-sets-complete"
            type="button"
            onClick={onConfirm}
            className="w-full sm:w-auto px-5 py-2.5 min-h-[48px] text-sm font-extrabold text-black bg-[#00FF87] hover:bg-[#00e57a] rounded-xl transition-all shadow-[0_0_15px_rgba(0,255,135,0.3)] active:scale-[0.97] flex items-center justify-center gap-2"
          >
            <Flag className="w-4 h-4 text-black stroke-[2.5]" />
            Finalizar rutina
          </button>
        </div>
      </div>
    </div>
  );
};
