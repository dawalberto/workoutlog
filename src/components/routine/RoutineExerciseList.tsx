import React, { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { ArrowUpDown, Dumbbell, Plus } from 'lucide-react';
import { ExerciseCard } from '../ExerciseCard';
import { AddExerciseModal } from '../AddExerciseModal';
import { ReorderExercisesModal } from '../ReorderExercisesModal';
import { useRoutineExerciseList } from '../../hooks/routine/useRoutineExerciseList';

interface RoutineExerciseListViewState {
  collapsedExerciseIds: Set<string>;
  setCollapsedExerciseIds: Dispatch<SetStateAction<Set<string>>>;
  onToggleCollapseExercise: (exerciseId: string) => void;
}

interface RoutineExerciseListProps {
  viewState: RoutineExerciseListViewState;
}

export const RoutineExerciseList: React.FC<RoutineExerciseListProps> = ({ viewState }) => {
  const {
    routine,
    subMode,
    completedSetIds,
    handleToggleSetComplete,
  } = useRoutineExerciseList(viewState);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReorderModal, setShowReorderModal] = useState(false);
  if (!routine) return null;

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-1">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#A1A1AA] flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-[#00FF87]" />
            <span>Ejercicios ({routine.exercises.length})</span>
          </h2>

          {subMode === 'edit' && (
            <div className="flex items-center gap-2">
              {routine.exercises.length > 1 && (
                <button
                  id="btn-show-reorder-exercises"
                  type="button"
                  onClick={() => setShowReorderModal(true)}
                  className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl border border-white/10 bg-[#1C1C1E] text-zinc-300 hover:text-white hover:border-[#00FF87]/40 transition-all active:scale-[0.97] flex items-center justify-center shadow-md"
                  title="Ordenar ejercicios"
                  aria-label="Ordenar ejercicios"
                >
                  <ArrowUpDown className="w-4 h-4 text-[#00FF87]" />
                </button>
              )}

              <button
                id="btn-show-add-exercise"
                type="button"
                onClick={() => setShowAddModal(true)}
                className="min-h-[44px] inline-flex items-center gap-2 px-4 text-xs font-extrabold rounded-xl bg-[#00FF87] text-black hover:bg-[#00e57a] shadow-[0_0_15px_rgba(0,255,135,0.25)] transition-all active:scale-[0.97]"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Añadir Ejercicio</span>
              </button>
            </div>
          )}
        </div>

        {routine.exercises.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-2xl border-2 border-dashed border-white/10 bg-[#1C1C1E]">
            <Dumbbell className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-sm font-bold text-white">Esta rutina no tiene ejercicios todavía.</p>
            <p className="text-xs text-[#A1A1AA] mt-1 mb-4">Añade ejercicios de tu biblioteca o crea uno nuevo.</p>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="min-h-[48px] inline-flex items-center gap-2 px-5 text-xs font-extrabold rounded-2xl bg-[#00FF87] text-black hover:bg-[#00e57a] transition-all shadow-[0_0_15px_rgba(0,255,135,0.3)] active:scale-[0.97]"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Añadir Primer Ejercicio</span>
            </button>
          </div>
        ) : (
          routine.exercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exerciseId={exercise.id}
              isCollapsed={viewState.collapsedExerciseIds.has(exercise.id)}
              onToggleCollapse={() => viewState.onToggleCollapseExercise(exercise.id)}
              onToggleSetComplete={handleToggleSetComplete}
            />
          ))
        )}
      </div>

      <AddExerciseModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />

      <ReorderExercisesModal
        isOpen={showReorderModal}
        onClose={() => setShowReorderModal(false)}
      />
    </>
  );
};
