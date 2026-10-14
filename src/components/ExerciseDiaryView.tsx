import React from 'react';
import { DiaryEntryList } from './exercise-diary/DiaryEntryList';
import { DiaryEntryModal } from './exercise-diary/DiaryEntryModal';
import { DiaryFilters } from './exercise-diary/DiaryFilters';
import { useExerciseDiary } from '../hooks/useExerciseDiary';

export const ExerciseDiaryView: React.FC = () => {
  const diary = useExerciseDiary();

  return (
    <div id="exercise-diary-container" className="min-h-screen bg-[#0D0D0D] text-white pb-28 pt-4 sm:pt-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <DiaryFilters
          catalog={diary.catalog}
          totalEntriesCount={diary.totalEntriesCount}
          allEntriesCount={diary.allEntries.length}
          exercisesWithDiary={diary.exercisesWithDiary}
          filters={diary.filters}
          onCreate={diary.openCreateModal}
          onGoToCatalog={diary.onGoToCatalog}
        />

        <DiaryEntryList
          entries={diary.filteredEntries}
          hasCatalog={diary.catalog.length > 0}
          hasActiveFilters={diary.hasActiveFilters}
          onCreate={diary.openCreateModal}
          onFilterExercise={diary.filters.setSelectedExerciseName}
          onEdit={diary.openEditModal}
          onDelete={diary.handleDeleteEntry}
        />

        <DiaryEntryModal
          isOpen={diary.isModalOpen}
          editingEntry={diary.editingEntry}
          catalog={diary.catalog}
          form={diary.form}
          onClose={diary.closeModal}
          onSave={diary.handleSaveEntry}
        />
      </div>
    </div>
  );
};
