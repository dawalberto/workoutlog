import { useState } from 'react';
import type { RmRecord } from '../../types';

export interface RmRecordFormState {
  editingRecordId: string | null;
  editWeight: string;
  setEditWeight: (value: string) => void;
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
  const [editDate, setEditDate] = useState('');
  const [editNotes, setEditNotes] = useState('');

  return {
    editingRecordId,
    editWeight,
    setEditWeight,
    editDate,
    setEditDate,
    editNotes,
    setEditNotes,
    handleStartEditRecord: (record) => {
      setEditingRecordId(record.id);
      setEditWeight(record.weight.toString());
      setEditDate(record.date);
      setEditNotes(record.notes || '');
    },
    handleCancelEdit: () => setEditingRecordId(null),
  };
}
