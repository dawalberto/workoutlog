import { useState } from 'react';
import type { RmMetric, RmRecord } from '../../types';
import { getRmRecordMetric } from '../../utils/rmCalculations';
import { formatWeightInput } from '../../utils/weightInput';

export interface RmRecordFormState {
  editingRecordId: string | null;
  editWeight: string;
  setEditWeight: (value: string) => void;
  editMetric: RmMetric;
  setEditMetric: (value: RmMetric) => void;
  editDate: string;
  setEditDate: (value: string) => void;
  editNotes: string;
  setEditNotes: (value: string) => void;
  handleStartEditRecord: (record: RmRecord) => void;
  handleCancelEdit: () => void;
}

export function useRmRecordForm(): RmRecordFormState {
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState('');
  const [editMetric, setEditMetric] = useState<RmMetric>('weight');
  const [editDate, setEditDate] = useState('');
  const [editNotes, setEditNotes] = useState('');

  return {
    editingRecordId,
    editWeight,
    setEditWeight,
    editMetric,
    setEditMetric,
    editDate,
    setEditDate,
    editNotes,
    setEditNotes,
    handleStartEditRecord: (record) => {
      setEditingRecordId(record.id);
      setEditWeight(formatWeightInput(record.weight));
      setEditMetric(getRmRecordMetric(record));
      setEditDate(record.date);
      setEditNotes(record.notes || '');
    },
    handleCancelEdit: () => setEditingRecordId(null),
  };
}
