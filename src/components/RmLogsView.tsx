import React from 'react';
import type { ExerciseDefinition, ExerciseRmLog } from '../types';
import { useRmLogActions } from '../hooks/useRmLogActions';
import { AddExerciseToRmModal } from './rm-logs/AddExerciseToRmModal';
import { QuickRmRecordModal } from './rm-logs/QuickRmRecordModal';
import { RmExerciseList } from './rm-logs/RmExerciseList';

interface RmLogsViewProps {
  catalog: ExerciseDefinition[];
  rmLogs: ExerciseRmLog[];
  onSaveRmLogs: (updated: ExerciseRmLog[]) => void;
  onGoToCatalog: () => void;
}

export const RmLogsView: React.FC<RmLogsViewProps> = ({
  catalog,
  rmLogs,
  onSaveRmLogs,
  onGoToCatalog,
}) => {
  const actions = useRmLogActions({ catalog, rmLogs, onSaveRmLogs });

  return (
    <div id="rm-logs-container" className="min-h-screen bg-[#0D0D0D] text-white pb-28 pt-4 sm:pt-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <RmExerciseList
          catalog={catalog}
          rmLogs={rmLogs}
          filteredRmLogs={actions.filteredRmLogs}
          searchTerm={actions.searchTerm}
          setSearchTerm={actions.setSearchTerm}
          onGoToCatalog={onGoToCatalog}
          onOpenAddModal={actions.handleOpenAddModal}
          onOpenEmptyAddModal={() => actions.setIsAddModalOpen(true)}
          expandedExerciseId={actions.expandedExerciseId}
          setExpandedExerciseId={actions.setExpandedExerciseId}
          catalogImageMap={actions.catalogImageMap}
          editingRecordId={actions.editingRecordId}
          editWeight={actions.editWeight}
          setEditWeight={actions.setEditWeight}
          editDate={actions.editDate}
          setEditDate={actions.setEditDate}
          editNotes={actions.editNotes}
          setEditNotes={actions.setEditNotes}
          onOpenQuickLog={actions.handleOpenQuickLog}
          onDeleteExercise={actions.handleDeleteExercise}
          onCancelEdit={() => actions.setEditingRecordId(null)}
          onStartEditRecord={actions.handleStartEditRecord}
          onSaveEditRecord={actions.handleSaveEditRecord}
          onDeleteRecord={actions.handleDeleteRecord}
        />

        {actions.quickLogTarget && (
          <QuickRmRecordModal
            target={actions.quickLogTarget}
            weight={actions.quickWeight}
            setWeight={actions.setQuickWeight}
            date={actions.quickDate}
            setDate={actions.setQuickDate}
            notes={actions.quickNotes}
            setNotes={actions.setQuickNotes}
            onClose={() => actions.setQuickLogTarget(null)}
            onSubmit={() => actions.handleAddRecordToLog(actions.quickLogTarget!.id)}
          />
        )}

        <AddExerciseToRmModal
          catalog={catalog}
          availableCatalog={actions.availableCatalog}
          isOpen={actions.isAddModalOpen}
          onClose={() => actions.setIsAddModalOpen(false)}
          catalogSearch={actions.catalogSearch}
          setCatalogSearch={actions.setCatalogSearch}
          selectedCatalogExercise={actions.selectedCatalogExercise}
          onSelectCatalogExercise={(exercise) => {
            actions.setSelectedCatalogExercise(exercise);
            actions.setInitialWeight(
              exercise.defaultWeight && exercise.defaultWeight > 0
                ? exercise.defaultWeight.toString()
                : '',
            );
          }}
          onClearSelectedExercise={() => actions.setSelectedCatalogExercise(null)}
          initialWeight={actions.initialWeight}
          setInitialWeight={actions.setInitialWeight}
          initialDate={actions.initialDate}
          setInitialDate={actions.setInitialDate}
          initialNotes={actions.initialNotes}
          setInitialNotes={actions.setInitialNotes}
          onConfirm={actions.handleConfirmAddExercise}
        />
      </div>
    </div>
  );
};
