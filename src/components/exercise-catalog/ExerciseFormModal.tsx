import React from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Dumbbell, Image as ImageIcon, X } from 'lucide-react';
import type { ExerciseDefinition } from '../../types';
import { TimePickerField } from '../TimePickerField';

interface ExerciseFormModalProps {
  isOpen: boolean;
  editingExercise: ExerciseDefinition | null;
  formName: string;
  setFormName: Dispatch<SetStateAction<string>>;
  formCategory: string;
  setFormCategory: Dispatch<SetStateAction<string>>;
  formImageUrl: string;
  setFormImageUrl: Dispatch<SetStateAction<string>>;
  formVideoUrl: string;
  setFormVideoUrl: Dispatch<SetStateAction<string>>;
  formNotes: string;
  setFormNotes: Dispatch<SetStateAction<string>>;
  formDefaultSets: number | string;
  setFormDefaultSets: Dispatch<SetStateAction<number | string>>;
  formDefaultReps: number | string;
  setFormDefaultReps: Dispatch<SetStateAction<number | string>>;
  formDefaultWeight: number | string;
  setFormDefaultWeight: Dispatch<SetStateAction<number | string>>;
  formDefaultRest: number | string;
  setFormDefaultRest: Dispatch<SetStateAction<number | string>>;
  imageError: boolean;
  setImageError: Dispatch<SetStateAction<boolean>>;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
}

export const ExerciseFormModal: React.FC<ExerciseFormModalProps> = ({
  isOpen,
  editingExercise,
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
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
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
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-4 overscroll-contain">
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
              onClick={onClose}
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
  );
};
