import React from 'react';
import { BellRing } from 'lucide-react';
import { useRestPushPrompt } from '../hooks/shell/useRestPushPrompt';

export const RestPushPrompt: React.FC = () => {
  const { user, restPush, enablePush } = useRestPushPrompt();
  if (!user) return null;

  if (restPush.support === 'needs-install') {
    return (
      <p className="px-2 text-center text-xs leading-5 text-zinc-300">
        Instala la app en la pantalla de inicio para recibir avisos con el móvil bloqueado
      </p>
    );
  }

  if (restPush.permission === 'denied') {
    return (
      <p className="px-2 text-center text-xs leading-5 text-zinc-300">
        Activa las notificaciones de WorkoutLog en los ajustes del móvil
      </p>
    );
  }

  if (
    restPush.support !== 'available' ||
    restPush.subscription
  ) {
    return null;
  }

  return (
    <div className="w-full space-y-1.5">
      <button
        type="button"
        onClick={enablePush}
        className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-[#242428] px-3 text-xs font-bold text-white transition-all active:scale-[0.97]"
      >
        <BellRing className="h-4 w-4 text-[#00FF87]" />
        Avisarme con el móvil bloqueado
      </button>
      {restPush.error && (
        <p role="status" className="px-2 text-center text-xs leading-5 text-amber-300">
          {restPush.error}
        </p>
      )}
    </div>
  );
};
