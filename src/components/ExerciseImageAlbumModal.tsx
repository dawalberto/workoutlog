import React, { useState } from 'react';
import { Check, ImageOff, Link2, Search, X } from 'lucide-react';
import { ExerciseThumbnail } from './ExerciseThumbnail';
import {
  EXERCISE_IMAGE_LIBRARY,
  filterExerciseImageOptions,
  exerciseLibrarySlug,
} from '../utils/exerciseImages';

interface ExerciseImageAlbumModalProps {
  /** Exercise name, used for alt text and the initials fallback. */
  name: string;
  /** Current stored value: a `library:` key, a URL, or empty. */
  value: string;
  /** Called with the chosen value, then the modal closes. */
  onSelect: (value: string) => void;
  onClose: () => void;
}

/**
 * Album of bundled exercise photos plus a custom-URL entry. Mounted only while
 * open (the picker controls that), so its search and URL draft start fresh each
 * time it is shown.
 */
export const ExerciseImageAlbumModal: React.FC<ExerciseImageAlbumModalProps> = ({
  name,
  value,
  onSelect,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [urlDraft, setUrlDraft] = useState(() => (exerciseLibrarySlug(value) ? '' : value));
  const [urlError, setUrlError] = useState(false);

  const options = filterExerciseImageOptions(EXERCISE_IMAGE_LIBRARY, searchTerm);
  const trimmedUrl = urlDraft.trim();

  const selectAndClose = (nextValue: string) => {
    onSelect(nextValue);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label="Seleccionar imagen del ejercicio"
      onClick={onClose}
      onKeyDown={(event) => {
        // The album lives inside the exercise form; keep Enter from submitting it.
        if (event.key === 'Enter') event.preventDefault();
      }}
    >
      <div
        className="bg-[#18181A] text-white rounded-3xl border border-white/10 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-slide-up"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 sm:px-6 py-4 border-b border-white/[0.08] shrink-0">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-black text-white truncate">Elegir imagen</h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Elige una de la biblioteca o pega tu propia URL.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar álbum de imágenes"
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 py-5 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar imagen..."
              aria-label="Buscar imagen en la biblioteca"
              className="w-full min-h-[48px] pl-11 pr-4 text-sm rounded-2xl border border-white/10 bg-zinc-900 text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#00FF87] focus:ring-2 focus:ring-[#00FF87]/20"
            />
          </div>

          {/* Clear selection */}
          <button
            type="button"
            onClick={() => selectAndClose('')}
            aria-pressed={!value}
            className={`w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-2xl border text-xs font-bold transition-all ${
              !value
                ? 'border-[#00FF87]/40 bg-[#00FF87]/10 text-[#00FF87]'
                : 'border-white/10 bg-zinc-900 text-zinc-400 hover:text-white hover:border-white/20'
            }`}
          >
            <ImageOff className="w-4 h-4" />
            Sin imagen (usar iniciales)
          </button>

          {/* Library grid */}
          {options.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-8">
              No hay imágenes que coincidan con &quot;{searchTerm}&quot;.
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => selectAndClose(option.value)}
                    aria-pressed={isSelected}
                    title={option.label}
                    className={`group relative rounded-2xl overflow-hidden border aspect-square transition-all ${
                      isSelected
                        ? 'border-[#00FF87] ring-2 ring-[#00FF87]/50'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <ExerciseThumbnail
                      name={option.label}
                      imageUrl={option.url}
                      className="w-full h-full"
                      iconClassName="w-6 h-6 text-zinc-600"
                      initialsClassName="text-xs"
                    />
                    <span className="absolute inset-x-0 bottom-0 bg-black/70 backdrop-blur-sm px-1.5 py-1 text-[10px] font-bold text-white truncate text-center">
                      {option.label}
                    </span>
                    {isSelected && (
                      <span className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-[#00FF87] text-black shadow-[0_0_10px_rgba(0,255,135,0.5)]">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Custom URL */}
          <div className="pt-4 border-t border-white/[0.08] space-y-2">
            <span className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">
              <Link2 className="w-3.5 h-3.5 text-[#00E5FF]" />
              O usa una URL propia
            </span>
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={urlDraft}
                onChange={(event) => {
                  setUrlDraft(event.target.value);
                  setUrlError(false);
                }}
                placeholder="https://ejemplo.com/imagen.jpg"
                aria-label="URL de imagen personalizada"
                className="flex-1 min-h-[48px] px-4 text-sm rounded-2xl border border-white/10 bg-zinc-900 text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#00E5FF] focus:ring-2 focus:ring-[#00E5FF]/20"
              />
              <button
                type="button"
                onClick={() => selectAndClose(trimmedUrl)}
                disabled={!trimmedUrl}
                className="min-h-[48px] px-4 rounded-2xl text-xs font-extrabold bg-[#00E5FF] text-black hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
              >
                Usar URL
              </button>
            </div>
            {urlError && (
              <p className="text-[11px] text-amber-400">
                No se pudo cargar la imagen desde este enlace.
              </p>
            )}
            {trimmedUrl && (
              <div className="flex items-center gap-3 pt-1">
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 bg-zinc-900 shrink-0">
                  <ExerciseThumbnail
                    name={name}
                    imageUrl={trimmedUrl}
                    className="w-full h-full"
                    onError={() => setUrlError(true)}
                  />
                </div>
                <span className="text-[11px] text-zinc-500">Vista previa del enlace</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
