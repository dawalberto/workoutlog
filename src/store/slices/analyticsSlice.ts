import type { StateCreator } from 'zustand/vanilla';
import type { AnalyticsConsent, AnalyticsEventName, AnalyticsEventParams } from '../../utils/analytics';
import type { AppState } from '../appStore';

export interface AnalyticsQueuedEvent {
  sequence: number;
  name: AnalyticsEventName;
  params: AnalyticsEventParams;
}

export interface AnalyticsSlice {
  analyticsConfigured: boolean;
  analyticsConsent: AnalyticsConsent;
  analyticsConsentReady: boolean;
  analyticsEvent: AnalyticsQueuedEvent | null;
  setAnalyticsConfigured: (configured: boolean) => void;
  setAnalyticsConsentState: (consent: AnalyticsConsent, ready?: boolean) => void;
  recordAnalyticsEvent: (name: AnalyticsEventName, params?: AnalyticsEventParams) => void;
}

export const createAnalyticsSlice: StateCreator<AppState, [], [], AnalyticsSlice> =
  (set) => ({
    analyticsConfigured: false,
    analyticsConsent: 'unknown',
    analyticsConsentReady: false,
    analyticsEvent: null,
    setAnalyticsConfigured: (analyticsConfigured) => set({ analyticsConfigured }),
    setAnalyticsConsentState: (analyticsConsent, ready = true) => set({
      analyticsConsent,
      analyticsConsentReady: ready,
    }),
    recordAnalyticsEvent: (name, params = {}) => set((state) => ({
      analyticsEvent: {
        sequence: (state.analyticsEvent?.sequence ?? 0) + 1,
        name,
        params,
      },
    })),
  });
