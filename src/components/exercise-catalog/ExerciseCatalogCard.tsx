import React from 'react';
import { Clock, Dumbbell, Edit3, Eye, Layers, Trash2, Video } from 'lucide-react';
import type { ExerciseDefinition } from '../../types';
import { DiaryButton } from '../DiaryButton';
import { RmBadge } from '../RmBadge';
import { useExerciseCatalogCard } from '../../hooks/exercise-catalog/useExerciseCatalogCard';
import { formatExerciseCategories } from '../../utils/exerciseCategories';

interface ExerciseCatalogCardProps {
  exercise: ExerciseDefinition;
  onPreview: (exercise: ExerciseDefinition) => void;
  onEdit: (exercise: ExerciseDefinition) => void;
  onDelete: (id: string, name: string) => void;
}

export const ExerciseCatalogCard: React.FC<ExerciseCatalogCardProps> = ({
  exercise: ex,
  onPreview,
  onEdit,
  onDelete,
}) => {
  const { rmLogs, exerciseDiary, openExerciseDiary } = useExerciseCatalogCard();
  return (
  <div
    id={`catalog-card-${ex.id}`}
    onClick={() => onPreview(ex)}
    className="bg-[#1C1C1E] rounded-2xl border border-white/[0.08] hover:border-[#00FF87]/40 p-4 sm:p-5 shadow-lg hover:shadow-[0_0_25px_rgba(0,255,135,0.08)] transition-all flex flex-col justify-between cursor-pointer group select-none relative overflow-hidden"
  >
    <div>
      <div className="flex items-start gap-3.5">
        {/* Cover Preview Image */}
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-zinc-900 shrink-0 border border-white/10 flex items-center justify-center relative shadow-sm">
          {ex.imageUrl ? (
            <img
              src={ex.imageUrl}
              alt={ex.name}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <Dumbbell className="w-6 h-6 text-zinc-600" />
          )}
          {ex.videoUrl && (
            <span className="absolute bottom-1 right-1 p-1 rounded-lg bg-black/80 text-[#00E5FF] shadow-sm">
              <Video className="w-3 h-3" />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-zinc-800 text-zinc-300 border border-white/5 uppercase tracking-wider">
              {formatExerciseCategories(ex) || 'General'}
            </span>
            <RmBadge rmLogs={rmLogs} exerciseName={ex.name} exerciseId={ex.id} />
          </div>
          <h3 className="text-base font-bold text-white tracking-tight mt-1 truncate group-hover:text-[#00FF87] transition-colors">
            {ex.name}
          </h3>
          {ex.notes && (
            <p className="text-xs text-[#A1A1AA] line-clamp-1 mt-0.5 leading-relaxed">
              {ex.notes}
            </p>
          )}
        </div>
      </div>

      {/* Preconfigured defaults */}
      <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center gap-3 text-xs text-[#A1A1AA] font-semibold">
        <span className="inline-flex items-center gap-1 text-white">
          <Layers className="w-3.5 h-3.5 text-[#00E5FF]" /> {ex.defaultSetsCount || 3}s
        </span>
        <span>·</span>
        <span>{ex.defaultReps || 10} reps</span>
        <span>·</span>
        <span>{ex.defaultWeight || 0} kg</span>
        <span>·</span>
        <span className="inline-flex items-center gap-1 font-mono">
          <Clock className="w-3.5 h-3.5 text-[#00FF87]" /> {ex.defaultRestSeconds || 60}s
        </span>
      </div>
    </div>

    {/* Card Actions */}
    <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#00FF87] group-hover:underline">
        <Eye className="w-3.5 h-3.5" />
        <span>Ver detalle</span>
      </span>

      <div className="flex items-center gap-1.5">
        {openExerciseDiary && (
          <DiaryButton
            exerciseName={ex.name}
            exerciseId={ex.id}
            diaries={exerciseDiary}
            onOpenDiary={openExerciseDiary}
            variant="compact"
          />
        )}

        <button
          id={`btn-edit-exercise-${ex.id}`}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(ex);
          }}
          className="min-h-[40px] px-3 inline-flex items-center gap-1 text-xs font-bold rounded-xl text-zinc-300 bg-zinc-800 hover:bg-zinc-700 hover:text-white transition-colors active:scale-95"
          title="Editar ejercicio"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Editar</span>
        </button>

        <button
          id={`btn-delete-exercise-${ex.id}`}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(ex.id, ex.name);
          }}
          className="min-h-[40px] min-w-[40px] p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors active:scale-95 flex items-center justify-center"
          title="Eliminar de la biblioteca"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
  );
};
