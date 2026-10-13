import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { createDataSlice, type DataSlice } from './slices/dataSlice';

export type AppState = DataSlice;

export const createAppStore = (initial?: Partial<AppState>) =>
  createStore<AppState>()((...args) => ({
    ...createDataSlice(...args),
    ...initial,
  }));

export const appStore = createAppStore();

export const useAppStore = <T,>(selector: (state: AppState) => T): T =>
  useStore(appStore, selector);
