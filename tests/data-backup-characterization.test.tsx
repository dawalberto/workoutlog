import React, { isValidElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  ExerciseDefinition,
  ExerciseDiary,
  ExerciseRmLog,
  Routine,
  WorkoutHistoryLog,
} from '../src/types';
import type { AppState } from '../src/store/appStore';

const { downloadJsonFileMock } = vi.hoisted(() => ({
  downloadJsonFileMock: vi.fn(),
}));

vi.mock('../src/utils/backup', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/utils/backup')>()),
  downloadJsonFile: downloadJsonFileMock,
}));

const catalog: ExerciseDefinition[] = [
  { id: 'exercise-press', name: 'Press de Banca', category: 'Pecho' },
];
const routines: Routine[] = [];
const rmLogs: ExerciseRmLog[] = [];
const workoutHistory: WorkoutHistoryLog[] = [];
const exerciseDiary: ExerciseDiary[] = [];

type ElementProps = { children?: ReactNode; [key: string]: unknown };
type StateOverrides = Record<number, unknown>;

function findElement(
  node: ReactNode,
  predicate: (props: ElementProps) => boolean,
): React.ReactElement<ElementProps> | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = findElement(child, predicate);
      if (match) return match;
    }
    return undefined;
  }
  if (!isValidElement<ElementProps>(node)) return undefined;
  if (predicate(node.props)) return node;
  if (typeof node.type === 'function') {
    return findElement((node.type as (props: ElementProps) => ReactNode)(node.props), predicate);
  }
  return findElement(node.props.children, predicate);
}

async function setup(
  overrides: StateOverrides = {},
  storeState: {
    closeBackupModal?: AppState['closeBackupModal'];
    importBackup?: AppState['importBackup'];
  } = {},
) {
  vi.doUnmock('react');
  vi.resetModules();
  const storeTestUtils = await import('./store-test-utils');
  storeTestUtils.seedPersistedAppStore({ catalog, routines, rmLogs, workoutHistory, exerciseDiary });
  storeTestUtils.seedAppStore({
    isBackupModalOpen: true,
    isSyncEnabled: false,
    ...storeState,
  });
  storeTestUtils.useCurrentStateAsServerSnapshot();
  const storeModule = await import('../src/store/appStore');
  vi.doMock('../src/store/appStore', () => ({
    appStore: storeModule.appStore,
    useAppStore: (selector: (state: AppState) => unknown) =>
      selector(storeModule.appStore.getState()),
  }));
  vi.doMock('zustand/react/shallow', () => ({
    useShallow: (selector: unknown) => selector,
  }));
  let stateIndex = 0;
  vi.doMock('react', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react')>();
    return {
      ...actual,
      useState: (initial: unknown) => {
        const index = stateIndex++;
        const value = Object.hasOwn(overrides, index)
          ? overrides[index]
          : typeof initial === 'function'
            ? (initial as () => unknown)()
            : initial;
        return [value, vi.fn()];
      },
      useRef: (initial: unknown) => ({ current: initial }),
    };
  });
  const { DataBackupModal } = await import('../src/components/DataBackupModal');
  const render = (): React.ReactElement => {
    stateIndex = 0;
    return DataBackupModal({}) as React.ReactElement;
  };
  return { render, appStore: storeModule.appStore };
}

afterEach(async () => {
  vi.doUnmock('react');
  vi.doUnmock('../src/store/appStore');
  vi.doUnmock('zustand/react/shallow');
  const { resetAppStore } = await import('./store-test-utils');
  resetAppStore();
  vi.resetModules();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('DataBackupModal characterization', () => {
  it('preserves export tab markup', async () => {
    const { render } = await setup();
    expect(renderToStaticMarkup(render())).toMatchSnapshot('backup-export');
  });

  it('preserves import tab markup without a selected file', async () => {
    const { render } = await setup({ 0: 'import' });
    expect(renderToStaticMarkup(render())).toMatchSnapshot('backup-import-empty');
  });

  it('preserves import tab markup with a parsed file and merge mode selected', async () => {
    const { parseImportedData } = await import('../src/utils/backup');
    const parsedData = parseImportedData(JSON.stringify({ catalog }));
    const { render } = await setup({
      0: 'import',
      1: { name: 'workoutlog-backup.json' },
      2: parsedData,
      4: 'merge',
    });
    expect(renderToStaticMarkup(render())).toMatchSnapshot('backup-import-merge');
  });

  it('exports the complete version 1 payload without changing its shape', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-13T12:00:00.000Z'));
    const { render } = await setup();
    const exportAll = findElement(render(), (props) => props.id === 'btn-export-all');

    (exportAll?.props.onClick as () => void)();

    expect(downloadJsonFileMock).toHaveBeenCalledExactlyOnceWith(
      'workoutlog-backup-completo-2026-10-13.json',
      {
        app: 'WorkoutLog',
        version: 1,
        exportedAt: '2026-10-13T12:00:00.000Z',
        type: 'all',
        catalog,
        routines,
        rmLogs,
        workoutHistory,
        exerciseDiary,
      },
    );
  });

  it.each(['merge', 'overwrite'] as const)(
    'imports parsed data in %s mode using the established callback shape',
    async (mode) => {
      const importedCatalog: ExerciseDefinition[] = [
        { id: 'imported-squat', name: 'Sentadilla', category: 'Pierna' },
      ];
      const { parseImportedData } = await import('../src/utils/backup');
      const parsedData = parseImportedData(JSON.stringify({ catalog: importedCatalog }));
      const onClose = vi.fn();
      const importBackup = vi.fn<AppState['importBackup']>();
      const { render } = await setup({
        0: 'import',
        1: { name: 'workoutlog-backup.json' },
        2: parsedData,
        4: mode,
      }, { closeBackupModal: onClose, importBackup });
      const confirmImport = findElement(render(), (props) => props.id === 'btn-confirm-import');

      (confirmImport?.props.onClick as () => void)();

      expect(importBackup).toHaveBeenCalledOnce();
      const [data, summary] = importBackup.mock.calls[0] as [
        {
          catalog: ExerciseDefinition[];
          routines: Routine[];
          rmLogs: ExerciseRmLog[];
          workoutHistory: WorkoutHistoryLog[];
          exerciseDiary: ExerciseDiary[];
        },
        { mode: string },
      ];
      expect(data.catalog.map(({ id }) => id)).toEqual(
        mode === 'merge'
          ? ['exercise-press', 'imported-squat']
          : ['imported-squat'],
      );
      expect(data.routines).toEqual([]);
      expect(data.rmLogs).toEqual([]);
      expect(data.workoutHistory).toEqual([]);
      expect(data.exerciseDiary).toEqual([]);
      expect(summary).toEqual(expect.objectContaining({ mode }));
      expect(onClose).toHaveBeenCalledOnce();
    },
  );
});
