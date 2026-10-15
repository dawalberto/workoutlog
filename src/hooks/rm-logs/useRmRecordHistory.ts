import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store/appStore';
import { selectPersistedData } from '../../store/selectors';
import type { ExerciseRmLog } from '../../types';
import { deleteRmRecordFromLogs, editRmRecordInLogs } from '../../utils/rmLogs';
import type { RmRecordFormState } from './useRmRecordForm';
import { parseWeightInput } from '../../utils/weightInput';

export function useRmRecordHistory(log: ExerciseRmLog, form: RmRecordFormState) {
  const { rmLogs, setRmLogs } = useAppStore(useShallow(selectPersistedData));

  const handleSaveEditRecord = (logId: string, recordId: string) => {
    const weightNum = parseWeightInput(form.editWeight);
    if (weightNum === null || weightNum <= 0) {
      alert('Por favor introduce un peso válido mayor a 0 kg');
      return;
    }
    setRmLogs(editRmRecordInLogs(
      rmLogs,
      logId,
      recordId,
      weightNum,
      form.editDate,
      form.editNotes.trim() ? form.editNotes.trim() : undefined,
      new Date().toISOString(),
    ));
    form.handleCancelEdit();
  };

  const handleDeleteRecord = (logId: string, recordId: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar este registro de RM?')) return;
    const targetLog = rmLogs.find((item) => item.id === logId);
    if (!targetLog) return;

    if (targetLog.records.length <= 1) {
      if (!window.confirm(`Este es el único registro de "${targetLog.exerciseName}". ¿Deseas eliminar el ejercicio del seguimiento de RMs?`)) {
        return;
      }
      setRmLogs(rmLogs.filter((item) => item.id !== logId));
      return;
    }
    setRmLogs(deleteRmRecordFromLogs(rmLogs, logId, recordId, new Date().toISOString()));
  };

  return {
    ...form,
    handleSaveEditRecord,
    handleDeleteRecord,
  };
}
