export const LANGUAGES = ['es', 'en', 'zh', 'hi', 'fr'] as const;
export type Language = typeof LANGUAGES[number];
export type WeightUnit = 'kg' | 'lb';
export interface Preferences { language: Language; weightUnit: WeightUnit; languageExplicit: boolean }

export function browserLanguage(languages: readonly string[]): Language {
  for (const language of languages) {
    const base = language.toLowerCase().split('-')[0];
    if (LANGUAGES.includes(base as Language)) return base as Language;
  }
  return 'es';
}

export function parsePreferences(value: unknown, fallback: Language): Preferences {
  const stored = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    language: LANGUAGES.includes(stored.language as Language) ? stored.language as Language : fallback,
    languageExplicit: LANGUAGES.includes(stored.language as Language),
    weightUnit: stored.weightUnit === 'lb' ? 'lb' : 'kg',
  };
}
