import React from 'react';
import { Trophy, Clock, CheckCircle2, Dumbbell, X, Trash2, Calendar } from 'lucide-react';
import { WorkoutHistoryLog, ExerciseRmLog, ExerciseDiary, Routine, ExerciseDefinition } from '../types';
import { formatDetailedDuration, formatExerciseSummary } from '../utils/timeCalculations';
import { RmBadge } from './RmBadge';
import { DiaryButton } from './DiaryButton';

interface WorkoutDetailModalProps {
  log: WorkoutHistoryLog | null;
  rmLogs?: ExerciseRmLog[];
  exerciseDiary?: ExerciseDiary[];
  routines?: Routine[];
  catalog?: ExerciseDefinition[];
  onOpenDiary?: (exerciseName: string, exerciseId?: string) => void;
  onClose: () => void;
  onDelete: (logId: string) => void;
}

export const WorkoutDetailModal: React.FC<WorkoutDetailModalProps> = ({
  log,
  rmLogs = [],
  exerciseDiary = [],
  routines = [],
  catalog = [],
  onOpenDiary,
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

  const getExerciseBadge = (name: string, totalSets: number, summaryText?: string, sets?: any[]) => {
    if (summaryText) return summaryText;
    if (sets && sets.length > 0) return formatExerciseSummary(sets);

    if (routines && routines.length > 0) {
      const r = routines.find(
        (item) => item.id === log.routineId || item.name.toLowerCase() === log.routineName.toLowerCase()
      );
      if (r) {
        const match = r.exercises.find((e) => e.name.toLowerCase() === name.toLowerCase());
        if (match && match.sets?.length > 0) {
          return formatExerciseSummary(match.sets);
        }
      }
    }

    if (catalog && catalog.length > 0) {
      const cat = catalog.find((c) => c.name.toLowerCase() === name.toLowerCase());
      if (cat) {
        const reps = cat.defaultReps || 10;
        const weight = cat.defaultWeight || 0;
        const restSec = cat.defaultRestSeconds || 90;
        const m = Math.floor(restSec / 60);
        const s = restSec % 60;
        return `${totalSets || 3}s x ${reps}r · ${weight}kg - ${m}:${s < 10 ? '0' : ''}${s}⏱️`;
      }
    }

    return null;
  };

  return (
    <div
      id="modal-workout-detail"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#1C1C1E] rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-white/[0.1] animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-[#00FF87]/15 border border-[#00FF87]/30 text-[#00FF87] flex items-center justify-center shadow-[0_0_15px_rgba(0,255,135,0.2)] shrink-0">
              <Trophy className="w-6 h-6 text-[#00FF87]" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-black text-[#00FF87] uppercase tracking-wider block">
                Sesión completada
              </span>
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight truncate">
                {log.routineName}
              </h3>
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-0.5 capitalize">
                <Calendar className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span className="truncate">{formattedDate}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-white/[0.08] transition-colors shrink-0"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Highlighted stats cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-black/30 border border-[#00FF87]/20 rounded-2xl p-3.5 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#00FF87] uppercase tracking-wider mb-1">
              <Clock className="w-4 h-4 text-[#00FF87]" />
              <span>Duración</span>
            </div>
            <span className="text-xl sm:text-2xl font-black text-white font-mono block">
              {formatDetailedDuration(log.durationSeconds)}
            </span>
            <span className="text-[11px] text-zinc-400 font-medium">tiempo invertido</span>
          </div>

          <div className="bg-black/30 border border-white/[0.08] rounded-2xl p-3.5 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
              <CheckCircle2 className="w-4 h-4 text-[#00FF87]" />
              <span>Progreso</span>
            </div>
            <span className="text-xl sm:text-2xl font-black text-white block">
              {log.completedSetsCount}/{log.totalSetsCount}
            </span>
            <span className="text-[11px] text-[#00FF87] font-extrabold">
              {log.completionPercentage}% series hechas
            </span>
          </div>
        </div>

        {/* Exercise breakdown */}
        <div className="flex-1 overflow-y-auto mb-4 pr-1">
          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Dumbbell className="w-3.5 h-3.5 text-[#00FF87]" /> Desglose por ejercicio
          </h4>

          <div className="space-y-2">
            {log.exercisesSummary.map((ex, idx) => {
              const isExComplete = ex.completedSets === ex.totalSets && ex.totalSets > 0;
              const badgeText = getExerciseBadge(ex.name, ex.totalSets, ex.summaryText, ex.sets);

              return (
                <div
                  key={idx}
                  className="p-3 sm:p-3.5 rounded-2xl bg-black/30 border border-white/[0.08] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors hover:border-white/20"
                >
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                      <span className="font-bold text-sm text-zinc-100 truncate">
                        {ex.name}
                      </span>
                      <RmBadge rmLogs={rmLogs} exerciseName={ex.name} size="xs" />
                      {onOpenDiary && (
                        <DiaryButton
                          exerciseName={ex.name}
                          diaries={exerciseDiary}
                          onOpenDiary={(name) => {
                            onClose();
                            onOpenDiary(name);
                          }}
                          variant="compact"
                        />
                      )}
                    </div>

                    {/* Exercise sets, reps, weight & rest badge (same as Routine cards) */}
                    {badgeText && (
                      <div className="mt-0.5">
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-mono font-semibold bg-zinc-900 text-zinc-300 border border-white/10 whitespace-nowrap shadow-inner"
                          title="Resumen: series x repeticiones · peso - descanso"
                        >
                          {badgeText}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <span
                      className={`font-bold px-2.5 py-1 rounded-xl text-xs ${
                        isExComplete
                          ? 'bg-[#00FF87]/15 text-[#00FF87] border border-[#00FF87]/30'
                          : ex.completedSets > 0
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          : 'bg-white/[0.06] text-zinc-400'
                      }`}
                    >
                      {ex.completedSets} / {ex.totalSets} series
                    </span>
                    {isExComplete && <CheckCircle2 className="w-4 h-4 text-[#00FF87] shrink-0" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer actions: Delete & Close */}
        <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 min-h-[44px] text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors active:scale-95"
          >
            <Trash2 className="w-4 h-4" />
            <span>Eliminar log</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 min-h-[48px] text-xs sm:text-sm font-extrabold text-black bg-[#00FF87] hover:bg-[#00e57a] rounded-xl transition-all shadow-[0_0_15px_rgba(0,255,135,0.3)] active:scale-[0.97]"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};
