import { afterEach, describe, expect, it } from 'vitest';
import { appStore } from '../../src/store/appStore';
import { t } from '../../src/utils/i18n';
import { browserLanguage, parsePreferences } from '../../src/utils/preferences';
import { formatExerciseSummary } from '../../src/utils/timeCalculations';
import { getRmMetricUnit } from '../../src/utils/rmCalculations';

afterEach(() => appStore.setState({ language: 'es', weightUnit: 'kg' }));

describe('device preferences', () => {
  it('chooses the first supported browser language or Spanish', () => {
    expect(browserLanguage(['de-DE', 'fr-CA', 'en-US'])).toBe('fr');
    expect(browserLanguage(['zh-Hans-CN'])).toBe('zh');
    expect(browserLanguage(['hi-IN'])).toBe('hi');
    expect(browserLanguage(['de-DE'])).toBe('es');
  });

  it('validates stored preferences and defaults to kg', () => {
    expect(parsePreferences(null, 'en')).toEqual({ language: 'en', weightUnit: 'kg', languageExplicit: false });
    expect(parsePreferences({ language: 'fr', weightUnit: 'lb' }, 'es')).toEqual({ language: 'fr', weightUnit: 'lb', languageExplicit: true });
    expect(parsePreferences({ language: 'de', weightUnit: 'invalid' }, 'hi')).toEqual({ language: 'hi', weightUnit: 'kg', languageExplicit: false });
  });

  it('changes application text and weight labels without converting values', () => {
    appStore.setState({ language: 'en', weightUnit: 'lb' });
    expect(t('Ajustes')).toBe('Settings');
    expect(t('Peso (kg)')).toContain('lb');
    expect(getRmMetricUnit('weight')).toBe('lb');
    expect(getRmMetricUnit('reps')).toBe('reps');
    expect(formatExerciseSummary([{ id: '1', setNumber: 1, reps: 5, weight: 100, restSeconds: 60 }])).toContain('100lb');
  });
});
