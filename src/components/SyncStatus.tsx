import React from 'react';
import type { UseSyncStatus } from '../hooks/useSync';

export interface SyncStatusProps {
  isSyncEnabled: boolean;
  isOnline: boolean;
  pendingChanges: number;
  status: UseSyncStatus;
  onRetry: () => void;
  onUpdate?: () => void;
}

export const SyncStatus: React.FC<SyncStatusProps> = ({
  isSyncEnabled,
  isOnline,
  pendingChanges,
  status,
  onRetry,
  onUpdate = () => window.dispatchEvent(new Event('workoutlog:update-app')),
}) => {
  let title: string;
  let description: string;
  let tone = 'border-white/[0.08] bg-[#1C1C1E] text-zinc-300';
  let canRetry = false;
  let requiresUpdate = false;

  if (!isSyncEnabled) {
    title = 'Solo en este dispositivo';
    description = 'Tus datos se guardan solo en este dispositivo.';
  } else if (status.updateRequired) {
    title = 'Actualización necesaria';
    description = 'Actualiza la app para continuar sincronizando.';
    tone = 'border-[#00FF87]/30 bg-[#00FF87]/10 text-white';
    requiresUpdate = true;
  } else if (!isOnline) {
    title = 'Sin conexión';
    description = 'Tus datos locales están a salvo.';
    tone = 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  } else if (status.state === 'error') {
    title = 'Error de sincronización';
    description = status.error
      ? `${status.error} Tus datos locales están a salvo.`
      : 'Tus datos locales están a salvo; puedes volver a intentarlo.';
    tone = 'border-red-500/30 bg-red-500/10 text-red-200';
    canRetry = true;
  } else if (status.state === 'syncing') {
    title = 'Sincronizando';
    description = 'Tus cambios locales se están enviando.';
    tone = 'border-[#00E5FF]/30 bg-[#00E5FF]/10 text-[#00E5FF]';
  } else if (pendingChanges > 0) {
    title = 'Cambios pendientes';
    description = 'Tus datos locales están a salvo y se enviarán automáticamente.';
    tone = 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  } else if (status.state === 'synced') {
    title = 'Sincronizado';
    description = status.lastSyncedAt
      ? `Última sincronización: ${new Date(status.lastSyncedAt).toLocaleTimeString()}`
      : 'Tus datos locales están sincronizados.';
    tone = 'border-[#00FF87]/30 bg-[#00FF87]/10 text-[#00FF87]';
  } else {
    title = 'Listo para sincronizar';
    description = 'Tus datos locales están disponibles en este dispositivo.';
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex min-w-0 items-center gap-2 rounded-2xl border px-3 py-2 text-xs ${tone}`}
    >
      <div className="min-w-0 flex-1">
        <p className="font-bold">{title}</p>
        <p className="truncate">{description}</p>
        {isSyncEnabled && pendingChanges > 0 && (
          <p className="font-semibold">
            {pendingChanges} {pendingChanges === 1 ? 'cambio pendiente' : 'cambios pendientes'}
          </p>
        )}
      </div>
      {canRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="min-h-[48px] shrink-0 rounded-lg border border-current px-3 font-bold hover:bg-white/10"
        >
          Reintentar
        </button>
      )}
      {requiresUpdate && (
        <button
          type="button"
          onClick={onUpdate}
          className="min-h-[48px] w-full shrink-0 rounded-xl bg-[#00FF87] px-4 font-extrabold text-black shadow-[0_0_20px_rgba(0,255,135,0.35)] transition-transform active:scale-[0.97] sm:w-auto"
        >
          Actualizar
        </button>
      )}
    </div>
  );
};
