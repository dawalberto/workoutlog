import { AppTab, type WorkoutCompletionSummary } from '../types';

export type AnalyticsConsent = 'unknown' | 'granted' | 'denied';

export const ANALYTICS_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]+$/i;

export const ANALYTICS_EVENTS = {
  PAGE_VIEW: 'page_view',
  LOGIN: 'login',
  WORKOUT_START: 'workout_start',
  WORKOUT_COMPLETE: 'workout_complete',
  APP_INSTALL: 'app_install',
  BACKUP_EXPORT: 'backup_export',
  BACKUP_IMPORT: 'backup_import',
  EXERCISE_CREATE: 'exercise_create',
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export type AnalyticsEventParams = Record<string, string | number | boolean>;

export const DENIED_CONSENT_COMMAND = {
  analytics_storage: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  functionality_storage: 'denied',
  personalization_storage: 'denied',
  security_storage: 'granted',
} as const;

export const GRANTED_ANALYTICS_CONSENT_COMMAND = {
  analytics_storage: 'granted',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
} as const;

const TAB_PAGES: Record<AppTab, { path: string; title: string }> = {
  [AppTab.ROUTINES]: { path: '/workoutlog/routines', title: 'Rutinas' },
  [AppTab.EXERCISES]: { path: '/workoutlog/exercises', title: 'Ejercicios' },
  [AppTab.RMS]: { path: '/workoutlog/rms', title: 'RMs' },
  [AppTab.HISTORY]: { path: '/workoutlog/history', title: 'Historial' },
  [AppTab.DIARY]: { path: '/workoutlog/diary', title: 'Diario' },
};

export function parseMeasurementId(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return ANALYTICS_MEASUREMENT_ID_PATTERN.test(trimmed) ? trimmed.toUpperCase() : null;
}

export function parseAnalyticsConsent(value: unknown): AnalyticsConsent {
  if (value === 'granted' || value === 'denied') return value;
  return 'unknown';
}

export function tabPagePath(tab: AppTab): string {
  return TAB_PAGES[tab].path;
}

export function tabPageTitle(tab: AppTab): string {
  return TAB_PAGES[tab].title;
}

export function pageViewParams(
  tab: AppTab,
  origin = '',
): AnalyticsEventParams {
  const path = tabPagePath(tab);
  return {
    page_title: tabPageTitle(tab),
    page_path: path,
    page_location: origin ? `${origin}${path}` : path,
  };
}

export function workoutCompleteParams(
  summary: Pick<
    WorkoutCompletionSummary,
    | 'durationSeconds'
    | 'completedSetsCount'
    | 'totalSetsCount'
    | 'completionPercentage'
    | 'exercisesSummary'
  >,
): AnalyticsEventParams {
  const params: AnalyticsEventParams = {
    duration_seconds: summary.durationSeconds,
    completed_sets: summary.completedSetsCount,
    exercise_count: summary.exercisesSummary.length,
  };
  if (summary.totalSetsCount !== null) params.total_sets = summary.totalSetsCount;
  if (summary.completionPercentage !== null) {
    params.completion_percentage = summary.completionPercentage;
  }
  return params;
}

export function newlyStartedRoutineIds(
  previousSessions: Record<string, { startTime?: number }>,
  nextSessions: Record<string, { startTime?: number }>,
): string[] {
  return Object.keys(nextSessions).filter((routineId) => {
    const nextStart = nextSessions[routineId]?.startTime;
    const previousStart = previousSessions[routineId]?.startTime;
    return Boolean(nextStart) && !previousStart;
  });
}

export interface AnalyticsStoreSnapshot {
  activeTab: AppTab;
  userId: string | null;
  activeSessions: Record<string, { startTime?: number }>;
  workoutSummary: WorkoutCompletionSummary | null;
  analyticsEvent: { sequence: number; name: AnalyticsEventName; params: AnalyticsEventParams } | null;
}

export interface AnalyticsTransition {
  name: AnalyticsEventName;
  params: AnalyticsEventParams;
}

export function analyticsTransitions(
  previous: AnalyticsStoreSnapshot,
  next: AnalyticsStoreSnapshot,
  origin = '',
): AnalyticsTransition[] {
  const events: AnalyticsTransition[] = [];
  if (previous.activeTab !== next.activeTab) {
    events.push({
      name: ANALYTICS_EVENTS.PAGE_VIEW,
      params: pageViewParams(next.activeTab, origin),
    });
  }
  if (!previous.userId && next.userId) {
    events.push({
      name: ANALYTICS_EVENTS.LOGIN,
      params: { method: 'google' },
    });
  }
  newlyStartedRoutineIds(previous.activeSessions, next.activeSessions).forEach(() => {
    events.push({ name: ANALYTICS_EVENTS.WORKOUT_START, params: {} });
  });
  if (!previous.workoutSummary && next.workoutSummary) {
    events.push({
      name: ANALYTICS_EVENTS.WORKOUT_COMPLETE,
      params: workoutCompleteParams(next.workoutSummary),
    });
  }
  if (
    next.analyticsEvent &&
    next.analyticsEvent.sequence !== previous.analyticsEvent?.sequence
  ) {
    events.push({
      name: next.analyticsEvent.name,
      params: next.analyticsEvent.params,
    });
  }
  return events;
}
