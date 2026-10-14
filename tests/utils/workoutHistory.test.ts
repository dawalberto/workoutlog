import { describe, expect, it } from 'vitest';
import type { WorkoutHistoryLog } from '../../src/types';
import {
  getWorkoutHistoryCalendarCells,
  getWorkoutHistoryDateKey,
  getWorkoutHistoryStats,
  groupWorkoutHistoryByDate,
} from '../../src/utils/workoutHistory';

function createLog(id: string, completedAt: string): WorkoutHistoryLog {
  return {
    id,
    routineId: `routine-${id}`,
    routineName: `Routine ${id}`,
    startTime: 0,
    endTime: new Date(completedAt).getTime(),
    completedAt,
    durationSeconds: 600,
    completedSetsCount: 3,
    totalSetsCount: 3,
    completionPercentage: 100,
    exercisesSummary: [],
  };
}

describe('workoutHistory', () => {
  it('groups logs by their local completion date and preserves log order', () => {
    const logs = [
      createLog('first', '2026-10-13T09:00:00'),
      createLog('second', '2026-10-13T18:00:00'),
      createLog('third', '2026-10-14T09:00:00'),
    ];

    expect(getWorkoutHistoryDateKey(logs[0]!)).toBe('2026-10-13');
    expect([...groupWorkoutHistoryByDate(logs)].map(([date, grouped]) => [
      date,
      grouped.map(({ id }) => id),
    ])).toEqual([
      ['2026-10-13', ['first', 'second']],
      ['2026-10-14', ['third']],
    ]);
  });

  it('counts current ISO week, month, and all completed workouts', () => {
    const logs = [
      createLog('monday', '2026-10-12T09:00:00'),
      createLog('sunday', '2026-10-18T09:00:00'),
      createLog('next-week', '2026-10-19T09:00:00'),
      createLog('last-month', '2026-09-30T09:00:00'),
    ];

    expect(getWorkoutHistoryStats(logs, new Date(2026, 9, 14, 12))).toEqual({
      currentWeekCount: 2,
      currentMonthCount: 3,
      totalCount: 4,
    });
  });

  it('builds a Monday-first calendar grid with neighboring month workouts', () => {
    const logsByDate = groupWorkoutHistoryByDate([
      createLog('previous', '2026-09-28T09:00:00'),
      createLog('today', '2026-10-13T09:00:00'),
      createLog('next', '2026-11-01T09:00:00'),
    ]);
    const cells = getWorkoutHistoryCalendarCells(2026, 9, logsByDate, new Date(2026, 9, 13));

    expect(cells).toHaveLength(35);
    expect(cells[0]).toMatchObject({
      dateKey: '2026-09-28',
      isCurrentMonth: false,
      workouts: [logsByDate.get('2026-09-28')![0]],
    });
    expect(cells.find(({ isToday }) => isToday)).toMatchObject({
      dateKey: '2026-10-13',
      workouts: [logsByDate.get('2026-10-13')![0]],
    });
    expect(cells.at(-1)).toMatchObject({
      dateKey: '2026-11-01',
      isCurrentMonth: false,
      workouts: [logsByDate.get('2026-11-01')![0]],
    });
  });
});
