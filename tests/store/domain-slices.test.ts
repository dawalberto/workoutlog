import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAppStore } from '../../src/store/appStore';
import type { BackupImportSummary } from '../../src/utils/backup';
import {
  selectActiveRoutine,
  selectInProgressRoutine,
  selectInProgressSessionEntry,
} from '../../src/store/selectors';
import type {
  ExerciseDefinition,
  ExerciseDiary,
  ExerciseRmLog,
  Routine,
  WorkoutCompletionSummary,
} from '../../src/types';

function createRoutine(id: string, name = 'Rutina'): Routine {
  return {
    id,
    name,
    exercises: [{
      id: `${id}-exercise`,
      name: 'Sentadilla',
      sets: [{
        id: `${id}-set`,
        setNumber: 1,
        reps: 8,
        weight: 40,
        restSeconds: 60,
      }],
    }],
    createdAt: '2026-10-13T00:00:00.000Z',
    updatedAt: '2026-10-13T00:00:00.000Z',
  };
}

function createSummary(routineId = 'routine-1'): WorkoutCompletionSummary {
  return {
    routineId,
    routineName: 'Rutina',
    startTime: 1_000,
    endTime: 2_000,
    durationSeconds: 1,
    completedSetsCount: 1,
    totalSetsCount: 1,
    completionPercentage: 100,
    exercisesSummary: [{ name: 'Sentadilla', completedSets: 1, totalSets: 1 }],
  };
}

