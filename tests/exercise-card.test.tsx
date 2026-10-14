import React, { isValidElement, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Exercise, Routine } from '../src/types';

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
  let currentExercise = exercise;
  const onUpdateExercise = vi.fn();
  const onCheckRmWeight = vi.fn();
  vi.doMock('react', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react')>();
    return {
      ...actual,
      useState: (initial: unknown) => harness.useState(initial),
      useMemo: (factory: () => unknown) => factory(),
    };
  });
  const storeState = {
    routines: [{
      id: 'routine',
      name: 'Rutina',
      exercises: [currentExercise],
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    }],
    activeRoutineId: 'routine',
    activeSessions: {},
    routineSubMode: 'edit',
    rmLogs: [],
    exerciseDiary: [],
    saveRoutine: vi.fn((routine: Routine) => {
      storeState.routines = [routine];
      currentExercise = routine.exercises[0];
      onUpdateExercise(currentExercise);
    }),
    checkRmWeight: onCheckRmWeight,
    openExerciseDiary: vi.fn(),
  };
  vi.doMock('../src/store/appStore', () => ({
    useAppStore: (selector: (state: typeof storeState) => unknown) => selector(storeState),
  }));
  const { ExerciseCard } = await import('../src/components/ExerciseCard');
  const props: React.ComponentProps<typeof ExerciseCard> = {
    exerciseId: exercise.id,
    onToggleSetComplete: vi.fn(),
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

  return {
    findSetInput,
    onUpdateExercise,
    onCheckRmWeight,
    render,
    props,
    setExercise: (updated: Exercise) => {
      currentExercise = updated;
      storeState.routines = storeState.routines.map((routine) => ({
        ...routine,
        exercises: [updated],
      }));
    },
  };
}

afterEach(() => {
  vi.doUnmock('react');
  vi.doUnmock('../src/store/appStore');
  vi.resetModules();
  vi.restoreAllMocks();
});

describe('ExerciseCard set field edits', () => {
  it.each(['name', 'notes', 'imageUrl', 'videoUrl'] as const)(
    'drafts %s until blur and merges the latest external exercise data',
    async (field) => {
      const { render, setExercise, onUpdateExercise } = await setupExerciseCard();
      if (field === 'imageUrl' || field === 'videoUrl') {
        const title = field === 'imageUrl' ? 'Configurar imagen miniatura / preview' : 'Configurar enlace de video';
        const button = findElement(render() as ReactNode, (element) => element.props.title === title);
        (button!.props.onClick as () => void)();
      }
      const placeholder = {
        name: 'Nombre del ejercicio (ej. Press banca, Sentadilla...)',
        notes: 'Notas de técnica o consejos (opcional)',
        imageUrl: 'URL de imagen preview (https://...)',
        videoUrl: 'Enlace de video (YouTube, Vimeo, mp4)...',
      }[field];
      const input = () => findElement(render() as ReactNode, (element) =>
        element.type === 'input' && (element.props.placeholder === placeholder ||
          (field === 'imageUrl' && element.props.type === 'url' && String(element.props.placeholder).includes('imagen')) ||
          (field === 'videoUrl' && element.props.type === 'url' && String(element.props.placeholder).includes('youtube'))),
      )!;
      expect(input()).toBeDefined();
      (input().props.onChange as (e: unknown) => void)({ target: { value: 'Draft' } });
      expect(onUpdateExercise).not.toHaveBeenCalled();
      setExercise({ ...exercise, category: 'External category' });
      expect(input().props.value).toBe('Draft');
      (input().props.onBlur as (e: unknown) => void)({ currentTarget: { value: 'Draft' } });
      expect(onUpdateExercise).toHaveBeenCalledExactlyOnceWith({
        ...{ ...exercise, category: 'External category' },
        [field]: 'Draft',
      });
      setExercise({ ...exercise, category: 'External category', [field]: 'Remote value' });
      expect(input().props.value).toBe('Remote value');
    },
  );
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
    const { findSetInput, onUpdateExercise, onCheckRmWeight, setExercise } =
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
    setExercise(exercise);
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
