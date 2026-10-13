import React from 'react';
import { Dumbbell } from 'lucide-react';
import type { ExerciseDefinition, ExerciseDiary, ExerciseRmLog } from '../../types';
import { ExerciseCatalogCard } from './ExerciseCatalogCard';

interface ExerciseCatalogGridProps {
  exercises: ExerciseDefinition[];
  rmLogs: ExerciseRmLog[];
  exerciseDiary: ExerciseDiary[];
  onOpenDiary?: (exerciseName: string, exerciseId?: string) => void;
  onCreateExercise: () => void;
  onPreview: (exercise: ExerciseDefinition) => void;
  onEdit: (exercise: ExerciseDefinition) => void;
  onDelete: (id: string, name: string) => void;
}

export const ExerciseCatalogGrid: React.FC<ExerciseCatalogGridProps> = ({
  exercises,
  rmLogs,
  exerciseDiary,
  onOpenDiary,
  onCreateExercise,
  onPreview,
  onEdit,
  onDelete,
}) => (
  exercises.length === 0 ? (
    <div className="text-center py-20 px-6 bg-[#1C1C1E] rounded-2xl border border-white/[0.08] max-w-md mx-auto my-6 shadow-xl">
      <div className="w-14 h-14 bg-zinc-900 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 text-zinc-500">
        <Dumbbell className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-bold text-white">No se encontraron ejercicios</h3>
      <p className="text-xs text-[#A1A1AA] mt-1 mb-5">
        Prueba con otro término de búsqueda o añade un nuevo ejercicio a tu biblioteca.
      </p>
      <button
        type="button"
        onClick={onCreateExercise}
        className="min-h-[48px] px-5 text-xs font-extrabold rounded-2xl bg-[#00FF87] text-black hover:bg-[#00e57a] transition-all shadow-[0_0_15px_rgba(0,255,135,0.3)] active:scale-[0.97]"
      >
        + Crear Ejercicio
      </button>
    </div>
  ) : (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {exercises.map((exercise) => (
        <ExerciseCatalogCard
          key={exercise.id}
          exercise={exercise}
          rmLogs={rmLogs}
          exerciseDiary={exerciseDiary}
          onOpenDiary={onOpenDiary}
          onPreview={onPreview}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
);
