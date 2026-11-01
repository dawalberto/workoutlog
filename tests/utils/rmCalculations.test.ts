import { describe, expect, it } from 'vitest';
import type { ExerciseRmLog, RmRecord } from '../../src/types';
import {
  findRmLogForExercise,
  formatRmRecordValue,
  getHighestRmRecord,
  getLatestRmRecord,
  getRmMetricUnit,
  getRmRecordMetric,
} from '../../src/utils/rmCalculations';

const weightRecord: RmRecord = {
  id: 'record-weight',
  weight: 82.5,
  date: '2026-06-10',
};

const repsRecord: RmRecord = {
  id: 'record-reps',
  weight: 120,
  metric: 'reps',
  date: '2026-06-12',
};

describe('RM metric helpers', () => {
  it('treats a missing metric as weight', () => {
    expect(getRmRecordMetric(weightRecord)).toBe('weight');
    expect(getRmRecordMetric({ ...weightRecord, metric: undefined })).toBe('weight');
  });

  it('keeps the reps metric', () => {
    expect(getRmRecordMetric(repsRecord)).toBe('reps');
  });

  it('maps metrics to their display units', () => {
    expect(getRmMetricUnit('weight')).toBe('kg');
    expect(getRmMetricUnit('reps')).toBe('reps');
  });

  it('formats a record value with its unit', () => {
    expect(formatRmRecordValue(weightRecord)).toBe('82.5 kg');
    expect(formatRmRecordValue(repsRecord)).toBe('120 reps');
  });
});

describe('RM record selection', () => {
  const mixedLog: ExerciseRmLog = {
    id: 'rm-log-mixed',
    exerciseName: 'Dominadas',
    records: [
      repsRecord,
      { id: 'record-old-weight', weight: 150, date: '2026-06-01' },
    ],
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-12T00:00:00.000Z',
  };

  it('returns the most recent record by date', () => {
    expect(getLatestRmRecord(mixedLog)?.id).toBe(repsRecord.id);
    expect(getLatestRmRecord(undefined)).toBeNull();
  });

  it('finds the highest record within the latest record metric', () => {
    const highest = getHighestRmRecord(mixedLog);

    expect(highest?.id).toBe(repsRecord.id);
    expect(highest?.weight).toBe(120);
  });

  it('finds the highest weight when the latest record is weight-based', () => {
    const log: ExerciseRmLog = {
      ...mixedLog,
      records: [
        { id: 'record-a', weight: 100, date: '2026-06-12' },
        { id: 'record-b', weight: 150, date: '2026-06-01' },
      ],
    };

    expect(getHighestRmRecord(log)?.id).toBe('record-b');
  });

  it('matches an RM log by definition id or normalized name', () => {
    const log: ExerciseRmLog = {
      ...mixedLog,
      exerciseId: 'definition-pullup',
      exerciseName: 'Dominadas',
    };

    expect(findRmLogForExercise([log], 'Otra', 'definition-pullup')?.id).toBe(log.id);
    expect(findRmLogForExercise([log], '  dominadas ')?.id).toBe(log.id);
  });
});
