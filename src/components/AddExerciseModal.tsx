import React, { useState } from 'react';
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
  const [customSetsCount, setCustomSetsCount] = useState(3);
  const [customReps, setCustomReps] = useState(10);
  const [customWeight, setCustomWeight] = useState(40);
  const [customRest, setCustomRest] = useState(90);
  const [saveToLibrary, setSaveToLibrary] = useState(true);

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
      name: item.name,
      category: item.category,
      imageUrl: item.imageUrl || '',
      videoUrl: item.videoUrl || '',
      notes: item.notes || '',
      sets,
    };

    onAddExercise(newExercise);
    onClose();
  };

  // Add created in-the-moment
  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const count = Math.max(1, customSetsCount);
    const sets: WorkoutSet[] = Array.from({ length: count }, (_, i) => ({
      id: 'set-' + Date.now() + '-' + (i + 1) + '-' + Math.random().toString(36).substring(2, 5),
      setNumber: i + 1,
      reps: Math.max(1, customReps),
      weight: Math.max(0, customWeight),
      restSeconds: Math.max(0, customRest),
    }));

    const newExercise: Exercise = {
      id: 'ex-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      name: customName.trim(),
      imageUrl: customImageUrl.trim(),
      videoUrl: customVideoUrl.trim(),
      notes: customNotes.trim(),
      sets,
    };

    let templateToSave: ExerciseDefinition | undefined;
    if (saveToLibrary) {
      templateToSave = {
        id: 'def-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        name: customName.trim(),
        category: customCategory,
        imageUrl: customImageUrl.trim(),
        videoUrl: customVideoUrl.trim(),
        notes: customNotes.trim(),
        defaultSetsCount: count,
        defaultReps: customReps,
        defaultWeight: customWeight,
        defaultRestSeconds: customRest,
        createdAt: new Date().toISOString(),
      };
    }

    onAddExercise(newExercise, templateToSave);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-zinc-200 shadow-2xl max-w-xl w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header - Fixed at top, never covered */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-zinc-100 shrink-0 bg-white">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-xl bg-emerald-100 text-emerald-800 shrink-0">
              <Dumbbell className="w-4 h-4" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-zinc-900 truncate">Añadir Ejercicio a la Rutina</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
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
                  {filteredCatalog.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl border border-zinc-200 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Thumbnail */}
                        <div className="w-12 h-12 rounded-lg bg-zinc-100 border border-zinc-200 overflow-hidden shrink-0 flex items-center justify-center">
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
                            <Dumbbell className="w-5 h-5 text-zinc-400" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-600 uppercase">
                              {item.category || 'General'}
                            </span>
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
                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-zinc-900 text-white group-hover:bg-emerald-600 transition-colors shrink-0 flex items-center gap-1 active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" /> Añadir
                      </button>
                    </div>
                  ))}
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
                      min="1"
                      max="12"
                      value={customSetsCount}
                      onChange={(e) => setCustomSetsCount(parseInt(e.target.value) || 1)}
                      className="w-full text-center text-xs font-bold py-1.5 rounded-lg border border-zinc-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1">Reps</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={customReps}
                      onChange={(e) => setCustomReps(parseInt(e.target.value) || 1)}
                      className="w-full text-center text-xs font-bold py-1.5 rounded-lg border border-zinc-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1">Peso (kg)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="500"
                      value={customWeight}
                      onChange={(e) => setCustomWeight(parseFloat(e.target.value) || 0)}
                      className="w-full text-center text-xs font-bold py-1.5 rounded-lg border border-zinc-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1">Descanso (s)</label>
                    <input
                      type="number"
                      step="5"
                      min="0"
                      max="600"
                      value={customRest}
                      onChange={(e) => setCustomRest(parseInt(e.target.value) || 0)}
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
