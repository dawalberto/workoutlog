import { describe, expect, it } from 'vitest';
import { createAnalyticsRuntime, type AnalyticsHost } from '../../src/services/analytics';
import { ANALYTICS_EVENTS } from '../../src/utils/analytics';

function createHost(): AnalyticsHost & { scripts: Array<{ id: string; src: string; async: boolean }> } {
  const scripts: Array<{ id: string; src: string; async: boolean }> = [];
  const dataLayer: unknown[] = [];
  return {
    dataLayer,
    scripts,
    gtag: (...args: unknown[]) => {
      dataLayer.push(args);
    },
    document: {
      getElementById(id: string) {
        return scripts.find((script) => script.id === id) ?? null;
      },
      createElement() {
        return { id: '', async: false, src: '' };
      },
      head: {
        appendChild(node: { id: string; src: string; async: boolean }) {
          scripts.push(node);
        },
      },
    },
    location: { origin: 'https://dawalberto.github.io' },
  };
}

describe('analytics runtime', () => {
  it('does not load gtag without a measurement ID', () => {
    const host = createHost();
    const runtime = createAnalyticsRuntime('', host);
    runtime.install(false);
    runtime.applyConsent('granted');
    runtime.track(ANALYTICS_EVENTS.PAGE_VIEW);
    expect(runtime.isConfigured).toBe(false);
    expect(host.scripts).toHaveLength(0);
    expect(host.dataLayer).toHaveLength(0);
  });

  it('installs Consent Mode denied, and dispatches events as cookieless pings before grant and full tracking after grant', () => {
    const host = createHost();
    const runtime = createAnalyticsRuntime('G-TEST12', host);
    runtime.install(true);
    expect(host.scripts[0]?.src).toBe('https://www.googletagmanager.com/gtag/js?id=G-TEST12');
    expect(host.dataLayer[0]).toEqual([
      'consent',
      'default',
      expect.objectContaining({
        analytics_storage: 'denied',
        ad_storage: 'denied',
        wait_for_update: 2000,
      }),
    ]);
    expect(host.dataLayer).toEqual(expect.arrayContaining([
      ['config', 'G-TEST12', expect.objectContaining({
        send_page_view: false,
        anonymize_ip: true,
        debug_mode: true,
      })],
    ]));

    // Under Advanced Consent Mode, events are dispatched even with denied consent (cookieless pings)
    runtime.track(ANALYTICS_EVENTS.WORKOUT_START);
    expect(host.dataLayer).toEqual(expect.arrayContaining([
      ['event', ANALYTICS_EVENTS.WORKOUT_START, {}],
    ]));

    runtime.applyConsent('granted');
    runtime.track(ANALYTICS_EVENTS.WORKOUT_START, { duration_seconds: 1 });
    expect(host.dataLayer).toEqual(expect.arrayContaining([
      ['consent', 'update', expect.objectContaining({ analytics_storage: 'granted', ad_storage: 'denied' })],
      ['event', ANALYTICS_EVENTS.WORKOUT_START, { duration_seconds: 1 }],
    ]));
  });

  it('updates consent to denied on reject and continues dispatching cookieless events', () => {
    const host = createHost();
    const runtime = createAnalyticsRuntime('G-TEST12', host);
    runtime.install(false);
    runtime.applyConsent('denied');
    runtime.track(ANALYTICS_EVENTS.LOGIN, { method: 'google' });
    expect(host.dataLayer).toEqual(expect.arrayContaining([
      ['consent', 'update', expect.objectContaining({ analytics_storage: 'denied' })],
      ['event', ANALYTICS_EVENTS.LOGIN, { method: 'google' }],
    ]));
  });

  it('initializes host.gtag pushing native Arguments objects when host.gtag is not predefined', () => {
    const dataLayer: unknown[] = [];
    const host: AnalyticsHost = {
      dataLayer,
      document: {
        getElementById: () => null,
        createElement: () => ({ id: '', async: false, src: '' }),
        head: { appendChild: () => {} },
      },
    };
    const runtime = createAnalyticsRuntime('G-TEST12', host);
    runtime.install(false);
    expect(typeof host.gtag).toBe('function');
    expect(host.dataLayer.length).toBeGreaterThan(0);
    // Real gtag.js requires [object Arguments], not [object Array]
    expect(Object.prototype.toString.call(host.dataLayer[0])).toBe('[object Arguments]');
    const firstArgs = Array.from(host.dataLayer[0] as IArguments);
    expect(firstArgs[0]).toBe('consent');
    expect(firstArgs[1]).toBe('default');
  });
});
