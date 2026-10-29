import { describe, expect, it } from 'vitest';
import {
  formatExerciseCategories,
  getExerciseCategories,
  normalizeExerciseCategories,
  primaryExerciseCategory,
  sameExerciseCategories,
} from '../../src/utils/exerciseCategories';

describe('exercise categories helper', () => {
  it('prefers the explicit list over the legacy single value', () => {
    expect(getExerciseCategories({ category: 'Pecho', categories: ['Core', 'Piernas'] }))
      .toEqual(['Core', 'Piernas']);
  });

  it('derives a one-element list from a legacy record', () => {
    expect(getExerciseCategories({ category: 'Pecho' })).toEqual(['Pecho']);
    expect(getExerciseCategories({})).toEqual([]);
    expect(getExerciseCategories(null)).toEqual([]);
  });

  it('drops empty entries from the raw list', () => {
    expect(getExerciseCategories({ categories: ['Core', '', 'Piernas'] }))
      .toEqual(['Core', 'Piernas']);
    expect(getExerciseCategories({ categories: [] })).toEqual([]);
  });

  it('reports the primary and formatted values', () => {
    expect(primaryExerciseCategory({ categories: ['Core', 'Piernas'] })).toBe('Core');
    expect(primaryExerciseCategory({})).toBeUndefined();
    expect(formatExerciseCategories({ categories: ['Core', 'Piernas'] })).toBe('Core, Piernas');
    expect(formatExerciseCategories({})).toBe('');
  });

  it('compares group sets ignoring order and duplicates', () => {
    expect(sameExerciseCategories({ categories: ['Core', 'Piernas'] }, { categories: ['Piernas', 'Core'] }))
      .toBe(true);
    expect(sameExerciseCategories({ category: 'Core' }, { categories: ['Core', 'Piernas'] }))
      .toBe(false);
    expect(sameExerciseCategories({}, {})).toBe(true);
  });

  it('normalizes form values trimming and deduplicating', () => {
    expect(normalizeExerciseCategories([' Core ', 'Core', '', 'Piernas']))
      .toEqual(['Core', 'Piernas']);
  });
});
