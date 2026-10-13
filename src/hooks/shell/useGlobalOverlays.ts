import { useAppStore } from '../../store/appStore';
import { useShallow } from 'zustand/react/shallow';
import { selectPersistedData } from '../../store/selectors';
import type { BackupImportSummary } from '../../utils/backup';
import type {
  ExerciseDefinition,
  ExerciseDiary,
  ExerciseRmLog,
  Routine,
  WorkoutHistoryLog,
} from '../../types';

export function useGlobalOverlays() {
  const data = useAppStore(useShallow(selectPersistedData));
  const isBackupModalOpen = useAppStore((state) => state.isBackupModalOpen);
  const closeBackupModal = useAppStore((state) => state.closeBackupModal);
  const isSyncEnabled = useAppStore((state) => state.isSyncEnabled);
  const activeRestTimer = useAppStore((state) => state.activeRestTimer);
  const workoutSummary = useAppStore((state) => state.workoutSummary);
  const dismissWorkoutSummary = useAppStore((state) => state.dismissWorkoutSummary);
  const openDiary = useAppStore((state) => state.openExerciseDiary);
  const importBackup = useAppStore((state) => state.importBackup);

  const onImportComplete = (
    catalog: ExerciseDefinition[],
    routines: Routine[],
    rmLogs: ExerciseRmLog[],
    workoutHistory: WorkoutHistoryLog[],
    exerciseDiary: ExerciseDiary[],
    summary: BackupImportSummary,
  ) => importBackup({ catalog, routines, rmLogs, workoutHistory, exerciseDiary }, summary);

  return {
    ...data,
    isBackupModalOpen,
    closeBackupModal,
    isSyncEnabled,
    activeRestTimer,
    workoutSummary,
    dismissWorkoutSummary,
    openDiary,
    onImportComplete,
  };
}
