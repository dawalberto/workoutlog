import React, { isValidElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ExerciseDefinition, ExerciseRmLog, RmRecord } from '../src/types';
import type { AppState } from '../src/store/appStore';

const exercise: ExerciseDefinition = {
  id: 'press-definition',
  name: 'Press de Banca',
  category: 'Pecho',
  imageUrl: 'https://example.test/press.jpg',
  defaultWeight: 65,
};

const secondExercise: ExerciseDefinition = {
  id: 'row-definition',
  name: 'Remo con Barra',
  category: 'Espalda',
};

const firstRecord: RmRecord = {
  id: 'rm-record-latest',
  weight: 82.5,
  date: '2026-06-10',
  notes: 'RPE 9',
};

const previousRecord: RmRecord = {
  id: 'rm-record-previous',
  weight: 80,
  date: '2026-05-10',
};

const rmLog: ExerciseRmLog = {
  id: 'rm-log-press',
  exerciseId: exercise.id,
  exerciseName: exercise.name,
  category: exercise.category,
  records: [firstRecord, previousRecord],
  createdAt: '2026-05-10T12:00:00.000Z',
  updatedAt: '2026-06-10T12:00:00.000Z',
};

const stateNames = [
  'searchTerm',
  'isAddModalOpen',
  'expandedExerciseId',
  'quickLogTarget',
  'quickWeight',
  'quickDate',
  'quickNotes',
  'editingRecordId',
  'editWeight',
  'editDate',
  'editNotes',
  'catalogSearch',
  'selectedCatalogExercise',
  'initialWeight',
  'initialDate',
  'initialNotes',
] as const;

type StateName = typeof stateNames[number];
type StateOverrides = Partial<Record<StateName, unknown>>;
type ElementProps = { children?: ReactNode; [key: string]: unknown };

function findElement(node: ReactNode, predicate: (props: ElementProps) => boolean): React.ReactElement<ElementProps> | undefined {
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

async function setup(overrides: StateOverrides = {}) {
  vi.doUnmock('react');
  vi.resetModules();
  const storeTestUtils = await import('./store-test-utils');
  storeTestUtils.seedPersistedAppStore({
    catalog: [exercise, secondExercise],
    rmLogs: [rmLog],
    exerciseDiary: [],
  });
  storeTestUtils.useCurrentStateAsServerSnapshot();
  const { appStore } = await import('../src/store/appStore');
  const setRmLogs = vi.fn();
  appStore.setState({ setRmLogs });

  let stateIndex = 0;
  vi.doMock('react', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react')>();
    return {
      ...actual,
      useState: (initial: unknown) => {
        const name = stateNames[stateIndex++];
        const value = name && Object.hasOwn(overrides, name)
          ? overrides[name]
          : typeof initial === 'function'
            ? (initial as () => unknown)()
            : initial;
        return [value, vi.fn()];
      },
      useMemo: (calculate: () => unknown) => calculate(),
    };
  });
  vi.doMock('zustand/react/shallow', () => ({
    useShallow: (selector: unknown) => selector,
  }));
  vi.doMock('../src/store/appStore', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../src/store/appStore')>();
    return {
      ...actual,
      useAppStore: (selector: (state: AppState) => unknown) =>
        selector(actual.appStore.getState()),
    };
  });
  const { RmLogsView } = await import('../src/components/RmLogsView');
  const render = (): React.ReactElement => {
    stateIndex = 0;
    return RmLogsView({}) as React.ReactElement;
  };
  return { setRmLogs, render };
}

afterEach(async () => {
  vi.doUnmock('react');
  vi.doUnmock('../src/store/appStore');
  vi.doUnmock('zustand/react/shallow');
  vi.resetModules();
  const { resetAppStore } = await import('./store-test-utils');
  resetAppStore();
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('RmLogsView characterization', () => {
  it('preserves the exercise list and summary markup', async () => {
    const { render } = await setup();
    expect(renderToStaticMarkup(render())).toMatchSnapshot('rm-logs-list-summary');
  });

  it('preserves markup for a selected exercise with its history expanded', async () => {
    const { render } = await setup({ expandedExerciseId: rmLog.id });
    expect(renderToStaticMarkup(render())).toMatchSnapshot('rm-logs-expanded-history');
  });

  it('preserves markup with the quick-record modal open', async () => {
    const { render } = await setup({
      quickLogTarget: rmLog,
      quickWeight: '82.5',
      quickDate: '2026-06-10',
      quickNotes: 'RPE 9',
    });
    expect(renderToStaticMarkup(render())).toMatchSnapshot('rm-logs-quick-record-modal');
  });

  it('preserves markup with the add-exercise modal open', async () => {
    const { render } = await setup({
      isAddModalOpen: true,
      initialDate: '2026-06-10',
    });
    expect(renderToStaticMarkup(render())).toMatchSnapshot('rm-logs-add-exercise-modal');
  });

  it('preserves quick-record creation values and reset behavior', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-01T12:00:00.000Z'));
    const { setRmLogs, render } = await setup({
      quickLogTarget: rmLog,
      quickWeight: '90',
      quickDate: '2026-06-30',
      quickNotes: '  RPE 10  ',
    });
    const submit = findElement(render(), (elementProps) => elementProps.id === 'btn-submit-quick-rm');
    (submit?.props.onClick as () => void)();

    expect(setRmLogs).toHaveBeenCalledWith([
      expect.objectContaining({
        ...rmLog,
        records: [
          expect.objectContaining({
            weight: 90,
            date: '2026-06-30',
            notes: 'RPE 10',
          }),
          firstRecord,
          previousRecord,
        ],
        updatedAt: '2026-07-01T12:00:00.000Z',
      }),
    ]);
  });

  it('preserves edited record values and sorting', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-01T12:00:00.000Z'));
    const { setRmLogs, render } = await setup({
      expandedExerciseId: rmLog.id,
      editingRecordId: previousRecord.id,
      editWeight: '75',
      editDate: '2026-04-10',
      editNotes: '  Deload  ',
    });
    const save = findElement(
      render(),
      (elementProps) => typeof elementProps.className === 'string' &&
        elementProps.className.includes('gap-1 active:scale-95'),
    );
    (save?.props.onClick as () => void)();

    expect(setRmLogs).toHaveBeenCalledWith([
      expect.objectContaining({
        ...rmLog,
        records: [
          expect.objectContaining({ ...firstRecord }),
          expect.objectContaining({
            ...previousRecord,
            weight: 75,
            date: '2026-04-10',
            notes: 'Deload',
          }),
        ],
        updatedAt: '2026-07-01T12:00:00.000Z',
      }),
    ]);
  });

  it('preserves confirmation and delete-record behavior', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-01T12:00:00.000Z'));
    const confirm = vi.fn().mockReturnValue(true);
    vi.stubGlobal('window', { confirm });
    const { setRmLogs, render } = await setup({ expandedExerciseId: rmLog.id });
    const deleteButton = findElement(
      render(),
      (elementProps) => elementProps['aria-label'] === 'Eliminar registro',
    );
    (deleteButton?.props.onClick as () => void)();

    expect(confirm).toHaveBeenCalledExactlyOnceWith('¿Seguro que deseas eliminar este registro de RM?');
    expect(setRmLogs).toHaveBeenCalledWith([
      expect.objectContaining({
        ...rmLog,
        records: [previousRecord],
        updatedAt: '2026-07-01T12:00:00.000Z',
      }),
    ]);
  });
});