function createRestTimer() {
  return {
    routineId: 'routine-1',
    initialSeconds: 60,
    targetEndTime: Date.now() + 60_000,
    exerciseName: 'Sentadilla',
    setNumber: 1,
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('routine store slice', () => {
  it('creates, selects, saves, and closes routines', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-13T12:00:00.000Z'));
    const store = createAppStore();

    store.getState().createRoutine();
    expect(store.getState().routines[0]).toMatchObject({
      id: `routine-${Date.now()}`,
      name: 'Nueva Rutina 1',
      exercises: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    expect(store.getState()).toMatchObject({
      activeRoutineId: `routine-${Date.now()}`,
      routineSubMode: 'edit',
    });
    expect(selectActiveRoutine(store.getState())).toEqual(store.getState().routines[0]);

    store.getState().selectRoutine('routine-selected', 'execute');
    expect(store.getState()).toMatchObject({
      activeRoutineId: 'routine-selected',
      routineSubMode: 'execute',
    });
    store.getState().closeRoutine();
    expect(store.getState().activeRoutineId).toBeNull();

    const updated = createRoutine('routine-saved', 'Saved');
    store.setState({ routines: [updated] });
    store.getState().saveRoutine({ ...updated, name: 'Updated' });
    expect(store.getState().routines[0].name).toBe('Updated');
  });

  it('enforces guest limits while allowing synced users to create and duplicate', () => {
    const store = createAppStore();
    const notify = vi.fn();
    store.setState({
      routines: [createRoutine('one'), createRoutine('two'), createRoutine('three')],
    });
    store.setState({ notify });

    store.getState().createRoutine();
    store.getState().duplicateRoutine('one');
    expect(store.getState().routines).toHaveLength(3);
    expect(notify).toHaveBeenCalledTimes(2);
    expect(notify).toHaveBeenCalledWith(
      'Sin sesión iniciada puedes tener como máximo tres rutinas. Elimina una rutina o inicia sesión para añadir o importar más.',
    );

    store.setState({ isSyncEnabled: true });
    store.getState().createRoutine();
    store.getState().duplicateRoutine('one');
    expect(store.getState().routines).toHaveLength(5);
  });

  it('duplicates routines with newly generated exercise and set ids', () => {
    const store = createAppStore();
    store.setState({ routines: [createRoutine('routine-1', 'Piernas')] });

    store.getState().duplicateRoutine('routine-1');

    const [duplicate, source] = store.getState().routines;
    expect(duplicate.name).toBe('Piernas (Copia)');
    expect(duplicate.id).not.toBe(source.id);
    expect(duplicate.exercises[0].id).not.toBe(source.exercises[0].id);
    expect(duplicate.exercises[0].sets[0].id).not.toBe(source.exercises[0].sets[0].id);
    expect(source).toEqual(createRoutine('routine-1', 'Piernas'));
  });

  it('confirms routine deletion, closes its session and timer, and leaves cancellation intact', () => {
    const confirm = vi.fn(() => false);
    vi.stubGlobal('window', { confirm });
    const store = createAppStore();
    store.setState({
      routines: [createRoutine('routine-1')],
      activeSessions: { 'routine-1': { routineId: 'routine-1', startTime: 1, completedSetIds: [] } },
      activeRoutineId: 'routine-1',
      activeRestTimer: createRestTimer(),
    });

    store.getState().deleteRoutine('routine-1');
    expect(store.getState().routines).toHaveLength(1);
    expect(store.getState().activeSessions['routine-1']).toBeDefined();

    confirm.mockReturnValue(true);
    store.getState().deleteRoutine('routine-1');
    expect(store.getState()).toMatchObject({
      routines: [],
      activeSessions: {},
      activeRoutineId: null,
      activeRestTimer: null,
    });
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  it('creates or replaces catalog entries and updates matching routine exercises', () => {
    const store = createAppStore();
    const notify = vi.fn();
    const routine = createRoutine('routine-1');
    const rmLog: ExerciseRmLog = {
      id: 'rm-log-1',
      exerciseId: 'definition-1',
      exerciseName: 'Sentadilla',
      category: 'Piernas',
      records: [{ id: 'rm-rec-1', weight: 100, date: '2026-01-01' }],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const diary: ExerciseDiary = {
      id: 'diary-1',
      exerciseId: 'definition-1',
      exerciseName: 'Sentadilla',
      category: 'Piernas',
      entries: [{ id: 'entry-1', date: '2026-01-01', note: 'Buena técnica' }],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    store.setState({
      catalog: [{ id: 'definition-1', name: 'Sentadilla' }],
      routines: [routine],
      rmLogs: [rmLog],
      exerciseDiary: [diary],
    });
    store.setState({ notify });
    const definition: ExerciseDefinition = {
      id: 'definition-1',
      name: 'Sentadilla frontal',
      category: 'Piernas',
      imageUrl: 'front.png',
      videoUrl: 'front.mp4',
      notes: 'Controlada',
    };
    const newDefinition: ExerciseDefinition = {
      id: 'definition-2',
      name: 'Press banca',
    };

    store.getState().createCatalogExercise(newDefinition);
    expect(store.getState().analyticsEvent).toEqual({
      sequence: 1,
      name: 'exercise_create',
      params: {},
    });
    store.getState().createCatalogExercise({ ...newDefinition, notes: 'Reemplazada' });
    expect(store.getState().catalog).toEqual([
      { ...newDefinition, notes: 'Reemplazada' },
      { id: 'definition-1', name: 'Sentadilla' },
    ]);

    store.getState().updateCatalogExercise(definition);
    expect(store.getState().routines[0].exercises[0]).toMatchObject({
      definitionId: 'definition-1',
      name: 'Sentadilla frontal',
      category: 'Piernas',
      imageUrl: 'front.png',
      videoUrl: 'front.mp4',
      notes: 'Controlada',
    });
    expect(store.getState().rmLogs[0]).toMatchObject({
      exerciseId: 'definition-1',
      exerciseName: 'Sentadilla frontal',
      category: 'Piernas',
    });
    expect(store.getState().exerciseDiary[0]).toMatchObject({
      exerciseId: 'definition-1',
      exerciseName: 'Sentadilla frontal',
      category: 'Piernas',
    });
    expect(notify).toHaveBeenCalledWith(
      '"Sentadilla frontal" actualizado en biblioteca y en 1 rutina',
    );

    store.getState().deleteCatalogExercise('definition-2');
    expect(store.getState().catalog).toEqual([definition]);
  });
});

describe('workout store slice', () => {
  it('starts sessions, toggles completed sets, and selects off-screen progress', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-13T12:00:00.000Z'));
    const store = createAppStore();
    const routine = createRoutine('routine-1');
    store.setState({ routines: [routine] });

    store.getState().startSession('routine-1');
    expect(store.getState().activeSessions['routine-1']).toEqual({
      routineId: 'routine-1',
      startTime: Date.now(),
      completedSetIds: [],
    });
    store.getState().toggleSetComplete('routine-1', 'routine-1-set');
    expect(store.getState().activeSessions['routine-1'].completedSetIds).toEqual([
      'routine-1-set',
    ]);
    store.getState().toggleSetComplete('routine-1', 'routine-1-set');
    expect(store.getState().activeSessions['routine-1'].completedSetIds).toEqual([]);

    expect(selectInProgressSessionEntry(store.getState())).toEqual(
      store.getState().activeSessions['routine-1'],
    );
    expect(selectInProgressRoutine(store.getState())).toEqual(routine);
    store.setState({ activeRoutineId: 'routine-1' });
    expect(selectInProgressSessionEntry(store.getState())).toBeUndefined();
    expect(selectInProgressRoutine(store.getState())).toBeNull();
  });

  it('resets sessions and closes the rest timer', () => {
    const store = createAppStore();
    store.setState({
      activeSessions: { 'routine-1': { routineId: 'routine-1', startTime: 1, completedSetIds: [] } },
      activeRestTimer: createRestTimer(),
    });

    store.getState().resetSession('routine-1');
    expect(store.getState().activeSessions).toEqual({});
    expect(store.getState().activeRestTimer).toBeNull();
  });

  it('finishes workouts into history with generated ids and closes the timer', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-13T12:00:00.000Z'));
    const store = createAppStore();
    const summary = createSummary();
    store.setState({
      activeSessions: { 'routine-1': { routineId: 'routine-1', startTime: 1, completedSetIds: [] } },
      activeRestTimer: createRestTimer(),
    });

    store.getState().finishSession(summary);

    expect(store.getState()).toMatchObject({
      activeSessions: {},
      workoutSummary: summary,
      activeRestTimer: null,
    });
    expect(store.getState().workoutHistory[0]).toMatchObject({
      ...summary,
      id: expect.stringMatching(/^workout-log-/),
      completedAt: new Date(summary.endTime).toISOString(),
    });
    store.getState().dismissWorkoutSummary();
    expect(store.getState().workoutSummary).toBeNull();
    store.getState().deleteHistoryLog(store.getState().workoutHistory[0].id);
    expect(store.getState().workoutHistory).toEqual([]);
  });
});

describe('RM store slice', () => {
  it('detects only new records above the latest RM and confirms or dismisses the alert', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-13T12:00:00.000Z'));
    const store = createAppStore();
    const rmLog: ExerciseRmLog = {
      id: 'rm-1',
      exerciseName: 'Sentadilla',
      records: [{ id: 'record-1', weight: 80, date: '2026-10-01' }],
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    };
    store.setState({ rmLogs: [rmLog] });

    store.getState().checkRmWeight('Sentadilla', 80);
    expect(store.getState().pendingRmAlert).toBeNull();
    store.getState().checkRmWeight('Sentadilla', 90);
    expect(store.getState().pendingRmAlert).toMatchObject({
      logId: 'rm-1',
      exerciseName: 'Sentadilla',
      newWeight: 90,
      previousRmWeight: 80,
      previousRmDate: '2026-10-01',
    });

    store.getState().checkRmWeight('Sentadilla', 100);
    expect(store.getState().pendingRmAlert?.newWeight).toBe(90);
    store.getState().confirmRmAlert(true);
    expect(store.getState().pendingRmAlert).toBeNull();
    expect(store.getState().rmLogs[0].records[0]).toMatchObject({
      weight: 90,
      date: '2026-10-13',
      notes: 'Superado en rutina / ejercicio',
    });
    expect(store.getState().feedbackMessage).toBe(
      '🏆 ¡Nuevo RM de 90 kg registrado en Sentadilla!',
    );

    store.getState().checkRmWeight('Sentadilla', 95);
    store.getState().dismissRmAlert();
    expect(store.getState().pendingRmAlert).toBeNull();
    expect(store.getState().rmLogs[0].records).toHaveLength(2);
  });

  it('does not alert when the exercise has no matching RM log', () => {
    const store = createAppStore();
    store.getState().checkRmWeight('Press banca', 100);
    expect(store.getState().pendingRmAlert).toBeNull();
  });
});

describe('backup import store action', () => {
  const summary: BackupImportSummary = {
    exercisesAdded: 1,
    exercisesReplaced: 0,
    routinesAdded: 1,
    mode: 'merge',
  };

  it('replaces imported data and reports the pure summary message', () => {
    const store = createAppStore();
    const imported = {
      catalog: [{ id: 'definition-1', name: 'Sentadilla' }],
      routines: [createRoutine('routine-1')],
      rmLogs: [],
      workoutHistory: [],
      exerciseDiary: [],
    };
    store.setState({
      catalog: [{ id: 'old-definition', name: 'Press banca' }],
      routines: [createRoutine('old-routine')],
      isSyncEnabled: true,
    });

    store.getState().importBackup(imported, summary);

    expect(store.getState()).toMatchObject(imported);
    expect(store.getState().feedbackMessage).toBe(
      'Importación completada: 1 ejerc. añadidos, 1 rutinas añadidas.',
    );
  });

  it('rejects a guest import over the routine limit without mutating data', () => {
    const store = createAppStore();
    const notify = vi.fn();
    store.setState({
      routines: [createRoutine('existing-1'), createRoutine('existing-2')],
      catalog: [{ id: 'existing-definition', name: 'Sentadilla' }],
      notify,
    });
    const rejectedData = {
      catalog: [{ id: 'new-definition', name: 'Press banca' }],
      routines: [
        createRoutine('imported-1'),
        createRoutine('imported-2'),
        createRoutine('imported-3'),
        createRoutine('imported-4'),
      ],
      rmLogs: [],
      workoutHistory: [],
      exerciseDiary: [],
    };

    store.getState().importBackup(rejectedData, summary);

    expect(store.getState().routines.map(({ id }) => id)).toEqual([
      'existing-1',
      'existing-2',
    ]);
    expect(store.getState().catalog).toEqual([
      { id: 'existing-definition', name: 'Sentadilla' },
    ]);
    expect(notify).toHaveBeenCalledWith(
      'Sin sesión iniciada puedes tener como máximo tres rutinas. Elimina una rutina o inicia sesión para añadir o importar más.',
    );
  });
});
