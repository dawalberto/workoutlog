import { describe, expect, it } from 'vitest';
import type { ExerciseDefinition } from '../../src/types';
import { buildCatalogExercise } from '../../src/utils/exerciseCatalog';

describe('catalog exercise creation', () => {
  it('normalizes form values and preserves the edited definition metadata', () => {
    const existing: ExerciseDefinition = {
      id: 'exercise-press',
      name: 'Press',
      category: 'Pecho',
      createdAt: '2026-01-01T00:00:00.000Z',
      customField: 'preserved',
    } as ExerciseDefinition;

    expect(buildCatalogExercise({
      name: '  Press de Banca  ',
      category: 'Pecho',
      imageUrl: ' https://example.test/press.jpg ',
      videoUrl: '',
      notes: '  Control  ',
      defaultSets: '4',
      defaultReps: '8',
      defaultWeight: '60',
      defaultRest: '90',
    }, existing, 'unused-id', 'unused-date')).toEqual({
      ...existing,
      name: 'Press de Banca',
      category: 'Pecho',
      imageUrl: 'https://example.test/press.jpg',
      videoUrl: '',
      notes: 'Control',
      defaultSetsCount: 4,
      defaultReps: 8,
      defaultWeight: 60,
      defaultRestSeconds: 90,
    });
  });

  it('applies create defaults and supplied identity values', () => {
    expect(buildCatalogExercise({
      name: 'Sentadilla',
      category: 'Pierna',
      imageUrl: '',
      videoUrl: '',
      notes: '',
      defaultSets: '',
      defaultReps: 0,
      defaultWeight: '',
      defaultRest: '',
    }, null, 'exercise-squat', '2026-01-02T00:00:00.000Z')).toEqual({
      id: 'exercise-squat',
      name: 'Sentadilla',
      category: 'Pierna',
      imageUrl: '',
      videoUrl: '',
      notes: '',
      defaultSetsCount: 3,
      defaultReps: 10,
      defaultWeight: 0,
      defaultRestSeconds: 60,
      createdAt: '2026-01-02T00:00:00.000Z',
    });
  });
});
