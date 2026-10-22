import { useEffect } from 'react';
import { DEVICE_KEYS, getDeviceStoredItem, setDeviceStoredItem } from '../services/db';
import { createAnalyticsRuntime } from '../services/analytics';
import { appStore, useAppStore } from '../store/appStore';
import {
  ANALYTICS_EVENTS,
  analyticsTransitions,
  pageViewParams,
  parseAnalyticsConsent,
  type AnalyticsConsent,
  type AnalyticsStoreSnapshot,
} from '../utils/analytics';

function readSnapshot(): AnalyticsStoreSnapshot {
  const state = appStore.getState();
  return {
    activeTab: state.activeTab,
    userId: state.user?.id ?? null,
    activeSessions: state.activeSessions,
    workoutSummary: state.workoutSummary,
    analyticsEvent: state.analyticsEvent,
  };
}

export function useAnalytics(): void {
  const setAnalyticsConfigured = useAppStore((state) => state.setAnalyticsConfigured);
  const setAnalyticsConsentState = useAppStore((state) => state.setAnalyticsConsentState);

  useEffect(() => {
    const runtime = createAnalyticsRuntime(import.meta.env.VITE_GA_MEASUREMENT_ID);
    setAnalyticsConfigured(runtime.isConfigured);
    if (!runtime.isConfigured) {
      setAnalyticsConsentState('unknown', true);
      return;
    }

    runtime.install(import.meta.env.DEV);
    runtime.track(
      ANALYTICS_EVENTS.PAGE_VIEW,
      pageViewParams(appStore.getState().activeTab, runtime.origin()),
    );
    let cancelled = false;
    let previous = readSnapshot();
    let consent: AnalyticsConsent = 'unknown';

    const applyConsent = (nextConsent: AnalyticsConsent, persist: boolean) => {
      consent = nextConsent;
      runtime.applyConsent(nextConsent);
      setAnalyticsConsentState(nextConsent, true);
      if (persist) {
        void setDeviceStoredItem(DEVICE_KEYS.ANALYTICS_CONSENT, nextConsent);
      }
    };

    void getDeviceStoredItem<unknown>(DEVICE_KEYS.ANALYTICS_CONSENT, 'unknown')
      .then((stored) => {
        if (cancelled || consent !== 'unknown') return;
        applyConsent(parseAnalyticsConsent(stored), false);
      });

    const unsubscribe = appStore.subscribe((state, prevState) => {
      const next = readSnapshot();
      const events = analyticsTransitions(previous, next, runtime.origin());
      previous = next;
      for (const event of events) runtime.track(event.name, event.params);
      if (
        state.analyticsConsent !== prevState.analyticsConsent &&
        state.analyticsConsent !== consent
      ) {
        applyConsent(state.analyticsConsent, true);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [setAnalyticsConfigured, setAnalyticsConsentState]);
}
