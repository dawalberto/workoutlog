import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExerciseDefinition, ExerciseDiary } from '../src/types';
import {
  formatDiaryDateDisplay,
  findDiaryForExercise,
  getAllFlattenedDiaryEntries,
  getDiaryEntriesCount,
  getTotalDiaryEntriesCount,
} from '../src/utils/diaryCalculations';

const catalog: ExerciseDefinition[] = [
  {
    id: 'exercise-press',
    name: 'Press de Banca',
    category: 'Pecho',
  },
  {
    id: 'exercise-squat',
    name: 'Sentadilla',
    category: 'Pierna',
  },
];

const diaries: ExerciseDiary[] = [
  {
    id: 'diary-press',
    exerciseId: 'exercise-press',
    exerciseName: 'Press de Banca',
    category: 'Pecho',
    entries: [
      {
        id: 'entry-today',
        date: '2026-01-15',
        note: 'Sesión de hoy',
        feeling: 'good',
        createdAt: '2026-01-15T10:00:00.000Z',
        updatedAt: '2026-01-15T10:00:00.000Z',
      },
      {
        id: 'entry-yesterday',
        date: '2026-01-14',
        note: 'Sesión de ayer',
        feeling: 'neutral',
        createdAt: '2026-01-14T10:00:00.000Z',
        updatedAt: '2026-01-14T10:00:00.000Z',
      },
    ],
    createdAt: '2026-01-14T10:00:00.000Z',
    updatedAt: '2026-01-15T10:00:00.000Z',
  },
  {
    id: 'diary-squat',
    exerciseId: 'exercise-squat',
    exerciseName: 'Sentadilla',
    category: 'Pierna',
    entries: [
      {
        id: 'entry-invalid-date',
        date: 'not-a-date',
        note: 'Fecha no válida',
        feeling: 'bad',
        createdAt: '2026-01-13T10:00:00.000Z',
        updatedAt: '2026-01-13T10:00:00.000Z',
      },
    ],
    createdAt: '2026-01-13T10:00:00.000Z',
    updatedAt: '2026-01-13T10:00:00.000Z',
  },
];

const diaryProps = {
  catalog,
  diaries,
  onSaveDiaries: vi.fn(),
  onGoToCatalog: vi.fn(),
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 0, 15, 12));
});

afterEach(() => {
  vi.useRealTimers();
  vi.doUnmock('react');
  vi.resetModules();
});

async function renderDiary(stateValues?: unknown[]) {
  vi.doUnmock('react');
  vi.resetModules();

  if (stateValues) {
    let stateIndex = 0;
    vi.doMock('react', async (importOriginal) => {
      const actual = await importOriginal<typeof import('react')>();
      return {
        ...actual,
        useState: (initial: unknown) => {
          const index = stateIndex++;
          const value = stateValues[index];
          return [
            value === undefined
              ? typeof initial === 'function'
                ? (initial as () => unknown)()
                : initial
              : value,
            vi.fn(),
          ];
        },
      };
    });
  }

  const { ExerciseDiaryView } = await import('../src/components/ExerciseDiaryView');
  return renderToStaticMarkup(<ExerciseDiaryView {...diaryProps} />);
}

describe('ExerciseDiaryView characterization', () => {
  it('preserves the default diary markup and date labels', async () => {
    const markup = await renderDiary();

    expect(markup).toMatchSnapshot('diary-default');
    expect(markup).toContain('>Hoy</span>');
    expect(markup).toContain('>Ayer</span>');
    expect(markup).toContain('not-a-date');
  });

  it('preserves filtered diary markup', async () => {
    const markup = await renderDiary([undefined, 'press']);
    expect(markup).toMatchSnapshot('diary-filtered');
  });

  it('preserves create modal markup', async () => {
    const markup = await renderDiary([
      undefined,
      '',
      'ALL',
      true,
      null,
      'Press de Banca',
      '2026-01-15',
      'Nota de prueba',
      'good',
      null,
    ]);
    expect(markup).toMatchSnapshot('diary-modal-open');
  });
});

describe('diaryCalculations', () => {
  it('formats today and yesterday labels and preserves invalid dates', () => {
    expect(formatDiaryDateDisplay('2026-01-15')).toEqual({
      formatted: new Date(2026, 0, 15).toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).replace(/^./, (letter) => letter.toUpperCase()),
      tag: 'Hoy',
    });
    expect(formatDiaryDateDisplay('2026-01-14').tag).toBe('Ayer');
    expect(formatDiaryDateDisplay('not-a-date')).toEqual({
      formatted: 'not-a-date',
      tag: null,
    });
  });

  it('finds diaries by exercise ID and normalized name', () => {
    expect(findDiaryForExercise(diaries, 'Otro nombre', 'exercise-press')?.id).toBe('diary-press');
    expect(findDiaryForExercise(diaries, '  PRESS DE BANCA  ')?.id).toBe('diary-press');
    expect(findDiaryForExercise(diaries, 'Ejercicio inexistente')).toBeUndefined();
  });

  it('counts entries and sorts flattened entries by date', () => {
    expect(getDiaryEntriesCount(diaries, 'Press de Banca', 'exercise-press')).toBe(2);
    expect(getTotalDiaryEntriesCount(diaries)).toBe(3);
    expect(getAllFlattenedDiaryEntries(diaries).map(({ id }) => id)).toEqual([
      'entry-today',
      'entry-yesterday',
      'entry-invalid-date',
    ]);
  });
});
