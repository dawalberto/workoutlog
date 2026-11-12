import { t } from '../../utils/i18n';
import { appStore } from '../../store/appStore';
import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store/appStore';
import { selectPersistedData } from '../../store/selectors';
import type { ExerciseRmLog, RmMetric } from '../../types';
import {
  getLatestRmRecord,
  getRmRecordMetric,
  getTodayDateString,
} from '../../utils/rmCalculations';
import { formatWeightInput, parseWeightInput } from '../../utils/weightInput';
import { addRmRecordToLogs, createRmRecord } from '../../utils/rmLogs';

export function useQuickRmRecordForm(target: ExerciseRmLog | null, onClose: () => void) {
  const { rmLogs, setRmLogs } = useAppStore(useShallow(selectPersistedData));
  const [weight, setWeight] = useState('');
  const [metric, setMetric] = useState<RmMetric>('weight');
  const [date, setDate] = useState(getTodayDateString());
  const [notes, setNotes] = useState('');

  const handleOpen = (log: ExerciseRmLog) => {
    const latestRecord = getLatestRmRecord(log);
    setWeight(latestRecord === null ? '' : formatWeightInput(latestRecord.weight));
    setMetric(latestRecord ? getRmRecordMetric(latestRecord) : 'weight');
    setDate(getTodayDateString());
    setNotes('');
  };

  const handleSubmit = () => {
    if (!target) return;
    const valueNum = parseWeightInput(weight);
    if (valueNum === null || valueNum <= 0) {
      alert(
        metric === 'reps'
          ? t('Por favor introduce un número de repeticiones válido mayor a 0')
          : t('Por favor introduce un peso válido mayor a 0 {0}', appStore.getState().weightUnit),
      );
      return;
    }
    const record = createRmRecord(
      `rm-rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      valueNum,
      date || getTodayDateString(),
      notes.trim() ? notes.trim() : undefined,
      metric,
    );
    setRmLogs(addRmRecordToLogs(rmLogs, target.id, record, new Date().toISOString()));
    onClose();
  };

  return {
    weight,
    setWeight,
    metric,
    setMetric,
    date,
    setDate,
    notes,
    setNotes,
    handleOpen,
    handleSubmit,
  };
}
