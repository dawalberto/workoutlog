import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { AppTab, type ExerciseRmLog } from '../types';
import { useAppStore } from '../store/appStore';
import { selectPersistedData } from '../store/selectors';
import { useAddExerciseToRmModal } from './rm-logs/useAddExerciseToRmModal';
import { useQuickRmRecordForm } from './rm-logs/useQuickRmRecordForm';
import { useRmRecordForm } from './rm-logs/useRmRecordForm';

export function useRmLogActions() {
  const data = useAppStore(useShallow(selectPersistedData));
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);
  const [quickLogTarget, setQuickLogTarget] = useState<ExerciseRmLog | null>(null);
  const quickForm = useQuickRmRecordForm(quickLogTarget, () => setQuickLogTarget(null));
  const recordForm = useRmRecordForm();
  const addForm = useAddExerciseToRmModal(
    () => setIsAddModalOpen(false),
    (logId) => setExpandedExerciseId(logId),
  );

  const handleOpenAddModal = () => {
    addForm.handleOpen();
    setIsAddModalOpen(true);
  };
  const handleOpenQuickLog = (log: ExerciseRmLog) => {
    quickForm.handleOpen(log);
    setQuickLogTarget(log);
  };
  const handleDeleteExercise = (logId: string, name: string) => {
    if (!window.confirm(`¿Seguro que deseas eliminar el registro de RM de "${name}" y todo su historial?`)) {
      return;
    }
    data.setRmLogs(data.rmLogs.filter((log) => log.id !== logId));
    if (expandedExerciseId === logId) setExpandedExerciseId(null);
  };

  return {
    searchTerm,
    setSearchTerm,
    isAddModalOpen,
    setIsAddModalOpen,
    expandedExerciseId,
    setExpandedExerciseId,
    quickLogTarget,
    setQuickLogTarget,
    handleOpenAddModal,
    handleOpenEmptyAddModal: () => setIsAddModalOpen(true),
    handleOpenQuickLog,
    quickForm,
    addForm,
    recordForm,
    handleDeleteExercise,
    onGoToCatalog: () => setActiveTab(AppTab.EXERCISES),
  };
}
