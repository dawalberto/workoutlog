import React, { isValidElement, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clampRestTimerPosition } from '../src/components/RestTimerBar';

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
  const slots: Array<{ value: unknown }> = [];
  let cursor = 0;
  return {
    render<T>(callback: () => T) {
      cursor = 0;
      return callback();
    },
    useState<T>(initial: T | (() => T)): [T, (next: T | ((previous: T) => T)) => void] {
      const index = cursor++;
      if (!slots[index]) {
        slots[index] = { value: typeof initial === 'function' ? (initial as () => T)() : initial };
      }
      return [
        slots[index]!.value as T,
        (next) => {
          slots[index]!.value = typeof next === 'function'
            ? (next as (previous: T) => T)(slots[index]!.value as T)
            : next;
        },
      ];
    },
    useRef<T>(initial: T) {
      const index = cursor++;
      if (!slots[index]) slots[index] = { value: { current: initial } };
      return slots[index]!.value as { current: T };
    },
    useEffect() {
      cursor++;
    },
    useCallback<T>(callback: T) {
      cursor++;
      return callback;
    },
  };
}

async function setupRestTimerBar() {
  const harness = createHarness();
  const timer = {
    activeRestTimer: {
      routineId: 'routine',
      initialSeconds: 60,
      targetEndTime: Date.now() + 60_000,
      exerciseName: 'Sentadilla',
      setNumber: 1,
    },
    isInsideActiveRoutine: true,
    onReturnToRoutine: vi.fn(),
    onClose: vi.fn(),
    onPause: vi.fn(),
    onResume: vi.fn(),
    onExtend: vi.fn(),
    restPushScheduleId: null,
    lastDeliveredScheduleId: null,
    lastDeliveredWhileVisible: null,
  };
  vi.doMock('react', async (importOriginal) => ({
    ...await importOriginal<typeof import('react')>(),
    useState: harness.useState,
    useRef: harness.useRef,
    useEffect: harness.useEffect,
    useCallback: harness.useCallback,
  }));
  vi.doMock('../src/hooks/shell/useRestTimerBar', () => ({
    useRestTimerBar: () => timer,
  }));
  vi.doMock('../src/components/RestPushPrompt', () => ({ RestPushPrompt: () => null }));
  vi.stubGlobal('window', {
    innerWidth: 400,
    innerHeight: 700,
    getComputedStyle: () => ({
      paddingTop: '20px',
      paddingRight: '10px',
      paddingBottom: '30px',
      paddingLeft: '10px',
    }),
  });
  vi.stubGlobal('document', {
    createElement: () => ({ style: {}, remove: vi.fn() }),
    body: { appendChild: vi.fn() },
  });

  const { RestTimerBar } = await import('../src/components/RestTimerBar');
  return {
    timer,
    render: () => harness.render(() => RestTimerBar({}) as ReactNode),
  };
}

afterEach(() => {
  vi.doUnmock('react');
  vi.doUnmock('../src/hooks/shell/useRestTimerBar');
  vi.doUnmock('../src/components/RestPushPrompt');
  vi.resetModules();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('rest timer banner dragging', () => {
  it('clamps the banner inside viewport safe areas', () => {
    expect(clampRestTimerPosition(
      { left: 490, top: 790 },
      { width: 500, height: 800 },
      { width: 100, height: 120 },
      { top: 20, right: 30, bottom: 40, left: 10 },
    )).toEqual({ left: 362, top: 632 });

    expect(clampRestTimerPosition(
      { left: -20, top: -30 },
      { width: 500, height: 800 },
      { width: 100, height: 120 },
      { top: 20, right: 30, bottom: 40, left: 10 },
    )).toEqual({ left: 18, top: 28 });
  });

  it('captures drag on the dedicated handle and keeps buttons interactive in both modes', async () => {
    const { timer, render } = await setupRestTimerBar();
    const findHandle = (tree: ReactNode) =>
      findElement(tree, (element) => element.props['aria-label'] === 'Mover temporizador');
    const findBanner = (tree: ReactNode) =>
      findElement(tree, (element) =>
        element.props.id === 'floating-rest-timer' ||
        element.props.id === 'floating-mini-rest-timer',
      );
    let handle = findHandle(render());
    expect(handle).toBeDefined();
    expect(handle?.props.className).toContain('min-h-[48px]');

    const bannerRect = { left: 120, top: 300, width: 280, height: 170 };
    const dragTarget = {
      setPointerCapture: vi.fn(),
      releasePointerCapture: vi.fn(),
      closest: vi.fn(() => ({ getBoundingClientRect: () => bannerRect })),
    };
    const pointerEvent = {
      pointerId: 7,
      clientX: 150,
      clientY: 320,
      currentTarget: dragTarget,
      preventDefault: vi.fn(),
    };
    (handle?.props.onPointerDown as (event: unknown) => void)(pointerEvent);
    expect(dragTarget.setPointerCapture).toHaveBeenCalledWith(7);

    (handle?.props.onPointerMove as (event: unknown) => void)({
      ...pointerEvent,
      clientX: 390,
      clientY: 690,
    });
    let banner = findBanner(render());
    expect(banner?.props.style).toMatchObject({ left: '102px', top: '492px' });

    timer.isInsideActiveRoutine = false;
    handle = findHandle(render());
    banner = findBanner(render());
    expect(banner?.props.style).toMatchObject({ left: '102px', top: '492px' });
    const closeButton = findElement(banner?.props.children as ReactNode, (element) =>
      element.props.id === 'btn-mini-close-timer',
    );
    (closeButton?.props.onClick as () => void)();
    expect(timer.onClose).toHaveBeenCalledOnce();

    (handle?.props.onPointerUp as (event: unknown) => void)(pointerEvent);
    expect(dragTarget.releasePointerCapture).toHaveBeenCalledWith(7);
  });
});
