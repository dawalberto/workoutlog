import React from 'react';
import { Flag, X, Clock, Layers, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatDetailedDuration } from '../utils/timeCalculations';

interface WorkoutFinishConfirmModalProps {
  isOpen: boolean;
  routineName: string;
  elapsedSeconds: number;
  completedSetsCount: number;
  totalSetsCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export const WorkoutFinishConfirmModal: React.FC<WorkoutFinishConfirmModalProps> = ({
  isOpen,
  routineName,
  elapsedSeconds,
  completedSetsCount,
  totalSetsCount,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const completionPercentage =
    totalSetsCount > 0 ? Math.round((completedSetsCount / totalSetsCount) * 100) : 0;
  const isAllCompleted = totalSetsCount > 0 && completedSetsCount === totalSetsCount;
  const remainingSets = Math.max(0, totalSetsCount - completedSetsCount);

  return (
    <div
      id="modal-finish-workout-confirm"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onCancel}
    >
      <div
        className="bg-[#1C1C1E] rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-white/[0.1] animate-in zoom-in-95 duration-200 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <Flag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-tight">
                ¿Finalizar entrenamiento?
              </h3>
              <p className="text-xs text-zinc-400 truncate max-w-xs">{routineName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workout metrics preview */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-black/30 border border-white/[0.08] rounded-2xl p-3.5 text-center">
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
              <Clock className="w-3.5 h-3.5 text-[#00FF87]" />
              <span>Tiempo</span>
            </div>
            <span className="text-base sm:text-lg font-black text-white font-mono">
              {formatDetailedDuration(elapsedSeconds)}
            </span>
          </div>

          <div className="bg-black/30 border border-white/[0.08] rounded-2xl p-3.5 text-center">
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
              <Layers className="w-3.5 h-3.5 text-[#00FF87]" />
              <span>Progreso</span>
            </div>
            <span className="text-base sm:text-lg font-black text-[#00FF87]">
              {completedSetsCount}/{totalSetsCount} ({completionPercentage}%)
            </span>
          </div>
        </div>

        {/* Informative notice */}
        {isAllCompleted ? (
          <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-[#00FF87]/15 border border-[#00FF87]/30 text-[#00FF87] text-xs mb-6">
            <CheckCircle2 className="w-4 h-4 text-[#00FF87] shrink-0 mt-0.5" />
            <span className="font-semibold">¡Excelente trabajo! Has completado el 100% de las series de esta rutina.</span>
          </div>
        ) : (
          <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs mb-6">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              Aún te quedan {remainingSets} serie{remainingSets > 1 ? 's' : ''} por completar. Al finalizar se registrará el tiempo y progreso alcanzado hasta ahora.
            </span>
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            id="btn-cancel-finish-workout"
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 min-h-[48px] text-xs sm:text-sm font-semibold text-zinc-400 hover:text-white rounded-xl hover:bg-white/[0.06] transition-colors active:scale-[0.97]"
          >
            Continuar entrenando
          </button>

          <button
            id="btn-confirm-finish-workout"
            type="button"
            onClick={onConfirm}
            className="px-5 py-2.5 min-h-[48px] text-xs sm:text-sm font-extrabold text-black bg-[#00FF87] hover:bg-[#00e57a] rounded-xl transition-all shadow-[0_0_15px_rgba(0,255,135,0.3)] active:scale-[0.97] flex items-center gap-2"
          >
            <Flag className="w-4 h-4 text-black stroke-[2.5]" /> Sí, finalizar rutina
          </button>
        </div>
      </div>
    </div>
  );
};
