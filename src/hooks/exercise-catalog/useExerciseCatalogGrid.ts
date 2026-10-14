import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store/appStore';
import { selectPersistedData } from '../../store/selectors';
import { filterExerciseCatalog } from '../../utils/exerciseCatalog';

export function useExerciseCatalogGrid(searchTerm: string, selectedCategory: string) {
  const { catalog } = useAppStore(useShallow(selectPersistedData));
  return useMemo(
    () => filterExerciseCatalog(catalog, searchTerm, selectedCategory),
    [catalog, searchTerm, selectedCategory],
  );
}
