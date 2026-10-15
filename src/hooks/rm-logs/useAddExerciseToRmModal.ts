import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store/appStore';
import { selectPersistedData } from '../../store/selectors';
import type { ExerciseDefinition } from '../../types';
import { getTodayDateString } from '../../utils/rmCalculations';
import { formatWeightInput, parseWeightInput } from '../../utils/weightInput';
import { createRmLog, createRmRecord, getAvailableRmCatalog } from '../../utils/rmLogs';

export function useAddExerciseToRmModal(onClose: () => void, onAdded: (logId: string) => void) {
  const { catalog, rmLogs, setRmLogs } = useAppStore(useShallow(selectPersistedData));
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCatalogExercise, setSelectedCatalogExercise] =
    useState<ExerciseDefinition | null>(null);
  const [initialWeight, setInitialWeight] = useState('');
  const [initialDate, setInitialDate] = useState(getTodayDateString());
  const [initialNotes, setInitialNotes] = useState('');

  const availableCatalog = useMemo(
    () => getAvailableRmCatalog(catalog, rmLogs, catalogSearch),
    [catalog, rmLogs, catalogSearch],
  );

  const handleOpen = () => {
    setSelectedCatalogExercise(null);
    setInitialWeight('');
    setInitialNotes('');
  };

  const handleSelectCatalogExercise = (exercise: ExerciseDefinition) => {
    setSelectedCatalogExercise(exercise);
    setInitialWeight(
      exercise.defaultWeight && exercise.defaultWeight > 0
        ? formatWeightInput(exercise.defaultWeight)
        : '',
    );
  };

  const handleConfirm = () => {
    if (!selectedCatalogExercise) return;
    const weightNum = parseWeightInput(initialWeight);
    if (weightNum === null || weightNum <= 0) {
      alert('Por favor introduce un peso válido mayor a 0 kg');
      return;
    }

    const timestamp = new Date().toISOString();
    const newLog = createRmLog(
      selectedCatalogExercise,
      createRmRecord(
        `rm-rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        weightNum,
        initialDate || getTodayDateString(),
        initialNotes.trim() ? initialNotes.trim() : undefined,
      ),
      `rm-log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp,
      timestamp,
    );
    setRmLogs([newLog, ...rmLogs]);
    onAdded(newLog.id);
    setSelectedCatalogExercise(null);
    setInitialWeight('');
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
    initialDate,
    setInitialDate,
    initialNotes,
    setInitialNotes,
    handleConfirm,
  };
}
