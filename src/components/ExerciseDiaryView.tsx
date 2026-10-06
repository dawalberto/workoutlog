import React, { useState, useMemo, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Calendar,
  Filter,
  Edit3,
  Trash2,
  X,
  Check,
  Dumbbell,
  ArrowRight,
  Clock,
  Sparkles,
  MessageSquare
} from 'lucide-react';
import { ExerciseDefinition, ExerciseDiary, ExerciseDiaryEntry, DiaryFeeling } from '../types';
import {
  findDiaryForExercise,
  getAllFlattenedDiaryEntries,
  getFeelingConfig,
  FlattenedDiaryEntry,
  getDiaryEntriesCount,
  getTotalDiaryEntriesCount
} from '../utils/diaryCalculations';
import { normalizeExerciseTitle } from '../utils/backup';

interface ExerciseDiaryViewProps {
  catalog: ExerciseDefinition[];
  diaries: ExerciseDiary[];
  onSaveDiaries: (updated: ExerciseDiary[]) => void;
  onGoToCatalog: () => void;
  initialExerciseName?: string;
  autoOpenCreate?: boolean;
  onClearInitialState?: () => void;
}

export const ExerciseDiaryView: React.FC<ExerciseDiaryViewProps> = ({
  catalog,
  diaries,
  onSaveDiaries,
  onGoToCatalog,
  initialExerciseName,
  autoOpenCreate = false,
  onClearInitialState,
}) => {
  // Navigation & Filter States
  const [selectedExerciseName, setSelectedExerciseName] = useState<string>(() => {
    return initialExerciseName || 'ALL';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFeelingFilter, setSelectedFeelingFilter] = useState<'ALL' | DiaryFeeling>('ALL');

  // Modal State for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<{
    diaryId: string;
    entry: ExerciseDiaryEntry;
  } | null>(null);

  // Form Fields
  const [formExerciseName, setFormExerciseName] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formNote, setFormNote] = useState('');
  const [formFeeling, setFormFeeling] = useState<DiaryFeeling | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);

  // Handle incoming initialExerciseName and autoOpenCreate triggers
  useEffect(() => {
    if (initialExerciseName) {
      setSelectedExerciseName(initialExerciseName);
      if (autoOpenCreate) {
        openCreateModal(initialExerciseName);
      }
      onClearInitialState?.();
    }
  }, [initialExerciseName, autoOpenCreate]);

  // Compute all flattened entries for search and feed
  const allEntries = useMemo(() => {
    return getAllFlattenedDiaryEntries(diaries);
  }, [diaries]);

  // Exercises from catalog that have at least one diary entry
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

  // Filter entries based on selected exercise, search, and feeling
  const filteredEntries = useMemo(() => {
    return allEntries.filter((item) => {
      // 1. Exercise filter
      if (selectedExerciseName !== 'ALL') {
        const matchesExercise =
          normalizeExerciseTitle(item.exerciseName) === normalizeExerciseTitle(selectedExerciseName);
        if (!matchesExercise) return false;
      }

      // 2. Feeling filter
      if (selectedFeelingFilter !== 'ALL') {
        if (item.feeling !== selectedFeelingFilter) return false;
      }

      // 3. Search query
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

  // Open Create Modal
  const openCreateModal = (targetExerciseName?: string) => {
    setEditingEntry(null);
    setFormError(null);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormNote('');
    setFormFeeling(undefined);

    // Default to targetExerciseName, or currently filtered exercise, or first catalog item
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

  // Open Edit Modal
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

  // Close Modal
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEntry(null);
    setFormError(null);
  };

  // Save entry (Create or Update)
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
      // UPDATE existing entry
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
      // CREATE new entry
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
        // Append to existing diary for this exercise
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
        // Create new ExerciseDiary container
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

  // Delete an entry
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
      .filter((d) => d.entries.length > 0); // Keep clean if no entries remain

    onSaveDiaries(updatedDiaries);
  };

  // Helper date formatter
  const formatDateDisplay = (dateString: string) => {
    try {
      const [year, month, day] = dateString.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      if (isNaN(d.getTime())) return { formatted: dateString, tag: null };

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const isToday = d.getTime() === today.getTime();
      const isYesterday = d.getTime() === yesterday.getTime();

      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      };
      const formatted = d.toLocaleDateString('es-ES', options);

      return {
        formatted: formatted.charAt(0).toUpperCase() + formatted.slice(1),
        tag: isToday ? 'Hoy' : isYesterday ? 'Ayer' : null,
      };
    } catch {
      return { formatted: dateString, tag: null };
    }
  };

  const totalEntriesCount = getTotalDiaryEntriesCount(diaries);

  return (
    <div id="exercise-diary-container" className="min-h-screen bg-[#0D0D0D] text-white pb-28 pt-4 sm:pt-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Top Header Card */}
        <div className="bg-[#1C1C1E] rounded-2xl border border-white/[0.08] p-5 sm:p-6 shadow-xl mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1.5 rounded-xl bg-zinc-900 border border-white/10 text-[#00FF87]">
                  <BookOpen className="w-5 h-5" />
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Diario de Ejercicios
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-[#00FF87]/15 text-[#00FF87] border border-[#00FF87]/30">
                  {totalEntriesCount} {totalEntriesCount === 1 ? 'registro' : 'registros'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#A1A1AA]">
                Anota sensaciones, progresiones técnicas y detalles de tus levantamientos.
              </p>
            </div>

            <button
              id="btn-new-diary-entry"
              type="button"
              onClick={() => openCreateModal()}
              disabled={catalog.length === 0}
              className="inline-flex items-center justify-center gap-2 px-5 min-h-[48px] rounded-2xl bg-[#00FF87] hover:bg-[#00e57a] disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-extrabold text-sm shadow-[0_0_20px_rgba(0,255,135,0.35)] active:scale-[0.97] transition-all shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Nuevo Registro</span>
            </button>
          </div>

          {/* Catalog Empty Warning */}
          {catalog.length === 0 && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center mt-4">
              <Dumbbell className="w-6 h-6 text-amber-400 mx-auto mb-1.5" />
              <h3 className="text-sm font-bold text-amber-300 mb-0.5">
                Tu biblioteca de ejercicios está vacía
              </h3>
              <p className="text-xs text-amber-200/80 max-w-md mx-auto mb-3">
                Para registrar notas en el diario, primero debes añadir ejercicios a tu biblioteca.
              </p>
              <button
                type="button"
                onClick={onGoToCatalog}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 transition-colors"
              >
                Ir a la Biblioteca de Ejercicios <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Search & Filter Bar */}
          <div className="mt-5 pt-4 border-t border-white/[0.08] space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar en las notas, ejercicios o fechas..."
                  className="w-full min-h-[48px] pl-11 pr-10 py-2.5 text-sm rounded-2xl border border-white/10 bg-zinc-900/90 text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#00FF87] focus:ring-2 focus:ring-[#00FF87]/20 transition-all shadow-inner"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white rounded-md"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Feeling Filter Pills */}
              <div className="flex items-center gap-1 p-1 bg-zinc-900/80 rounded-2xl border border-white/10 shrink-0 overflow-x-auto min-h-[48px]">
                <button
                  type="button"
                  onClick={() => setSelectedFeelingFilter('ALL')}
                  className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all ${
                    selectedFeelingFilter === 'ALL'
                      ? 'bg-[#00FF87] text-black shadow-[0_0_10px_rgba(0,255,135,0.4)]'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFeelingFilter('good')}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all ${
                    selectedFeelingFilter === 'good'
                      ? 'bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                  title="Filtrar por sensación: Bien"
                >
                  <span>🟢</span>
                  <span className="hidden sm:inline">Bien</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFeelingFilter('neutral')}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all ${
                    selectedFeelingFilter === 'neutral'
                      ? 'bg-amber-400 text-black shadow-[0_0_10px_rgba(251,191,36,0.4)]'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                  title="Filtrar por sensación: Regular"
                >
                  <span>🟠</span>
                  <span className="hidden sm:inline">Regular</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFeelingFilter('bad')}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all ${
                    selectedFeelingFilter === 'bad'
                      ? 'bg-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.4)]'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                  title="Filtrar por sensación: Mal"
                >
                  <span>🔴</span>
                  <span className="hidden sm:inline">Mal</span>
                </button>
              </div>
            </div>

            {/* Exercise Quick-Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs pt-1">
              <button
                type="button"
                onClick={() => setSelectedExerciseName('ALL')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all shrink-0 ${
                  selectedExerciseName === 'ALL'
                    ? 'bg-[#00FF87] text-black shadow-[0_0_10px_rgba(0,255,135,0.4)]'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/10'
                }`}
              >
                <span>Todos los ejercicios</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    selectedExerciseName === 'ALL'
                      ? 'bg-black/20 text-black'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {allEntries.length}
                </span>
              </button>

              {exercisesWithDiary.map(({ def, count }) => {
                const isSelected =
                  normalizeExerciseTitle(selectedExerciseName) === normalizeExerciseTitle(def.name);
                return (
                  <button
                    key={def.id}
                    type="button"
                    onClick={() => setSelectedExerciseName(def.name)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all shrink-0 ${
                      isSelected
                        ? 'bg-[#00FF87] text-black shadow-[0_0_10px_rgba(0,255,135,0.4)]'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/10'
                    }`}
                  >
                    <span>{def.name}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                        isSelected
                          ? 'bg-black/20 text-black'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

      {/* Entries List or Empty State */}
      {filteredEntries.length === 0 ? (
        <div className="bg-[#1C1C1E] rounded-2xl border border-white/[0.08] p-8 sm:p-12 text-center shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.05] border border-white/10 text-zinc-400 mx-auto flex items-center justify-center mb-3">
            <BookOpen className="w-7 h-7 text-[#00FF87]" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">
            No hay registros en el diario
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto mb-4">
            {searchQuery || selectedFeelingFilter !== 'ALL' || selectedExerciseName !== 'ALL'
              ? 'No se encontraron notas que coincidan con los filtros seleccionados.'
              : 'Empieza a registrar tus entrenamientos, sensaciones y notas técnicas para cada ejercicio.'}
          </p>
          {catalog.length > 0 && (
            <button
              type="button"
              onClick={() => openCreateModal()}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#00FF87] hover:bg-[#00e57a] text-black text-xs sm:text-sm font-extrabold shadow-[0_0_15px_rgba(0,255,135,0.3)] transition-all active:scale-[0.97]"
            >
              <Plus className="w-4 h-4 text-black stroke-[2.5]" />
              <span>Añadir primer registro</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEntries.map((item) => {
            const feelingCfg = getFeelingConfig(item.feeling);
            const dateInfo = formatDateDisplay(item.date);

            return (
              <article
                key={item.id}
                id={`diary-entry-card-${item.id}`}
                className="bg-[#1C1C1E] rounded-2xl border border-white/[0.08] hover:border-white/20 p-4 sm:p-6 shadow-lg transition-all flex flex-col justify-between group"
              >
                {/* Entry Top Header */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-xs sm:text-sm text-white flex items-center gap-1.5">
                      <Dumbbell className="w-4 h-4 text-[#00FF87]" />
                      {item.exerciseName}
                    </span>

                    {item.category && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/[0.06] text-zinc-400 uppercase tracking-wider border border-white/5">
                        {item.category}
                      </span>
                    )}

                    {item.feeling && (
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${feelingCfg.badgeClass}`}
                      >
                        <span>{feelingCfg.emoji}</span>
                        <span>{feelingCfg.label}</span>
                      </span>
                    )}
                  </div>

                  {/* Date badge */}
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{dateInfo.formatted}</span>
                    {dateInfo.tag && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-[#00FF87]/15 text-[#00FF87] border border-[#00FF87]/30">
                        {dateInfo.tag}
                      </span>
                    )}
                  </div>
                </div>

                {/* Entry Note Body (Spacious & Comfortable) */}
                <div className="py-4 text-sm sm:text-base text-zinc-200 leading-relaxed sm:leading-loose whitespace-pre-wrap font-normal selection:bg-[#00FF87]/20">
                  {item.note}
                </div>

                {/* Entry Footer / Actions */}
                <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedExerciseName(item.exerciseName)}
                      className="text-[11px] font-semibold text-zinc-400 hover:text-[#00FF87] transition-colors"
                      title={`Ver todos los registros de ${item.exerciseName}`}
                    >
                      Filtrar solo este ejercicio
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-colors active:scale-95"
                      title="Editar registro"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteEntry(item.diaryId, item.id, item.exerciseName)
                      }
                      className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors active:scale-95"
                      title="Eliminar registro"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Create / Edit Entry Modal */}
      {isModalOpen && (
        <div
          id="modal-diary-form"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-in fade-in duration-150"
          onClick={closeModal}
        >
          <div
            className="bg-[#1C1C1E] rounded-2xl border border-white/[0.1] shadow-2xl max-w-xl w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 sm:px-6 py-4 border-b border-white/[0.08] shrink-0 bg-[#1C1C1E] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-[#00FF87]/15 text-[#00FF87] border border-[#00FF87]/30">
                  <BookOpen className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-white">
                    {editingEntry ? 'Editar Registro del Diario' : 'Nuevo Registro en el Diario'}
                  </h2>
                  <span className="text-[11px] text-zinc-400 font-medium">
                    Añade tus observaciones y sensaciones
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-white/[0.08] transition-colors"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEntry} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
                {formError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 font-semibold animate-in fade-in">
                    {formError}
                  </div>
                )}

                {/* Exercise Selector */}
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Ejercicio de la Biblioteca <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formExerciseName}
                    disabled={Boolean(editingEntry)}
                    onChange={(e) => setFormExerciseName(e.target.value)}
                    className="w-full min-h-[48px] px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-white/10 bg-black/40 text-white font-semibold focus:outline-none focus:border-[#00FF87] focus:ring-1 focus:ring-[#00FF87] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {catalog.map((c) => (
                      <option key={c.id} value={c.name} className="bg-[#1C1C1E] text-white">
                        {c.name} {c.category ? `(${c.category})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Picker */}
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Fecha del Registro <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full min-h-[48px] px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-white/10 bg-black/40 text-white font-semibold focus:outline-none focus:border-[#00FF87] focus:ring-1 focus:ring-[#00FF87] transition-all"
                  />
                </div>

                {/* Sensation / Feeling Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                      Sensación en la sesión
                    </label>
                    {formFeeling && (
                      <button
                        type="button"
                        onClick={() => setFormFeeling(undefined)}
                        className="text-[11px] text-zinc-400 hover:text-white"
                      >
                        Quitar sensación
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormFeeling('good')}
                      className={`min-h-[48px] p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.97] ${
                        formFeeling === 'good'
                          ? 'bg-emerald-500 text-black border-emerald-400 font-black shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                          : 'bg-emerald-950/20 text-emerald-300 border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-950/40'
                      }`}
                    >
                      <span className="text-base">🟢</span>
                      <span>Bien</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormFeeling('neutral')}
                      className={`min-h-[48px] p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.97] ${
                        formFeeling === 'neutral'
                          ? 'bg-amber-500 text-black border-amber-400 font-black shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                          : 'bg-amber-950/20 text-amber-300 border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-950/40'
                      }`}
                    >
                      <span className="text-base">🟠</span>
                      <span>Regular</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormFeeling('bad')}
                      className={`min-h-[48px] p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.97] ${
                        formFeeling === 'bad'
                          ? 'bg-rose-500 text-white border-rose-400 font-black shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                          : 'bg-rose-950/20 text-rose-300 border-rose-500/20 hover:border-rose-500/40 hover:bg-rose-950/40'
                      }`}
                    >
                      <span className="text-base">🔴</span>
                      <span>Mal</span>
                    </button>
                  </div>
                </div>

                {/* Note / Journal Entry Textarea (Spacious & Comfortable) */}
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Nota y Observaciones <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={6}
                    value={formNote}
                    onChange={(e) => setFormNote(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveEntry();
                      }
                    }}
                    placeholder="Ej: Hoy ha tocado en la parte de fuera 6s x 4r al 80% del RM y me he puesto 55kg y casi peto. Muy buena congestión pero vigilar el agarre..."
                    className="w-full p-3.5 text-xs sm:text-sm rounded-xl border border-white/10 bg-black/40 text-white focus:outline-none focus:border-[#00FF87] focus:ring-1 focus:ring-[#00FF87] resize-y min-h-[140px] leading-relaxed placeholder-zinc-500 transition-all selection:bg-[#00FF87]/20"
                  />
                  <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-1">
                    <span>Espacio amplio para notas largas y técnicas</span>
                    <span>Ctrl + Enter para guardar</span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-5 sm:px-6 py-4 border-t border-white/[0.08] bg-black/30 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2.5 min-h-[44px] text-xs sm:text-sm font-semibold text-zinc-400 hover:text-white rounded-xl hover:bg-white/[0.06] transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 min-h-[48px] text-xs sm:text-sm font-extrabold text-black bg-[#00FF87] hover:bg-[#00e57a] rounded-xl shadow-[0_0_15px_rgba(0,255,135,0.3)] transition-all active:scale-[0.97] flex items-center gap-2"
                >
                  <Check className="w-4 h-4 text-black stroke-[3]" />
                  <span>{editingEntry ? 'Actualizar Registro' : 'Guardar en el Diario'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
