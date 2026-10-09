import React, { isValidElement, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Exercise } from '../src/types';

type StateSlot = { value: unknown; initialized: boolean };
type ElementProps = {
  children?: ReactNode;
  [key: string]: unknown;
};

function createStateHarness() {
  const slots: StateSlot[] = [];
  let cursor = 0;
  const harness = {
    render<T>(callback: () => T): T {
      cursor = 0;
      return callback();
    },
    useState<T>(initial: T | (() => T)): [T, (next: T | ((previous: T) => T)) => void] {
      const index = cursor++;
      const slot = (slots[index] ??= { value: undefined, initialized: false });
      if (!slot.initialized) {
        slot.value = typeof initial === 'function'
          ? (initial as () => T)()
          : initial;
        slot.initialized = true;
      }
      return [
        slot.value as T,
        (next) => {
          slot.value = typeof next === 'function'
            ? (next as (previous: T) => T)(slot.value as T)
            : next;
        },
      ];
    },
  };
  return harness;
}

function findElement(
  node: ReactNode,
  predicate: (element: React.ReactElement<ElementProps>) => boolean,
): React.ReactElement<ElementProps> | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = findElement(child, predicate);
      if (match) return match;
    }
    return undefined;
  }
  if (!isValidElement<ElementProps>(node)) return undefined;
  if (predicate(node)) return node;
  return findElement(node.props.children, predicate);
}

const exercise: Exercise = {
  id: 'exercise-1',
  definitionId: 'definition-1',
  name: 'Sentadilla',
  sets: [{ id: 'set-1', setNumber: 1, reps: 10, weight: 20, restSeconds: 60 }],
};

async function setupExerciseCard() {
  const harness = createStateHarness();
  vi.doMock('react', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react')>();
    return {
      ...actual,
      useState: (initial: unknown) => harness.useState(initial),
    };
  });
  const { ExerciseCard } = await import('../src/components/ExerciseCard');
  const onUpdateExercise = vi.fn();
  const onCheckRmWeight = vi.fn();
  const props = {
    exercise,
    exerciseIndex: 0,
    isExecutionMode: false,
    completedSetIds: new Set<string>(),
    onToggleSetComplete: vi.fn(),
    onUpdateExercise,
    onDeleteExercise: vi.fn(),
    onCheckRmWeight,
  };
  const render = () => harness.render(() => ExerciseCard(props));
  const findSetInput = (inputMode: string) =>
    findElement(
      render() as unknown as ReactNode,
      (element) =>
        element.type === 'input' &&
        element.props.inputMode === inputMode,
    ) as React.ReactElement<{
      value: number | string;
      min?: string;
      max?: string;
      onChange: (event: { target: { value: string } }) => void;
      onBlur: (event: { currentTarget: { value: string } }) => void;
    }>;

  return { findSetInput, onUpdateExercise, onCheckRmWeight };
}

afterEach(() => {
  vi.doUnmock('react');
  vi.resetModules();
  vi.restoreAllMocks();
});

describe('ExerciseCard set field edits', () => {
  it('keeps reps local while typing and commits the normalized number once on blur', async () => {
    const { findSetInput, onUpdateExercise } = await setupExerciseCard();
    const repsInput = findSetInput('numeric');

    expect(repsInput.props.min).toBe('1');
    expect(repsInput.props.max).toBe('999');
    repsInput.props.onChange({ target: { value: '25' } });
    expect(onUpdateExercise).not.toHaveBeenCalled();
    expect(findSetInput('numeric').props.value).toBe('25');

    findSetInput('numeric').props.onBlur({
      currentTarget: { value: '25' },
    });

    expect(onUpdateExercise).toHaveBeenCalledTimes(1);
    expect(onUpdateExercise).toHaveBeenCalledWith({
      ...exercise,
      sets: [{ ...exercise.sets[0], reps: 25 }],
    });
  });

  it('keeps weight local while typing and checks a changed positive RM value once', async () => {
    const { findSetInput, onUpdateExercise, onCheckRmWeight } =
      await setupExerciseCard();
    const weightInput = findSetInput('decimal');

    expect(weightInput.props.min).toBe('0');
    expect(weightInput.props.max).toBe('999');
    weightInput.props.onChange({ target: { value: '42.5' } });
    expect(onUpdateExercise).not.toHaveBeenCalled();
    expect(onCheckRmWeight).not.toHaveBeenCalled();
    expect(findSetInput('decimal').props.value).toBe('42.5');

    findSetInput('decimal').props.onBlur({
      currentTarget: { value: '42.5' },
    });

    expect(onUpdateExercise).toHaveBeenCalledTimes(1);
    expect(onUpdateExercise).toHaveBeenCalledWith({
      ...exercise,
      sets: [{ ...exercise.sets[0], weight: 42.5 }],
    });
    expect(onCheckRmWeight).toHaveBeenCalledExactlyOnceWith(
      'Sentadilla',
      42.5,
      'definition-1',
    );
  });

  it('preserves empty drafts and the existing minimum-value normalization on blur', async () => {
    const { findSetInput, onUpdateExercise, onCheckRmWeight } =
      await setupExerciseCard();
    findSetInput('numeric').props.onChange({ target: { value: '' } });
    expect(onUpdateExercise).not.toHaveBeenCalled();
    expect(findSetInput('numeric').props.value).toBe('');
    findSetInput('numeric').props.onBlur({ currentTarget: { value: '' } });

    expect(onUpdateExercise).toHaveBeenCalledExactlyOnceWith({
      ...exercise,
      sets: [{ ...exercise.sets[0], reps: 1 }],
    });

    onUpdateExercise.mockClear();
    findSetInput('decimal').props.onChange({ target: { value: '-2' } });
    expect(onUpdateExercise).not.toHaveBeenCalled();
    findSetInput('decimal').props.onBlur({ currentTarget: { value: '-2' } });
    expect(onUpdateExercise).toHaveBeenCalledExactlyOnceWith({
      ...exercise,
      sets: [{ ...exercise.sets[0], weight: 0 }],
    });
    expect(onCheckRmWeight).not.toHaveBeenCalled();
  });

  it('does not persist a draft that normalizes to the unchanged value', async () => {
    const { findSetInput, onUpdateExercise, onCheckRmWeight } =
      await setupExerciseCard();
    findSetInput('numeric').props.onChange({ target: { value: '10' } });
    findSetInput('numeric').props.onBlur({ currentTarget: { value: '10' } });
    findSetInput('decimal').props.onChange({ target: { value: '20' } });
    findSetInput('decimal').props.onBlur({ currentTarget: { value: '20' } });

    expect(onUpdateExercise).not.toHaveBeenCalled();
    expect(onCheckRmWeight).not.toHaveBeenCalled();
  });
});
