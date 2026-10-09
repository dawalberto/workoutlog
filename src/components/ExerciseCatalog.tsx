/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Dumbbell, 
  Video, 
  Image as ImageIcon, 
  Clock, 
  X,
  Layers,
  Eye,
  FileText,
  Sparkles
} from 'lucide-react';
import { ExerciseDefinition, ExerciseRmLog, ExerciseDiary } from '../types';
import { VideoPreview } from './VideoPreview';
import { formatSecondsToTime } from '../utils/timeCalculations';
import { RmBadge } from './RmBadge';
import { DiaryButton } from './DiaryButton';
import { TimePickerField } from './TimePickerField';

interface ExerciseCatalogProps {
  exercises: ExerciseDefinition[];
  rmLogs?: ExerciseRmLog[];
  exerciseDiary?: ExerciseDiary[];
  onCreateExercise: (exercise: ExerciseDefinition) => void;
  onUpdateExercise: (exercise: ExerciseDefinition) => void;
  onDeleteExercise: (id: string) => void;
  onCheckRmWeight?: (exerciseName: string, newWeight: number, exerciseId?: string) => void;
  onOpenDiary?: (exerciseName: string, exerciseId?: string) => void;
}

const CATEGORIES = ['Todos', 'Pecho', 'Espalda', 'Pierna', 'Hombro', 'Brazos', 'Core'];

