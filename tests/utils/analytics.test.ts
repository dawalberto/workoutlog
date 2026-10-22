import { describe, expect, it } from 'vitest';
import { AppTab } from '../../src/types';
import {
  ANALYTICS_EVENTS,
  analyticsTransitions,
  parseAnalyticsConsent,
  parseMeasurementId,
  tabPagePath,
  workoutCompleteParams,
  type AnalyticsStoreSnapshot,
} from '../../src/utils/analytics';

function snapshot(overrides: Partial<AnalyticsStoreSnapshot> = {}): AnalyticsStoreSnapshot {
  return {
    activeTab: AppTab.ROUTINES,
    userId: null,
    activeSessions: {},
    workoutSummary: null,
    analyticsEvent: null,
    ...overrides,
  };
}

describe('analytics helpers', () => {
  it('accepts only GA4 measurement IDs', () => {
    expect(parseMeasurementId('G-ABC123')).toBe('G-ABC123');
    expect(parseMeasurementId(' g-abc123 ')).toBe('G-ABC123');
    expect(parseMeasurementId('UA-123')).toBeNull();
    expect(parseMeasurementId('')).toBeNull();
    expect(parseMeasurementId(undefined)).toBeNull();
  });

  it('treats unknown stored consent as unknown', () => {
    expect(parseAnalyticsConsent('granted')).toBe('granted');
    expect(parseAnalyticsConsent('denied')).toBe('denied');
    expect(parseAnalyticsConsent('legacy')).toBe('unknown');
    expect(parseAnalyticsConsent(null)).toBe('unknown');
  });

  it('maps tabs to virtual paths under /workoutlog', () => {
    expect(tabPagePath(AppTab.HISTORY)).toBe('/workoutlog/history');
  });

  it('omits names from workout complete params', () => {
    const params = workoutCompleteParams({
      durationSeconds: 3600,
      completedSetsCount: 8,
      totalSetsCount: 10,
      completionPercentage: 80,
      exercisesSummary: [
        { name: 'Sentadilla', completedSets: 4, totalSets: 4 },
        { name: 'Press banca', completedSets: 4, totalSets: 6 },
      ],
    });
    expect(params).toEqual({
      duration_seconds: 3600,
      completed_sets: 8,
      total_sets: 10,
      completion_percentage: 80,
      exercise_count: 2,
    });
    expect(JSON.stringify(params)).not.toContain('Sentadilla');
  });

  it('emits page, login, start, complete, and queued events', () => {
    const events = analyticsTransitions(
      snapshot(),
      snapshot({
        activeTab: AppTab.DIARY,
        userId: 'user-1',
        activeSessions: { 'routine-1': { startTime: 1 } },
        workoutSummary: {
          routineId: 'routine-1',
          routineName: 'Empuje',
          startTime: 1,
          endTime: 2,
          durationSeconds: 90,
          completedSetsCount: 3,
          totalSetsCount: 3,
          completionPercentage: 100,
          exercisesSummary: [{ name: 'Press banca', completedSets: 3, totalSets: 3 }],
        },
        analyticsEvent: {
          sequence: 1,
          name: ANALYTICS_EVENTS.BACKUP_EXPORT,
          params: { backup_type: 'all' },
        },
      }),
      'https://example.test',
    );
    expect(events.map((event) => event.name)).toEqual([
      ANALYTICS_EVENTS.PAGE_VIEW,
      ANALYTICS_EVENTS.LOGIN,
      ANALYTICS_EVENTS.WORKOUT_START,
      ANALYTICS_EVENTS.WORKOUT_COMPLETE,
      ANALYTICS_EVENTS.BACKUP_EXPORT,
    ]);
    expect(events[0]?.params.page_path).toBe('/workoutlog/diary');
    expect(events[0]?.params.page_location).toBe('https://example.test/workoutlog/diary');
    expect(events[1]?.params).toEqual({ method: 'google' });
    expect(JSON.stringify(events)).not.toContain('Empuje');
    expect(JSON.stringify(events)).not.toContain('Press banca');
  });

  it('does not start an already running session again', () => {
    const events = analyticsTransitions(
      snapshot({ activeSessions: { 'routine-1': { startTime: 1 } } }),
      snapshot({ activeSessions: { 'routine-1': { startTime: 1 } } }),
    );
    expect(events).toEqual([]);
  });
});
