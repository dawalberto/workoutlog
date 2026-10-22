import React from 'react';
import { useAnalyticsConsentBanner } from '../hooks/shell/useAnalyticsConsentBanner';

export const AnalyticsConsentBanner: React.FC = () => {
  const { visible, onAccept, onReject } = useAnalyticsConsentBanner();
  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Consentimiento de estadísticas"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-[#121214]/95 px-4 pt-4 backdrop-blur-xl pb-[max(1rem,env(safe-area-inset-bottom,0px))]"
    >
      <div className="mx-auto w-full max-w-lg space-y-3">
        <p className="text-sm leading-5 text-zinc-300">
          Usamos Google Analytics para entender cómo se usa la app. No enviamos tu
          nombre, correo ni el contenido de tus entrenamientos.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            id="btn-analytics-reject"
            type="button"
            onClick={onReject}
            className="min-h-[48px] rounded-2xl border border-white/10 bg-[#242428] px-3 text-sm font-bold text-white transition-all active:scale-[0.97]"
          >
            Rechazar
          </button>
          <button
            id="btn-analytics-accept"
            type="button"
            onClick={onAccept}
            className="min-h-[48px] rounded-2xl bg-[#00FF87] px-3 text-sm font-extrabold text-black shadow-[0_0_20px_rgba(0,255,135,0.35)] transition-all hover:bg-[#00e57a] active:scale-[0.97]"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};
