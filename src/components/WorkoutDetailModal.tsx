import React from 'react';
import { Trophy, Clock, CheckCircle2, Dumbbell, X, Trash2, Calendar } from 'lucide-react';
import { WorkoutHistoryLog } from '../types';
import { formatDetailedDuration } from '../utils/timeCalculations';

interface WorkoutDetailModalProps {
  log: WorkoutHistoryLog | null;
  onClose: () => void;
  onDelete: (logId: string) => void;
}

export const WorkoutDetailModal: React.FC<WorkoutDetailModalProps> = ({
  log,
  onClose,
  onDelete,
}) => {
  if (!log) return null;

  const handleDelete = () => {
    if (window.confirm(`¿Seguro que deseas eliminar este registro de "${log.routineName}" del historial?`)) {
      onDelete(log.id);
      onClose();
    }
  };

  const formattedDate = new Date(log.completedAt || log.endTime).toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      id="modal-workout-detail"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-zinc-200 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs shrink-0">
              <Trophy className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wide block">
                Sesión completada
              </span>
              <h3 className="text-lg sm:text-xl font-black text-zinc-900 tracking-tight truncate">
                {log.routineName}
              </h3>
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mt-0.5 capitalize">
                <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="truncate">{formattedDate}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-xl hover:bg-zinc-100 transition-colors shrink-0"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Highlighted stats cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-3.5 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-800 uppercase tracking-wide mb-1">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>Duración</span>
            </div>
            <span className="text-xl sm:text-2xl font-black text-zinc-900 font-mono block">
              {formatDetailedDuration(log.durationSeconds)}
            </span>
            <span className="text-[11px] text-emerald-700 font-medium">tiempo invertido</span>
          </div>

          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-3.5 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-zinc-600 uppercase tracking-wide mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Progreso</span>
            </div>
            <span className="text-xl sm:text-2xl font-black text-zinc-900 block">
              {log.completedSetsCount}/{log.totalSetsCount}
            </span>
            <span className="text-[11px] text-zinc-500 font-semibold">
              {log.completionPercentage}% series hechas
            </span>
          </div>
        </div>

        {/* Exercise breakdown */}
        <div className="flex-1 overflow-y-auto mb-4 pr-1">
          <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Dumbbell className="w-3.5 h-3.5" /> Desglose por ejercicio
          </h4>

          <div className="space-y-2">
            {log.exercisesSummary.map((ex, idx) => {
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

        {/* Footer actions: Delete & Close */}
        <div className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Eliminar log</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-all shadow-sm active:scale-95"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};
