import React, { isValidElement, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

type StateSlot = { value: unknown; initialized: boolean };
type ElementProps = { children?: ReactNode; [key: string]: unknown };

function createStateHarness() {
  const slots: StateSlot[] = [];
  let cursor = 0;
  return {
    render<T>(callback: () => T): T {
      cursor = 0;
      return callback();
    },
    useState<T>(initial: T | (() => T)): [T, (next: T | ((previous: T) => T)) => void] {
      const index = cursor++;
      const slot = (slots[index] ??= { value: undefined, initialized: false });
      if (!slot.initialized) {
        slot.value = typeof initial === 'function' ? (initial as () => T)() : initial;
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

async function setupThumbnail() {
  const harness = createStateHarness();
  vi.doMock('react', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react')>();
    return { ...actual, useState: (initial: unknown) => harness.useState(initial) };
  });
  vi.resetModules();
  const { ExerciseThumbnail } = await import('../src/components/ExerciseThumbnail');
  const render = (imageUrl: string) =>
    harness.render(() => ExerciseThumbnail({ name: 'Sentadilla', imageUrl })) as unknown as ReactNode;
  const findImage = (imageUrl: string) =>
    findElement(render(imageUrl), (element) => element.type === 'img');
  return { findImage };
}

afterEach(() => {
  vi.doUnmock('react');
  vi.resetModules();
  vi.restoreAllMocks();
});

describe('ExerciseThumbnail image recovery', () => {
  it('reveals a newly selected cover after the previous image failed', async () => {
    const { findImage } = await setupThumbnail();

    const brokenImage = findImage('https://example.test/broken.jpg');
    expect(brokenImage).toBeDefined();

    // The image fails to load: the fallback shows instead.
    (brokenImage!.props.onError as () => void)();
    expect(findImage('https://example.test/broken.jpg')).toBeUndefined();

    // Picking a library image updates the src and must bring the <img> back.
    const recovered = findImage('library:push-ups');
    expect(recovered).toBeDefined();
    expect(String(recovered!.props.src)).toContain('push-ups');
  });

  it('keeps rendering the fallback when a library key has no matching file', async () => {
    const { findImage } = await setupThumbnail();
    expect(findImage('library:removed-image')).toBeUndefined();
  });
});
