import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store/appStore';
import { selectPersistedData } from '../../store/selectors';

export function useExerciseCatalogCard() {
  const { rmLogs } = useAppStore(useShallow(selectPersistedData));
  return { rmLogs };
}
