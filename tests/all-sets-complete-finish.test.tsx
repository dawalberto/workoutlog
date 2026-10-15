import React, { isValidElement, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Routine } from '../src/types';
import { AllSetsCompleteFinishModal } from '../src/components/AllSetsCompleteFinishModal';
import { shouldPromptForAllSetsComplete } from '../src/utils/routineCompletion';

type ElementProps = {
  children?: ReactNode;
  [key: string]: unknown;
};

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

function createHarness() {
  const slots: Array<{ value?: unknown; deps?: readonly unknown[]; cleanup?: () => void }> = [];
  let cursor = 0;
  const effects: Array<() => void> = [];
  return {
    render<T>(callback: () => T) {
      cursor = 0;
      const result = callback();
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
    useEffect(effect: () => void | (() => void), deps: readonly unknown[]) {
      const index = cursor++;
      const slot = slots[index];
      if (!slot || deps.some((dependency, depIndex) => !Object.is(dependency, slot.deps?.[depIndex]))) {
        slots[index] = { deps };
        effects.push(() => {
          slot?.cleanup?.();
          slots[index]!.cleanup = effect() || undefined;
        });
      }
    },
  };
}

async function setupProgressPanel() {
  const harness = createHarness();
  vi.doMock('react', async (importOriginal) => ({
    ...await importOriginal<typeof import('react')>(),
    useState: harness.useState,
    useRef: harness.useRef,
    useEffect: harness.useEffect,
  }));
  const routine: Routine = {
    id: 'routine',
    name: 'Rutina',
    notes: '',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    exercises: [],
  };
  const progress = {
    routine,
    session: { routineId: 'routine', startTime: 1, completedSetIds: [] },
    completedSetsCount: 1,
    totalSetsCount: 2,
    completionPercentage: 50,
    onStartSession: vi.fn(),
    onResetSession: vi.fn(),
    onConfirmFinish: vi.fn(),
  };
  vi.doMock('../src/hooks/routine/useWorkoutProgressPanel', () => ({
    useWorkoutProgressPanel: () => progress,
  }));
  const { WorkoutProgressPanel } = await import('../src/components/routine/WorkoutProgressPanel');
  const render = () =>
    harness.render(() => WorkoutProgressPanel({ elapsedSeconds: 60 }) as ReactNode);
  return { progress, render };
}

afterEach(() => {
  vi.doUnmock('react');
  vi.doUnmock('../src/hooks/routine/useWorkoutProgressPanel');
  vi.resetModules();
  vi.restoreAllMocks();
});

describe('all-sets-complete finish prompt', () => {
  it('prompts only on a positive completion transition during an active session', () => {
    expect(shouldPromptForAllSetsComplete(false, 2, 2, true)).toBe(true);
    expect(shouldPromptForAllSetsComplete(true, 2, 2, true)).toBe(false);
    expect(shouldPromptForAllSetsComplete(false, 0, 0, true)).toBe(false);
    expect(shouldPromptForAllSetsComplete(false, 2, 2, false)).toBe(false);
    expect(shouldPromptForAllSetsComplete(false, 1, 2, true)).toBe(false);
  });

  it('does not reopen after dismissal until completion happens again', async () => {
    const { progress, render } = await setupProgressPanel();
    const findPrompt = (tree: ReactNode) =>
      findElement(tree, (element) =>
        typeof element.type === 'function' &&
        element.type.name === 'AllSetsCompleteFinishModal',
      );

    expect(findPrompt(render())?.props.isOpen).toBe(false);
    progress.completedSetsCount = 2;
    expect(findPrompt(render())?.props.isOpen).toBe(false);
    let prompt = findPrompt(render());
    expect(prompt?.props.isOpen).toBe(true);

    (prompt?.props.onDismiss as () => void)();
    expect(findPrompt(render())?.props.isOpen).toBe(false);
    expect(findPrompt(render())?.props.isOpen).toBe(false);

    progress.completedSetsCount = 1;
    render();
    progress.completedSetsCount = 2;
    render();
    prompt = findPrompt(render());
    expect(prompt?.props.isOpen).toBe(true);

    (prompt?.props.onConfirm as () => void)();
    expect(progress.onConfirmFinish).toHaveBeenCalledOnce();
    expect(findPrompt(render())?.props.isOpen).toBe(false);
  });

  it('does not prompt for an already-complete or empty routine', async () => {
    const { progress, render } = await setupProgressPanel();
    progress.completedSetsCount = 2;
    expect(render()).toBeDefined();
    expect(findElement(render(), (element) =>
      typeof element.type === 'function' &&
      element.type.name === 'AllSetsCompleteFinishModal',
    )?.props.isOpen).toBe(false);

    progress.completedSetsCount = 0;
    progress.totalSetsCount = 0;
    render();
    expect(findElement(render(), (element) =>
      typeof element.type === 'function' &&
      element.type.name === 'AllSetsCompleteFinishModal',
    )?.props.isOpen).toBe(false);
  });

  it('renders Spanish confirmation actions without finishing on dismiss', () => {
    const onDismiss = vi.fn();
    const onConfirm = vi.fn();
    const tree = AllSetsCompleteFinishModal({ isOpen: true, onDismiss, onConfirm }) as ReactNode;
    expect(tree).not.toBeNull();

    const dismiss = findElement(tree, (element) => element.props.id === 'btn-dismiss-all-sets-complete');
    const confirm = findElement(tree, (element) => element.props.id === 'btn-confirm-all-sets-complete');
    expect(dismiss).toBeDefined();
    expect(confirm).toBeDefined();
    expect(findElement(tree, (element) => element.type === 'h2')?.props.children).toBe('Rutina completada');

    (dismiss?.props.onClick as () => void)();
    expect(onDismiss).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
    (confirm?.props.onClick as () => void)();
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
