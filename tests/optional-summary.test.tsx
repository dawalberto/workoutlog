import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { WorkoutSummaryModal } from '../src/components/WorkoutSummaryModal';
import { WorkoutDetailModal } from '../src/components/WorkoutDetailModal';
import { parseImportedData } from '../src/utils/backup';
import { resetAppStore, seedAppStore, seedPersistedAppStore, useCurrentStateAsServerSnapshot } from './store-test-utils';

const summary = {
  routineId: 'routine', routineName: 'Rutina', startTime: 1, endTime: 2,
  durationSeconds: 1, completedSetsCount: 1, totalSetsCount: 1, completionPercentage: 100,
  exercisesSummary: [
    { name: 'Sentadilla', completedSets: 1, totalSets: 1 },
    { name: 'Press', completedSets: 0, totalSets: 1, isOptional: true },
  ],
};

afterEach(resetAppStore);

describe('optional exercises in workout summaries', () => {
  it('marks optional exercises in the session summary and history details', () => {
    seedPersistedAppStore({ workoutHistory: [{ ...summary, id: 'log', completedAt: '2026-01-01T00:00:00Z' }] });
    seedAppStore({ workoutSummary: summary });
    useCurrentStateAsServerSnapshot();
    for (const html of [renderToStaticMarkup(<WorkoutSummaryModal />), renderToStaticMarkup(<WorkoutDetailModal logId="log" onClose={() => {}} />)]) {
      expect(html).toContain('Press');
      expect(html).toContain('Opcional');
      expect(html).toContain('0 / 1 series');
    }
  });

  it('preserves the optional marker when importing a history backup', () => {
    const imported = parseImportedData(JSON.stringify({ workoutHistory: [{ ...summary, id: 'log' }] }));
    expect(imported.workoutHistory[0].exercisesSummary[1].isOptional).toBe(true);
  });
});
