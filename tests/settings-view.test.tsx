import React, { isValidElement, type ReactNode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import type { AppState } from '../src/store/appStore';

function findButton(node: ReactNode): React.ReactElement<{ id?: string; onClick?: () => void; children?: ReactNode }> | undefined {
  if (!isValidElement<{ id?: string; onClick?: () => void; children?: ReactNode }>(node)) return undefined;
  if (node.props.id === 'settings-link-backup') return node;
  for (const child of React.Children.toArray(node.props.children)) {
    const found = findButton(child);
    if (found) return found;
  }
  return undefined;
}

afterEach(() => {
  vi.doUnmock('../src/store/appStore');
  vi.resetModules();
});

it('opens the backup modal from the settings button', async () => {
  const openBackupModal = vi.fn();
  vi.doMock('../src/store/appStore', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../src/store/appStore')>();
    const state = { ...actual.appStore.getState(), openBackupModal };
    return { ...actual, useAppStore: (selector: (state: AppState) => unknown) => selector(state) };
  });
  const { SettingsView } = await import('../src/components/SettingsView');
  const button = findButton(await SettingsView({}));
  expect(button).toBeDefined();
  button?.props.onClick?.();
  expect(openBackupModal).toHaveBeenCalledOnce();
});
