import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store/appStore';
import { selectPersistedData } from '../../store/selectors';
import type { ExerciseRmLog } from '../../types';
import { getLatestRmRecord, getTodayDateString } from '../../utils/rmCalculations';
import { formatWeightInput, parseWeightInput } from '../../utils/weightInput';
import { addRmRecordToLogs, createRmRecord } from '../../utils/rmLogs';

export function useQuickRmRecordForm(target: ExerciseRmLog | null, onClose: () => void) {
  const { rmLogs, setRmLogs } = useAppStore(useShallow(selectPersistedData));
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  const [notes, setNotes] = useState('');

  const handleOpen = (log: ExerciseRmLog) => {
    const latestWeight = getLatestRmRecord(log)?.weight;
    setWeight(latestWeight === undefined ? '' : formatWeightInput(latestWeight));
    setDate(getTodayDateString());
    setNotes('');
  };

  const handleSubmit = () => {
    if (!target) return;
    const weightNum = parseWeightInput(weight);
    if (weightNum === null || weightNum <= 0) {
      alert('Por favor introduce un peso válido mayor a 0 kg');
      return;
    }
    const record = createRmRecord(
      `rm-rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      weightNum,
      date || getTodayDateString(),
      notes.trim() ? notes.trim() : undefined,
    );
    setRmLogs(addRmRecordToLogs(rmLogs, target.id, record, new Date().toISOString()));
    onClose();
  };

  return {
    weight,
    setWeight,
    date,
    setDate,
    notes,
    setNotes,
    handleOpen,
    handleSubmit,
  };
}
