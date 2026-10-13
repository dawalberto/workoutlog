import { useEffect, useMemo, useState } from 'react';
import type { ExerciseDefinition, ExerciseDiary, ExerciseDiaryEntry, DiaryFeeling } from '../types';
import {
  findDiaryForExercise,
  getAllFlattenedDiaryEntries,
  getDiaryEntriesCount,
  getTotalDiaryEntriesCount,
  type FlattenedDiaryEntry,
} from '../utils/diaryCalculations';
import { normalizeExerciseTitle } from '../utils/backup';

interface UseExerciseDiaryProps {
  catalog: ExerciseDefinition[];
  diaries: ExerciseDiary[];
  initialExerciseName?: string;
  autoOpenCreate?: boolean;
  onSaveDiaries: (updated: ExerciseDiary[]) => void;
  onClearInitialState?: () => void;
}

export function useExerciseDiary({
  catalog,
  diaries,
  initialExerciseName,
  autoOpenCreate = false,
  onSaveDiaries,
  onClearInitialState,
}: UseExerciseDiaryProps) {
  const [selectedExerciseName, setSelectedExerciseName] = useState<string>(() => {
    return initialExerciseName || 'ALL';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFeelingFilter, setSelectedFeelingFilter] = useState<'ALL' | DiaryFeeling>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<{
    diaryId: string;
    entry: ExerciseDiaryEntry;
  } | null>(null);
  const [formExerciseName, setFormExerciseName] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formNote, setFormNote] = useState('');
  const [formFeeling, setFormFeeling] = useState<DiaryFeeling | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);

  const allEntries = useMemo(() => getAllFlattenedDiaryEntries(diaries), [diaries]);

  const exercisesWithDiary = useMemo(() => {
    const list: { def: ExerciseDefinition; count: number }[] = [];
    catalog.forEach((def) => {
      const count = getDiaryEntriesCount(diaries, def.name, def.id);
      if (count > 0) {
        list.push({ def, count });
      }
    });
    return list.sort((a, b) => b.count - a.count);
  }, [catalog, diaries]);

  const filteredEntries = useMemo(() => {
    return allEntries.filter((item) => {
      if (selectedExerciseName !== 'ALL') {
        const matchesExercise =
          normalizeExerciseTitle(item.exerciseName) === normalizeExerciseTitle(selectedExerciseName);
        if (!matchesExercise) return false;
      }

      if (selectedFeelingFilter !== 'ALL') {
        if (item.feeling !== selectedFeelingFilter) return false;
      }

      if (searchQuery.trim()) {
        const q = normalizeExerciseTitle(searchQuery);
        const inNote = normalizeExerciseTitle(item.note).includes(q);
        const inName = normalizeExerciseTitle(item.exerciseName).includes(q);
        const inCategory = item.category ? normalizeExerciseTitle(item.category).includes(q) : false;
        const inDate = item.date.includes(searchQuery.trim());
        if (!inNote && !inName && !inCategory && !inDate) return false;
      }

      return true;
    });
  }, [allEntries, selectedExerciseName, selectedFeelingFilter, searchQuery]);

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEntry(null);
    setFormError(null);
  };

  const openCreateModal = (targetExerciseName?: string) => {
    setEditingEntry(null);
    setFormError(null);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormNote('');
    setFormFeeling(undefined);

    if (targetExerciseName && catalog.some((c) => normalizeExerciseTitle(c.name) === normalizeExerciseTitle(targetExerciseName))) {
      setFormExerciseName(targetExerciseName);
    } else if (selectedExerciseName !== 'ALL' && catalog.some((c) => normalizeExerciseTitle(c.name) === normalizeExerciseTitle(selectedExerciseName))) {
      setFormExerciseName(selectedExerciseName);
    } else if (catalog.length > 0) {
      setFormExerciseName(catalog[0].name);
    } else {
      setFormExerciseName('');
    }

    setIsModalOpen(true);
  };

  useEffect(() => {
    if (initialExerciseName) {
      setSelectedExerciseName(initialExerciseName);
      if (autoOpenCreate) {
        openCreateModal(initialExerciseName);
      }
      onClearInitialState?.();
    }
  }, [initialExerciseName, autoOpenCreate]);

  const openEditModal = (entry: FlattenedDiaryEntry) => {
    setEditingEntry({
      diaryId: entry.diaryId,
      entry: {
        id: entry.id,
        date: entry.date,
        note: entry.note,
        feeling: entry.feeling,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      },
    });
    setFormError(null);
    setFormExerciseName(entry.exerciseName);
    setFormDate(entry.date);
    setFormNote(entry.note);
    setFormFeeling(entry.feeling);
    setIsModalOpen(true);
  };

  const handleSaveEntry = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!formExerciseName.trim()) {
      setFormError('Debes seleccionar un ejercicio de tu biblioteca.');
      return;
    }

    if (!formNote.trim()) {
      setFormError('La nota no puede estar vacía.');
      return;
    }

    const matchedDef = catalog.find(
      (c) => normalizeExerciseTitle(c.name) === normalizeExerciseTitle(formExerciseName)
    );

    const nowIso = new Date().toISOString();

    if (editingEntry) {
      const updatedDiaries = diaries.map((d) => {
        if (d.id === editingEntry.diaryId) {
          const updatedEntries = d.entries.map((entry) => {
            if (entry.id === editingEntry.entry.id) {
              return {
                ...entry,
                date: formDate,
                note: formNote.trim(),
                feeling: formFeeling,
                updatedAt: nowIso,
              };
            }
            return entry;
          });
          return {
            ...d,
            entries: updatedEntries,
            updatedAt: nowIso,
          };
        }
        return d;
      });

      onSaveDiaries(updatedDiaries);
    } else {
      const newEntry: ExerciseDiaryEntry = {
        id: 'diary-entry-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        date: formDate,
        note: formNote.trim(),
        feeling: formFeeling,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const existingDiary = findDiaryForExercise(diaries, formExerciseName, matchedDef?.id);

      let updatedDiaries: ExerciseDiary[];

      if (existingDiary) {
        updatedDiaries = diaries.map((d) => {
          if (d.id === existingDiary.id) {
            return {
              ...d,
              exerciseId: matchedDef?.id || d.exerciseId,
              exerciseName: matchedDef?.name || d.exerciseName,
              category: matchedDef?.category || d.category,
              entries: [newEntry, ...d.entries],
              updatedAt: nowIso,
            };
          }
          return d;
        });
      } else {
        const newDiary: ExerciseDiary = {
          id: 'diary-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          exerciseId: matchedDef?.id,
          exerciseName: matchedDef?.name || formExerciseName.trim(),
          category: matchedDef?.category || 'General',
          entries: [newEntry],
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        updatedDiaries = [newDiary, ...diaries];
      }

      onSaveDiaries(updatedDiaries);
      setSelectedExerciseName(formExerciseName);
    }

    closeModal();
  };

  const handleDeleteEntry = (diaryId: string, entryId: string, exerciseName: string) => {
    if (!window.confirm(`¿Seguro que deseas eliminar este registro del diario de "${exerciseName}"?`)) {
      return;
    }

    const updatedDiaries = diaries
      .map((d) => {
        if (d.id === diaryId) {
          const remainingEntries = d.entries.filter((e) => e.id !== entryId);
          return {
            ...d,
            entries: remainingEntries,
            updatedAt: new Date().toISOString(),
          };
        }
        return d;
      })
      .filter((d) => d.entries.length > 0);

    onSaveDiaries(updatedDiaries);
  };

  return {
    allEntries,
    closeModal,
    editingEntry,
    exercisesWithDiary,
    filteredEntries,
    formDate,
    formError,
    formExerciseName,
    formFeeling,
    formNote,
    handleDeleteEntry,
    handleSaveEntry,
    isModalOpen,
    openCreateModal,
    openEditModal,
    searchQuery,
    selectedExerciseName,
    selectedFeelingFilter,
    setFormDate,
    setFormError,
    setFormExerciseName,
    setFormFeeling,
    setFormNote,
    setSearchQuery,
    setSelectedExerciseName,
    setSelectedFeelingFilter,
    totalEntriesCount: getTotalDiaryEntriesCount(diaries),
  };
}
