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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Flag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-zinc-900 tracking-tight">
                ¿Finalizar entrenamiento?
              </h3>
              <p className="text-xs text-zinc-500 truncate max-w-xs">{routineName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workout metrics preview */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Tiempo</span>
            </div>
            <span className="text-base sm:text-lg font-black text-zinc-900 font-mono">
              {formatDetailedDuration(elapsedSeconds)}
            </span>
          </div>

          <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              <span>Progreso</span>
            </div>
            <span className="text-base sm:text-lg font-black text-zinc-900">
              {completedSetsCount}/{totalSetsCount} ({completionPercentage}%)
            </span>
          </div>
        </div>

        {/* Informative notice */}
        {isAllCompleted ? (
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-emerald-50 border border-emerald-200/60 text-emerald-900 text-xs mb-6">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>¡Excelente trabajo! Has completado el 100% de las series de esta rutina.</span>
          </div>
        ) : (
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50 border border-amber-200/60 text-amber-900 text-xs mb-6">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Aún te quedan {remainingSets} serie{remainingSets > 1 ? 's' : ''} por completar. Al finalizar se registrará el tiempo y progreso alcanzado hasta ahora.
            </span>
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2.5">
          <button
            id="btn-cancel-finish-workout"
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors active:scale-95"
          >
            Continuar entrenando
          </button>

          <button
            id="btn-confirm-finish-workout"
            type="button"
            onClick={onConfirm}
            className="px-4 py-2.5 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
          >
            <Flag className="w-4 h-4" /> Sí, finalizar rutina
          </button>
        </div>
      </div>
    </div>
  );
};
