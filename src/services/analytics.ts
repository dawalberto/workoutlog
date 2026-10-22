import {
  DENIED_CONSENT_COMMAND,
  GRANTED_ANALYTICS_CONSENT_COMMAND,
  parseMeasurementId,
  type AnalyticsConsent,
  type AnalyticsEventName,
  type AnalyticsEventParams,
} from '../utils/analytics';

export interface AnalyticsGtag {
  (...args: unknown[]): void;
}

export interface AnalyticsHost {
  dataLayer: unknown[];
  gtag?: AnalyticsGtag;
  document?: {
    getElementById(id: string): { id: string } | null;
    createElement(tag: string): { id: string; async: boolean; src: string };
    head?: { appendChild(node: { id: string }): void };
  };
  location?: { origin: string };
}

const GTAG_SCRIPT_ID = 'ga4-gtag';
const GTAG_SRC = 'https://www.googletagmanager.com/gtag/js';

export interface AnalyticsRuntime {
  measurementId: string | null;
  isConfigured: boolean;
  origin(): string;
  install(debugMode: boolean): void;
  applyConsent(consent: AnalyticsConsent): void;
  track(name: AnalyticsEventName, params?: AnalyticsEventParams): void;
}

function readHost(): AnalyticsHost {
  return globalThis as typeof globalThis & AnalyticsHost;
}

export function createAnalyticsRuntime(
  measurementIdValue: string | undefined,
  host: AnalyticsHost = readHost(),
): AnalyticsRuntime {
  const measurementId = parseMeasurementId(measurementIdValue);
  let installed = false;

  const ensureGtag = (): AnalyticsGtag => {
    if (typeof host.gtag === 'function') {
      return host.gtag;
    }
    host.dataLayer = host.dataLayer ?? [];
    // CRITICAL: Google's gtag.js explicitly checks for `[object Arguments]`.
    // Pushing a standard Array (...args) causes gtag.js to silently drop commands (config, event, consent).
    const gtagFn: AnalyticsGtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      host.dataLayer.push(arguments);
    };
    host.gtag = gtagFn;
    return gtagFn;
  };

  const gtag: AnalyticsGtag = (...args) => {
    const fn = ensureGtag();
    fn(...args);
  };

  return {
    measurementId,
    isConfigured: measurementId !== null,
    origin: () => host.location?.origin ?? '',
    install(debugMode: boolean) {
      if (!measurementId || installed) return;
      installed = true;
      ensureGtag();
      gtag('consent', 'default', {
        ...DENIED_CONSENT_COMMAND,
        wait_for_update: 2000,
      });
      gtag('js', new Date());
      gtag('config', measurementId, {
        anonymize_ip: true,
        send_page_view: false,
        debug_mode: debugMode,
      });
      const doc = host.document;
      if (!doc || doc.getElementById(GTAG_SCRIPT_ID)) return;
      const script = doc.createElement('script');
      script.id = GTAG_SCRIPT_ID;
      script.async = true;
      script.src = `${GTAG_SRC}?id=${measurementId}`;
      doc.head?.appendChild(script);
    },
    applyConsent(nextConsent: AnalyticsConsent) {
      if (!measurementId || !installed) return;
      if (nextConsent === 'granted') {
        gtag('consent', 'update', { ...GRANTED_ANALYTICS_CONSENT_COMMAND });
        return;
      }
      if (nextConsent === 'denied') {
        gtag('consent', 'update', { ...DENIED_CONSENT_COMMAND });
      }
    },
    track(name, params = {}) {
      if (!measurementId || !installed) return;
      gtag('event', name, params);
    },
  };
}
