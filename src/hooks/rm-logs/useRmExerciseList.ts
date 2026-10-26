import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store/appStore';
import { selectPersistedData } from '../../store/selectors';
import { filterRmLogs } from '../../utils/rmLogs';
import { normalizeExerciseTitle } from '../../utils/backup';

export function useRmExerciseList(searchTerm: string) {
  const { catalog, rmLogs } = useAppStore(useShallow(selectPersistedData));
  const filteredRmLogs = useMemo(
    () => filterRmLogs(rmLogs, searchTerm),
    [rmLogs, searchTerm],
  );
  const catalogImageMap = useMemo(() => {
    const map = new Map<string, string>();
    catalog.forEach((definition) => {
      if (definition.imageUrl) {
        map.set(definition.id, definition.imageUrl);
        map.set(normalizeExerciseTitle(definition.name), definition.imageUrl);
      }
    });
    return map;
  }, [catalog]);

  return { catalog, rmLogs, filteredRmLogs, catalogImageMap };
}
