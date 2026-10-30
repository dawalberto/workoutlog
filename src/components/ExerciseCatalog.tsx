/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Dumbbell, Plus, Search, X } from 'lucide-react';
import { useExerciseCatalog } from '../hooks/useExerciseCatalog';
import { ExerciseCatalogGrid } from './exercise-catalog/ExerciseCatalogGrid';
import { ExerciseFormModal } from './exercise-catalog/ExerciseFormModal';
import { ExercisePreviewModal } from './exercise-catalog/ExercisePreviewModal';

const CATEGORIES = ['Todos', 'Pecho', 'Espalda', 'Pierna', 'Hombro', 'Brazos', 'Core'];

export const ExerciseCatalog: React.FC = () => {
  const catalog = useExerciseCatalog();
  return (
    <div id="exercise-catalog-page" className="min-h-screen bg-[#0D0D0D] text-white pb-28 pt-4 sm:pt-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-[#00FF87]">
                <Dumbbell className="w-3.5 h-3.5" /> Biblioteca de Ejercicios
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#00FF87]/15 text-[#00FF87] border border-[#00FF87]/30">
                {catalog.filteredExercises.length} {catalog.filteredExercises.length === 1 ? 'ejercicio' : 'ejercicios'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#A1A1AA] mt-0.5">
              Crea tus movimientos con imagen, video de técnica y series preconfiguradas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-new-catalog-exercise"
              type="button"
              onClick={catalog.handleOpenCreate}
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
              value={catalog.searchTerm}
              onChange={(e) => catalog.setSearchTerm(e.target.value)}
              placeholder="Buscar ejercicio o grupo muscular..."
              className="w-full min-h-[48px] pl-11 pr-10 py-2.5 text-sm rounded-2xl border border-white/10 bg-[#1C1C1E] text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#00FF87] focus:ring-2 focus:ring-[#00FF87]/20 transition-all shadow-inner"
            />
            {catalog.searchTerm && (
              <button
                type="button"
                onClick={() => catalog.setSearchTerm('')}
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
                onClick={() => catalog.setSelectedCategory(cat)}
                className={`min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-xl shrink-0 transition-all active:scale-95 ${
                  catalog.selectedCategory === cat
                    ? 'bg-[#00FF87] text-black shadow-[0_0_12px_rgba(0,255,135,0.35)] font-black'
                    : 'bg-[#1C1C1E] text-zinc-400 hover:text-white border border-white/5'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Cards Grid */}
        <ExerciseCatalogGrid
          searchTerm={catalog.searchTerm}
          selectedCategory={catalog.selectedCategory}
          onCreateExercise={catalog.handleOpenCreate}
          onPreview={catalog.setPreviewExercise}
          onEdit={catalog.handleOpenEdit}
          onDelete={catalog.handleDelete}
        />
      </div>

      {/* Exercise Preview Modal */}
      <ExercisePreviewModal
        exercise={catalog.previewExercise}
        onClose={() => catalog.setPreviewExercise(null)}
        onEdit={catalog.handleOpenEdit}
      />

      {/* Create / Edit Exercise Modal */}
      <ExerciseFormModal
        isOpen={catalog.isEditing}
        editingExercise={catalog.editingExercise}
        form={catalog.form}
        onClose={() => catalog.setIsEditing(false)}
        onSubmit={catalog.handleSaveForm}
      />
    </div>
  );
};
