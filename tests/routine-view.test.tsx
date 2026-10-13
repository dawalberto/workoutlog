import React, { isValidElement, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Routine } from '../src/types';

function createHarness() {
  const slots: Array<{ value?: unknown; deps?: readonly unknown[]; cleanup?: () => void }> = [];
  let cursor = 0;
  const effects: Array<() => void> = [];
  return {
    render<T>(fn: () => T) { cursor = 0; const result = fn(); effects.splice(0).forEach((effect) => effect()); return result; },
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

type Props = { children?: ReactNode; [key: string]: unknown };
function find(node: ReactNode, id: string): React.ReactElement<Props> | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = find(child, id);
      if (match) return match;
    }
    return undefined;
  }
  if (!isValidElement<Props>(node)) return undefined;
  if (node.props.id === id) return node;
  if (typeof node.type === 'function') {
    const renderComponent = node.type as (props: Props) => ReactNode;
    return find(renderComponent(node.props), id);
  }
  return find(node.props.children, id);
}

async function setup() {
  const harness = createHarness();
  vi.doMock('react', async (original) => ({
    ...await original<typeof import('react')>(),
    useState: harness.useState, useRef: harness.useRef,
    useCallback: harness.useCallback, useEffect: harness.useEffect,
  }));
  vi.doMock('../src/hooks/useWorkoutTimer', () => ({ useWorkoutTimer: () => 0 }));
  const { RoutineView } = await import('../src/components/RoutineView');
  const routine: Routine = {
    id: 'routine', name: 'Routine', notes: 'Notes',
    createdAt: '2024-01-01', updatedAt: '2024-01-01',
    exercises: [{ id: 'exercise', name: 'Press', sets: [{ id: 'set', reps: 8, weight: 20, restSeconds: 60, setNumber: 1 }] }],
  };
  const props: React.ComponentProps<typeof RoutineView> = {
    routine, catalog: [], initialMode: 'edit', onSaveRoutine: vi.fn(), onSaveToCatalog: vi.fn(),
    onBack: vi.fn(), onStartSession: vi.fn(), onToggleSetComplete: vi.fn(),
    onResetSession: vi.fn(), onFinishSession: vi.fn(),
  };
  const scrollTo = vi.fn();
  const scrollIntoView = vi.fn();
  vi.stubGlobal('window', { scrollTo });
  vi.stubGlobal('document', { getElementById: vi.fn(() => ({ scrollIntoView })) });
  return { props, scrollTo, scrollIntoView, render: () => harness.render(() => RoutineView(props)) };
}

afterEach(() => { vi.doUnmock('react'); vi.doUnmock('../src/hooks/useWorkoutTimer'); vi.resetModules(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('RoutineView editing', () => {
  it.each(['name', 'notes'] as const)('commits %s on blur without overwriting external exercise changes', async (field) => {
    const { props, render } = await setup();
    const input = () => find(render() as ReactNode, `routine-${field}-input`)!;
    (input().props.onChange as (event: unknown) => void)({ target: { value: 'Draft' } });
    expect(props.onSaveRoutine).not.toHaveBeenCalled();
    props.routine = { ...props.routine, exercises: [] };
    expect(input().props.value).toBe('Draft');
    (input().props.onBlur as (event: unknown) => void)({ currentTarget: { value: 'Draft' } });
    expect(props.onSaveRoutine).toHaveBeenCalledExactlyOnceWith({
      ...props.routine, [field]: 'Draft', updatedAt: expect.any(String),
    });
    props.routine = { ...props.routine, [field]: 'Remote' };
    expect(input().props.value).toBe('Remote');
  });

  it('preserves scroll for edits but advances when completion changes the active exercise', async () => {
    vi.useFakeTimers();
    const { props, render, scrollTo, scrollIntoView } = await setup();
    props.routine = { ...props.routine, exercises: [
      ...props.routine.exercises,
      { id: 'next-exercise', name: 'Row', sets: [{ id: 'next-set', setNumber: 1, reps: 8, weight: 20, restSeconds: 60 }] },
    ] };
    render();
    expect(scrollTo).toHaveBeenCalledTimes(1);
    props.routine = { ...props.routine, exercises: props.routine.exercises.map((ex) => ({
      ...ex, sets: ex.sets.map((set) => ({ ...set, weight: 40 })),
    })) };
    render();
    expect(scrollTo).toHaveBeenCalledTimes(1);
    props.session = { routineId: 'routine', startTime: 1700000000000, completedSetIds: [] };
    render();
    await vi.runAllTimersAsync();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    props.routine = { ...props.routine, notes: 'Changed' };
    props.onSaveRoutine = vi.fn();
    render();
    await vi.runAllTimersAsync();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    props.session = { ...props.session, completedSetIds: ['set'] };
    render();
    await vi.runAllTimersAsync();
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
    expect(document.getElementById).toHaveBeenLastCalledWith('exercise-card-next-exercise');
  });
});
