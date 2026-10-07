import React from 'react';
import type { UseSyncStatus } from '../hooks/useSync';

export interface SyncStatusProps {
  isAuthenticated: boolean;
  isPremiumActive: boolean;
  isEntitlementLoading?: boolean;
  isOnline: boolean;
  pendingChanges: number;
  status: UseSyncStatus;
  onRetry: () => void;
}

export const SyncStatus: React.FC<SyncStatusProps> = ({
  isAuthenticated,
  isPremiumActive,
  isEntitlementLoading = false,
  isOnline,
  pendingChanges,
  status,
  onRetry,
}) => {
  let title: string;
  let description: string;
  let tone = 'border-zinc-200 bg-zinc-50 text-zinc-700';
  let canRetry = false;

  if (!isPremiumActive) {
    title = 'Solo en este dispositivo';
    description = !isAuthenticated
      ? 'Plan Free: tus datos se guardan solo en este dispositivo.'
      : isEntitlementLoading
        ? 'Estamos comprobando tu plan; tus datos locales siguen disponibles.'
        : 'Premium no está activo; tus datos locales siguen disponibles.';
  } else if (!isOnline) {
    title = 'Sin conexión';
    description = 'Tus datos locales están a salvo.';
    tone = 'border-amber-200 bg-amber-50 text-amber-900';
  } else if (status.state === 'error') {
    title = 'Error de sincronización';
    description = status.error
      ? `${status.error} Tus datos locales están a salvo.`
      : 'Tus datos locales están a salvo; puedes volver a intentarlo.';
    tone = 'border-red-200 bg-red-50 text-red-900';
    canRetry = true;
  } else if (status.state === 'syncing') {
    title = 'Sincronizando';
    description = 'Tus cambios locales se están enviando.';
    tone = 'border-sky-200 bg-sky-50 text-sky-900';
  } else if (pendingChanges > 0) {
    title = 'Cambios pendientes';
    description = 'Tus datos locales están a salvo y se enviarán automáticamente.';
    tone = 'border-amber-200 bg-amber-50 text-amber-900';
  } else if (status.state === 'synced') {
    title = 'Sincronizado';
    description = status.lastSyncedAt
      ? `Última sincronización: ${new Date(status.lastSyncedAt).toLocaleTimeString()}`
      : 'Tus datos locales están sincronizados.';
    tone = 'border-emerald-200 bg-emerald-50 text-emerald-900';
  } else {
    title = 'Listo para sincronizar';
    description = 'Tus datos locales están disponibles en este dispositivo.';
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex min-w-0 items-center gap-2 border px-3 py-2 text-xs ${tone}`}
    >
      <div className="min-w-0 flex-1">
        <p className="font-bold">{title}</p>
        <p className="truncate">{description}</p>
        {isPremiumActive && pendingChanges > 0 && (
          <p className="font-semibold">
            {pendingChanges} {pendingChanges === 1 ? 'cambio pendiente' : 'cambios pendientes'}
          </p>
        )}
      </div>
      {canRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 rounded-lg border border-current px-2.5 py-1 font-bold hover:bg-white/70"
        >
          Reintentar
        </button>
      )}
    </div>
  );
};
