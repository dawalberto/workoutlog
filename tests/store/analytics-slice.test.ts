import { describe, expect, it } from 'vitest';
import { createAppStore } from '../../src/store/appStore';
import { ANALYTICS_EVENTS } from '../../src/utils/analytics';

describe('analytics slice', () => {
  it('records consent and queued events', () => {
    const store = createAppStore();
    expect(store.getState()).toMatchObject({
      analyticsConfigured: false,
      analyticsConsent: 'unknown',
      analyticsConsentReady: false,
      analyticsEvent: null,
    });

    store.getState().setAnalyticsConfigured(true);
    store.getState().setAnalyticsConsentState('granted');
    store.getState().recordAnalyticsEvent(ANALYTICS_EVENTS.APP_INSTALL);
    store.getState().recordAnalyticsEvent(ANALYTICS_EVENTS.BACKUP_IMPORT, { backup_type: 'merge' });

    expect(store.getState().analyticsConfigured).toBe(true);
    expect(store.getState().analyticsConsent).toBe('granted');
    expect(store.getState().analyticsConsentReady).toBe(true);
    expect(store.getState().analyticsEvent).toEqual({
      sequence: 2,
      name: ANALYTICS_EVENTS.BACKUP_IMPORT,
      params: { backup_type: 'merge' },
    });
  });
});
