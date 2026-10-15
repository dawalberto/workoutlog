import React, { isValidElement, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clampRestTimerPosition,
  isSpuriousPointerPoint,
  restTimerDragStyle,
  restTimerDragOffset,
} from '../src/components/RestTimerBar';

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
    updateState(index: number, next: unknown) {
      slots[index]!.value = next;
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
    timerTick: (secondsLeft: number) => harness.updateState(0, secondsLeft),
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
  it('calculates pointer movement as a pixel delta', () => {
    expect(restTimerDragOffset(
      { x: 162, y: 332 },
      { x: 150, y: 320 },
    )).toEqual({ x: 12, y: 12 });
  });

  it('styles drag movement as a translate delta without absolute positioning', () => {
    const style = restTimerDragStyle({ x: 12, y: -4 });

    expect(style).toEqual({
      transform: 'translate(calc(-50% + 12px), -4px)',
    });
    expect(style).not.toHaveProperty('top');
    expect(style).not.toHaveProperty('left');
  });

  it('ignores a spurious zero pointer point unless the origin is also zero', () => {
    expect(isSpuriousPointerPoint(
      { x: 100, y: 700 },
      { x: 0, y: 0 },
    )).toBe(true);
    expect(isSpuriousPointerPoint(
      { x: 100, y: 700 },
      { x: 101, y: 701 },
    )).toBe(false);
    expect(isSpuriousPointerPoint(
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    )).toBe(false);
  });

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

  it.each([
    ['normal', true, 'floating-rest-timer'],
    ['compact', false, 'floating-mini-rest-timer'],
  ] as const)('drags the whole %s banner directly and preserves its position', async (
    _mode,
    isInsideActiveRoutine,
    bannerId,
  ) => {
    const { timer, timerTick, render } = await setupRestTimerBar();
    const findHandle = (tree: ReactNode) =>
      findElement(tree, (element) => element.props['aria-label'] === 'Mover temporizador');
    timer.isInsideActiveRoutine = isInsideActiveRoutine;
    const findBanner = (tree: ReactNode) =>
      findElement(tree, (element) =>
        element.props.id === 'floating-rest-timer' ||
        element.props.id === 'floating-mini-rest-timer',
      );
    let handle = findHandle(render());
    let banner = findBanner(render());
    expect(handle).toBeDefined();
    expect(handle?.props.className).toContain('min-h-[48px]');
    expect(handle?.props.className).not.toContain('active:scale-[0.97]');
    expect(banner?.props.className).toContain('touch-none');
    expect(banner?.props.className).toContain('select-none');
    expect(banner?.props.className).toContain('left-1/2');
    expect(banner?.props.className).toContain('bottom-[');
    expect(banner?.props.className).not.toContain('-translate-x-1/2');
    expect(banner?.props.className).not.toContain('transition-all');
    expect(banner?.props.className).not.toContain('animate-slide-up');
    const initialStyle = banner?.props.style;
    expect(initialStyle).toEqual({
      transform: 'translate(calc(-50% + 0px), 0px)',
    });

    const bannerRect = { left: 120, top: 300, width: 280, height: 170 };
    const bannerElement = {
      style: {} as Record<string, string>,
      getBoundingClientRect: () => bannerRect,
      setPointerCapture: vi.fn(),
      releasePointerCapture: vi.fn(),
    };
    const preventDefault = vi.fn();
    const pointerEvent = {
      pointerId: 7,
      isPrimary: true,
      clientX: 150,
      clientY: 320,
      currentTarget: bannerElement,
      target: {
        closest: vi.fn((selector: string) =>
          selector === '[data-rest-timer-drag-handle]' ? {} : null,
        ),
      },
      preventDefault,
    };
    (banner?.props.onPointerDown as (event: unknown) => void)(pointerEvent);
    expect(bannerElement.setPointerCapture).toHaveBeenCalledWith(7);
    expect(preventDefault).toHaveBeenCalledOnce();
    banner = findBanner(render());
    expect(banner?.props.style).toEqual(initialStyle);
    expect(banner?.props.className).toContain('left-1/2');
    expect(banner?.props.className).toContain('bottom-[');

    (banner?.props.onPointerMove as (event: unknown) => void)({
      ...pointerEvent,
      clientX: 162,
      clientY: 332,
    });
    timerTick(39);
    banner = findBanner(render());
    expect(banner?.props.style).toMatchObject({
      transform: 'translate(calc(-50% + 12px), 12px)',
    });
    expect(banner?.props.className).toContain('left-1/2');
    expect(banner?.props.className).toContain('bottom-[');

    (banner?.props.onPointerUp as (event: unknown) => void)({
      ...pointerEvent,
      clientX: 162,
      clientY: 332,
    });
    expect(bannerElement.releasePointerCapture).toHaveBeenCalledWith(7);
    banner = findBanner(render());
    expect(banner?.props.style).toEqual({
      transform: 'translate(calc(-50% + 12px), 12px)',
    });

    timer.isInsideActiveRoutine = !isInsideActiveRoutine;
    banner = findBanner(render());
    expect(banner?.props.style).toEqual({
      transform: 'translate(calc(-50% + 12px), 12px)',
    });
  });

  it('leaves taps in place and ignores non-primary and spurious pointer events', async () => {
    const { render } = await setupRestTimerBar();
    const findBanner = () =>
      findElement(render(), (element) => element.props.id === 'floating-rest-timer');
    let banner = findBanner();
    const bannerElement = {
      getBoundingClientRect: () => ({ left: 120, top: 300, width: 280, height: 170 }),
      setPointerCapture: vi.fn(),
      releasePointerCapture: vi.fn(),
    };
    const preventDefault = vi.fn();
    const pointerEvent = {
      pointerId: 11,
      isPrimary: false,
      clientX: 150,
      clientY: 320,
      currentTarget: bannerElement,
      target: { closest: vi.fn(() => null) },
      preventDefault,
    };

    (banner?.props.onPointerDown as (event: unknown) => void)(pointerEvent);
    expect(bannerElement.setPointerCapture).not.toHaveBeenCalled();
    expect(preventDefault).not.toHaveBeenCalled();

    const primaryPointerEvent = { ...pointerEvent, isPrimary: true };
    (banner?.props.onPointerDown as (event: unknown) => void)(primaryPointerEvent);
    banner = findBanner();
    expect(banner?.props.style).toEqual({
      transform: 'translate(calc(-50% + 0px), 0px)',
    });
    (banner?.props.onPointerUp as (event: unknown) => void)(primaryPointerEvent);
    expect(bannerElement.releasePointerCapture).toHaveBeenCalledWith(11);
    banner = findBanner();
    expect(banner?.props.style).toEqual({
      transform: 'translate(calc(-50% + 0px), 0px)',
    });

    const nextPointerEvent = {
      ...primaryPointerEvent,
      pointerId: 12,
    };
    (banner?.props.onPointerDown as (event: unknown) => void)(nextPointerEvent);
    (banner?.props.onPointerMove as (event: unknown) => void)({
      ...nextPointerEvent,
      clientX: 0,
      clientY: 0,
    });
    banner = findBanner();
    expect(banner?.props.style).toEqual({
      transform: 'translate(calc(-50% + 0px), 0px)',
    });
    (banner?.props.onPointerMove as (event: unknown) => void)({
      ...nextPointerEvent,
      clientX: 162,
      clientY: 332,
    });
    banner = findBanner();
    expect(banner?.props.style).toEqual({
      transform: 'translate(calc(-50% + 12px), 12px)',
    });
  });

  it('does not capture or prevent pointer events on timer controls', async () => {
    const { timer, render } = await setupRestTimerBar();
    const banner = findElement(render(), (element) => element.props.id === 'floating-rest-timer');
    const bannerElement = {
      getBoundingClientRect: () => ({ left: 120, top: 300, width: 280, height: 170 }),
      setPointerCapture: vi.fn(),
    };
    const preventDefault = vi.fn();

    (banner?.props.onPointerDown as (event: unknown) => void)({
      pointerId: 9,
      isPrimary: true,
      clientX: 130,
      clientY: 310,
      currentTarget: bannerElement,
      target: {
        closest: vi.fn((selector: string) =>
          selector === 'button, a, input' ? {} : null,
        ),
      },
      preventDefault,
    });

    expect(bannerElement.setPointerCapture).not.toHaveBeenCalled();
    expect(preventDefault).not.toHaveBeenCalled();

    const findButton = (id: string) =>
      findElement(banner?.props.children as ReactNode, (element) =>
        element.props.id === id,
      );
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
