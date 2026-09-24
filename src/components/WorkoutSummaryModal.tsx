import React from 'react';
import { Trophy, Clock, CheckCircle2, Dumbbell, X, Sparkles } from 'lucide-react';
import { WorkoutCompletionSummary } from '../types';
import { formatDetailedDuration } from '../utils/timeCalculations';

interface WorkoutSummaryModalProps {
  summary: WorkoutCompletionSummary | null;
  onClose: () => void;
}

export const WorkoutSummaryModal: React.FC<WorkoutSummaryModalProps> = ({ summary, onClose }) => {
  if (!summary) return null;

  return (
    <div
      id="modal-workout-summary"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-zinc-200 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with celebration banner */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs shrink-0">
              <Trophy className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 uppercase tracking-wide">
                <Sparkles className="w-3.5 h-3.5" /> ¡Entrenamiento completado!
              </div>
              <h3 className="text-xl font-black text-zinc-900 tracking-tight">
                {summary.routineName}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-xl hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Highlighted stats cards */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-800 uppercase tracking-wide mb-1">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>Tiempo total</span>
            </div>
            <span className="text-xl sm:text-2xl font-black text-zinc-900 font-mono block">
              {formatDetailedDuration(summary.durationSeconds)}
            </span>
            <span className="text-[11px] text-emerald-700 font-medium">desde el inicio</span>
          </div>

          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-zinc-600 uppercase tracking-wide mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Progreso</span>
            </div>
            <span className="text-xl sm:text-2xl font-black text-zinc-900 block">
              {summary.completedSetsCount}/{summary.totalSetsCount}
            </span>
            <span className="text-[11px] text-zinc-500 font-semibold">
              {summary.completionPercentage}% series hechas
            </span>
          </div>
        </div>

        {/* Exercise breakdown */}
        <div className="flex-1 overflow-y-auto mb-5 pr-1">
          <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Dumbbell className="w-3.5 h-3.5" /> Desglose por ejercicio
          </h4>

          <div className="space-y-2">
            {summary.exercisesSummary.map((ex, idx) => {
              const isExComplete = ex.completedSets === ex.totalSets && ex.totalSets > 0;
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 border border-zinc-100 text-xs"
                >
                  <span className="font-semibold text-zinc-800 truncate max-w-[200px] sm:max-w-xs">
                    {ex.name}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`font-bold px-2 py-0.5 rounded-md ${
                        isExComplete
                          ? 'bg-emerald-100 text-emerald-800'
                          : ex.completedSets > 0
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-zinc-200 text-zinc-600'
                      }`}
                    >
                      {ex.completedSets} / {ex.totalSets} series
                    </span>
                    {isExComplete && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-zinc-100 flex items-center justify-end">
          <button
            id="btn-close-workout-summary"
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-all shadow-sm active:scale-95 text-center"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};
