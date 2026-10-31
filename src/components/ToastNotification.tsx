/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { CheckCircle2, LogIn, X } from 'lucide-react';
import { useToast } from '../hooks/shell/useToast';

export const ToastNotification: React.FC = () => {
  const { message, onClose, onSignIn, showSignIn, isSigningIn } = useToast();
  const durationMs = showSignIn ? 8000 : 4000;
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, durationMs);

    return () => clearTimeout(timer);
  }, [message, onClose, durationMs]);

  if (!message) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-[#1C1C1E]/95 backdrop-blur-xl text-white rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.8),0_0_20px_rgba(0,255,135,0.25)] border border-[#00FF87]/40 text-xs font-bold flex items-start gap-3 max-w-md w-[calc(100%-2rem)] animate-slide-up">
      <CheckCircle2 className="mt-0.5 w-5 h-5 text-[#00FF87] shrink-0 drop-shadow-[0_0_8px_rgba(0,255,135,0.6)]" />
      <div className="flex-1 min-w-0">
        <p className="whitespace-normal break-words leading-relaxed">{message}</p>
        {showSignIn && (
          <button
            type="button"
            onClick={() => {
              void onSignIn();
              onClose();
            }}
            disabled={isSigningIn}
            className="mt-3 inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl bg-[#00FF87] hover:bg-[#00e57a] text-black font-extrabold text-xs shadow-[0_0_15px_rgba(0,255,135,0.35)] transition-all active:scale-[0.97] disabled:cursor-wait disabled:opacity-60"
          >
            <LogIn className="w-4 h-4 stroke-[2.5]" />
            <span>{isSigningIn ? 'Iniciando sesión…' : 'Iniciar sesión'}</span>
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="p-1 text-zinc-400 hover:text-white rounded-lg transition-colors shrink-0"
        aria-label="Cerrar notificación"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
