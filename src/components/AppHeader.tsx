/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Flame, Gem, Menu } from 'lucide-react';
import { AppTab } from '../types';

export interface AppHeaderProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  routinesCount: number;
  catalogCount: number;
  isPremiumActive: boolean;
  onOpenMenu: () => void;
}

/**
 * Main application header with brand logo, sleek dark aesthetic, and drawer trigger.
 */
export const AppHeader: React.FC<AppHeaderProps> = ({
  activeTab,
  onSelectTab,
  routinesCount,
  catalogCount,
  isPremiumActive,
  onOpenMenu,
}) => {
  return (
    <header className="bg-[#121214]/90 backdrop-blur-xl border-b border-white/[0.08] sticky top-0 z-40 shadow-lg pt-[env(safe-area-inset-top,0px)]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-3">
          {/* Left: Brand Logo & Title */}
          <button
            id="btn-nav-logo"
            type="button"
            onClick={() => onSelectTab(AppTab.ROUTINES)}
            className="flex items-center gap-2.5 text-left group focus:outline-none"
            title="WorkoutLog - Rutinas"
            aria-label="WorkoutLog"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center shadow-[0_0_15px_rgba(0,255,135,0.15)] group-hover:border-[#00FF87]/40 group-hover:shadow-[0_0_20px_rgba(0,255,135,0.3)] transition-all duration-200 active:scale-95">
              <Flame className="w-5 h-5 text-[#00FF87] fill-current drop-shadow-[0_0_8px_rgba(0,255,135,0.6)]" />
            </div>
            <div>
              <span className="text-sm sm:text-base font-black tracking-tight text-white block leading-tight">
                WORKOUT<span className="text-[#00FF87]">LOG</span>
              </span>
              <span className="text-[10px] font-semibold text-zinc-400 block tracking-wider uppercase">
                Performance
              </span>
            </div>
          </button>

          {/* Center / Desktop Tab Pills */}
          <nav className="hidden sm:flex items-center p-1 bg-zinc-900/80 rounded-2xl border border-white/[0.08] shadow-inner">
            <button
              id="header-tab-routines"
              type="button"
              onClick={() => onSelectTab(AppTab.ROUTINES)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all active:scale-95 ${
                activeTab === AppTab.ROUTINES
                  ? 'bg-[#00FF87] text-black shadow-[0_0_12px_rgba(0,255,135,0.4)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span>Rutinas</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === AppTab.ROUTINES ? 'bg-black/20 text-black' : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {routinesCount}
              </span>
            </button>

            <button
              id="header-tab-catalog"
              type="button"
              onClick={() => onSelectTab(AppTab.EXERCISES)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all active:scale-95 ${
                activeTab === AppTab.EXERCISES
                  ? 'bg-[#00FF87] text-black shadow-[0_0_12px_rgba(0,255,135,0.4)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span>Ejercicios</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === AppTab.EXERCISES ? 'bg-black/20 text-black' : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {catalogCount}
              </span>
            </button>
          </nav>

          {/* Right: Hamburger Menu Trigger */}
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`hidden sm:inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold ${
                isPremiumActive
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {isPremiumActive ? (
                <>
                  <Gem aria-hidden="true" className="mr-1 inline h-3 w-3" />
                  Premium
                </>
              ) : (
                'Free'
              )}
            </span>
            <button
              id="btn-open-sidebar-menu"
              type="button"
              onClick={onOpenMenu}
              className="w-10 h-10 rounded-2xl border border-white/10 bg-zinc-900/90 text-zinc-300 hover:text-white hover:border-[#00FF87]/40 hover:bg-zinc-800 flex items-center justify-center transition-all active:scale-95 shadow-md"
              title="Menú principal"
              aria-label="Menú principal"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
