import { useAppStore } from '../../store/appStore';

export function useAnalyticsPreference() {
  const configured = useAppStore((state) => state.analyticsConfigured);
  const consent = useAppStore((state) => state.analyticsConsent);
  const setAnalyticsConsentState = useAppStore((state) => state.setAnalyticsConsentState);

  return {
    configured,
    enabled: consent === 'granted',
    pending: consent === 'unknown',
    onEnable: () => setAnalyticsConsentState('granted'),
    onDisable: () => setAnalyticsConsentState('denied'),
  };
}
