import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ExerciseDefinition } from '../src/types';
import { filterExerciseCatalog } from '../src/utils/exerciseCatalog';

const exercises: ExerciseDefinition[] = [
  {
    id: 'def-press',
    name: 'Press de Banca',
    category: 'Pecho',
    imageUrl: 'https://example.test/press.jpg',
    videoUrl: 'https://example.test/press-video',
    notes: 'Control escapular',
    defaultSetsCount: 4,
    defaultReps: 8,
    defaultWeight: 60,
    defaultRestSeconds: 90,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'def-row',
    name: 'Remo con Barra',
    category: 'Espalda',
    imageUrl: '',
    videoUrl: '',
    notes: 'Tirón horizontal',
    defaultSetsCount: 3,
    defaultReps: 10,
    defaultWeight: 45,
    defaultRestSeconds: 75,
    createdAt: '2026-01-02T00:00:00.000Z',
  },
  {
    id: 'def-squat',
    name: 'Sentadilla',
    category: 'Pierna',
    imageUrl: '',
    videoUrl: '',
    notes: 'Cadera y glúteo',
    defaultSetsCount: 3,
    defaultReps: 12,
    defaultWeight: 40,
    defaultRestSeconds: 60,
    createdAt: '2026-01-03T00:00:00.000Z',
  },
];

const catalogProps = {
  exercises,
  rmLogs: [],
  exerciseDiary: [],
  onCreateExercise: vi.fn(),
  onUpdateExercise: vi.fn(),
  onDeleteExercise: vi.fn(),
};

afterEach(() => {
  vi.doUnmock('react');
  vi.resetModules();
});

async function renderCatalog(
  searchTerm?: string,
  selectedCategory?: string,
  additionalState: unknown[] = [],
) {
  vi.doUnmock('react');
  vi.resetModules();

  if (searchTerm !== undefined || selectedCategory !== undefined || additionalState.length > 0) {
    let stateIndex = 0;
    const stateValues = [searchTerm ?? '', selectedCategory ?? 'Todos', ...additionalState];
    vi.doMock('react', async (importOriginal) => {
      const actual = await importOriginal<typeof import('react')>();
      return {
        ...actual,
        useState: (initial: unknown) => {
          const index = stateIndex++;
          const value = index < stateValues.length
            ? stateValues[index]
            : typeof initial === 'function'
              ? (initial as () => unknown)()
              : initial;
          return [value, vi.fn()];
        },
      };
    });
  }

  const { ExerciseCatalog } = await import('../src/components/ExerciseCatalog');
  return renderToStaticMarkup(<ExerciseCatalog {...catalogProps} />);
}

describe('ExerciseCatalog characterization', () => {
  it('preserves the default catalog markup', async () => {
    expect(await renderCatalog()).toMatchSnapshot('catalog-default');
  });

  it('preserves AddExerciseModal markup with the catalog tab open', async () => {
    const { AddExerciseModal } = await import('../src/components/AddExerciseModal');
    const markup = renderToStaticMarkup(
      <AddExerciseModal
        isOpen
        onClose={vi.fn()}
        catalog={exercises}
        onAddExercise={vi.fn()}
      />,
    );
    expect(markup).toMatchSnapshot('add-exercise-modal-open');
  });

  it('preserves original preview and create/edit form modal markup', async () => {
    const modalStates = [
      ['preview', [false, null, exercises[0]]],
      ['create-form', [true, null, null]],
      ['edit-form', [true, exercises[0], null]],
    ] as const;

    for (const [name, state] of modalStates) {
      const markup = await renderCatalog('', 'Todos', [...state]);
      expect(markup).toMatchSnapshot(`catalog-${name}-original`);
    }
  });

  it('filters by case-insensitive name or notes and then by category', async () => {
    const notesMatch = await renderCatalog('ESCAPULAR', 'Todos');
    expect(notesMatch).toContain('id="catalog-card-def-press"');
    expect(notesMatch).not.toContain('id="catalog-card-def-row"');
    expect(notesMatch).not.toContain('id="catalog-card-def-squat"');

    const categoryMatch = await renderCatalog('remo', 'Espalda');
    expect(categoryMatch).toContain('id="catalog-card-def-row"');
    expect(categoryMatch).not.toContain('id="catalog-card-def-press"');
    expect(categoryMatch).not.toContain('id="catalog-card-def-squat"');
  });

  it('preserves shared catalog filtering semantics', () => {
    expect(filterExerciseCatalog(exercises, 'ESCAPULAR', 'Todos').map(({ id }) => id))
      .toEqual(['def-press']);
    expect(filterExerciseCatalog(exercises, 'remo', 'Espalda').map(({ id }) => id))
      .toEqual(['def-row']);
    expect(filterExerciseCatalog(exercises, '', 'Todos').map(({ id }) => id))
      .toEqual(['def-press', 'def-row', 'def-squat']);
    expect(filterExerciseCatalog(exercises, 'press', 'Espalda')).toEqual([]);
  });
});
