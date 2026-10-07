/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Flame, Dumbbell, Menu } from 'lucide-react';
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
 * Main application header with brand logo, primary tab toggle, and drawer menu trigger.
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
    <header className="bg-white border-b border-zinc-200 sticky top-0 z-40 shadow-2xs pt-[env(safe-area-inset-top,0px)]">
      <div className="max-w-4xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          {/* Left: Brand Logo */}
          <button
            id="btn-nav-logo"
            type="button"
            onClick={() => onSelectTab(AppTab.ROUTINES)}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-zinc-950 text-white flex items-center justify-center shadow-xs shrink-0 hover:bg-zinc-800 transition-colors active:scale-95"
            title="WorkoutLog - Rutinas"
            aria-label="WorkoutLog"
          >
            <Flame className="w-5 h-5 text-emerald-400 fill-current" />
          </button>

          {/* Center: Routines / Exercises Primary Tab Switcher */}
          <nav className="flex items-center p-1 bg-zinc-100 rounded-xl border border-zinc-200/80 shrink-0 shadow-2xs">
            <button
              id="tab-nav-routines"
              type="button"
              onClick={() => onSelectTab(AppTab.ROUTINES)}
              className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all shrink-0 active:scale-95 ${
                activeTab === AppTab.ROUTINES
                  ? 'bg-white text-zinc-950 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Rutinas</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === AppTab.ROUTINES
                    ? 'bg-zinc-100 text-zinc-700'
                    : 'bg-zinc-200 text-zinc-600'
                }`}
              >
                {routinesCount}
              </span>
            </button>

            <button
              id="tab-nav-catalog"
              type="button"
              onClick={() => onSelectTab(AppTab.EXERCISES)}
              className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all shrink-0 active:scale-95 ${
                activeTab === AppTab.EXERCISES
                  ? 'bg-white text-zinc-950 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Dumbbell className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Ejercicios</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === AppTab.EXERCISES
                    ? 'bg-zinc-100 text-zinc-700'
                    : 'bg-zinc-200 text-zinc-600'
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
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-zinc-100 text-zinc-600'
              }`}
            >
              {isPremiumActive ? 'Premium' : 'Free'}
            </span>
            <button
              id="btn-open-sidebar-menu"
              type="button"
              onClick={onOpenMenu}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 flex items-center justify-center transition-colors active:scale-95 shadow-2xs shrink-0"
              title="Main menu"
              aria-label="Main menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
