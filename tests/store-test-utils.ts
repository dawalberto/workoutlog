import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { vi } from 'vitest';
import { appStore, useAppStore, type AppState } from '../src/store/appStore';

const initialState = appStore.getState();

export function seedAppStore(state: Partial<AppState>): void {
  appStore.setState(state);
}

export function resetAppStore(): void {
  appStore.setState(initialState, true);
  vi.restoreAllMocks();
}

export function useCurrentStateAsServerSnapshot(): void {
  vi.spyOn(appStore, 'getInitialState').mockImplementation(() => appStore.getState());
}

export function renderSelectedStoreValue<T>(
  selector: (state: AppState) => T,
): string {
  const SelectedValue = () => React.createElement(
    'span',
    null,
    String(useAppStore(selector)),
  );
  return renderToStaticMarkup(React.createElement(SelectedValue));
}
