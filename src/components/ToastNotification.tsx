/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';

export interface ToastNotificationProps {
  message: string | null;
  onClose: () => void;
  durationMs?: number;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({
  message,
  onClose,
  durationMs = 4000,
}) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, durationMs);

    return () => clearTimeout(timer);
  }, [message, durationMs, onClose]);

  if (!message) return null;

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-zinc-950 text-white rounded-2xl shadow-xl border border-zinc-800 text-xs font-semibold flex items-center gap-2.5 max-w-md animate-in fade-in slide-in-from-bottom-3">
      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
      <span className="flex-1 truncate">{message}</span>
      <button
        type="button"
        onClick={onClose}
        className="p-0.5 text-zinc-400 hover:text-white rounded"
        aria-label="Cerrar notificación"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
