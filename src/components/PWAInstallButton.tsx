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
        className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-extrabold rounded-xl bg-[#00FF87] hover:bg-[#00e57a] text-black shadow-[0_0_12px_rgba(0,255,135,0.3)] transition-all active:scale-95 shrink-0"
        title="Instalar WorkoutLog como aplicación"
      >
        <Download className="w-3.5 h-3.5 stroke-[2.5]" />
        <span>Instalar App</span>
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
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-extrabold rounded-xl border border-white/10 bg-white/[0.08] hover:bg-[#00FF87] hover:border-transparent text-white hover:text-black shadow-sm transition-all active:scale-95 shrink-0"
          title="Instalar en iPhone o iPad"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Instalar en iPhone</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
            <div className="w-full max-w-sm rounded-3xl bg-[#1C1C1E] p-5 shadow-2xl border border-white/[0.1] text-white">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-[#00FF87]/15 border border-[#00FF87]/30 text-[#00FF87] flex items-center justify-center">
                    <Download className="w-4 h-4 text-[#00FF87]" />
                  </span>
                  <h3 className="text-sm font-black text-white">Instalar en iPhone / iPad</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-3.5 space-y-3 text-xs text-zinc-300">
                <div className="flex items-start gap-2.5 bg-black/30 p-3 rounded-2xl border border-white/[0.06]">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Share className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <div>
                    <strong className="text-white font-bold block">1. Pulsa Compartir</strong>
                    <span className="text-zinc-400">Toca el botón Compartir en la barra inferior de Safari.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 bg-black/30 p-3 rounded-2xl border border-white/[0.06]">
                  <div className="w-7 h-7 rounded-lg bg-[#00FF87]/15 border border-[#00FF87]/30 text-[#00FF87] flex items-center justify-center shrink-0 mt-0.5">
                    <PlusSquare className="w-3.5 h-3.5 text-[#00FF87]" />
                  </div>
                  <div>
                    <strong className="text-white font-bold block">2. Añadir a pantalla de inicio</strong>
                    <span className="text-zinc-400">Desliza hacia abajo y pulsa en &quot;Añadir a pantalla de inicio&quot;.</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full min-h-[44px] rounded-xl bg-[#00FF87] hover:bg-[#00e57a] text-black font-extrabold text-xs transition active:scale-[0.97] shadow-[0_0_15px_rgba(0,255,135,0.3)]"
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
