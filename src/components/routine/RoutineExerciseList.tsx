import React from 'react';
import { ArrowUpDown, Dumbbell, Plus } from 'lucide-react';
import type {
  Exercise,
  ExerciseDefinition,
  ExerciseDiary,
  ExerciseRmLog,
  Routine,
  RoutineSubMode,
} from '../../types';
import { ExerciseCard } from '../ExerciseCard';
import { AddExerciseModal } from '../AddExerciseModal';
import { ReorderExercisesModal } from '../ReorderExercisesModal';
import { WorkoutFinishConfirmModal } from '../WorkoutFinishConfirmModal';

interface RoutineExerciseListProps {
  routine: Routine;
  catalog: ExerciseDefinition[];
  rmLogs: ExerciseRmLog[];
  exerciseDiary: ExerciseDiary[];
  subMode: RoutineSubMode;
  completedSetIds: Set<string>;
  collapsedExerciseIds: Set<string>;
  showAddModal: boolean;
  showReorderModal: boolean;
  isFinishConfirmOpen: boolean;
  elapsedSeconds: number;
  completedSetsCount: number;
  totalSetsCount: number;
  onToggleCollapseExercise: (exerciseId: string) => void;
  onToggleSetComplete: (setId: string, restSeconds: number, exerciseName: string, setNumber: number) => void;
  onUpdateExercise: (index: number, exercise: Exercise) => void;
  onDeleteExercise: (index: number) => void;
  onMoveExercise: (fromIndex: number, toIndex: number) => void;
  onAddExercise: (exercise: Exercise, templateToSave?: ExerciseDefinition) => void;
  onSaveOrder: (exercises: Exercise[]) => void;
  onOpenDiary?: (exerciseName: string, exerciseId?: string) => void;
  onCheckRmWeight?: (exerciseName: string, newWeight: number, exerciseId?: string) => void;
  onCloseAddModal: () => void;
  onCloseReorderModal: () => void;
  onOpenAddModal: () => void;
  onOpenReorderModal: () => void;
  onCancelFinish: () => void;
  onConfirmFinish: () => void;
}

export const RoutineExerciseList: React.FC<RoutineExerciseListProps> = ({
  routine,
  catalog,
  rmLogs,
  exerciseDiary,
  subMode,
  completedSetIds,
  collapsedExerciseIds,
  showAddModal,
  showReorderModal,
  isFinishConfirmOpen,
  elapsedSeconds,
  completedSetsCount,
  totalSetsCount,
  onToggleCollapseExercise,
  onToggleSetComplete,
  onUpdateExercise,
  onDeleteExercise,
  onMoveExercise,
  onAddExercise,
  onSaveOrder,
  onOpenDiary,
  onCheckRmWeight,
  onCloseAddModal,
  onCloseReorderModal,
  onOpenAddModal,
  onOpenReorderModal,
  onCancelFinish,
  onConfirmFinish,
}) => (
  <>
    {/* Exercises List Header & Buttons */}
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
                onClick={onOpenReorderModal}
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
              onClick={onOpenAddModal}
              className="min-h-[44px] inline-flex items-center gap-2 px-4 text-xs font-extrabold rounded-xl bg-[#00FF87] text-black hover:bg-[#00e57a] shadow-[0_0_15px_rgba(0,255,135,0.25)] transition-all active:scale-[0.97]"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Añadir Ejercicio</span>
            </button>
          </div>
        )}
      </div>

      {/* Exercise cards list */}
      {routine.exercises.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl border-2 border-dashed border-white/10 bg-[#1C1C1E]">
          <Dumbbell className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <p className="text-sm font-bold text-white">Esta rutina no tiene ejercicios todavía.</p>
          <p className="text-xs text-[#A1A1AA] mt-1 mb-4">Añade ejercicios de tu biblioteca o crea uno nuevo.</p>
          <button
            type="button"
            onClick={onOpenAddModal}
            className="min-h-[48px] inline-flex items-center gap-2 px-5 text-xs font-extrabold rounded-2xl bg-[#00FF87] text-black hover:bg-[#00e57a] transition-all shadow-[0_0_15px_rgba(0,255,135,0.3)] active:scale-[0.97]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Añadir Primer Ejercicio</span>
          </button>
        </div>
      ) : (
        routine.exercises.map((exercise, index) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            exerciseIndex={index}
            totalExercises={routine.exercises.length}
            isExecutionMode={subMode === 'execute'}
            completedSetIds={completedSetIds}
            isCollapsed={collapsedExerciseIds.has(exercise.id)}
            rmLogs={rmLogs}
            exerciseDiary={exerciseDiary}
            onOpenDiary={onOpenDiary}
            onToggleCollapse={() => onToggleCollapseExercise(exercise.id)}
            onToggleSetComplete={onToggleSetComplete}
            onUpdateExercise={(updated) => onUpdateExercise(index, updated)}
            onDeleteExercise={() => onDeleteExercise(index)}
            onMoveToPosition={(targetIndex) => onMoveExercise(index, targetIndex)}
            onCheckRmWeight={onCheckRmWeight}
          />
        ))
      )}
    </div>

    {/* Add Exercise Modal */}
    <AddExerciseModal
      isOpen={showAddModal}
      onClose={onCloseAddModal}
      catalog={catalog}
      rmLogs={rmLogs}
      exerciseDiary={exerciseDiary}
      onOpenDiary={onOpenDiary}
      onAddExercise={onAddExercise}
    />

    {/* Reorder Exercises Modal */}
    <ReorderExercisesModal
      isOpen={showReorderModal}
      onClose={onCloseReorderModal}
      exercises={routine.exercises}
      onSaveOrder={onSaveOrder}
    />

    {/* Confirmation Modal before finishing workout */}
    <WorkoutFinishConfirmModal
      isOpen={isFinishConfirmOpen}
      routineName={routine.name}
      elapsedSeconds={elapsedSeconds}
      completedSetsCount={completedSetsCount}
      totalSetsCount={totalSetsCount}
      onConfirm={onConfirmFinish}
      onCancel={onCancelFinish}
    />
  </>
);
