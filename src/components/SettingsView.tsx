import React from 'react';
import { ArrowDownUp, ChevronRight } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { t } from '../utils/i18n';
import { LANGUAGES, type Language, type WeightUnit } from '../utils/preferences';

const languageNames: Record<Language, string> = {
  es: 'Español', en: 'English', zh: '简体中文', hi: 'हिन्दी', fr: 'Français',
};

export const SettingsView: React.FC = () => {
  const preferencesReady = useAppStore((state) => state.preferencesReady);
  const language = useAppStore((state) => state.language);
  const weightUnit = useAppStore((state) => state.weightUnit);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const setWeightUnit = useAppStore((state) => state.setWeightUnit);
  const openBackupModal = useAppStore((state) => state.openBackupModal);
  return (
    <div className="mx-auto w-full max-w-lg space-y-5 px-4 py-6">
      <h1 className="text-2xl font-black tracking-tight text-white">{t('Ajustes')}</h1>
      <fieldset disabled={!preferencesReady} className="rounded-2xl border border-white/[0.08] bg-[#1C1C1E] p-4 shadow-lg">
        <legend className="px-2 text-base font-black text-white">{t('Idioma')}</legend>
        <div className="space-y-1">
          {LANGUAGES.map((option) => (
            <label key={option} className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl px-3 text-base text-white hover:bg-white/5">
              <input type="radio" name="language" value={option} checked={language === option} onChange={() => setLanguage(option)} className="h-5 w-5 accent-[#00FF87]" />
              <span lang={option}>{languageNames[option]}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset disabled={!preferencesReady} className="rounded-2xl border border-white/[0.08] bg-[#1C1C1E] p-4 shadow-lg">
        <legend className="px-2 text-base font-black text-white">{t('Unidad de peso')}</legend>
        <p className="mb-2 text-sm text-zinc-400">{t('Solo cambia la etiqueta; los valores no se convierten.')}</p>
        {(['kg', 'lb'] as WeightUnit[]).map((option) => (
          <label key={option} className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl px-3 text-base text-white hover:bg-white/5">
            <input type="radio" name="weight-unit" value={option} checked={weightUnit === option} onChange={() => setWeightUnit(option)} className="h-5 w-5 accent-[#00FF87]" />
            {option}
          </label>
        ))}
      </fieldset>
      <button
        id="settings-link-backup"
        type="button"
        onClick={openBackupModal}
        className="flex min-h-[48px] w-full items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#1C1C1E] p-4 text-left text-white shadow-lg transition-colors hover:border-white/20 active:scale-[0.97]"
      >
        <ArrowDownUp className="h-5 w-5 shrink-0 text-[#00FF87]" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block text-base font-black">{t('Copia de Seguridad')}</span>
          <span className="block text-sm text-zinc-400">{t('Importar / Exportar JSON')}</span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-zinc-400" aria-hidden="true" />
      </button>
    </div>
  );
};
