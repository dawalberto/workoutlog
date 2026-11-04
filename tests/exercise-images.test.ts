import { describe, expect, it } from 'vitest';
import {
  EXERCISE_IMAGE_LIBRARY,
  EXERCISE_LIBRARY_PREFIX,
  exerciseImageLabel,
  exerciseLibrarySlug,
  filterExerciseImageOptions,
  resolveExerciseImageUrl,
} from '../src/utils/exerciseImages';

describe('exercise image library', () => {
  it('enumerates the bundled photos with stable keys, URLs, and labels', () => {
    expect(EXERCISE_IMAGE_LIBRARY.length).toBeGreaterThan(0);
    for (const option of EXERCISE_IMAGE_LIBRARY) {
      expect(option.value.startsWith(EXERCISE_LIBRARY_PREFIX)).toBe(true);
      expect(option.url).toBeTruthy();
      expect(option.label).toBeTruthy();
    }
    expect(EXERCISE_IMAGE_LIBRARY.map((option) => option.value)).toContain('library:back-squat');
  });

  it('sorts the library by Spanish label', () => {
    const labels = EXERCISE_IMAGE_LIBRARY.map((option) => option.label);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b, 'es')));
  });

  it('gives shipped photos Spanish labels and humanizes unknown slugs', () => {
    expect(exerciseImageLabel('back-squat')).toBe('Sentadilla Trasera');
    expect(exerciseImageLabel('seated-cable-row')).toBe('Remo Sentado en Polea');
    expect(exerciseImageLabel('some-new_move')).toBe('Some New Move');
  });

  it('recognizes library keys and ignores URLs and empty values', () => {
    expect(exerciseLibrarySlug('library:back-squat')).toBe('back-squat');
    expect(exerciseLibrarySlug('library:   ')).toBeNull();
    expect(exerciseLibrarySlug('https://example.test/row.jpg')).toBeNull();
    expect(exerciseLibrarySlug('')).toBeNull();
    expect(exerciseLibrarySlug(undefined)).toBeNull();
  });

  it('resolves a library key to the current asset URL and passes URLs through', () => {
    const backSquat = EXERCISE_IMAGE_LIBRARY.find((option) => option.value === 'library:back-squat');

    expect(backSquat).toBeDefined();
    expect(resolveExerciseImageUrl('library:back-squat')).toBe(backSquat?.url);
    expect(resolveExerciseImageUrl('https://example.test/row.jpg')).toBe('https://example.test/row.jpg');
    expect(resolveExerciseImageUrl('')).toBe('');
    expect(resolveExerciseImageUrl(undefined)).toBe('');
    // A removed/broken library file resolves to empty so callers show the fallback.
    expect(resolveExerciseImageUrl('library:missing-image')).toBe('');
  });

  it('filters options by case-insensitive label', () => {
    const options = [
      { value: 'library:a', url: '/a.webp', label: 'Prensa de Piernas' },
      { value: 'library:b', url: '/b.webp', label: 'Flexiones' },
    ];

    expect(filterExerciseImageOptions(options, 'PIE')).toEqual([options[0]]);
    expect(filterExerciseImageOptions(options, '  flex ')).toEqual([options[1]]);
    expect(filterExerciseImageOptions(options, '')).toEqual(options);
    expect(filterExerciseImageOptions(options, 'zzz')).toEqual([]);
  });
});
