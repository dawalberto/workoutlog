import React from 'react';
import { Flame, Dumbbell, Trophy, ArrowDownUp, X, ChevronRight } from 'lucide-react';
import { AppTab } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface SidebarMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  routinesCount: number;
  catalogCount: number;
  rmCount: number;
  onOpenBackup: () => void;
}

export const SidebarMenu: React.FC<SidebarMenuProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  routinesCount,
  catalogCount,
  rmCount,
  onOpenBackup,
}) => {
  if (!isOpen) return null;

  const handleNav = (tab: AppTab) => {
    onSelectTab(tab);
    onClose();
  };

  const handleBackup = () => {
    onOpenBackup();
    onClose();
  };

  return (
    <div
      id="sidebar-menu-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="sidebar-menu-panel"
        className="w-80 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col justify-between border-l border-zinc-200 animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          {/* Drawer Header */}
          <div className="p-4 sm:p-5 border-b border-zinc-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-zinc-950 text-white flex items-center justify-center shadow-xs">
                <Flame className="w-4 h-4 text-emerald-400 fill-current" />
              </span>
              <div>
                <span className="text-base font-black tracking-tight text-zinc-900 block leading-tight">
                  WorkoutLog
                </span>
                <span className="text-[10px] text-zinc-600 font-medium">
                  Menú de navegación
                </span>
              </div>
            </div>

            <button
              id="btn-close-sidebar-menu"
              type="button"
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-xl hover:bg-zinc-100 transition-colors"
              aria-label="Cerrar menú"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="p-3 sm:p-4 space-y-1.5">
            <div className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider px-3 py-1">
              Vistas Principales
            </div>

            {/* Rutinas */}
            <button
              id="sidebar-link-routines"
              type="button"
              onClick={() => handleNav(AppTab.ROUTINES)}
              className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all ${
                activeTab === AppTab.ROUTINES
                  ? 'bg-emerald-50 text-emerald-950 font-bold border border-emerald-200/80 shadow-2xs'
                  : 'text-zinc-700 hover:bg-zinc-100 font-semibold'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    activeTab === AppTab.ROUTINES
                      ? 'bg-emerald-600 text-white'
                      : 'bg-zinc-100 text-zinc-600'
                  }`}
                >
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm">Rutinas</div>
                  <div className="text-[11px] text-zinc-600 font-normal">
                    Planificador y sesiones
                  </div>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === AppTab.ROUTINES
                    ? 'bg-emerald-200/70 text-emerald-900'
                    : 'bg-zinc-100 text-zinc-600'
                }`}
              >
                {routinesCount}
              </span>
            </button>

            {/* Biblioteca de Ejercicios */}
            <button
              id="sidebar-link-exercises"
              type="button"
              onClick={() => handleNav(AppTab.EXERCISES)}
              className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all ${
                activeTab === AppTab.EXERCISES
                  ? 'bg-emerald-50 text-emerald-950 font-bold border border-emerald-200/80 shadow-2xs'
                  : 'text-zinc-700 hover:bg-zinc-100 font-semibold'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    activeTab === AppTab.EXERCISES
                      ? 'bg-emerald-600 text-white'
                      : 'bg-zinc-100 text-zinc-600'
                  }`}
                >
                  <Dumbbell className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm">Biblioteca de Ejercicios</div>
                  <div className="text-[11px] text-zinc-600 font-normal">
                    Catálogo y técnica
                  </div>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === AppTab.EXERCISES
                    ? 'bg-emerald-200/70 text-emerald-900'
                    : 'bg-zinc-100 text-zinc-600'
                }`}
              >
                {catalogCount}
              </span>
            </button>

            {/* Registro de RMs */}
            <button
              id="sidebar-link-rms"
              type="button"
              onClick={() => handleNav(AppTab.RMS)}
              className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all ${
                activeTab === AppTab.RMS
                  ? 'bg-emerald-50 text-emerald-950 font-bold border border-emerald-200/80 shadow-2xs'
                  : 'text-zinc-700 hover:bg-zinc-100 font-semibold'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    activeTab === AppTab.RMS
                      ? 'bg-emerald-600 text-white'
                      : 'bg-zinc-100 text-zinc-600'
                  }`}
                >
                  <Trophy className="w-4 h-4 text-amber-500 fill-amber-500/20" />
                </div>
                <div>
                  <div className="text-sm">Registro de RMs</div>
                  <div className="text-[11px] text-zinc-600 font-normal">
                    Pesos máximos (1RM) e histórico
                  </div>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === AppTab.RMS
                    ? 'bg-emerald-200/70 text-emerald-900'
                    : 'bg-zinc-100 text-zinc-600'
                }`}
              >
                {rmCount}
              </span>
            </button>

            <div className="pt-4 pb-1">
              <div className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider px-3 py-1">
                Herramientas y Datos
              </div>
            </div>

            {/* Copia de Seguridad */}
            <button
              id="sidebar-link-backup"
              type="button"
              onClick={handleBackup}
              className="w-full flex items-center justify-between p-3 rounded-2xl text-left text-zinc-700 hover:bg-zinc-100 font-semibold transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-zinc-100 text-zinc-600 flex items-center justify-center">
                  <ArrowDownUp className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm">Copia de Seguridad</div>
                  <div className="text-[11px] text-zinc-600 font-normal">
                    Importar / Exportar JSON
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between">
          <PWAInstallButton />
          <span className="text-[11px] text-zinc-600 font-medium">v2.1 • Offline</span>
        </div>
      </div>
    </div>
  );
};
