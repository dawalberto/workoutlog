import { useAppStore } from '../../store/appStore';
import { selectPersistedData } from '../../store/selectors';
import { getTotalDiaryEntriesCount } from '../../utils/diaryCalculations';
import { useShallow } from 'zustand/react/shallow';

export function useTabCounts() {
  return useAppStore(useShallow((state) => {
    const data = selectPersistedData(state);
    return {
      routinesCount: data.routines.length,
      catalogCount: data.catalog.length,
      rmCount: data.rmLogs.length,
      historyCount: data.workoutHistory.length,
      diaryCount: getTotalDiaryEntriesCount(data.exerciseDiary),
    };
  }));
}
