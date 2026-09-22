import React, { useState, useEffect } from 'react';
import { Download, Flame, Share, PlusSquare, X, Check, MoreVertical } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    try {
      const dismissed = sessionStorage.getItem('workoutlog_pwa_banner_dismissed');
      if (dismissed === 'true') {
        setIsDismissed(true);
      }
    } catch {
      // Ignore sessionStorage errors
    }
  }, []);

  // Do not show if already installed in standalone mode or dismissed by user
  if (isInstalled || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem('workoutlog_pwa_banner_dismissed', 'true');
    } catch {
      // Ignore
    }
  };

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (!success) {
        setShowGuide(true);
      }
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      {/* Mobile-optimized Install Banner */}
      <div id="pwa-mobile-banner" className="sm:hidden px-3 pt-3">
        <div className="bg-gradient-to-br from-zinc-950 to-zinc-900 text-white rounded-2xl p-3.5 border border-zinc-800 shadow-md">
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-10 h-10 rounded-xl bg-zinc-800/90 border border-zinc-700/80 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
                <Flame className="w-5 h-5 fill-current" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-white tracking-tight leading-tight">
                    Instalar WorkoutLog
                  </h4>
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400">
                    App
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-snug mt-0.5 line-clamp-2">
                  Añádela a tu pantalla de inicio para una experiencia más rápida y 100% offline.
                </p>
              </div>
            </div>

            <button
              id="btn-dismiss-pwa-banner"
              type="button"
              onClick={handleDismiss}
              className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 active:scale-95 shrink-0"
              aria-label="Cerrar aviso de instalación"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleDismiss}
              className="px-2 py-1 text-[11px] font-medium text-zinc-400 hover:text-zinc-200"
            >
              Ahora no
            </button>

            <button
              id="btn-banner-install-action"
              type="button"
              onClick={handleInstallClick}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-xs transition-transform active:scale-95"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Instalar en el móvil</span>
            </button>
          </div>
        </div>
      </div>

      {/* Guide Modal for iOS or manual install */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-zinc-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-zinc-950 text-white flex items-center justify-center">
                  <Flame className="w-4 h-4 text-emerald-400 fill-current" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 leading-tight">Instalar WorkoutLog</h3>
                  <span className="text-[11px] text-zinc-500">
                    {isIOS ? 'En iPhone / iPad (Safari)' : 'En Android / Navegador'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-zinc-600">
              {isIOS ? (
                <>
                  <div className="flex items-start gap-2.5 bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                      <Share className="w-4 h-4" />
                    </div>
                    <div>
                      <strong className="text-zinc-900 font-semibold block text-xs">1. Botón Compartir</strong>
                      <span className="text-[11px]">Toca el icono de Compartir en la barra de Safari (abajo en iPhone o arriba en iPad).</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                    <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-900 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                      <PlusSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <strong className="text-zinc-900 font-semibold block text-xs">2. Añadir a pantalla de inicio</strong>
                      <span className="text-[11px]">Desliza las opciones y pulsa en "Añadir a pantalla de inicio".</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2.5 bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                    <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                      <MoreVertical className="w-4 h-4" />
                    </div>
                    <div>
                      <strong className="text-zinc-900 font-semibold block text-xs">1. Menú del navegador</strong>
                      <span className="text-[11px]">Pulsa en el menú de 3 puntos (arriba a la derecha en Chrome/Firefox).</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Download className="w-4 h-4" />
                    </div>
                    <div>
                      <strong className="text-zinc-900 font-semibold block text-xs">2. Instalar aplicación</strong>
                      <span className="text-[11px]">Selecciona "Instalar aplicación" o "Añadir a pantalla principal".</span>
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 p-2 rounded-lg">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>Listo: se abrirá como app nativa a pantalla completa.</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-4 w-full rounded-xl bg-zinc-900 py-2.5 text-xs font-bold text-white hover:bg-zinc-800 transition"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
