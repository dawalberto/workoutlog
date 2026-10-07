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
    <div className="fixed bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-[#1C1C1E]/95 backdrop-blur-xl text-white rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.8),0_0_20px_rgba(0,255,135,0.25)] border border-[#00FF87]/40 text-xs font-bold flex items-center gap-3 max-w-md w-[calc(100%-2rem)] animate-slide-up">
      <CheckCircle2 className="w-5 h-5 text-[#00FF87] shrink-0 drop-shadow-[0_0_8px_rgba(0,255,135,0.6)]" />
      <span className="flex-1 truncate">{message}</span>
      <button
        type="button"
        onClick={onClose}
        className="p-1 text-zinc-400 hover:text-white rounded-lg transition-colors"
        aria-label="Cerrar notificación"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
