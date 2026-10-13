import type { ExerciseDefinition } from '../types';

export const filterExerciseCatalog = (
  exercises: ExerciseDefinition[],
  searchTerm: string,
  selectedCategory: string,
): ExerciseDefinition[] => exercises.filter((ex) => {
  const matchesSearch = ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (ex.notes && ex.notes.toLowerCase().includes(searchTerm.toLowerCase()));
  const matchesCat = selectedCategory === 'Todos' || ex.category === selectedCategory;
  return matchesSearch && matchesCat;
});
