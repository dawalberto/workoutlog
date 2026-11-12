import { appStore } from '../store/appStore';
import translations from '../data/translations.json';
import type { Language } from './preferences';

export function t(message: string, ...values: unknown[]): string {
  const { language, weightUnit } = appStore.getState();
  const dictionary = translations as Record<Exclude<Language, 'es'>, Record<string, string>>;
  const translated = language === 'es' ? message : dictionary[language]?.[message] ?? message;
  const withUnit = /\bkg\b/.test(message)
    ? translated.replace(/\bkg\b|公斤|किलो/g, weightUnit)
    : translated;
  return withUnit
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&rarr;/g, '→')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, '\u00a0')
    .replace(/\{(\d+)\}/g, (match, index: string) => Number(index) < values.length ? String(values[Number(index)]) : match);
}

export function displayedWeightUnit(): string {
  return appStore.getState().weightUnit;
}

export function currentLocale(): string {
  const language = appStore.getState().language;
  return language === 'es' ? 'es-ES' : language === 'zh' ? 'zh-CN' : language;
}
