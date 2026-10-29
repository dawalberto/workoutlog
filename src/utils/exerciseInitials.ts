const STOPWORDS = new Set([
  'de',
  'del',
  'la',
  'el',
  'los',
  'las',
  'con',
  'en',
  'y',
  'a',
  'al',
  'para',
  'por',
]);

/**
 * Builds a short two-letter tag from an exercise name, used as a visual
 * placeholder when no image (or a broken image) is available.
 *
 * "Push up" -> "PU", "Remo con Barra" -> "RB", "Sentadilla" -> "SE".
 */
export function getExerciseInitials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter((word) => word.length > 0);

  const meaningful = words.filter((word) => !STOPWORDS.has(word.toLowerCase()));
  const source = meaningful.length > 0 ? meaningful : words;

  if (source.length === 0) return '';
  if (source.length === 1) return source[0].slice(0, 2).toUpperCase();
  return (source[0][0] + source[1][0]).toUpperCase();
}
