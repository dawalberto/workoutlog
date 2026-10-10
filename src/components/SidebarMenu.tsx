/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Flame, Dumbbell, Trophy, Calendar, BookOpen, ArrowDownUp, X, ChevronRight } from 'lucide-react';
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
  historyCount: number;
  diaryCount?: number;
  onOpenBackup: () => void;
  isAuthenticated: boolean;
  userEmail: string | null;
  isSyncEnabled: boolean;
  isSyncEligibilityLoading: boolean;
  isOnline: boolean;
  isSigningIn: boolean;
  error: string | null;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
}

export const SidebarMenu: React.FC<SidebarMenuProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  routinesCount,
  catalogCount,
  rmCount,
  historyCount,
  diaryCount = 0,
  onOpenBackup,
  isAuthenticated,
  userEmail,
  isSyncEnabled,
  isSyncEligibilityLoading,
  isOnline,
  isSigningIn,
  error,
  onSignIn,
  onSignOut,
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
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex justify-end animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="sidebar-menu-panel"
        className="w-80 max-w-[85vw] bg-[#121214] text-white h-full shadow-2xl flex flex-col justify-between border-l border-white/[0.08] animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Drawer Header */}
          <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center shadow-[0_0_15px_rgba(0,255,135,0.2)]">
                <Flame className="w-5 h-5 text-[#00FF87] fill-current" />
              </span>
              <div>
                <span className="text-base font-black tracking-tight text-white block leading-tight">
                  WORKOUT<span className="text-[#00FF87]">LOG</span>
                </span>
                <span className="text-[10px] text-zinc-400 font-semibold tracking-wider uppercase">
                  Performance Gym
                </span>
              </div>
            </div>

            <button
              id="btn-close-sidebar-menu"
              type="button"
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors"
              aria-label="Cerrar menú"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="p-3 sm:p-4 space-y-1.5">
            <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-3 py-1.5">
              Vistas Principales
            </div>

            {/* Rutinas */}
            <button
              id="sidebar-link-routines"
              type="button"
              onClick={() => handleNav(AppTab.ROUTINES)}
              className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all active:scale-[0.98] ${
                activeTab === AppTab.ROUTINES
                  ? 'bg-[#00FF87]/15 text-[#00FF87] font-bold border border-[#00FF87]/40 shadow-[0_0_15px_rgba(0,255,135,0.15)]'
                  : 'text-zinc-300 hover:bg-zinc-900 hover:text-white font-semibold'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    activeTab === AppTab.ROUTINES
                      ? 'bg-[#00FF87] text-black shadow-sm'
                      : 'bg-zinc-900 text-zinc-400 border border-white/5'
                  }`}
                >
                  <Flame className="w-4 h-4 fill-current" />
                </div>
                <div>
                  <div className="text-sm font-bold">Rutinas</div>
                  <div className="text-[11px] text-zinc-500 font-normal">
                    Planificador y sesiones
                  </div>
                </div>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                  activeTab === AppTab.ROUTINES
                    ? 'bg-[#00FF87] text-black'
                    : 'bg-zinc-900 text-zinc-400 border border-white/5'
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
              className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all active:scale-[0.98] ${
                activeTab === AppTab.EXERCISES
                  ? 'bg-[#00FF87]/15 text-[#00FF87] font-bold border border-[#00FF87]/40 shadow-[0_0_15px_rgba(0,255,135,0.15)]'
                  : 'text-zinc-300 hover:bg-zinc-900 hover:text-white font-semibold'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    activeTab === AppTab.EXERCISES
                      ? 'bg-[#00FF87] text-black shadow-sm'
                      : 'bg-zinc-900 text-zinc-400 border border-white/5'
                  }`}
                >
                  <Dumbbell className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold">Biblioteca de Ejercicios</div>
                  <div className="text-[11px] text-zinc-500 font-normal">
                    Catálogo y técnica
                  </div>
                </div>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                  activeTab === AppTab.EXERCISES
                    ? 'bg-[#00FF87] text-black'
                    : 'bg-zinc-900 text-zinc-400 border border-white/5'
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
              className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all active:scale-[0.98] ${
                activeTab === AppTab.RMS
                  ? 'bg-[#00FF87]/15 text-[#00FF87] font-bold border border-[#00FF87]/40 shadow-[0_0_15px_rgba(0,255,135,0.15)]'
                  : 'text-zinc-300 hover:bg-zinc-900 hover:text-white font-semibold'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    activeTab === AppTab.RMS
                      ? 'bg-[#00FF87] text-black shadow-sm'
                      : 'bg-zinc-900 text-zinc-400 border border-white/5'
                  }`}
                >
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold">Registro de RMs</div>
                  <div className="text-[11px] text-zinc-500 font-normal">
                    Pesos máximos (1RM) e histórico
                  </div>
                </div>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                  activeTab === AppTab.RMS
                    ? 'bg-[#00FF87] text-black'
                    : 'bg-zinc-900 text-zinc-400 border border-white/5'
                }`}
              >
                {rmCount}
              </span>
            </button>

            {/* Historial de Entrenamientos */}
            <button
              id="sidebar-link-history"
              type="button"
              onClick={() => handleNav(AppTab.HISTORY)}
              className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all active:scale-[0.98] ${
                activeTab === AppTab.HISTORY
                  ? 'bg-[#00FF87]/15 text-[#00FF87] font-bold border border-[#00FF87]/40 shadow-[0_0_15px_rgba(0,255,135,0.15)]'
                  : 'text-zinc-300 hover:bg-zinc-900 hover:text-white font-semibold'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    activeTab === AppTab.HISTORY
                      ? 'bg-[#00FF87] text-black shadow-sm'
                      : 'bg-zinc-900 text-zinc-400 border border-white/5'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold">Historial</div>
                  <div className="text-[11px] text-zinc-500 font-normal">
                    Sesiones completadas
                  </div>
                </div>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                  activeTab === AppTab.HISTORY
                    ? 'bg-[#00FF87] text-black'
                    : 'bg-zinc-900 text-zinc-400 border border-white/5'
                }`}
              >
                {historyCount}
              </span>
            </button>

            {/* Diario de Ejercicios */}
            <button
              id="sidebar-link-diary"
              type="button"
              onClick={() => handleNav(AppTab.DIARY)}
              className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all active:scale-[0.98] ${
                activeTab === AppTab.DIARY
                  ? 'bg-[#00FF87]/15 text-[#00FF87] font-bold border border-[#00FF87]/40 shadow-[0_0_15px_rgba(0,255,135,0.15)]'
                  : 'text-zinc-300 hover:bg-zinc-900 hover:text-white font-semibold'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    activeTab === AppTab.DIARY
                      ? 'bg-[#00FF87] text-black shadow-sm'
                      : 'bg-zinc-900 text-zinc-400 border border-white/5'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold">Diario de Ejercicios</div>
                  <div className="text-[11px] text-zinc-500 font-normal">
                    Notas, sensaciones y marcas
                  </div>
                </div>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                  activeTab === AppTab.DIARY
                    ? 'bg-[#00FF87] text-black'
                    : 'bg-zinc-900 text-zinc-400 border border-white/5'
                }`}
              >
                {diaryCount}
              </span>
            </button>

            <div className="pt-4 pb-1">
              <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-3 py-1">
                Herramientas y Datos
              </div>
            </div>

            {/* Copia de Seguridad */}
            <button
              id="sidebar-link-backup"
              type="button"
              onClick={handleBackup}
              className="w-full flex items-center justify-between p-3 rounded-2xl text-left text-zinc-300 hover:bg-zinc-900 hover:text-white font-semibold transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-zinc-900 text-zinc-400 border border-white/5 flex items-center justify-center">
                  <ArrowDownUp className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold">Copia de Seguridad</div>
                  <div className="text-[11px] text-zinc-500 font-normal">
                    Importar / Exportar JSON
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            </button>
          </div>

          <section
            aria-label="Cuenta"
            className="mx-3 mb-3 rounded-2xl border border-white/10 bg-[#121214] p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-white">Cuenta</h2>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  isSyncEnabled
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : 'bg-zinc-800 text-zinc-300'
                }`}
              >
                {isSyncEnabled ? 'Sincronización activa' : 'Solo local'}
              </span>
            </div>
            <p className="mt-1 break-all text-[11px] text-zinc-400">
              {userEmail ??
                (isAuthenticated
                ? 'Sesión iniciada'
                : 'Sesión sin iniciar; tus datos siguen en este dispositivo.')}
            </p>
            {isSyncEligibilityLoading && isAuthenticated && (
              <p className="mt-1 text-[11px] text-zinc-500">Comprobando la sincronización…</p>
            )}
            {error && (
              <p role="alert" className="mt-2 text-[11px] text-red-300">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={() => void (isAuthenticated ? onSignOut() : onSignIn())}
              disabled={isSigningIn}
              className="mt-2 w-full rounded-xl bg-[#00FF87] px-3 py-2 text-xs font-black text-black transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
            >
              {isSigningIn
                ? 'Conectando…'
                : isAuthenticated
                ? 'Cerrar sesión'
                : 'Continuar con Google'}
            </button>
          </section>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-white/[0.08] bg-[#0D0D0D] flex items-center justify-between">
          <PWAInstallButton />
          <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono font-semibold">
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-[#00FF87]' : 'bg-amber-400'}`}
            />
            {isOnline ? 'En línea' : 'Sin conexión'}
          </span>
        </div>
      </div>
    </div>
  );
};
