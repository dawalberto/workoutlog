/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Dumbbell, Plus, Search, X } from 'lucide-react';
import type { ExerciseDefinition, ExerciseDiary, ExerciseRmLog } from '../types';
import { useExerciseCatalog } from '../hooks/useExerciseCatalog';
import { ExerciseCatalogGrid } from './exercise-catalog/ExerciseCatalogGrid';
import { ExerciseFormModal } from './exercise-catalog/ExerciseFormModal';
import { ExercisePreviewModal } from './exercise-catalog/ExercisePreviewModal';

interface ExerciseCatalogProps {
  exercises: ExerciseDefinition[];
  rmLogs?: ExerciseRmLog[];
  exerciseDiary?: ExerciseDiary[];
  onCreateExercise: (exercise: ExerciseDefinition) => void;
  onUpdateExercise: (exercise: ExerciseDefinition) => void;
  onDeleteExercise: (id: string) => void;
  onCheckRmWeight?: (exerciseName: string, newWeight: number, exerciseId?: string) => void;
  onOpenDiary?: (exerciseName: string, exerciseId?: string) => void;
}

const CATEGORIES = ['Todos', 'Pecho', 'Espalda', 'Pierna', 'Hombro', 'Brazos', 'Core'];

export const ExerciseCatalog: React.FC<ExerciseCatalogProps> = ({
  exercises,
  rmLogs = [],
  exerciseDiary = [],
  onCreateExercise,
  onUpdateExercise,
  onDeleteExercise,
  onCheckRmWeight,
  onOpenDiary,
}) => {
  const {
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    isEditing,
    setIsEditing,
    editingExercise,
    previewExercise,
    setPreviewExercise,
    formName,
    setFormName,
    formCategory,
    setFormCategory,
    formImageUrl,
    setFormImageUrl,
    formVideoUrl,
    setFormVideoUrl,
    formNotes,
    setFormNotes,
    formDefaultSets,
    setFormDefaultSets,
    formDefaultReps,
    setFormDefaultReps,
    formDefaultWeight,
    setFormDefaultWeight,
    formDefaultRest,
    setFormDefaultRest,
    imageError,
    setImageError,
    filteredExercises,
    handleOpenCreate,
    handleOpenEdit,
    handleSaveForm,
    handleDelete,
  } = useExerciseCatalog({
    exercises,
    onCreateExercise,
    onUpdateExercise,
    onDeleteExercise,
    onCheckRmWeight,
  });

  return (
    <div id="exercise-catalog-page" className="min-h-screen bg-[#0D0D0D] text-white pb-28 pt-4 sm:pt-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-[#00FF87]">
                <Dumbbell className="w-3.5 h-3.5" /> Catálogo Maestro
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Biblioteca de Ejercicios
            </h1>
            <p className="text-xs sm:text-sm text-[#A1A1AA] mt-0.5">
              Crea tus movimientos con imagen, video de técnica y series preconfiguradas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-new-catalog-exercise"
              type="button"
              onClick={handleOpenCreate}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 min-h-[48px] rounded-2xl text-sm font-extrabold bg-[#00FF87] hover:bg-[#00e57a] text-black shadow-[0_0_20px_rgba(0,255,135,0.35)] transition-all active:scale-[0.97]"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
              <span>Nuevo Ejercicio</span>
            </button>
          </div>
        </div>

        {/* Search & Category Filter */}
        <div className="my-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar ejercicio o grupo muscular..."
              className="w-full min-h-[48px] pl-11 pr-10 py-2.5 text-sm rounded-2xl border border-white/10 bg-[#1C1C1E] text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#00FF87] focus:ring-2 focus:ring-[#00FF87]/20 transition-all shadow-inner"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-xl shrink-0 transition-all active:scale-95 ${
                  selectedCategory === cat
                    ? 'bg-[#00FF87] text-black shadow-[0_0_12px_rgba(0,255,135,0.35)] font-black'
                    : 'bg-[#1C1C1E] text-zinc-400 hover:text-white border border-white/5'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Main List Info */}
        <div className="flex items-center justify-between text-xs font-semibold text-[#A1A1AA] px-1 mb-4">
          <span>{filteredExercises.length} {filteredExercises.length === 1 ? 'ejercicio registrado' : 'ejercicios registrados'}</span>
        </div>

        {/* Cards Grid */}
        <ExerciseCatalogGrid
          exercises={filteredExercises}
          rmLogs={rmLogs}
          exerciseDiary={exerciseDiary}
          onOpenDiary={onOpenDiary}
          onCreateExercise={handleOpenCreate}
          onPreview={setPreviewExercise}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
        />
      </div>

      {/* Exercise Preview Modal */}
      <ExercisePreviewModal
        exercise={previewExercise}
        rmLogs={rmLogs}
        exerciseDiary={exerciseDiary}
        onOpenDiary={onOpenDiary}
        onClose={() => setPreviewExercise(null)}
        onEdit={handleOpenEdit}
      />

      {/* Create / Edit Exercise Modal */}
      <ExerciseFormModal
        isOpen={isEditing}
        editingExercise={editingExercise}
        formName={formName}
        setFormName={setFormName}
        formCategory={formCategory}
        setFormCategory={setFormCategory}
        formImageUrl={formImageUrl}
        setFormImageUrl={setFormImageUrl}
        formVideoUrl={formVideoUrl}
        setFormVideoUrl={setFormVideoUrl}
        formNotes={formNotes}
        setFormNotes={setFormNotes}
        formDefaultSets={formDefaultSets}
        setFormDefaultSets={setFormDefaultSets}
        formDefaultReps={formDefaultReps}
        setFormDefaultReps={setFormDefaultReps}
        formDefaultWeight={formDefaultWeight}
        setFormDefaultWeight={setFormDefaultWeight}
        formDefaultRest={formDefaultRest}
        setFormDefaultRest={setFormDefaultRest}
        imageError={imageError}
        setImageError={setImageError}
        onClose={() => setIsEditing(false)}
        onSubmit={handleSaveForm}
      />
    </div>
  );
};
