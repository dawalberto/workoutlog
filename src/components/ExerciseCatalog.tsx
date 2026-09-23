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
  Sparkles, 
  Check, 
  X,
  Layers
} from 'lucide-react';
import { ExerciseDefinition } from '../types';

interface ExerciseCatalogProps {
  exercises: ExerciseDefinition[];
  onCreateExercise: (exercise: ExerciseDefinition) => void;
  onUpdateExercise: (exercise: ExerciseDefinition) => void;
  onDeleteExercise: (id: string) => void;
}

const CATEGORIES = ['Todos', 'Pecho', 'Espalda', 'Pierna', 'Hombro', 'Brazos', 'Core'];

export const ExerciseCatalog: React.FC<ExerciseCatalogProps> = ({
  exercises,
  onCreateExercise,
  onUpdateExercise,
  onDeleteExercise,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingExercise, setEditingExercise] = useState<ExerciseDefinition | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Pecho');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formVideoUrl, setFormVideoUrl] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formDefaultSets, setFormDefaultSets] = useState(3);
  const [formDefaultReps, setFormDefaultReps] = useState(10);
  const [formDefaultWeight, setFormDefaultWeight] = useState(50);
  const [formDefaultRest, setFormDefaultRest] = useState(90);
  const [imageError, setImageError] = useState(false);

  const filteredExercises = exercises.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ex.notes && ex.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCat = selectedCategory === 'Todos' || ex.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleOpenCreate = () => {
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

    setIsEditing(false);
    setEditingExercise(null);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`¿Seguro que deseas eliminar "${name}" de la biblioteca?`)) {
      onDeleteExercise(id);
    }
  };

  return (
    <div id="exercise-catalog-page" className="min-h-screen bg-zinc-50 pb-20">
      {/* Sub-header */}
      <div className="bg-white border-b border-zinc-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
                Biblioteca de Ejercicios
              </h1>
              <p className="text-xs sm:text-sm text-zinc-600 mt-0.5">
                Crea y preconfigura tus movimientos con imagen de preview, video y series para usarlos rápidamente.
              </p>
            </div>

            <button
              id="btn-new-catalog-exercise"
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors active:scale-95"
            >
              <Plus className="w-4 h-4" /> Nuevo Ejercicio
            </button>
          </div>

          {/* Search & Category Filter */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar ejercicio o grupo muscular..."
                className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 transition-colors ${
                    selectedCategory === cat
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main List */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">
        <div className="flex items-center justify-between text-xs text-zinc-600 px-1 mb-4">
          <span>{filteredExercises.length} {filteredExercises.length === 1 ? 'ejercicio registrado' : 'ejercicios registrados'}</span>
        </div>

        {filteredExercises.length === 0 ? (
          <div className="text-center py-16 px-6 bg-white rounded-2xl border border-zinc-200 shadow-sm max-w-md mx-auto">
            <div className="w-12 h-12 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-zinc-400">
              <Dumbbell className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-zinc-900">No se encontraron ejercicios</h3>
            <p className="text-xs text-zinc-600 mt-1 mb-4">
              Prueba con otro término de búsqueda o crea un nuevo ejercicio para tu catálogo.
            </p>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
            >
              + Crear Ejercicio
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredExercises.map((ex) => (
              <div
                key={ex.id}
                id={`catalog-card-${ex.id}`}
                className="bg-white rounded-2xl border border-zinc-200 hover:border-zinc-300 p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start gap-3">
                    {/* Cover Preview Image */}
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-zinc-100 shrink-0 border border-zinc-200 flex items-center justify-center relative">
                      {ex.imageUrl ? (
                        <img
                          src={ex.imageUrl}
                          alt={ex.name}
                          loading="lazy"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback if image fails to load
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Dumbbell className="w-6 h-6 text-zinc-400" />
                      )}
                      {ex.videoUrl && (
                        <span className="absolute bottom-1 right-1 p-0.5 rounded-md bg-black/70 text-white">
                          <Video className="w-3 h-3" />
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-100 text-zinc-700 uppercase tracking-wide">
                          {ex.category || 'General'}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-zinc-900 tracking-tight mt-1 truncate">
                        {ex.name}
                      </h3>
                      {ex.notes && (
                        <p className="text-xs text-zinc-600 line-clamp-1 mt-0.5">
                          {ex.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Pre-configured defaults badge */}
                  <div className="mt-3 pt-2.5 border-t border-zinc-100 flex items-center gap-3 text-[11px] text-zinc-600 font-medium">
                    <span className="inline-flex items-center gap-1">
                      <Layers className="w-3 h-3 text-zinc-600" /> {ex.defaultSetsCount || 3} series
                    </span>
                    <span>•</span>
                    <span>{ex.defaultReps || 10} reps</span>
                    <span>•</span>
                    <span>{ex.defaultWeight || 0} kg</span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3 text-zinc-600" /> {ex.defaultRestSeconds || 60}s
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-3 pt-2.5 border-t border-zinc-100 flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(ex)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg text-zinc-700 bg-zinc-100 hover:bg-zinc-200 transition-colors"
                  >
                    <Edit3 className="w-3 h-3" /> Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(ex.id, ex.name)}
                    className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar de la biblioteca"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create / Edit Exercise Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-hidden">
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-zinc-200 shadow-2xl max-w-lg w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-zinc-100 shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-xl bg-emerald-100 text-emerald-800 shrink-0">
                  <Dumbbell className="w-4 h-4" />
                </span>
                <h2 className="text-base sm:text-lg font-bold text-zinc-900 truncate">
                  {editingExercise ? 'Editar Ejercicio del Catálogo' : 'Nuevo Ejercicio en la Biblioteca'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 overscroll-contain">
              {/* Exercise Name */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wide mb-1">
                  Nombre del Ejercicio *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="ej. Press de Banca Plano, Sentadilla..."
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wide mb-1">
                  Grupo Muscular / Categoría
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {['Pecho', 'Espalda', 'Pierna', 'Hombro', 'Brazos', 'Core', 'Otro'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFormCategory(cat)}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                        formCategory === cat
                          ? 'bg-emerald-600 text-white'
                          : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Image URL & Live Preview */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wide mb-1 flex items-center justify-between">
                  <span>URL de Imagen (Preview / Cover)</span>
                  <span className="text-[10px] font-normal text-zinc-600">Miniatura visual rápida</span>
                </label>
                <div className="flex items-center gap-3">
                  {/* Thumbnail preview */}
                  <div className="w-14 h-14 rounded-xl border border-zinc-200 bg-zinc-100 shrink-0 overflow-hidden flex items-center justify-center relative">
                    {formImageUrl && !imageError ? (
                      <img
                        src={formImageUrl}
                        alt="Vista previa"
                        className="w-full h-full object-cover"
                        onError={() => setImageError(true)}
                        onLoad={() => setImageError(false)}
                      />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-zinc-400" />
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
                      className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    {imageError && (
                      <p className="text-[11px] text-amber-600 mt-1">
                        No se pudo cargar la imagen desde este enlace (revisa la URL).
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Video URL */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wide mb-1">
                  URL de Video (Técnica / Demostración)
                </label>
                <input
                  type="url"
                  value={formVideoUrl}
                  onChange={(e) => setFormVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... o enlace de video"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wide mb-1">
                  Notas de Técnica o Consejos (opcional)
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Instrucciones sobre agarre, colocación o tempo..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Pre-configured Defaults */}
              <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200">
                <span className="block text-xs font-bold text-zinc-800 uppercase tracking-wider mb-2.5">
                  Valores Preconfigurados al añadir a una rutina
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-600 mb-1">Nº Series</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      min="1"
                      max="12"
                      value={formDefaultSets}
                      onChange={(e) => setFormDefaultSets(parseInt(e.target.value) || 1)}
                      className="w-full text-center text-xs font-bold py-1.5 rounded-lg border border-zinc-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-600 mb-1">Reps / Serie</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      min="1"
                      max="100"
                      value={formDefaultReps}
                      onChange={(e) => setFormDefaultReps(parseInt(e.target.value) || 1)}
                      className="w-full text-center text-xs font-bold py-1.5 rounded-lg border border-zinc-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-600 mb-1">Peso (kg)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      pattern="[0-9]*[.,]?[0-9]*"
                      step="0.5"
                      min="0"
                      max="500"
                      value={formDefaultWeight}
                      onChange={(e) => setFormDefaultWeight(parseFloat(e.target.value) || 0)}
                      className="w-full text-center text-xs font-bold py-1.5 rounded-lg border border-zinc-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-600 mb-1">Descanso (s)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      step="5"
                      min="0"
                      max="600"
                      value={formDefaultRest}
                      onChange={(e) => setFormDefaultRest(parseInt(e.target.value) || 0)}
                      className="w-full text-center text-xs font-bold py-1.5 rounded-lg border border-zinc-300 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="sticky bottom-0 bg-white/95 backdrop-blur-xs pt-3 pb-1 flex items-center justify-end gap-2 border-t border-zinc-100 -mx-1 px-1 mt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors"
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
