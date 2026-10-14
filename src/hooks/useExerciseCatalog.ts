import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { AppTab } from '../types';
import type { ExerciseDefinition } from '../types';
import { useAppStore } from '../store/appStore';
import { selectPersistedData } from '../store/selectors';
import { buildCatalogExercise, filterExerciseCatalog } from '../utils/exerciseCatalog';
import { useExerciseForm } from './exercise-catalog/useExerciseForm';

export function useExerciseCatalog() {
  const data = useAppStore(useShallow(selectPersistedData));
  const createCatalogExercise = useAppStore((state) => state.createCatalogExercise);
  const updateCatalogExercise = useAppStore((state) => state.updateCatalogExercise);
  const deleteCatalogExercise = useAppStore((state) => state.deleteCatalogExercise);
  const checkRmWeight = useAppStore((state) => state.checkRmWeight);
  const openExerciseDiary = useAppStore((state) => state.openExerciseDiary);
  const setActiveTab = useAppStore((state) => state.setActiveTab);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [isEditing, setIsEditing] = useState(false);
  const [editingExercise, setEditingExercise] = useState<ExerciseDefinition | null>(null);
  const [previewExercise, setPreviewExercise] = useState<ExerciseDefinition | null>(null);
  const { form, reset: resetForm } = useExerciseForm();

  const filteredExercises = useMemo(
    () => filterExerciseCatalog(data.catalog, searchTerm, selectedCategory),
    [data.catalog, searchTerm, selectedCategory],
  );

  const handleOpenCreate = () => {
    setPreviewExercise(null);
    setEditingExercise(null);
    resetForm();
    setIsEditing(true);
  };

  const handleOpenEdit = (exercise: ExerciseDefinition) => {
    setPreviewExercise(null);
    setEditingExercise(exercise);
    resetForm(exercise);
    setIsEditing(true);
  };

  const handleSaveForm = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return;

    const savedExercise = buildCatalogExercise(
      form,
      editingExercise,
      `def-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      new Date().toISOString(),
    );
    if (editingExercise) {
      updateCatalogExercise(savedExercise);
    } else {
      createCatalogExercise(savedExercise);
    }

    const savedWeight = Number(form.defaultWeight) || 0;
    if (savedWeight > 0) {
      checkRmWeight(savedExercise.name, savedWeight, editingExercise?.id);
    }

    setIsEditing(false);
    setEditingExercise(null);
  };

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`¿Seguro que deseas eliminar "${name}" de la biblioteca?`)) return;
    if (previewExercise?.id === id) setPreviewExercise(null);
    deleteCatalogExercise(id);
  };

  return {
    catalog: data.catalog,
    rmLogs: data.rmLogs,
    exerciseDiary: data.exerciseDiary,
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    isEditing,
    setIsEditing,
    editingExercise,
    previewExercise,
    setPreviewExercise,
    form,
    filteredExercises,
    handleOpenCreate,
    handleOpenEdit,
    handleSaveForm,
    handleDelete,
    onOpenDiary: openExerciseDiary,
    onGoToCatalog: () => setActiveTab(AppTab.EXERCISES),
  };
}
