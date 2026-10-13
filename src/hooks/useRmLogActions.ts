import { useMemo, useState } from 'react';
import type { ExerciseDefinition, ExerciseRmLog, RmRecord } from '../types';
import {
  getTodayDateString,
} from '../utils/rmCalculations';
import { normalizeExerciseTitle } from '../utils/backup';
import {
  addRmRecordToLogs,
  createRmLog,
  createRmRecord,
  deleteRmRecordFromLogs,
  editRmRecordInLogs,
} from '../utils/rmLogs';

interface UseRmLogActionsProps {
  catalog: ExerciseDefinition[];
  rmLogs: ExerciseRmLog[];
  onSaveRmLogs: (updated: ExerciseRmLog[]) => void;
}

export function useRmLogActions({ catalog, rmLogs, onSaveRmLogs }: UseRmLogActionsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);
  const [quickLogTarget, setQuickLogTarget] = useState<ExerciseRmLog | null>(null);
  const [quickWeight, setQuickWeight] = useState('');
  const [quickDate, setQuickDate] = useState(getTodayDateString());
  const [quickNotes, setQuickNotes] = useState('');
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCatalogExercise, setSelectedCatalogExercise] = useState<ExerciseDefinition | null>(null);
  const [initialWeight, setInitialWeight] = useState('');
  const [initialDate, setInitialDate] = useState(getTodayDateString());
  const [initialNotes, setInitialNotes] = useState('');

  const filteredRmLogs = useMemo(() => {
    const term = normalizeExerciseTitle(searchTerm);
    if (!term) return rmLogs;
    return rmLogs.filter((log) => {
      const matchName = normalizeExerciseTitle(log.exerciseName).includes(term);
      const matchCat = log.category ? normalizeExerciseTitle(log.category).includes(term) : false;
      return matchName || matchCat;
    });
  }, [rmLogs, searchTerm]);

  const trackedNormalizedNames = useMemo(
    () => new Set(rmLogs.map((log) => normalizeExerciseTitle(log.exerciseName))),
    [rmLogs],
  );

  const availableCatalog = useMemo(() => {
    const term = normalizeExerciseTitle(catalogSearch);
    return catalog.filter((definition) => {
      const isTracked = trackedNormalizedNames.has(normalizeExerciseTitle(definition.name));
      if (isTracked) return false;
      if (!term) return true;
      const matchName = normalizeExerciseTitle(definition.name).includes(term);
      const matchCat = definition.category
        ? normalizeExerciseTitle(definition.category).includes(term)
        : false;
      return matchName || matchCat;
    });
  }, [catalog, trackedNormalizedNames, catalogSearch]);

  const catalogImageMap = useMemo(() => {
    const map = new Map<string, string>();
    catalog.forEach((definition) => {
      if (definition.imageUrl) {
        map.set(normalizeExerciseTitle(definition.name), definition.imageUrl);
      }
    });
    return map;
  }, [catalog]);

  const handleConfirmAddExercise = () => {
    if (!selectedCatalogExercise) return;
    const weightNum = parseFloat(initialWeight);
    if (isNaN(weightNum) || weightNum <= 0) {
      alert('Por favor introduce un peso válido mayor a 0 kg');
      return;
    }

    const newRecord = createRmRecord(
      `rm-rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      weightNum,
      initialDate || getTodayDateString(),
      initialNotes.trim() ? initialNotes.trim() : undefined,
    );
    const newLog = createRmLog(
      selectedCatalogExercise,
      newRecord,
      `rm-log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      new Date().toISOString(),
      new Date().toISOString(),
    );

    onSaveRmLogs([newLog, ...rmLogs]);
    setIsAddModalOpen(false);
    setSelectedCatalogExercise(null);
    setInitialWeight('');
    setInitialNotes('');
    setInitialDate(getTodayDateString());
    setExpandedExerciseId(newLog.id);
  };

  const handleOpenAddModal = () => {
    setSelectedCatalogExercise(null);
    setInitialWeight('');
    setInitialNotes('');
    setIsAddModalOpen(true);
  };

  const handleDeleteExercise = (logId: string, name: string) => {
    if (window.confirm(`¿Seguro que deseas eliminar el registro de RM de "${name}" y todo su historial?`)) {
      onSaveRmLogs(rmLogs.filter((log) => log.id !== logId));
      if (expandedExerciseId === logId) {
        setExpandedExerciseId(null);
      }
    }
  };

  const handleOpenQuickLog = (log: ExerciseRmLog, latestRecord: RmRecord | null) => {
    setQuickLogTarget(log);
    setQuickWeight(latestRecord ? latestRecord.weight.toString() : '');
    setQuickDate(getTodayDateString());
    setQuickNotes('');
  };

  const handleAddRecordToLog = (logId: string) => {
    const weightNum = parseFloat(quickWeight);
    if (isNaN(weightNum) || weightNum <= 0) {
      alert('Por favor introduce un peso válido mayor a 0 kg');
      return;
    }
    const newRecord = createRmRecord(
      `rm-rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      weightNum,
      quickDate || getTodayDateString(),
      quickNotes.trim() ? quickNotes.trim() : undefined,
    );
    onSaveRmLogs(addRmRecordToLogs(rmLogs, logId, newRecord, new Date().toISOString()));
    setQuickLogTarget(null);
    setQuickWeight('');
    setQuickNotes('');
    setQuickDate(getTodayDateString());
  };

  const handleStartEditRecord = (record: RmRecord) => {
    setEditingRecordId(record.id);
    setEditWeight(record.weight.toString());
    setEditDate(record.date);
    setEditNotes(record.notes || '');
  };

  const handleSaveEditRecord = (logId: string, recordId: string) => {
    const weightNum = parseFloat(editWeight);
    if (isNaN(weightNum) || weightNum <= 0) {
      alert('Por favor introduce un peso válido mayor a 0 kg');
      return;
    }
    onSaveRmLogs(editRmRecordInLogs(
      rmLogs,
      logId,
      recordId,
      weightNum,
      editDate,
      editNotes.trim() ? editNotes.trim() : undefined,
      new Date().toISOString(),
    ));
    setEditingRecordId(null);
  };

  const handleDeleteRecord = (logId: string, recordId: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar este registro de RM?')) return;
    const targetLog = rmLogs.find((log) => log.id === logId);
    if (!targetLog) return;

    if (targetLog.records.length <= 1) {
      if (window.confirm(`Este es el único registro de "${targetLog.exerciseName}". ¿Deseas eliminar el ejercicio del seguimiento de RMs?`)) {
        onSaveRmLogs(rmLogs.filter((log) => log.id !== logId));
        return;
      }
    }

    onSaveRmLogs(deleteRmRecordFromLogs(rmLogs, logId, recordId, new Date().toISOString()));
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
    quickWeight,
    setQuickWeight,
    quickDate,
    setQuickDate,
    quickNotes,
    setQuickNotes,
    editingRecordId,
    setEditingRecordId,
    editWeight,
    setEditWeight,
    editDate,
    setEditDate,
    editNotes,
    setEditNotes,
    catalogSearch,
    setCatalogSearch,
    selectedCatalogExercise,
    setSelectedCatalogExercise,
    initialWeight,
    setInitialWeight,
    initialDate,
    setInitialDate,
    initialNotes,
    setInitialNotes,
    filteredRmLogs,
    availableCatalog,
    catalogImageMap,
    handleConfirmAddExercise,
    handleOpenAddModal,
    handleDeleteExercise,
    handleOpenQuickLog,
    handleAddRecordToLog,
    handleStartEditRecord,
    handleSaveEditRecord,
    handleDeleteRecord,
  };
}
