import React, { useState } from 'react';
import { Download, Share, PlusSquare, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed or running as standalone, hide button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        id="btn-pwa-install"
        type="button"
        onClick={install}
        className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-bold rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white shadow-xs transition-all active:scale-95 shrink-0"
        title="Instalar WorkoutLog como aplicación"
      >
        <Download className="w-3.5 h-3.5 text-emerald-400" />
        <span className="hidden sm:inline">Instalar App</span>
        <span className="sm:hidden">Instalar</span>
      </button>
    );
  }

  // iOS Safari flow (WebKit doesn't trigger beforeinstallprompt)
  if (isIOS) {
    return (
      <>
        <button
          id="btn-pwa-install-ios"
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-bold rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-800 shadow-2xs transition-all active:scale-95 shrink-0"
          title="Instalar en iPhone o iPad"
        >
          <Download className="w-3.5 h-3.5 text-emerald-600" />
          <span className="hidden sm:inline">Instalar en iPhone</span>
          <span className="sm:hidden">Instalar</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-zinc-200">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-zinc-950 text-white flex items-center justify-center">
                    <Download className="w-4 h-4 text-emerald-400" />
                  </span>
                  <h3 className="text-sm font-bold text-zinc-900">Instalar en iPhone / iPad</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-3 space-y-3 text-xs text-zinc-600">
                <div className="flex items-start gap-2.5 bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                  <div className="w-6 h-6 rounded-md bg-zinc-200 text-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Share className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div>
                    <strong className="text-zinc-900 font-semibold block">1. Pulsa Compartir</strong>
                    <span>Toca el botón Compartir en la barra inferior de Safari.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                  <div className="w-6 h-6 rounded-md bg-zinc-200 text-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                    <PlusSquare className="w-3.5 h-3.5 text-zinc-900" />
                  </div>
                  <div>
                    <strong className="text-zinc-900 font-semibold block">2. Añadir a pantalla de inicio</strong>
                    <span>Desliza hacia abajo y pulsa en "Añadir a pantalla de inicio".</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-xl bg-zinc-900 py-2.5 text-xs font-bold text-white hover:bg-zinc-800 transition"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
