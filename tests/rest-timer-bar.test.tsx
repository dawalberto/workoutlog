import React, { isValidElement, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

type ElementProps = {
  children?: ReactNode;
  [key: string]: unknown;
};

type DragPosition = {
  x: number;
  y: number;
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

function findDraggable(node: ReactNode) {
  return findElement(node, (element) =>
    element.props.nodeRef != null &&
    typeof element.props.cancel === 'string' &&
    element.props.position != null,
  );
}

function findBanner(node: ReactNode, bannerId?: string) {
  return findElement(node, (element) =>
    bannerId
      ? element.props.id === bannerId
      : element.props.id === 'floating-rest-timer' ||
        element.props.id === 'floating-mini-rest-timer',
  );
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
    innerWidth: 600,
    innerHeight: 900,
  });

  const { RestTimerBar } = await import('../src/components/RestTimerBar');

  // RestTimerBar now delegates hook-based UI to RestTimerBarContent. This test uses a
  // lightweight hook harness rather than a React renderer, so resolve that one
  // component layer explicitly to inspect the actual Draggable tree.
  const render = (): ReactNode => {
    const outerTree = harness.render(() => RestTimerBar({}) as ReactNode);
    if (!isValidElement<ElementProps>(outerTree) || typeof outerTree.type !== 'function') {
      return outerTree;
    }
    return harness.render(() =>
      (outerTree.type as (props: ElementProps) => ReactNode)(outerTree.props),
    );
  };

  return { timer, render };
}

function expectNoTopOrLeft(node: ReactNode) {
  const style = (node as React.ReactElement<ElementProps> | undefined)?.props.style as
    | { top?: unknown; left?: unknown }
    | undefined;
  expect(style?.top).toBeUndefined();
  expect(style?.left).toBeUndefined();
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
  it.each([
    ['normal', true, 'floating-rest-timer', '+1.5rem'],
    ['compact', false, 'floating-mini-rest-timer', '+5rem'],
  ] as const)('renders the %s banner as one controlled draggable', async (
    _mode,
    isInsideActiveRoutine,
    bannerId,
    bottomOffset,
  ) => {
    const { timer, render } = await setupRestTimerBar();
    timer.isInsideActiveRoutine = isInsideActiveRoutine;
    const tree = render();
    const draggable = findDraggable(tree);
    const banner = findBanner(draggable?.props.children, bannerId);
    const anchor = findElement(tree, (element) =>
      String(element.props.className).includes('pointer-events-none') &&
      String(element.props.className).includes('-translate-x-1/2'),
    );
    const grip = findElement(tree, (element) => element.props['aria-label'] === 'Mover temporizador');

    expect(draggable).toBeDefined();
    expect(draggable?.props.nodeRef).toEqual({ current: null });
    expect(draggable?.props.nodeRef).toBe(banner?.props.ref);
    expect(draggable?.props.handle).toBe('.rest-timer-drag-handle');
    expect(String(draggable?.props.cancel)).toContain('button');
    expect(draggable?.props.position).toEqual({ x: 0, y: 0 });
    expect(draggable?.props.allowMobileScroll).toBeUndefined();
    expect(banner?.props.id).toBe(bannerId);
    expect(banner?.props.className).toContain('pointer-events-auto');
    expect(banner?.props.className).toContain('touch-none');
    expect(banner?.props.className).toContain('select-none');
    expect(banner?.props.className).not.toContain('left-1/2');
    expect(banner?.props.className).not.toContain('-translate-x-1/2');
    expectNoTopOrLeft(banner);
    expect(anchor?.props.className).toContain('left-1/2');
    expect(anchor?.props.className).toContain('z-50');
    expect(anchor?.props.className).toContain(`bottom-[calc(env(safe-area-inset-bottom,0px)${bottomOffset})]`);
    expect(anchor?.props.className).not.toContain('inset-0');
    expect(grip?.type).not.toBe('button');
    expect(grip?.props.className).toContain('rest-timer-drag-handle');
    expect(grip?.props.className).toContain('min-h-[48px]');
    expect(grip?.props.className).toContain('min-w-[48px]');
    expect(grip?.props.className).toContain('touch-none');
  });

  it('shares one controlled position across modes and re-renders', async () => {
    const { timer, render } = await setupRestTimerBar();
    const normal = findDraggable(render());
    expect(normal?.props.position).toEqual({ x: 0, y: 0 });

    (normal?.props.onDrag as (event: unknown, data: DragPosition) => void)({}, { x: 12, y: -4 });

    const held = findDraggable(render());
    expect(held?.props.position).toEqual({ x: 12, y: -4 });
    expectNoTopOrLeft(findBanner(held?.props.children, 'floating-rest-timer'));

    timer.isInsideActiveRoutine = false;
    const compact = findDraggable(render());
    expect(compact?.props.position).toEqual({ x: 12, y: -4 });
    expect(compact?.props.nodeRef).toBe(normal?.props.nodeRef);
    expect(findBanner(compact?.props.children)?.props.id).toBe('floating-mini-rest-timer');
    expectNoTopOrLeft(findBanner(compact?.props.children));
  });

  it('limits translation from the visual viewport without writing top or left', async () => {
    const { render } = await setupRestTimerBar();
    const draggable = findDraggable(render());
    const nodeRef = draggable?.props.nodeRef as {
      current: { getBoundingClientRect: () => { left: number; top: number; right: number; bottom: number } };
    };
    nodeRef.current = {
      getBoundingClientRect: () => ({ left: 120, top: 300, right: 400, bottom: 470 }),
    };

    (draggable?.props.onStart as (event: unknown, data: unknown) => void)({}, {});
    const fallback = findDraggable(render());
    expect(fallback?.props.bounds).toEqual({
      left: -112,
      right: 192,
      top: -292,
      bottom: 422,
    });
    expect(typeof fallback?.props.bounds).not.toBe('string');

    (window as { visualViewport?: unknown }).visualViewport = {
      offsetLeft: 4,
      offsetTop: 12,
      width: 500,
      height: 800,
    };
    (fallback?.props.onStart as (event: unknown, data: unknown) => void)({}, {});
    const measured = findDraggable(render());
    expect(measured?.props.bounds).toEqual({
      left: -108,
      right: 96,
      top: -280,
      bottom: 334,
    });
    expectNoTopOrLeft(findBanner(measured?.props.children));
  });

  it('keeps timer controls clickable outside the drag surface', async () => {
    const { timer, render } = await setupRestTimerBar();
    const tree = render();
    const draggable = findDraggable(tree);
    expect(String(draggable?.props.cancel)).toBe('button, a, input, textarea, select');
    expect(draggable?.props.handle).toBe('.rest-timer-drag-handle');

    const findButton = (id: string) =>
      findElement(tree, (element) => element.props.id === id);
    const activateButton = (id: string) => {
      const onClick = findButton(id)?.props.onClick as (() => void) | undefined;
      onClick?.();
    };
    activateButton('btn-add-30s-rest');
    activateButton('btn-pause-rest-timer');
    activateButton('btn-skip-rest-timer');
    activateButton('btn-close-rest-timer');
    expect(timer.onExtend).toHaveBeenCalledWith(30);
    expect(timer.onPause).toHaveBeenCalledOnce();
    expect(timer.onClose).toHaveBeenCalledTimes(2);
  });
});
