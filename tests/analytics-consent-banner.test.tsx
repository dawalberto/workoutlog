import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import {
  resetAppStore,
  seedAppStore,
  useCurrentStateAsServerSnapshot,
} from './store-test-utils';

afterEach(() => {
  resetAppStore();
});

describe('AnalyticsConsentBanner', () => {
  it('renders nothing until analytics is configured and consent is pending', async () => {
    const { AnalyticsConsentBanner } = await import('../src/components/AnalyticsConsentBanner');
    seedAppStore({
      analyticsConfigured: false,
      analyticsConsentReady: true,
      analyticsConsent: 'unknown',
    });
    useCurrentStateAsServerSnapshot();
    expect(renderToStaticMarkup(React.createElement(AnalyticsConsentBanner))).toBe('');
  });

  it('accepts analytics from the Spanish banner', async () => {
    const { AnalyticsConsentBanner } = await import('../src/components/AnalyticsConsentBanner');
    const { useAnalyticsConsentBanner } = await import('../src/hooks/shell/useAnalyticsConsentBanner');
    seedAppStore({
      analyticsConfigured: true,
      analyticsConsentReady: true,
      analyticsConsent: 'unknown',
    });
    useCurrentStateAsServerSnapshot();
    const markup = renderToStaticMarkup(React.createElement(AnalyticsConsentBanner));
    expect(markup).toContain('Usamos Google Analytics');
    expect(markup).toContain('id="btn-analytics-accept"');
    expect(markup).toContain('id="btn-analytics-reject"');
    expect(markup).toContain('Aceptar');
    expect(markup).toContain('Rechazar');

    let actions!: ReturnType<typeof useAnalyticsConsentBanner>;
    const Capture: React.FC = () => {
      actions = useAnalyticsConsentBanner();
      return null;
    };
    renderToStaticMarkup(React.createElement(Capture));
    expect(actions.visible).toBe(true);
    actions.onAccept();

    const { appStore } = await import('../src/store/appStore');
    expect(appStore.getState().analyticsConsent).toBe('granted');
  });

  it('rejects analytics from the Spanish banner', async () => {
    const { useAnalyticsConsentBanner } = await import('../src/hooks/shell/useAnalyticsConsentBanner');
    seedAppStore({
      analyticsConfigured: true,
      analyticsConsentReady: true,
      analyticsConsent: 'unknown',
    });
    useCurrentStateAsServerSnapshot();

    let actions!: ReturnType<typeof useAnalyticsConsentBanner>;
    const Capture: React.FC = () => {
      actions = useAnalyticsConsentBanner();
      return null;
    };
    renderToStaticMarkup(React.createElement(Capture));
    expect(actions.visible).toBe(true);
    actions.onReject();

    const { appStore } = await import('../src/store/appStore');
    expect(appStore.getState().analyticsConsent).toBe('denied');
  });
});

describe('AnalyticsPreferenceControl', () => {
  it('renders nothing when analytics is not configured', async () => {
    const { AnalyticsPreferenceControl } = await import('../src/components/AnalyticsPreferenceControl');
    seedAppStore({
      analyticsConfigured: false,
      analyticsConsent: 'unknown',
    });
    useCurrentStateAsServerSnapshot();
    expect(renderToStaticMarkup(React.createElement(AnalyticsPreferenceControl))).toBe('');
  });

  it('allows toggling consent when configured', async () => {
    const { AnalyticsPreferenceControl } = await import('../src/components/AnalyticsPreferenceControl');
    const { useAnalyticsPreference } = await import('../src/hooks/shell/useAnalyticsPreference');
    seedAppStore({
      analyticsConfigured: true,
      analyticsConsent: 'granted',
    });
    useCurrentStateAsServerSnapshot();

    const markup = renderToStaticMarkup(React.createElement(AnalyticsPreferenceControl));
    expect(markup).toContain('Estadísticas de uso');
    expect(markup).toContain('Activadas');

    let actions!: ReturnType<typeof useAnalyticsPreference>;
    const Capture: React.FC = () => {
      actions = useAnalyticsPreference();
      return null;
    };
    renderToStaticMarkup(React.createElement(Capture));
    expect(actions.enabled).toBe(true);
    actions.onDisable();

    const { appStore } = await import('../src/store/appStore');
    expect(appStore.getState().analyticsConsent).toBe('denied');
  });
});
