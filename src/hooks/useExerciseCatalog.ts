import React, { useState } from 'react';
import type { ExerciseDefinition } from '../types';
import { filterExerciseCatalog } from '../utils/exerciseCatalog';

interface UseExerciseCatalogProps {
  exercises: ExerciseDefinition[];
  onCreateExercise: (exercise: ExerciseDefinition) => void;
  onUpdateExercise: (exercise: ExerciseDefinition) => void;
  onDeleteExercise: (id: string) => void;
  onCheckRmWeight?: (exerciseName: string, newWeight: number, exerciseId?: string) => void;
}

export const useExerciseCatalog = ({
  exercises,
  onCreateExercise,
  onUpdateExercise,
  onDeleteExercise,
  onCheckRmWeight,
}: UseExerciseCatalogProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingExercise, setEditingExercise] = useState<ExerciseDefinition | null>(null);
  const [previewExercise, setPreviewExercise] = useState<ExerciseDefinition | null>(null);

  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Pecho');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formVideoUrl, setFormVideoUrl] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formDefaultSets, setFormDefaultSets] = useState<number | string>(3);
  const [formDefaultReps, setFormDefaultReps] = useState<number | string>(10);
  const [formDefaultWeight, setFormDefaultWeight] = useState<number | string>(50);
  const [formDefaultRest, setFormDefaultRest] = useState<number | string>(90);
  const [imageError, setImageError] = useState(false);

  const filteredExercises = filterExerciseCatalog(exercises, searchTerm, selectedCategory);

  const handleOpenCreate = () => {
    setPreviewExercise(null);
    setEditingExercise(null);
    setFormName('');
    setFormCategory('Pecho');
    setFormImageUrl('');
    setFormVideoUrl('');
    setFormNotes('');
    setFormDefaultSets(3);
    setFormDefaultReps(10);
    setFormDefaultWeight(50);
    setFormDefaultRest(90);
    setImageError(false);
    setIsEditing(true);
  };

  const handleOpenEdit = (ex: ExerciseDefinition) => {
    setPreviewExercise(null);
    setEditingExercise(ex);
    setFormName(ex.name);
    setFormCategory(ex.category || 'Pecho');
    setFormImageUrl(ex.imageUrl || '');
    setFormVideoUrl(ex.videoUrl || '');
    setFormNotes(ex.notes || '');
    setFormDefaultSets(ex.defaultSetsCount || 3);
    setFormDefaultReps(ex.defaultReps || 10);
    setFormDefaultWeight(ex.defaultWeight || 50);
    setFormDefaultRest(ex.defaultRestSeconds || 90);
    setImageError(false);
    setIsEditing(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingExercise) {
      onUpdateExercise({
        ...editingExercise,
        name: formName.trim(),
        category: formCategory,
        imageUrl: formImageUrl.trim(),
        videoUrl: formVideoUrl.trim(),
        notes: formNotes.trim(),
        defaultSetsCount: Number(formDefaultSets) || 3,
        defaultReps: Number(formDefaultReps) || 10,
        defaultWeight: Number(formDefaultWeight) || 0,
        defaultRestSeconds: Number(formDefaultRest) || 60,
      });
    } else {
      const newDef: ExerciseDefinition = {
        id: 'def-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        name: formName.trim(),
        category: formCategory,
        imageUrl: formImageUrl.trim(),
        videoUrl: formVideoUrl.trim(),
        notes: formNotes.trim(),
        defaultSetsCount: Number(formDefaultSets) || 3,
        defaultReps: Number(formDefaultReps) || 10,
        defaultWeight: Number(formDefaultWeight) || 0,
        defaultRestSeconds: Number(formDefaultRest) || 60,
        createdAt: new Date().toISOString(),
      };
      onCreateExercise(newDef);
    }

    const savedWeight = Number(formDefaultWeight) || 0;
    if (savedWeight > 0 && onCheckRmWeight) {
      onCheckRmWeight(formName.trim(), savedWeight, editingExercise?.id);
    }

    setIsEditing(false);
    setEditingExercise(null);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`¿Seguro que deseas eliminar "${name}" de la biblioteca?`)) {
      if (previewExercise?.id === id) {
        setPreviewExercise(null);
      }
      onDeleteExercise(id);
    }
  };

  return {
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    isEditing,
    setIsEditing,
    editingExercise,
    previewExercise,
    setPreviewExercise,
    formName,
    setFormName,
    formCategory,
    setFormCategory,
    formImageUrl,
    setFormImageUrl,
    formVideoUrl,
    setFormVideoUrl,
    formNotes,
    setFormNotes,
    formDefaultSets,
    setFormDefaultSets,
    formDefaultReps,
    setFormDefaultReps,
    formDefaultWeight,
    setFormDefaultWeight,
    formDefaultRest,
    setFormDefaultRest,
    imageError,
    setImageError,
    filteredExercises,
    handleOpenCreate,
    handleOpenEdit,
    handleSaveForm,
    handleDelete,
  };
};
