import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Routine } from '../src/types';
import type { AppState } from '../src/store/appStore';
import { RoutineView } from '../src/components/RoutineView';
import { appStore } from '../src/store/appStore';
import {
  resetAppStore,
  seedAppStore,
  useCurrentStateAsServerSnapshot,
} from './store-test-utils';

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

beforeEach(() => {
  resetAppStore();
  seedAppStore({
    routines: [routine],
    activeRoutineId: routine.id,
    routineSubMode: 'edit',
    catalog: [],
    rmLogs: [],
    exerciseDiary: [],
    activeSessions: {},
    openExerciseDiary: undefined as unknown as AppState['openExerciseDiary'],
  });
  useCurrentStateAsServerSnapshot();
});

afterEach(() => {
  resetAppStore();
});

describe('RoutineView characterization', () => {
  it('preserves edit mode markup', () => {
    expect(renderToStaticMarkup(<RoutineView />))
      .toMatchSnapshot('routine-edit');
  });

  it('preserves active-workout markup with partial progress', () => {
    seedAppStore({
      routineSubMode: 'execute',
      activeSessions: {
        [routine.id]: {
          routineId: routine.id,
          startTime: 1767225600000,
          completedSetIds: ['press-set-1'],
        },
      },
    });

    expect(renderToStaticMarkup(<RoutineView />))
      .toMatchSnapshot('routine-active-workout-partial-progress');
  });
});