export const ExerciseCatalog: React.FC<ExerciseCatalogProps> = ({
  exercises,
  rmLogs = [],
  exerciseDiary = [],
  onCreateExercise,
  onUpdateExercise,
  onDeleteExercise,
  onCheckRmWeight,
  onOpenDiary,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingExercise, setEditingExercise] = useState<ExerciseDefinition | null>(null);
  const [previewExercise, setPreviewExercise] = useState<ExerciseDefinition | null>(null);

  // Form states
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

  const filteredExercises = exercises.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ex.notes && ex.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCat = selectedCategory === 'Todos' || ex.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

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

  return (
    <div id="exercise-catalog-page" className="min-h-screen bg-[#0D0D0D] text-white pb-28 pt-4 sm:pt-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-[#00FF87]">
                <Dumbbell className="w-3.5 h-3.5" /> Catálogo Maestro
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Biblioteca de Ejercicios
            </h1>
            <p className="text-xs sm:text-sm text-[#A1A1AA] mt-0.5">
              Crea tus movimientos con imagen, video de técnica y series preconfiguradas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-new-catalog-exercise"
              type="button"
              onClick={handleOpenCreate}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 min-h-[48px] rounded-2xl text-sm font-extrabold bg-[#00FF87] hover:bg-[#00e57a] text-black shadow-[0_0_20px_rgba(0,255,135,0.35)] transition-all active:scale-[0.97]"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
              <span>Nuevo Ejercicio</span>
            </button>
          </div>
        </div>

        {/* Search & Category Filter */}
        <div className="my-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar ejercicio o grupo muscular..."
              className="w-full min-h-[48px] pl-11 pr-10 py-2.5 text-sm rounded-2xl border border-white/10 bg-[#1C1C1E] text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#00FF87] focus:ring-2 focus:ring-[#00FF87]/20 transition-all shadow-inner"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-xl shrink-0 transition-all active:scale-95 ${
                  selectedCategory === cat
                    ? 'bg-[#00FF87] text-black shadow-[0_0_12px_rgba(0,255,135,0.35)] font-black'
                    : 'bg-[#1C1C1E] text-zinc-400 hover:text-white border border-white/5'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Main List Info */}
        <div className="flex items-center justify-between text-xs font-semibold text-[#A1A1AA] px-1 mb-4">
          <span>{filteredExercises.length} {filteredExercises.length === 1 ? 'ejercicio registrado' : 'ejercicios registrados'}</span>
        </div>

        {/* Cards Grid */}
        {filteredExercises.length === 0 ? (
          <div className="text-center py-20 px-6 bg-[#1C1C1E] rounded-2xl border border-white/[0.08] max-w-md mx-auto my-6 shadow-xl">
            <div className="w-14 h-14 bg-zinc-900 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 text-zinc-500">
              <Dumbbell className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white">No se encontraron ejercicios</h3>
            <p className="text-xs text-[#A1A1AA] mt-1 mb-5">
              Prueba con otro término de búsqueda o añade un nuevo ejercicio a tu biblioteca.
            </p>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="min-h-[48px] px-5 text-xs font-extrabold rounded-2xl bg-[#00FF87] text-black hover:bg-[#00e57a] transition-all shadow-[0_0_15px_rgba(0,255,135,0.3)] active:scale-[0.97]"
            >
              + Crear Ejercicio
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredExercises.map((ex) => (
              <div
                key={ex.id}
                id={`catalog-card-${ex.id}`}
                onClick={() => setPreviewExercise(ex)}
                className="bg-[#1C1C1E] rounded-2xl border border-white/[0.08] hover:border-[#00FF87]/40 p-4 sm:p-5 shadow-lg hover:shadow-[0_0_25px_rgba(0,255,135,0.08)] transition-all flex flex-col justify-between cursor-pointer group select-none relative overflow-hidden"
              >
                <div>
                  <div className="flex items-start gap-3.5">
                    {/* Cover Preview Image */}
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-zinc-900 shrink-0 border border-white/10 flex items-center justify-center relative shadow-sm">
                      {ex.imageUrl ? (
                        <img
                          src={ex.imageUrl}
                          alt={ex.name}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Dumbbell className="w-6 h-6 text-zinc-600" />
                      )}
                      {ex.videoUrl && (
                        <span className="absolute bottom-1 right-1 p-1 rounded-lg bg-black/80 text-[#00E5FF] shadow-sm">
                          <Video className="w-3 h-3" />
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-zinc-800 text-zinc-300 border border-white/5 uppercase tracking-wider">
                          {ex.category || 'General'}
                        </span>
                        <RmBadge rmLogs={rmLogs} exerciseName={ex.name} exerciseId={ex.id} />
                      </div>
                      <h3 className="text-base font-bold text-white tracking-tight mt-1 truncate group-hover:text-[#00FF87] transition-colors">
                        {ex.name}
                      </h3>
                      {ex.notes && (
                        <p className="text-xs text-[#A1A1AA] line-clamp-1 mt-0.5 leading-relaxed">
                          {ex.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Preconfigured defaults */}
                  <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center gap-3 text-xs text-[#A1A1AA] font-semibold">
                    <span className="inline-flex items-center gap-1 text-white">
                      <Layers className="w-3.5 h-3.5 text-[#00E5FF]" /> {ex.defaultSetsCount || 3}s
                    </span>
                    <span>·</span>
                    <span>{ex.defaultReps || 10} reps</span>
                    <span>·</span>
                    <span>{ex.defaultWeight || 0} kg</span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5 text-[#00FF87]" /> {ex.defaultRestSeconds || 60}s
                    </span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#00FF87] group-hover:underline">
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ver detalle</span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    {onOpenDiary && (
                      <DiaryButton
                        exerciseName={ex.name}
                        exerciseId={ex.id}
                        diaries={exerciseDiary}
                        onOpenDiary={onOpenDiary}
                        variant="compact"
                      />
                    )}

                    <button
                      id={`btn-edit-exercise-${ex.id}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(ex);
                      }}
                      className="min-h-[40px] px-3 inline-flex items-center gap-1 text-xs font-bold rounded-xl text-zinc-300 bg-zinc-800 hover:bg-zinc-700 hover:text-white transition-colors active:scale-95"
                      title="Editar ejercicio"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>

                    <button
                      id={`btn-delete-exercise-${ex.id}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(ex.id, ex.name);
                      }}
                      className="min-h-[40px] min-w-[40px] p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors active:scale-95 flex items-center justify-center"
                      title="Eliminar de la biblioteca"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Exercise Preview Modal */}
      {previewExercise && (
        <div
          id="modal-exercise-preview"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-in fade-in duration-150"
          onClick={() => setPreviewExercise(null)}
        >
          <div
            className="bg-[#18181A] text-white rounded-3xl border border-white/10 shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 sm:px-6 py-4 border-b border-white/[0.08] shrink-0 bg-[#18181A] flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-zinc-800 text-zinc-300 uppercase tracking-wider">
                    {previewExercise.category || 'General'}
                  </span>
                  <RmBadge rmLogs={rmLogs} exerciseName={previewExercise.name} exerciseId={previewExercise.id} size="sm" />
                </div>
                <h2 className="text-lg sm:text-xl font-black text-white truncate">
                  {previewExercise.name}
                </h2>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {onOpenDiary && (
                  <DiaryButton
                    exerciseName={previewExercise.name}
                    exerciseId={previewExercise.id}
                    diaries={exerciseDiary}
                    onOpenDiary={(name, id) => {
                      setPreviewExercise(null);
                      onOpenDiary(name, id);
                    }}
                    variant="compact"
                  />
                )}

                <button
                  id="btn-preview-header-edit"
                  type="button"
                  onClick={() => {
                    const ex = previewExercise;
                    setPreviewExercise(null);
                    handleOpenEdit(ex);
                  }}
                  className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition-colors active:scale-95"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewExercise(null)}
                  className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors"
                  aria-label="Cerrar vista previa"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
              {/* Media Image */}
              {previewExercise.imageUrl && (
                <div className="rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 max-h-60 flex items-center justify-center shadow-md">
                  <img
                    src={previewExercise.imageUrl}
                    alt={previewExercise.name}
                    className="w-full h-full object-cover max-h-60"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              )}

              {/* Notes */}
              {previewExercise.notes && (
                <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/5 flex items-start gap-3">
                  <FileText className="w-4 h-4 text-[#00FF87] shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <span className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1">
                      Notas y Técnica
                    </span>
                    <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed whitespace-pre-line">
                      {previewExercise.notes}
                    </p>
                  </div>
                </div>
              )}

              {/* Video Preview */}
              {previewExercise.videoUrl && (
                <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/5">
                  <span className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-2">
                    Técnica en Video
                  </span>
                  <VideoPreview
                    url={previewExercise.videoUrl}
                    exerciseName={previewExercise.name}
                  />
                </div>
              )}

              {/* Preconfigured Sets */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#A1A1AA] flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#00E5FF]" />
                    Series preconfiguradas
                  </span>

                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold bg-zinc-900 text-zinc-300 border border-white/10">
                    <Clock className="w-3.5 h-3.5 text-[#00FF87]" />
                    ~{formatSecondsToTime(
                      (previewExercise.defaultSetsCount || 3) *
                        ((previewExercise.defaultReps || 10) * 3 +
                          (previewExercise.defaultRestSeconds || 60))
                    )}
                  </span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-zinc-900/60">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.08] bg-zinc-900 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        <th className="py-3 px-3 text-center w-14">Serie</th>
                        <th className="py-3 px-3 text-center">Reps</th>
                        <th className="py-3 px-3 text-center">Peso</th>
                        <th className="py-3 px-3 text-center">Descanso</th>
                        <th className="py-3 px-3 text-center">Tiempo est.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {Array.from(
                        { length: previewExercise.defaultSetsCount || 3 },
                        (_, idx) => {
                          const reps = previewExercise.defaultReps || 10;
                          const weight = previewExercise.defaultWeight || 0;
                          const rest = previewExercise.defaultRestSeconds || 60;
                          const setSeconds = reps * 3 + rest;

                          return (
                            <tr key={idx} className="hover:bg-white/[0.02]">
                              <td className="py-3 px-3 text-center">
                                <span className="inline-block w-6 h-6 leading-6 text-xs font-bold rounded-lg bg-zinc-800 text-zinc-200">
                                  {idx + 1}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center font-bold text-white">
                                {reps} <span className="text-[10px] text-zinc-500">reps</span>
                              </td>
                              <td className="py-3 px-3 text-center font-bold text-white">
                                {weight} <span className="text-[10px] text-zinc-500">kg</span>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300">
                                  {rest}s
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center text-zinc-400 font-mono text-xs">
                                ~{formatSecondsToTime(setSeconds)}
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 sm:px-6 py-4 border-t border-white/[0.08] bg-[#141416] flex items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-zinc-400 hidden sm:inline font-mono">
                {previewExercise.defaultSetsCount || 3}s x {previewExercise.defaultReps || 10}r · {previewExercise.defaultWeight || 0}kg
              </span>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setPreviewExercise(null)}
                  className="min-h-[44px] px-4 text-xs font-bold rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  Cerrar
                </button>

                <button
                  id="btn-preview-footer-edit"
                  type="button"
                  onClick={() => {
                    const ex = previewExercise;
                    setPreviewExercise(null);
                    handleOpenEdit(ex);
                  }}
                  className="min-h-[44px] inline-flex items-center gap-2 px-5 text-xs font-extrabold rounded-xl bg-[#00FF87] hover:bg-[#00e57a] text-black shadow-[0_0_15px_rgba(0,255,135,0.3)] transition-all active:scale-[0.97]"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editar Ejercicio</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Exercise Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-in fade-in duration-150">
          <div className="bg-[#18181A] text-white rounded-3xl border border-white/10 shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden animate-slide-up">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/[0.08] shrink-0 bg-[#18181A]">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-[#00FF87]/20 text-[#00FF87] shrink-0 border border-[#00FF87]/30">
                  <Dumbbell className="w-5 h-5" />
                </span>
                <h2 className="text-base sm:text-lg font-black text-white truncate">
                  {editingExercise ? 'Editar Ejercicio' : 'Nuevo Ejercicio'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-4 overscroll-contain">
              {/* Exercise Name */}
              <div>
                <label className="block text-xs font-extrabold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Nombre del Ejercicio *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="ej. Press de Banca Plano, Sentadilla..."
                  className="w-full min-h-[48px] px-4 text-sm font-bold rounded-2xl border border-white/10 bg-zinc-900 text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#00FF87] focus:ring-2 focus:ring-[#00FF87]/20 shadow-inner"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-extrabold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Grupo Muscular
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Pecho', 'Espalda', 'Pierna', 'Hombro', 'Brazos', 'Core', 'Otro'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFormCategory(cat)}
                      className={`min-h-[40px] px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                        formCategory === cat
                          ? 'bg-[#00FF87] text-black shadow-sm font-black'
                          : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Image URL & Live Preview */}
              <div>
                <label className="block text-xs font-extrabold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>URL de Imagen (Preview)</span>
                  <span className="text-[10px] font-normal text-zinc-500">Miniatura visual</span>
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl border border-white/10 bg-zinc-900 shrink-0 overflow-hidden flex items-center justify-center relative shadow-inner">
                    {formImageUrl && !imageError ? (
                      <img
                        src={formImageUrl}
                        alt="Vista previa"
                        className="w-full h-full object-cover"
                        onError={() => setImageError(true)}
                        onLoad={() => setImageError(false)}
                      />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-zinc-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="url"
                      value={formImageUrl}
                      onChange={(e) => {
                        setFormImageUrl(e.target.value);
                        setImageError(false);
                      }}
                      placeholder="https://ejemplo.com/imagen.jpg..."
                      className="w-full min-h-[48px] px-4 text-xs rounded-2xl border border-white/10 bg-zinc-900 text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#00FF87]"
                    />
                    {imageError && (
                      <p className="text-[11px] text-amber-400 mt-1">
                        No se pudo cargar la imagen desde este enlace.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Video URL */}
              <div>
                <label className="block text-xs font-extrabold text-zinc-300 uppercase tracking-wider mb-1.5">
                  URL de Video
                </label>
                <input
                  type="url"
                  value={formVideoUrl}
                  onChange={(e) => setFormVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full min-h-[48px] px-4 text-xs rounded-2xl border border-white/10 bg-zinc-900 text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#00FF87]"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-extrabold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Notas de Técnica (opcional)
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Instrucciones sobre postura, agarre o tempo..."
                  className="w-full p-3 text-xs rounded-2xl border border-white/10 bg-zinc-900 text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#00FF87]"
                />
              </div>

              {/* Preconfigured Defaults */}
              <div className="p-4 rounded-2xl bg-zinc-900 border border-white/[0.08]">
                <span className="block text-xs font-extrabold text-white uppercase tracking-wider mb-3">
                  Valores Por Defecto
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 mb-1">Nº Series</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      min="1"
                      max="12"
                      value={formDefaultSets}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setFormDefaultSets(e.target.value)}
                      className="w-full min-h-[44px] text-center text-xs font-black rounded-xl border border-white/10 bg-zinc-800 text-white focus:border-[#00FF87] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 mb-1">Reps / Serie</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      min="1"
                      max="100"
                      value={formDefaultReps}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setFormDefaultReps(e.target.value)}
                      className="w-full min-h-[44px] text-center text-xs font-black rounded-xl border border-white/10 bg-zinc-800 text-white focus:border-[#00FF87] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 mb-1">Peso (kg)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      pattern="[0-9]*[.,]?[0-9]*"
                      step="0.5"
                      min="0"
                      max="500"
                      value={formDefaultWeight}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setFormDefaultWeight(e.target.value)}
                      className="w-full min-h-[44px] text-center text-xs font-black rounded-xl border border-white/10 bg-zinc-800 text-white focus:border-[#00FF87] focus:outline-none"
                    />
                  </div>
                  <div>
                    <TimePickerField
                      variant="compact"
                      label="Descanso"
                      value={formDefaultRest}
                      onChange={(secs) => setFormDefaultRest(secs)}
                      modalTitle="Tiempo de descanso por defecto"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="sticky bottom-0 bg-[#18181A]/95 backdrop-blur-md pt-3 pb-1 flex items-center justify-end gap-2 border-t border-white/[0.08] -mx-1 px-1 mt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="min-h-[44px] px-4 text-xs font-bold text-zinc-400 hover:text-white rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="min-h-[48px] px-6 text-xs font-extrabold bg-[#00FF87] hover:bg-[#00e57a] text-black rounded-2xl shadow-[0_0_15px_rgba(0,255,135,0.35)] transition-all active:scale-[0.97]"
                >
                  {editingExercise ? 'Guardar Cambios' : 'Crear en Biblioteca'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
