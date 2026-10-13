import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { Routine } from '../src/types';

vi.mock('../src/hooks/useWorkoutTimer', () => ({ useWorkoutTimer: () => 123 }));

const routine: Routine = {
  id: 'routine',
  name: 'Rutina de prueba',
  notes: 'Objetivo de fuerza',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  exercises: [
    {
      id: 'exercise-press',
      name: 'Press de Banca',
      category: 'Pecho',
      notes: 'Controlar el descenso',
      sets: [
        { id: 'press-set-1', setNumber: 1, reps: 8, weight: 60, restSeconds: 90 },
        { id: 'press-set-2', setNumber: 2, reps: 8, weight: 60, restSeconds: 90 },
      ],
    },
    {
      id: 'exercise-row',
      name: 'Remo con Barra',
      category: 'Espalda',
      sets: [
        { id: 'row-set-1', setNumber: 1, reps: 10, weight: 45, restSeconds: 75 },
        { id: 'row-set-2', setNumber: 2, reps: 10, weight: 45, restSeconds: 75 },
      ],
    },
  ],
};

const baseProps = {
  routine,
  catalog: [],
  rmLogs: [],
  exerciseDiary: [],
  onSaveRoutine: vi.fn(),
  onSaveToCatalog: vi.fn(),
  onBack: vi.fn(),
  onStartSession: vi.fn(),
  onToggleSetComplete: vi.fn(),
  onResetSession: vi.fn(),
  onFinishSession: vi.fn(),
};

describe('RoutineView characterization', () => {
  it('preserves edit mode markup', async () => {
    const { RoutineView } = await import('../src/components/RoutineView');
    expect(renderToStaticMarkup(<RoutineView {...baseProps} initialMode="edit" />))
      .toMatchSnapshot('routine-edit');
  });

  it('preserves active-workout markup with partial progress', async () => {
    const { RoutineView } = await import('../src/components/RoutineView');
    expect(renderToStaticMarkup(
      <RoutineView
        {...baseProps}
        initialMode="execute"
        session={{ routineId: routine.id, startTime: 1767225600000, completedSetIds: ['press-set-1'] }}
      />,
    )).toMatchSnapshot('routine-active-workout-partial-progress');
  });
});
