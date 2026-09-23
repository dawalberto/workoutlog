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
import { Exercise, ExerciseDefinition, WorkoutSet } from '../types';

interface AddExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalog: ExerciseDefinition[];
  onAddExercise: (exercise: Exercise, saveToCatalog?: ExerciseDefinition) => void;
}

export const AddExerciseModal: React.FC<AddExerciseModalProps> = ({
  isOpen,
  onClose,
  catalog,
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      <div className="relative bg-white rounded-2xl sm:rounded-3xl border border-zinc-200 shadow-2xl max-w-xl w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header - Fixed at top, never covered */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-zinc-100 shrink-0 bg-white">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-1.5 rounded-xl bg-emerald-100 text-emerald-800 shrink-0">
              <Dumbbell className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 truncate">Añadir Ejercicio a la Rutina</h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {addedCount > 0 && (
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 animate-in zoom-in-75">
                +{addedCount} añadido{addedCount > 1 ? 's' : ''}
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl transition-colors shadow-2xs active:scale-95"
            >
              Listo
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors shrink-0"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab switch: Catalog vs Custom */}
        <div className="px-4 sm:px-6 pt-3 pb-1 shrink-0 bg-white">
          <div className="flex p-1 bg-zinc-100 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('catalog')}
              className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-all truncate ${
                activeTab === 'catalog'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Biblioteca ({catalog.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('custom')}
              className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-all truncate ${
                activeTab === 'custom'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Crear en el momento
            </button>
          </div>
        </div>

        {/* Fixed Notification at top of screen when an exercise is added - Fixed position, does NOT displace DOM */}
        {addedNotification && (
          <div className="fixed top-3 sm:top-4 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-md pointer-events-none flex justify-center animate-in fade-in slide-in-from-top-3 duration-150">
            <div className="pointer-events-auto bg-zinc-950/95 text-white backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-2xl border border-zinc-800 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 w-full">
              <div className="flex items-center gap-2.5 truncate">
                <span className="p-1 rounded-lg bg-emerald-500 text-white shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </span>
                <span className="truncate">{addedNotification}</span>
              </div>
              <button
                type="button"
                onClick={() => setAddedNotification(null)}
                className="p-1 hover:bg-white/20 rounded-lg text-zinc-400 hover:text-white shrink-0 transition-colors"
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
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar en la biblioteca..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg shrink-0 transition-colors ${
                        selectedCategory === cat
                          ? 'bg-zinc-900 text-white'
                          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
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
                      <p className="font-semibold text-zinc-700">Tu biblioteca no tiene ejercicios todavía.</p>
                      <p className="text-zinc-500">Puedes crear un ejercicio ahora mismo en la pestaña &quot;Crear en el momento&quot;.</p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('custom')}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Crear en el momento
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
                        className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 group ${
                          isJustAdded
                            ? 'border-emerald-500 bg-emerald-100/70 ring-2 ring-emerald-400 shadow-md scale-[1.01]'
                            : 'border-zinc-200 hover:border-emerald-500 hover:bg-emerald-50/30'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* Thumbnail */}
                          <div
                            className={`w-12 h-12 rounded-lg border overflow-hidden shrink-0 flex items-center justify-center transition-colors ${
                              isJustAdded ? 'bg-emerald-50 border-emerald-300' : 'bg-zinc-100 border-zinc-200'
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
                              <Dumbbell className={`w-5 h-5 ${isJustAdded ? 'text-emerald-700' : 'text-zinc-400'}`} />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase ${
                                  isJustAdded ? 'bg-emerald-200/80 text-emerald-900' : 'bg-zinc-100 text-zinc-600'
                                }`}
                              >
                                {item.category || 'General'}
                              </span>
                              {isJustAdded && (
                                <span className="text-[10px] font-bold text-emerald-700 animate-in fade-in">
                                  ✓ Añadido
                                </span>
                              )}
                            </div>
                            <h4 className="text-xs sm:text-sm font-bold text-zinc-900 truncate mt-0.5">
                              {item.name}
                            </h4>
                            <p className="text-[11px] text-zinc-500 truncate">
                              {item.defaultSetsCount || 3} series • {item.defaultReps || 10} reps • {item.defaultWeight || 0} kg • {item.defaultRestSeconds || 90}s rest
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSelectFromCatalog(item)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 flex items-center gap-1.5 active:scale-95 ${
                            isJustAdded
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-zinc-900 text-white group-hover:bg-emerald-600'
                          }`}
                        >
                          {isJustAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5 stroke-[3] animate-in zoom-in-50 duration-150" />
                              <span>¡Añadido!</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
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
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wide mb-1">
                  Nombre del Ejercicio *
                </label>
                <input
                  type="text"
                  required
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="ej. Press Inclinado, Fondos..."
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Cover Preview Image URL with live preview */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wide mb-1 flex items-center justify-between">
                  <span>URL de Imagen (Preview / Cover)</span>
                  <span className="text-[10px] font-normal text-zinc-500">Miniatura visual rápida</span>
                </label>
                <div className="flex items-center gap-2.5">
                  <div className="w-12 h-12 rounded-xl border border-zinc-200 bg-zinc-100 shrink-0 overflow-hidden flex items-center justify-center">
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
                      <ImageIcon className="w-5 h-5 text-zinc-400" />
                    )}
                  </div>
                  <input
                    type="url"
                    value={customImageUrl}
                    onChange={(e) => setCustomImageUrl(e.target.value)}
                    placeholder="https://ejemplo.com/foto.jpg..."
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Video URL */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wide mb-1">
                  URL de Video (opcional)
                </label>
                <input
                  type="url"
                  value={customVideoUrl}
                  onChange={(e) => setCustomVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wide mb-1">
                  Notas de técnica (opcional)
                </label>
                <input
                  type="text"
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Consejos sobre agarre, colocación..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Initial Sets config */}
              <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200">
                <span className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wide mb-2">
                  Configuración inicial de series
                </span>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1">Series</label>
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
                      className="w-full text-center text-xs font-bold py-1.5 rounded-lg border border-zinc-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1">Reps</label>
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
                      className="w-full text-center text-xs font-bold py-1.5 rounded-lg border border-zinc-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1">Peso (kg)</label>
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
                      className="w-full text-center text-xs font-bold py-1.5 rounded-lg border border-zinc-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1">Descanso (s)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      step="5"
                      min="0"
                      max="600"
                      value={customRest}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setCustomRest(e.target.value)}
                      onBlur={() => {
                        if (customRest === '' || isNaN(Number(customRest)) || Number(customRest) < 0) {
                          setCustomRest(0);
                        }
                      }}
                      className="w-full text-center text-xs font-bold py-1.5 rounded-lg border border-zinc-300 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Option to also save to library */}
              <label className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50/60 border border-emerald-200/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveToLibrary}
                  onChange={(e) => setSaveToLibrary(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs font-medium text-emerald-900">
                  Guardar también en mi Biblioteca para usarlo en futuras rutinas
                </span>
              </label>

              <div className="sticky bottom-0 bg-white/95 backdrop-blur-xs pt-3 pb-1 flex justify-end gap-2 border-t border-zinc-100 -mx-1 px-1 mt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors"
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
