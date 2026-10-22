import React from 'react';
import { BarChart3 } from 'lucide-react';
import { useAnalyticsPreference } from '../hooks/shell/useAnalyticsPreference';

export const AnalyticsPreferenceControl: React.FC = () => {
  const { configured, enabled, pending, onEnable, onDisable } = useAnalyticsPreference();
  if (!configured) return null;

  return (
    <div
      className="mx-3 mb-3 rounded-2xl border border-white/10 bg-[#121214] p-3"
      aria-label="Estadísticas de uso"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/5 bg-zinc-900 text-zinc-400">
          <BarChart3 className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-white">Estadísticas de uso</div>
          <p className="mt-0.5 text-[11px] leading-4 text-zinc-500">
            Google Analytics anónimo. Puedes cambiarlo cuando quieras.
          </p>
        </div>
      </div>
      {pending ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onDisable}
            className="min-h-[48px] rounded-xl border border-white/10 bg-[#242428] px-3 text-xs font-bold text-white transition-all active:scale-[0.97]"
          >
            Rechazar
          </button>
          <button
            type="button"
            onClick={onEnable}
            className="min-h-[48px] rounded-xl bg-[#00FF87] px-3 text-xs font-extrabold text-black transition-all active:scale-[0.97]"
          >
            Aceptar
          </button>
        </div>
      ) : (
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={enabled ? onDisable : onEnable}
          className={`mt-2 flex min-h-[48px] w-full items-center justify-between rounded-xl border px-3 text-xs font-bold transition-all active:scale-[0.97] ${
            enabled
              ? 'border-[#00FF87]/40 bg-[#00FF87]/15 text-[#00FF87]'
              : 'border-white/10 bg-[#242428] text-zinc-300'
          }`}
        >
          <span>{enabled ? 'Activadas' : 'Desactivadas'}</span>
          <span
            aria-hidden="true"
            className={`relative h-6 w-10 rounded-full ${
              enabled ? 'bg-[#00FF87]' : 'bg-zinc-700'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-black transition-transform ${
                enabled ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </span>
        </button>
      )}
    </div>
  );
};
