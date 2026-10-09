import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  Plus, 
  Dumbbell, 
  Layers, 
  Clock, 
  Sparkles, 
  Image as ImageIcon,
  Check
} from 'lucide-react';
import { Exercise, ExerciseDefinition, WorkoutSet, ExerciseRmLog, ExerciseDiary } from '../types';
import { RmBadge } from './RmBadge';
import { DiaryButton } from './DiaryButton';
import { TimePickerField } from './TimePickerField';

interface AddExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalog: ExerciseDefinition[];
  rmLogs?: ExerciseRmLog[];
  exerciseDiary?: ExerciseDiary[];
  onOpenDiary?: (exerciseName: string, exerciseId?: string) => void;
  onAddExercise: (exercise: Exercise, saveToCatalog?: ExerciseDefinition) => void;
}

export const AddExerciseModal: React.FC<AddExerciseModalProps> = ({
  isOpen,
  onClose,
  catalog,
  rmLogs = [],
  exerciseDiary = [],
  onOpenDiary,
  onAddExercise,
}) => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'custom'>(() => 
    catalog.length > 0 ? 'catalog' : 'custom'
  );
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  // Custom in-the-moment form state
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState('Pecho');
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [customVideoUrl, setCustomVideoUrl] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [customSetsCount, setCustomSetsCount] = useState<number | string>(3);
  const [customReps, setCustomReps] = useState<number | string>(10);
  const [customWeight, setCustomWeight] = useState<number | string>(40);
  const [customRest, setCustomRest] = useState<number | string>(90);
  const [saveToLibrary, setSaveToLibrary] = useState(true);

  // Visual feedback states for continuous exercise adding
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [addedNotification, setAddedNotification] = useState<string | null>(null);
  const [addedCount, setAddedCount] = useState<number>(0);

  useEffect(() => {
    if (!isOpen) {
      setJustAddedId(null);
      setAddedNotification(null);
      setAddedCount(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const categories = ['Todos', 'Pecho', 'Espalda', 'Pierna', 'Hombro', 'Brazos', 'Core'];

  const filteredCatalog = catalog.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase()) ||
      (ex.notes && ex.notes.toLowerCase().includes(search.toLowerCase()));
    const matchesCat = selectedCategory === 'Todos' || ex.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // Add from preconfigured catalog
  const handleSelectFromCatalog = (item: ExerciseDefinition) => {
    const setsCount = item.defaultSetsCount || 3;
    const reps = item.defaultReps || 10;
    const weight = item.defaultWeight || 0;
    const restSeconds = item.defaultRestSeconds || 90;

    const sets: WorkoutSet[] = Array.from({ length: setsCount }, (_, i) => ({
      id: 'set-' + Date.now() + '-' + (i + 1) + '-' + Math.random().toString(36).substring(2, 5),
      setNumber: i + 1,
      reps,
      weight,
      restSeconds,
    }));

    const newExercise: Exercise = {
      id: 'ex-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      definitionId: item.id,
      name: item.name,
      category: item.category,
      imageUrl: item.imageUrl || '',
      videoUrl: item.videoUrl || '',
      notes: item.notes || '',
      sets,
    };

    onAddExercise(newExercise);

    // Keep modal open, provide visual confirmation and toast feedback
    setJustAddedId(item.id);
    setAddedCount((prev) => prev + 1);
    setAddedNotification(`"${item.name}" añadido a la rutina`);

    setTimeout(() => {
      setJustAddedId((curr) => (curr === item.id ? null : curr));
    }, 1400);

    setTimeout(() => {
      setAddedNotification((curr) => (curr && curr.includes(item.name) ? null : curr));
    }, 1600);
  };

  // Add created in-the-moment
  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const count = Math.max(1, Number(customSetsCount) || 1);
    const numReps = Math.max(1, Number(customReps) || 1);
    const numWeight = Math.max(0, Number(customWeight) || 0);
    const numRest = Math.max(0, Number(customRest) || 0);

    const sets: WorkoutSet[] = Array.from({ length: count }, (_, i) => ({
      id: 'set-' + Date.now() + '-' + (i + 1) + '-' + Math.random().toString(36).substring(2, 5),
      setNumber: i + 1,
      reps: numReps,
      weight: numWeight,
      restSeconds: numRest,
    }));

    const defId = saveToLibrary
      ? 'def-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6)
      : undefined;

    const createdName = customName.trim();

    const newExercise: Exercise = {
      id: 'ex-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      definitionId: defId,
      name: createdName,
      category: customCategory,
      imageUrl: customImageUrl.trim(),
      videoUrl: customVideoUrl.trim(),
      notes: customNotes.trim(),
      sets,
    };

    let templateToSave: ExerciseDefinition | undefined;
    if (saveToLibrary && defId) {
      templateToSave = {
        id: defId,
        name: createdName,
        category: customCategory,
        imageUrl: customImageUrl.trim(),
        videoUrl: customVideoUrl.trim(),
        notes: customNotes.trim(),
        defaultSetsCount: count,
        defaultReps: numReps,
        defaultWeight: numWeight,
        defaultRestSeconds: numRest,
        createdAt: new Date().toISOString(),
      };
    }

    onAddExercise(newExercise, templateToSave);

    // Keep modal open, reset form for next exercise, and show visual notification
    setCustomName('');
    setCustomImageUrl('');
    setCustomVideoUrl('');
    setCustomNotes('');
    setAddedCount((prev) => prev + 1);
    setAddedNotification(`"${createdName}" añadido a la rutina`);

    setTimeout(() => {
      setAddedNotification((curr) => (curr && curr.includes(createdName) ? null : curr));
    }, 1600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      <div className="relative bg-[#1C1C1E] rounded-2xl sm:rounded-3xl border border-white/[0.1] shadow-2xl max-w-xl w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-white">
        {/* Header - Fixed at top, never covered */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/[0.08] shrink-0 bg-[#1C1C1E]">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-2 rounded-xl bg-[#00FF87]/15 border border-[#00FF87]/30 text-[#00FF87] shrink-0">
              <Dumbbell className="w-4 h-4 text-[#00FF87]" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-white truncate">Añadir Ejercicio a la Rutina</h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {addedCount > 0 && (
              <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-[#00FF87]/15 text-[#00FF87] border border-[#00FF87]/30 animate-in zoom-in-75">
                +{addedCount} añadido{addedCount > 1 ? 's' : ''}
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 min-h-[40px] text-xs font-extrabold bg-[#00FF87] hover:bg-[#00e57a] text-black rounded-xl transition-all shadow-[0_0_15px_rgba(0,255,135,0.3)] active:scale-[0.97]"
            >
              Listo
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors shrink-0"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab switch: Catalog vs Custom */}
        <div className="px-4 sm:px-6 pt-3 pb-2 shrink-0 bg-[#1C1C1E]">
          <div className="flex p-1 bg-black/40 border border-white/[0.08] rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('catalog')}
              className={`flex-1 min-h-[38px] py-1.5 px-3 text-xs font-extrabold rounded-lg transition-all truncate ${
                activeTab === 'catalog'
                  ? 'bg-[#00FF87] text-black shadow-[0_0_10px_rgba(0,255,135,0.3)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Biblioteca ({catalog.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('custom')}
              className={`flex-1 min-h-[38px] py-1.5 px-3 text-xs font-extrabold rounded-lg transition-all truncate ${
                activeTab === 'custom'
                  ? 'bg-[#00FF87] text-black shadow-[0_0_10px_rgba(0,255,135,0.3)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Crear en el momento
            </button>
          </div>
        </div>

        {/* Fixed Notification at top of screen when an exercise is added */}
        {addedNotification && (
          <div className="fixed top-3 sm:top-4 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-md pointer-events-none flex justify-center animate-in fade-in slide-in-from-top-3 duration-150">
            <div className="pointer-events-auto bg-[#1C1C1E] text-white backdrop-blur-md px-4 py-3 rounded-2xl shadow-2xl border border-[#00FF87]/40 text-xs sm:text-sm font-bold flex items-center justify-between gap-3 w-full">
              <div className="flex items-center gap-2.5 truncate">
                <span className="p-1 rounded-lg bg-[#00FF87] text-black shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </span>
                <span className="truncate">{addedNotification}</span>
              </div>
              <button
                type="button"
                onClick={() => setAddedNotification(null)}
                className="p-1 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white shrink-0 transition-colors"
                aria-label="Cerrar notificación"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Content - Single dedicated scroll container */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 overscroll-contain">
          {activeTab === 'catalog' ? (
            <div className="space-y-3">
              {/* Search & categories */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar en la biblioteca..."
                    className="w-full min-h-[44px] pl-10 pr-3.5 py-2 text-xs sm:text-sm rounded-xl border border-white/10 bg-black/40 text-white placeholder-zinc-500 focus:outline-none focus:border-[#00FF87] focus:ring-1 focus:ring-[#00FF87] transition-all"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg shrink-0 transition-all ${
                        selectedCategory === cat
                          ? 'bg-[#00FF87] text-black shadow-[0_0_10px_rgba(0,255,135,0.3)]'
                          : 'bg-black/30 border border-white/[0.08] text-zinc-400 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Items List */}
              {filteredCatalog.length === 0 ? (
                <div className="text-center py-8 px-4 text-xs">
                  {catalog.length === 0 ? (
                    <div className="space-y-2">
                      <p className="font-bold text-zinc-300">Tu biblioteca no tiene ejercicios todavía.</p>
                      <p className="text-zinc-500">Puedes crear un ejercicio ahora mismo en la pestaña &quot;Crear en el momento&quot;.</p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('custom')}
                        className="mt-2 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#00FF87] text-black font-extrabold text-xs shadow-[0_0_12px_rgba(0,255,135,0.3)] hover:bg-[#00e57a] transition-all"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Crear en el momento
                      </button>
                    </div>
                  ) : (
                    <span className="text-zinc-500">No se encontraron ejercicios con ese filtro o búsqueda.</span>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredCatalog.map((item) => {
                    const isJustAdded = justAddedId === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 group ${
                          isJustAdded
                            ? 'border-[#00FF87] bg-[#00FF87]/15 ring-2 ring-[#00FF87]/50 shadow-lg scale-[1.01]'
                            : 'border-white/[0.08] bg-black/25 hover:border-white/20 hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* Thumbnail */}
                          <div
                            className={`w-12 h-12 rounded-lg border overflow-hidden shrink-0 flex items-center justify-center transition-colors ${
                              isJustAdded ? 'bg-[#00FF87]/20 border-[#00FF87]/40' : 'bg-black/40 border-white/10'
                            }`}
                          >
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <Dumbbell className={`w-5 h-5 ${isJustAdded ? 'text-[#00FF87]' : 'text-zinc-500'}`} />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md uppercase ${
                                  isJustAdded ? 'bg-[#00FF87] text-black' : 'bg-white/[0.06] text-zinc-400 border border-white/5'
                                }`}
                              >
                                {item.category || 'General'}
                              </span>
                              <RmBadge rmLogs={rmLogs} exerciseName={item.name} exerciseId={item.id} size="xs" />
                              {onOpenDiary && (
                                <DiaryButton
                                  exerciseName={item.name}
                                  exerciseId={item.id}
                                  diaries={exerciseDiary}
                                  onOpenDiary={(name, id) => {
                                    onClose();
                                    onOpenDiary(name, id);
                                  }}
                                  variant="compact"
                                />
                              )}
                              {isJustAdded && (
                                <span className="text-[10px] font-black text-[#00FF87] animate-in fade-in">
                                  ✓ Añadido
                                </span>
                              )}
                            </div>
                            <h4 className="text-xs sm:text-sm font-bold text-white truncate mt-0.5">
                              {item.name}
                            </h4>
                            <p className="text-[11px] text-zinc-400 truncate">
                              {item.defaultSetsCount || 3} series • {item.defaultReps || 10} reps • {item.defaultWeight || 0} kg • {item.defaultRestSeconds || 90}s rest
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSelectFromCatalog(item)}
                          className={`px-3.5 py-2 min-h-[40px] text-xs font-extrabold rounded-xl transition-all shrink-0 flex items-center gap-1.5 active:scale-[0.97] ${
                            isJustAdded
                              ? 'bg-[#00FF87] text-black shadow-[0_0_12px_rgba(0,255,135,0.4)]'
                              : 'bg-white/[0.08] hover:bg-[#00FF87] text-white hover:text-black border border-white/10 hover:border-transparent'
                          }`}
                        >
                          {isJustAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5 stroke-[3] animate-in zoom-in-50 duration-150" />
                              <span>¡Añadido!</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Añadir</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Custom Form in the moment */
            <form onSubmit={handleCreateCustom} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wide mb-1.5">
                  Nombre del Ejercicio <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="ej. Press Inclinado, Fondos..."
                  className="w-full min-h-[48px] px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-white/10 bg-black/40 text-white placeholder-zinc-500 focus:outline-none focus:border-[#00FF87] focus:ring-1 focus:ring-[#00FF87] transition-all"
                />
              </div>

              {/* Cover Preview Image URL with live preview */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wide mb-1.5 flex items-center justify-between">
                  <span>URL de Imagen (Preview / Cover)</span>
                  <span className="text-[10px] font-normal text-zinc-500">Miniatura visual rápida</span>
                </label>
                <div className="flex items-center gap-2.5">
                  <div className="w-12 h-12 rounded-xl border border-white/10 bg-black/40 shrink-0 overflow-hidden flex items-center justify-center">
                    {customImageUrl ? (
                      <img
                        src={customImageUrl}
                        alt="Vista previa"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-zinc-500" />
                    )}
                  </div>
                  <input
                    type="url"
                    value={customImageUrl}
                    onChange={(e) => setCustomImageUrl(e.target.value)}
                    placeholder="https://ejemplo.com/foto.jpg..."
                    className="flex-1 min-h-[48px] px-3.5 py-2.5 text-xs rounded-xl border border-white/10 bg-black/40 text-white placeholder-zinc-500 focus:outline-none focus:border-[#00FF87] focus:ring-1 focus:ring-[#00FF87] transition-all"
                  />
                </div>
              </div>

              {/* Video URL */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wide mb-1.5">
                  URL de Video (opcional)
                </label>
                <input
                  type="url"
                  value={customVideoUrl}
                  onChange={(e) => setCustomVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full min-h-[48px] px-3.5 py-2.5 text-xs rounded-xl border border-white/10 bg-black/40 text-white placeholder-zinc-500 focus:outline-none focus:border-[#00FF87] focus:ring-1 focus:ring-[#00FF87] transition-all"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wide mb-1.5">
                  Notas de técnica (opcional)
                </label>
                <input
                  type="text"
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Consejos sobre agarre, colocación..."
                  className="w-full min-h-[48px] px-3.5 py-2.5 text-xs rounded-xl border border-white/10 bg-black/40 text-white placeholder-zinc-500 focus:outline-none focus:border-[#00FF87] focus:ring-1 focus:ring-[#00FF87] transition-all"
                />
              </div>

              {/* Initial Sets config */}
              <div className="p-3.5 rounded-2xl bg-black/30 border border-white/[0.08]">
                <span className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2.5">
                  Configuración inicial de series
                </span>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 mb-1">Series</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      min="1"
                      max="12"
                      value={customSetsCount}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setCustomSetsCount(e.target.value)}
                      onBlur={() => {
                        if (!customSetsCount || Number(customSetsCount) < 1) {
                          setCustomSetsCount(1);
                        }
                      }}
                      className="w-full min-h-[44px] text-center text-xs font-bold py-1.5 rounded-lg border border-white/10 bg-black/40 text-white focus:outline-none focus:border-[#00FF87]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 mb-1">Reps</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      min="1"
                      max="100"
                      value={customReps}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setCustomReps(e.target.value)}
                      onBlur={() => {
                        if (!customReps || Number(customReps) < 1) {
                          setCustomReps(1);
                        }
                      }}
                      className="w-full min-h-[44px] text-center text-xs font-bold py-1.5 rounded-lg border border-white/10 bg-black/40 text-white focus:outline-none focus:border-[#00FF87]"
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
                      value={customWeight}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setCustomWeight(e.target.value)}
                      onBlur={() => {
                        if (customWeight === '' || isNaN(Number(customWeight)) || Number(customWeight) < 0) {
                          setCustomWeight(0);
                        }
                      }}
                      className="w-full min-h-[44px] text-center text-xs font-bold py-1.5 rounded-lg border border-white/10 bg-black/40 text-white focus:outline-none focus:border-[#00FF87]"
                    />
                  </div>
                  <div>
                    <TimePickerField
                      variant="compact"
                      label="Descanso"
                      value={customRest}
                      onChange={(secs) => setCustomRest(secs)}
                      modalTitle="Tiempo de descanso por defecto"
                    />
                  </div>
                </div>
              </div>

              {/* Option to also save to library */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-black/30 border border-white/[0.08] cursor-pointer hover:border-white/20 transition-colors">
                <input
                  type="checkbox"
                  checked={saveToLibrary}
                  onChange={(e) => setSaveToLibrary(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#00FF87]"
                />
                <span className="text-xs font-semibold text-zinc-300">
                  Guardar también en mi Biblioteca para usarlo en futuras rutinas
                </span>
              </label>

              <div className="sticky bottom-0 bg-[#1C1C1E]/95 backdrop-blur-md pt-3 pb-1 flex justify-end gap-3 border-t border-white/[0.08] -mx-1 px-1 mt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 min-h-[44px] text-xs font-bold text-zinc-400 hover:text-white rounded-xl hover:bg-white/[0.06] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 min-h-[48px] text-xs font-extrabold bg-[#00FF87] hover:bg-[#00e57a] text-black rounded-xl shadow-[0_0_15px_rgba(0,255,135,0.3)] transition-all active:scale-[0.97]"
                >
                  Añadir a la Rutina
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
