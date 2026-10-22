import { useAppStore } from '../../store/appStore';

export function useAnalyticsConsentBanner() {
  const configured = useAppStore((state) => state.analyticsConfigured);
  const ready = useAppStore((state) => state.analyticsConsentReady);
  const consent = useAppStore((state) => state.analyticsConsent);
  const setAnalyticsConsentState = useAppStore((state) => state.setAnalyticsConsentState);
  const visible = configured && ready && consent === 'unknown';

  return {
    visible,
    onAccept: () => setAnalyticsConsentState('granted'),
    onReject: () => setAnalyticsConsentState('denied'),
  };
}
