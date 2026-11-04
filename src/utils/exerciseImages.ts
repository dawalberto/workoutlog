/**
 * Exercise cover library.
 *
 * Bundled exercise photos live in `src/assets/exercises/`. They are
 * auto-enumerated with `import.meta.glob`, so adding a file is enough; no
 * manifest to maintain. Vite emits each image with a content hash, so the
 * persisted (and synced) `imageUrl` never stores the hashed URL directly.
 *
 * For a bundled image, `imageUrl` holds a stable key (`library:<slug>`), and
 * {@link resolveExerciseImageUrl} maps it to the current build's asset URL.
 * Custom images keep storing their raw URL unchanged.
 */

export interface ExerciseImageOption {
  /** Stable value persisted in `imageUrl` for a bundled image. */
  value: string;
  /** Content-hashed asset URL for the current build. */
  url: string;
  /** Spanish label shown in the album. */
  label: string;
}

export const EXERCISE_LIBRARY_PREFIX = 'library:';

/** Friendly Spanish names for the shipped photos; unknown files fall back to a humanized slug. */
const EXERCISE_IMAGE_LABELS: Record<string, string> = {
  'back-squat': 'Sentadilla Trasera',
  'barbell-deadlift': 'Peso Muerto con Barra',
  'cable-tricep-pushdown': 'Extensión de Tríceps en Polea',
  'calf-raises': 'Elevación de Gemelos',
  'clean-and-jerk': 'Dos Tiempos',
  'dumbbell-bicep-curls': 'Curl de Bíceps con Mancuernas',
  'dumbbell-lateral-raises': 'Elevaciones Laterales',
  'dumbbell-romanian-deadlift': 'Peso Muerto Rumano con Mancuernas',
  'dumbbell-shoulder-press': 'Press de Hombro con Mancuernas',
  'flat-bench-press': 'Press de Banca Plano',
  'front-squat': 'Sentadilla Frontal',
  'glute-bridge': 'Puente de Glúteo',
  'goblet-squat': 'Sentadilla Goblet',
  'lat-pulldown': 'Jalón al Pecho',
  'leg-extension': 'Extensión de Cuádriceps',
  'leg-press': 'Prensa de Piernas',
  'push-ups': 'Flexiones',
  'seated-cable-row': 'Remo Sentado en Polea',
  'seated-leg-curl': 'Curl Femoral Sentado',
};

const imageModules = import.meta.glob('../assets/exercises/*.{webp,png,jpg,jpeg}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

function slugFromPath(path: string): string {
  const file = path.split('/').pop() ?? path;
  return file.replace(/\.[^./]+$/, '');
}

function humanizeSlug(slug: string): string {
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function exerciseImageLabel(slug: string): string {
  return EXERCISE_IMAGE_LABELS[slug] ?? humanizeSlug(slug);
}

/** Every bundled exercise photo, sorted by its Spanish label. */
export const EXERCISE_IMAGE_LIBRARY: ExerciseImageOption[] = Object.entries(imageModules)
  .map(([path, url]) => {
    const slug = slugFromPath(path);
    return { value: `${EXERCISE_LIBRARY_PREFIX}${slug}`, url, label: exerciseImageLabel(slug) };
  })
  .sort((a, b) => a.label.localeCompare(b.label, 'es'));

const LIBRARY_URL_BY_VALUE = new Map(
  EXERCISE_IMAGE_LIBRARY.map((option) => [option.value, option.url] as const),
);

/** Returns the slug of a bundled-image key, or `null` for URLs and empty values. */
export function exerciseLibrarySlug(imageUrl: string | undefined): string | null {
  if (!imageUrl || !imageUrl.startsWith(EXERCISE_LIBRARY_PREFIX)) return null;
  const slug = imageUrl.slice(EXERCISE_LIBRARY_PREFIX.length).trim();
  return slug.length > 0 ? slug : null;
}

/**
 * Resolves a stored `imageUrl` to something usable in an `<img src>`: a bundled
 * key becomes the current asset URL, any other value passes through unchanged,
 * and an unknown library key resolves to `''` so callers show the fallback.
 */
export function resolveExerciseImageUrl(imageUrl: string | undefined): string {
  if (!imageUrl) return '';
  const slug = exerciseLibrarySlug(imageUrl);
  if (!slug) return imageUrl;
  return LIBRARY_URL_BY_VALUE.get(imageUrl) ?? '';
}

/**
 * Normalizes text for search: lower-case, accent-insensitive, and without
 * separators, so "push up", "pushup", and "push-ups" all match the same entry.
 */
function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Filters the album by a case- and accent-insensitive match against both the
 * Spanish label and the English file slug (so "push up" finds "Flexiones").
 */
export function filterExerciseImageOptions(
  options: ExerciseImageOption[],
  searchTerm: string,
): ExerciseImageOption[] {
  const term = normalizeSearchText(searchTerm);
  if (!term) return options;
  return options.filter((option) => {
    const slug = exerciseLibrarySlug(option.value) ?? option.value;
    return (
      normalizeSearchText(option.label).includes(term) ||
      normalizeSearchText(slug).includes(term)
    );
  });
}
