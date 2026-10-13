import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Routine } from '../src/types';

function createHarness() {
  const slots: Array<{ value?: unknown; deps?: readonly unknown[]; cleanup?: () => void }> = [];
  let cursor = 0;
  const effects: Array<() => void> = [];
  return {
    render<T>(fn: () => T) {
      cursor = 0;
      const result = fn();
      effects.splice(0).forEach((effect) => effect());
      return result;
    },
    useState(initial: unknown) {
      const index = cursor++;
      if (!slots[index]) slots[index] = { value: typeof initial === 'function' ? initial() : initial };
      return [slots[index]!.value, (next: unknown) => {
        slots[index]!.value = typeof next === 'function' ? next(slots[index]!.value) : next;
      }];
    },
    useRef(initial: unknown) {
      const index = cursor++;
      return (slots[index] ??= { value: { current: initial } }).value;
    },
    useCallback(fn: unknown, deps: readonly unknown[]) {
      const index = cursor++;
      const slot = slots[index];
      if (!slot || deps.some((dep, i) => !Object.is(dep, slot.deps?.[i]))) slots[index] = { value: fn, deps };
      return slots[index]!.value;
    },
    useEffect(fn: () => void | (() => void), deps: readonly unknown[]) {
      const index = cursor++;
      const slot = slots[index];
      if (!slot || deps.some((dep, i) => !Object.is(dep, slot.deps?.[i]))) {
        slots[index] = { deps };
        effects.push(() => { slot?.cleanup?.(); slots[index]!.cleanup = fn() || undefined; });
      }
    },
  };
}

async function setup() {
  const harness = createHarness();
  vi.doMock('react', async (original) => ({
    ...await original<typeof import('react')>(),
    useState: harness.useState,
    useRef: harness.useRef,
    useCallback: harness.useCallback,
    useEffect: harness.useEffect,
  }));
  vi.doMock('../src/hooks/useWorkoutTimer', () => ({ useWorkoutTimer: () => 0 }));
  const routine: Routine = {
    id: 'routine', name: 'Routine', notes: 'Notes',
    createdAt: '2024-01-01', updatedAt: '2024-01-01',
    exercises: [{ id: 'exercise', name: 'Press', sets: [{ id: 'set', reps: 8, weight: 20, restSeconds: 60, setNumber: 1 }] }],
  };
  const saveRoutine = vi.fn();
  const storeState = {
    routines: [routine],
    activeRoutineId: routine.id,
    routineSubMode: 'edit',
    activeSessions: {} as Record<string, { routineId: string; startTime: number; completedSetIds: string[] }>,
    activeRestTimer: null,
    saveRoutine,
    selectRoutine: vi.fn(),
  };
  vi.doMock('../src/store/appStore', () => ({
    useAppStore: (selector: (state: typeof storeState) => unknown) => selector(storeState),
  }));
  const { useRoutineViewState } = await import('../src/hooks/useRoutineViewState');
  const scrollTo = vi.fn();
  const scrollIntoView = vi.fn();
  vi.stubGlobal('window', { scrollTo });
  vi.stubGlobal('document', { getElementById: vi.fn(() => ({ scrollIntoView })) });
  let viewState: ReturnType<typeof useRoutineViewState>;
  const render = () => harness.render(() => {
    viewState = useRoutineViewState();
    return viewState;
  });
  return { storeState, saveRoutine, scrollTo, scrollIntoView, render, get viewState() { return viewState!; } };
}

afterEach(() => {
  vi.doUnmock('react');
  vi.doUnmock('../src/store/appStore');
  vi.doUnmock('../src/hooks/useWorkoutTimer');
  vi.resetModules();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('RoutineView editing', () => {
  it.each(['name', 'notes'] as const)('commits %s on blur without overwriting external exercise changes', async (field) => {
    const { storeState, saveRoutine, render } = await setup();
    let viewState = render();
    const fieldProps = () => viewState.routineFieldProps(field)!;
    (fieldProps().onChange as (event: unknown) => void)({ target: { value: 'Draft' } });
    expect(saveRoutine).not.toHaveBeenCalled();
    storeState.routines[0] = { ...storeState.routines[0]!, exercises: [] };
    viewState = render();
    expect(fieldProps().value).toBe('Draft');
    (fieldProps().onBlur as (event: unknown) => void)({ currentTarget: { value: 'Draft' } });
    expect(saveRoutine).toHaveBeenCalledExactlyOnceWith({
      ...storeState.routines[0], [field]: 'Draft', updatedAt: expect.any(String),
    });
    storeState.routines[0] = { ...storeState.routines[0]!, [field]: 'Remote' };
    viewState = render();
    expect(fieldProps().value).toBe('Remote');
  });

  it('preserves scroll for edits but advances when completion changes the active exercise', async () => {
    vi.useFakeTimers();
    const { storeState, render, scrollTo, scrollIntoView } = await setup();
    storeState.routines[0] = {
      ...storeState.routines[0]!,
      exercises: [
        ...storeState.routines[0]!.exercises,
        { id: 'next-exercise', name: 'Row', sets: [{ id: 'next-set', setNumber: 1, reps: 8, weight: 20, restSeconds: 60 }] },
      ],
    };
    render();
    expect(scrollTo).toHaveBeenCalledTimes(1);
    storeState.routines[0] = { ...storeState.routines[0]!, exercises: storeState.routines[0]!.exercises.map((ex) => ({
      ...ex, sets: ex.sets.map((set) => ({ ...set, weight: 40 })),
    })) };
    render();
    expect(scrollTo).toHaveBeenCalledTimes(1);
    storeState.activeSessions.routine = { routineId: 'routine', startTime: 1700000000000, completedSetIds: [] };
    render();
    await vi.runAllTimersAsync();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    storeState.routines[0] = { ...storeState.routines[0]!, notes: 'Changed' };
    render();
    await vi.runAllTimersAsync();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    storeState.activeSessions.routine = { ...storeState.activeSessions.routine!, completedSetIds: ['set'] };
    render();
    await vi.runAllTimersAsync();
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
    expect(document.getElementById).toHaveBeenLastCalledWith('exercise-card-next-exercise');
  });
});
