import React from 'react';
import { Dumbbell } from 'lucide-react';
import { getExerciseInitials } from '../utils/exerciseInitials';

interface ExerciseThumbnailProps {
  /** Exercise name; drives the alt text and the initials placeholder. */
  name: string;
  imageUrl?: string;
  /** Size, shape, border and background classes for the square container. */
  className?: string;
  /** Size and color classes for the placeholder dumbbell icon. */
  iconClassName?: string;
  /** Size classes for the neon initials overlaid on the dumbbell. */
  initialsClassName?: string;
  /** Called when the image fails to load, so callers can react (e.g. show an error message). */
  onError?: () => void;
}

/**
 * Exercise cover thumbnail. Renders the image when available and falls back to
 * the weight icon with the exercise initials overlaid in neon green. The
 * fallback sits behind the image, so it is shown both when there is no image
 * and when the image fails to load.
 */
export const ExerciseThumbnail: React.FC<ExerciseThumbnailProps> = ({
  name,
  imageUrl,
  className = '',
  iconClassName = 'w-6 h-6 text-zinc-500',
  initialsClassName = 'text-[10px]',
  onError,
}) => {
  const initials = getExerciseInitials(name);

  return (
    <div className={`relative flex items-center justify-center overflow-hidden ${className}`}>
      <Dumbbell className={iconClassName} aria-hidden="true" />
      {initials && (
        <span
          aria-hidden="true"
          className={`absolute inset-0 flex items-center justify-center font-black leading-none text-[#00FF87] drop-shadow-[0_0_3px_rgba(0,0,0,0.9)] select-none pointer-events-none ${initialsClassName}`}
        >
          {initials}
        </span>
      )}
      {imageUrl && (
        <img
          src={imageUrl}
          alt={name}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
          onError={(event) => {
            (event.target as HTMLElement).style.display = 'none';
            onError?.();
          }}
        />
      )}
    </div>
  );
};
