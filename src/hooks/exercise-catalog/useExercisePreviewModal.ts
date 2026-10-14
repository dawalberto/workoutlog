import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store/appStore';
import { selectPersistedData } from '../../store/selectors';

export function useExercisePreviewModal() {
  const { rmLogs, exerciseDiary } = useAppStore(useShallow(selectPersistedData));
  const openExerciseDiary = useAppStore((state) => state.openExerciseDiary);
  return { rmLogs, exerciseDiary, openExerciseDiary };
}
