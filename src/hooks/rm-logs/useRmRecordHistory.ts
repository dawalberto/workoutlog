import { t } from '../../utils/i18n';
import { appStore } from '../../store/appStore';
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
    const valueNum = parseWeightInput(form.editWeight);
    if (valueNum === null || valueNum <= 0) {
      alert(
        form.editMetric === 'reps'
          ? t('Por favor introduce un número de repeticiones válido mayor a 0')
          : t('Por favor introduce un peso válido mayor a 0 {0}', appStore.getState().weightUnit),
      );
      return;
    }
    setRmLogs(editRmRecordInLogs(
      rmLogs,
      logId,
      recordId,
      valueNum,
      form.editDate,
      form.editNotes.trim() ? form.editNotes.trim() : undefined,
      new Date().toISOString(),
      form.editMetric,
    ));
    form.handleCancelEdit();
  };

  const handleDeleteRecord = (logId: string, recordId: string) => {
    if (!window.confirm(t("¿Seguro que deseas eliminar este registro de RM?"))) return;
    const targetLog = rmLogs.find((item) => item.id === logId);
    if (!targetLog) return;

    if (targetLog.records.length <= 1) {
      if (!window.confirm(t("Este es el único registro de \"{0}\". ¿Deseas eliminar el ejercicio del seguimiento de RMs?", targetLog.exerciseName))) {
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
