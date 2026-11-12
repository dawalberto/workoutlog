import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RmBadge } from '../src/components/RmBadge';
import { estimateOneRepMax } from '../src/utils/rmCalculations';

describe('estimated RM', () => {
  it('uses the strongest valid configured set and preserves a single repetition load', () => {
    expect(estimateOneRepMax([{ weight: 60, reps: 10 }, { weight: '80', reps: '1' }])).toBe(80);
    expect(estimateOneRepMax([{ weight: 60, reps: 10 }])).toBe(80);
    expect(estimateOneRepMax([{ weight: 0, reps: 10 }, { weight: 50, reps: '' }, { weight: 50, reps: 2.5 }])).toBeNull();
  });

  it('labels estimates and gives registered records precedence', () => {
    const sets = [{ weight: 60, reps: 10 }];
    const estimate = renderToStaticMarkup(<RmBadge exerciseName="Sentadilla" estimatedSets={sets} />);
    expect(estimate).toContain('RM est.: 80 kg');
    expect(estimate).toContain('border-dashed');
    const record = renderToStaticMarkup(<RmBadge exerciseName="Sentadilla" estimatedSets={sets} rmLogs={[{
      id: 'log', exerciseName: 'Sentadilla', createdAt: '', updatedAt: '',
      records: [{ id: 'record', weight: 12, metric: 'reps', date: '2026-01-01' }],
    }]} />);
    expect(record).toContain('RM: 12 reps');
    expect(record).not.toContain('border-dashed');
    expect(renderToStaticMarkup(<RmBadge exerciseName="Sentadilla" />)).toBe('');
  });
});
