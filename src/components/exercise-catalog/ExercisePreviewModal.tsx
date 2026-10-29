import React from 'react';
import { Clock, Edit3, FileText, Layers, X } from 'lucide-react';
import type { ExerciseDefinition } from '../../types';
import { formatSecondsToTime } from '../../utils/timeCalculations';
import { DiaryButton } from '../DiaryButton';
import { ExerciseThumbnail } from '../ExerciseThumbnail';
import { RmBadge } from '../RmBadge';
import { VideoPreview } from '../VideoPreview';
import { useExercisePreviewModal } from '../../hooks/exercise-catalog/useExercisePreviewModal';
import { formatExerciseCategories } from '../../utils/exerciseCategories';

interface ExercisePreviewModalProps {
  exercise: ExerciseDefinition | null;
  onClose: () => void;
  onEdit: (exercise: ExerciseDefinition) => void;
}

export const ExercisePreviewModal: React.FC<ExercisePreviewModalProps> = ({
  exercise: previewExercise,
  onClose,
  onEdit,
}) => {
  const { rmLogs, exerciseDiary, openExerciseDiary } = useExercisePreviewModal();
  if (!previewExercise) return null;

  return (
    <div
      id="modal-exercise-preview"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-[#18181A] text-white rounded-3xl border border-white/10 shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-white/[0.08] shrink-0 bg-[#18181A] flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-zinc-800 text-zinc-300 uppercase tracking-wider">
                {formatExerciseCategories(previewExercise) || 'General'}
              </span>
              <RmBadge rmLogs={rmLogs} exerciseName={previewExercise.name} exerciseId={previewExercise.id} size="sm" />
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white truncate">
              {previewExercise.name}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {openExerciseDiary && (
              <DiaryButton
                exerciseName={previewExercise.name}
                exerciseId={previewExercise.id}
                diaries={exerciseDiary}
                onOpenDiary={(name, id) => {
                  onClose();
                  openExerciseDiary(name, id);
                }}
                variant="compact"
              />
            )}

            <button
              id="btn-preview-header-edit"
              type="button"
              onClick={() => {
                const ex = previewExercise;
                onClose();
                onEdit(ex);
              }}
              className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition-colors active:scale-95"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editar</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors"
              aria-label="Cerrar vista previa"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {/* Media Image */}
          <div className="rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 h-48 sm:h-56 shadow-md">
            <ExerciseThumbnail
              name={previewExercise.name}
              imageUrl={previewExercise.imageUrl}
              className="w-full h-full"
              iconClassName="w-14 h-14 text-zinc-600"
              initialsClassName="text-2xl"
            />
          </div>

          {/* Notes */}
          {previewExercise.notes && (
            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/5 flex items-start gap-3">
              <FileText className="w-4 h-4 text-[#00FF87] shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1">
                  Notas y Técnica
                </span>
                <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed whitespace-pre-line">
                  {previewExercise.notes}
                </p>
              </div>
            </div>
          )}

          {/* Video Preview */}
          {previewExercise.videoUrl && (
            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/5">
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-2">
                Técnica en Video
              </span>
              <VideoPreview
                url={previewExercise.videoUrl}
                exerciseName={previewExercise.name}
              />
            </div>
          )}

          {/* Preconfigured Sets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#A1A1AA] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#00E5FF]" />
                Series preconfiguradas
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold bg-zinc-900 text-zinc-300 border border-white/10">
                <Clock className="w-3.5 h-3.5 text-[#00FF87]" />
                ~{formatSecondsToTime(
                  (previewExercise.defaultSetsCount || 3) *
                    ((previewExercise.defaultReps || 10) * 3 +
                      (previewExercise.defaultRestSeconds || 60))
                )}
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-zinc-900/60">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-zinc-900 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    <th className="py-3 px-3 text-center w-14">Serie</th>
                    <th className="py-3 px-3 text-center">Reps</th>
                    <th className="py-3 px-3 text-center">Peso</th>
                    <th className="py-3 px-3 text-center">Descanso</th>
                    <th className="py-3 px-3 text-center">Tiempo est.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {Array.from(
                    { length: previewExercise.defaultSetsCount || 3 },
                    (_, idx) => {
                      const reps = previewExercise.defaultReps || 10;
                      const weight = previewExercise.defaultWeight || 0;
                      const rest = previewExercise.defaultRestSeconds || 60;
                      const setSeconds = reps * 3 + rest;

                      return (
                        <tr key={idx} className="hover:bg-white/[0.02]">
                          <td className="py-3 px-3 text-center">
                            <span className="inline-block w-6 h-6 leading-6 text-xs font-bold rounded-lg bg-zinc-800 text-zinc-200">
                              {idx + 1}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-white">
                            {reps} <span className="text-[10px] text-zinc-500">reps</span>
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-white">
                            {weight} <span className="text-[10px] text-zinc-500">kg</span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300">
                              {rest}s
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center text-zinc-400 font-mono text-xs">
                            ~{formatSecondsToTime(setSeconds)}
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-white/[0.08] bg-[#141416] flex items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-zinc-400 hidden sm:inline font-mono">
            {previewExercise.defaultSetsCount || 3}s x {previewExercise.defaultReps || 10}r · {previewExercise.defaultWeight || 0}kg
          </span>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 text-xs font-bold rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              Cerrar
            </button>

            <button
              id="btn-preview-footer-edit"
              type="button"
              onClick={() => {
                const ex = previewExercise;
                onClose();
                onEdit(ex);
              }}
              className="min-h-[44px] inline-flex items-center gap-2 px-5 text-xs font-extrabold rounded-xl bg-[#00FF87] hover:bg-[#00e57a] text-black shadow-[0_0_15px_rgba(0,255,135,0.3)] transition-all active:scale-[0.97]"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editar Ejercicio</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
