import React, { useState } from 'react';
import { Images } from 'lucide-react';
import { ExerciseThumbnail } from './ExerciseThumbnail';
import { ExerciseImageAlbumModal } from './ExerciseImageAlbumModal';

interface ExerciseImagePickerProps {
  /** Exercise name, used for the alt text and the initials fallback. */
  name: string;
  /** Current stored value: a `library:` key, a URL, or empty. */
  value: string;
  /** Receives the chosen value (library key, URL, or `''` to clear). */
  onChange: (value: string) => void;
  /** Field label; defaults to "Imagen". */
  label?: string;
}

/**
 * Exercise cover field. The preview doubles as a button that opens the bundled
 * image album. It shows, in order of preference: the selected image (library or
 * URL) or the dumbbell/initials fallback handled by {@link ExerciseThumbnail}.
 */
export const ExerciseImagePicker: React.FC<ExerciseImagePickerProps> = ({
  name,
  value,
  onChange,
  label = 'Imagen',
}) => {
  const [isAlbumOpen, setIsAlbumOpen] = useState(false);

  return (
    <div>
      <label className="block text-xs font-extrabold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
        <span>{label}</span>
        <span className="text-[10px] font-normal text-zinc-500">
          {value ? 'Toca para cambiar' : 'Álbum o URL'}
        </span>
      </label>

      <button
        type="button"
        onClick={() => setIsAlbumOpen(true)}
        aria-label={value ? 'Cambiar imagen del ejercicio' : 'Elegir imagen del ejercicio'}
        className="group relative mx-auto block w-full max-w-[160px] aspect-square rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 hover:border-[#00FF87]/40 transition-all shadow-inner"
      >
        <ExerciseThumbnail
          name={name}
          imageUrl={value}
          className="w-full h-full"
          iconClassName="w-8 h-8 text-zinc-600"
          initialsClassName="text-lg"
        />
        <span className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/70 via-transparent to-transparent transition-opacity">
          <span className="mb-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-sm border border-white/15 text-[11px] font-extrabold text-white">
            <Images className="w-3.5 h-3.5 text-[#00FF87]" />
            {value ? 'Cambiar imagen' : 'Elegir imagen'}
          </span>
        </span>
      </button>

      {isAlbumOpen && (
        <ExerciseImageAlbumModal
          name={name}
          value={value}
          onSelect={onChange}
          onClose={() => setIsAlbumOpen(false)}
        />
      )}
    </div>
  );
};
