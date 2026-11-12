import { t } from '../../utils/i18n';
import { appStore } from '../../store/appStore';
import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store/appStore';
import { selectPersistedData } from '../../store/selectors';
import type { ExerciseDefinition, RmMetric } from '../../types';
import { findRmLogForExercise, getTodayDateString } from '../../utils/rmCalculations';
import { formatWeightInput, parseWeightInput } from '../../utils/weightInput';
import {
  addRmRecordToLogs,
  createRmLog,
  createRmRecord,
  getAvailableRmCatalog,
} from '../../utils/rmLogs';

export function useAddExerciseToRmModal(onClose: () => void, onAdded: (logId: string) => void) {
  const { catalog, rmLogs, setRmLogs } = useAppStore(useShallow(selectPersistedData));
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCatalogExercise, setSelectedCatalogExercise] =
    useState<ExerciseDefinition | null>(null);
  const [initialWeight, setInitialWeight] = useState('');
  const [initialMetric, setInitialMetric] = useState<RmMetric>('weight');
  const [initialDate, setInitialDate] = useState(getTodayDateString());
  const [initialNotes, setInitialNotes] = useState('');

  const availableCatalog = useMemo(
    () => getAvailableRmCatalog(catalog, rmLogs, catalogSearch),
    [catalog, rmLogs, catalogSearch],
  );

  const handleOpen = () => {
    setSelectedCatalogExercise(null);
    setInitialWeight('');
    setInitialMetric('weight');
    setInitialNotes('');
  };

  const handleSelectCatalogExercise = (exercise: ExerciseDefinition) => {
    setSelectedCatalogExercise(exercise);
    setInitialMetric('weight');
    setInitialWeight(
      exercise.defaultWeight && exercise.defaultWeight > 0
        ? formatWeightInput(exercise.defaultWeight)
        : '',
    );
  };

  const handleConfirm = () => {
    if (!selectedCatalogExercise) return;
    const valueNum = parseWeightInput(initialWeight);
    if (valueNum === null || valueNum <= 0) {
      alert(
        initialMetric === 'reps'
          ? t('Por favor introduce un número de repeticiones válido mayor a 0')
          : t('Por favor introduce un peso válido mayor a 0 {0}', appStore.getState().weightUnit),
      );
      return;
    }

    const timestamp = new Date().toISOString();
    const newRecord = createRmRecord(
      `rm-rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      valueNum,
      initialDate || getTodayDateString(),
      initialNotes.trim() ? initialNotes.trim() : undefined,
      initialMetric,
    );

    const existingLog = findRmLogForExercise(
      rmLogs,
      selectedCatalogExercise.name,
      selectedCatalogExercise.id,
    );

    if (existingLog) {
      const updated = addRmRecordToLogs(rmLogs, existingLog.id, newRecord, timestamp);
      setRmLogs(updated);
      onAdded(existingLog.id);
    } else {
      const newLog = createRmLog(
        selectedCatalogExercise,
        newRecord,
        `rm-log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp,
        timestamp,
      );
      setRmLogs([newLog, ...rmLogs]);
      onAdded(newLog.id);
    }
    setSelectedCatalogExercise(null);
    setInitialWeight('');
    setInitialMetric('weight');
    setInitialNotes('');
    setInitialDate(getTodayDateString());
    onClose();
  };

  return {
    catalog,
    availableCatalog,
    catalogSearch,
    setCatalogSearch,
    handleOpen,
    selectedCatalogExercise,
    handleSelectCatalogExercise,
    handleClearSelectedExercise: () => setSelectedCatalogExercise(null),
    initialWeight,
    setInitialWeight,
    initialMetric,
    setInitialMetric,
    initialDate,
    setInitialDate,
    initialNotes,
    setInitialNotes,
    handleConfirm,
  };
}
