import React from 'react';
import { useLocalCleanupPending } from '../hooks/shell/useLocalCleanupPending';

export const LocalCleanupPendingScreen: React.FC = () => {
  const { error, isSigningOut, onRetry } = useLocalCleanupPending();

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white flex items-center justify-center p-5">
      <section
        role="alert"
        aria-busy={isSigningOut}
        className="w-full max-w-lg rounded-3xl border border-rose-500/40 bg-[#1C1C1E] p-6 shadow-2xl sm:p-8"
      >
        <p className="text-[11px] font-extrabold uppercase tracking-widest text-rose-300">
          Limpieza local incompleta
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight">
          No se pudieron eliminar por completo tus datos locales.
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-300">
          La sesión en línea ya se cerró. Reintenta la limpieza para quitar los datos de esta cuenta
          y del dispositivo antes de continuar.
        </p>
        {error && (
          <p className="mt-3 break-words text-sm text-rose-200">{error}</p>
        )}
        <button
          type="button"
          onClick={onRetry}
          disabled={isSigningOut}
          className="mt-6 min-h-[48px] w-full rounded-2xl bg-[#00FF87] px-5 py-3 font-extrabold text-black shadow-[0_0_20px_rgba(0,255,135,0.35)] transition-all active:scale-[0.97] disabled:cursor-wait disabled:opacity-60"
        >
          {isSigningOut ? 'Limpiando datos…' : 'Reintentar limpieza'}
        </button>
      </section>
    </div>
  );
};
