import React from 'react';
import type { ExerciseDefinition, ExerciseDiary } from '../types';
import { DiaryEntryList } from './exercise-diary/DiaryEntryList';
import { DiaryEntryModal } from './exercise-diary/DiaryEntryModal';
import { DiaryFilters } from './exercise-diary/DiaryFilters';
import { useExerciseDiary } from '../hooks/useExerciseDiary';

interface ExerciseDiaryViewProps {
  catalog: ExerciseDefinition[];
  diaries: ExerciseDiary[];
  onSaveDiaries: (updated: ExerciseDiary[]) => void;
  onGoToCatalog: () => void;
  initialExerciseName?: string;
  autoOpenCreate?: boolean;
  onClearInitialState?: () => void;
}

export const ExerciseDiaryView: React.FC<ExerciseDiaryViewProps> = ({
  catalog,
  diaries,
  onSaveDiaries,
  onGoToCatalog,
  initialExerciseName,
  autoOpenCreate = false,
  onClearInitialState,
}) => {
  const diary = useExerciseDiary({
    catalog,
    diaries,
    initialExerciseName,
    autoOpenCreate,
    onSaveDiaries,
    onClearInitialState,
  });

  return (
    <div id="exercise-diary-container" className="min-h-screen bg-[#0D0D0D] text-white pb-28 pt-4 sm:pt-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <DiaryFilters
          catalog={catalog}
          totalEntriesCount={diary.totalEntriesCount}
          allEntriesCount={diary.allEntries.length}
          exercisesWithDiary={diary.exercisesWithDiary}
          searchQuery={diary.searchQuery}
          selectedFeelingFilter={diary.selectedFeelingFilter}
          selectedExerciseName={diary.selectedExerciseName}
          onSearchQueryChange={diary.setSearchQuery}
          onFeelingFilterChange={diary.setSelectedFeelingFilter}
          onExerciseFilterChange={diary.setSelectedExerciseName}
          onCreate={diary.openCreateModal}
          onGoToCatalog={onGoToCatalog}
        />

        <DiaryEntryList
          entries={diary.filteredEntries}
          hasCatalog={catalog.length > 0}
          hasActiveFilters={Boolean(
            diary.searchQuery ||
            diary.selectedFeelingFilter !== 'ALL' ||
            diary.selectedExerciseName !== 'ALL'
          )}
          onCreate={diary.openCreateModal}
          onFilterExercise={diary.setSelectedExerciseName}
          onEdit={diary.openEditModal}
          onDelete={diary.handleDeleteEntry}
        />

        <DiaryEntryModal
          isOpen={diary.isModalOpen}
          editingEntry={diary.editingEntry}
          catalog={catalog}
          formExerciseName={diary.formExerciseName}
          formDate={diary.formDate}
          formNote={diary.formNote}
          formFeeling={diary.formFeeling}
          formError={diary.formError}
          onClose={diary.closeModal}
          onSave={diary.handleSaveEntry}
          onFormExerciseNameChange={diary.setFormExerciseName}
          onFormDateChange={diary.setFormDate}
          onFormNoteChange={diary.setFormNote}
          onFormFeelingChange={diary.setFormFeeling}
        />
      </div>
    </div>
  );
};
