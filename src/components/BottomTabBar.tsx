/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Flame, Dumbbell, Trophy, Calendar, BookOpen } from 'lucide-react';
import { AppTab } from '../types';

export interface BottomTabBarProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  routinesCount: number;
  catalogCount: number;
  rmCount: number;
  historyCount: number;
  diaryCount: number;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  onSelectTab,
  routinesCount,
  catalogCount,
  rmCount,
  historyCount,
  diaryCount,
}) => {
  const tabs = [
    {
      id: 'tab-nav-routines',
      tab: AppTab.ROUTINES,
      label: 'Rutinas',
      icon: Flame,
      count: routinesCount,
    },
    {
      id: 'tab-nav-catalog',
      tab: AppTab.EXERCISES,
      label: 'Ejercicios',
      icon: Dumbbell,
      count: catalogCount,
    },
    {
      id: 'tab-nav-rms',
      tab: AppTab.RMS,
      label: 'RMs',
      icon: Trophy,
      count: rmCount,
    },
    {
      id: 'tab-nav-history',
      tab: AppTab.HISTORY,
      label: 'Historial',
      icon: Calendar,
      count: historyCount,
    },
    {
      id: 'tab-nav-diary',
      tab: AppTab.DIARY,
      label: 'Diario',
      icon: BookOpen,
      count: diaryCount,
    },
  ];

  return (
    <nav
      id="bottom-tab-bar"
      aria-label="Navegación principal"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#121214]/90 backdrop-blur-xl border-t border-white/[0.08] shadow-[0_-8px_30px_rgba(0,0,0,0.8)] pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="max-w-lg mx-auto px-2">
        <div className="flex items-center justify-around h-16">
          {tabs.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.tab;

            return (
              <button
                key={item.tab}
                id={item.id}
                type="button"
                onClick={() => onSelectTab(item.tab)}
                className={`relative flex flex-col items-center justify-center flex-1 h-full py-1 transition-all duration-150 active:scale-95 group focus:outline-none`}
              >
                <div className="relative">
                  <Icon
                    className={`w-5 h-5 transition-all duration-200 ${
                      isActive
                        ? 'text-[#00FF87] drop-shadow-[0_0_8px_rgba(0,255,135,0.6)] scale-110'
                        : 'text-zinc-400 group-hover:text-zinc-200'
                    }`}
                  />
                  {item.count > 0 && (
                    <span
                      className={`absolute -top-1.5 -right-2 min-w-3.5 h-3.5 px-0.5 rounded-full text-[9px] font-black flex items-center justify-center transition-colors ${
                        isActive
                          ? 'bg-[#00FF87] text-black shadow-[0_0_8px_rgba(0,255,135,0.6)]'
                          : 'bg-zinc-800 text-zinc-300 border border-white/10'
                      }`}
                    >
                      {item.count > 99 ? '99+' : item.count}
                    </span>
                  )}
                </div>

                <span
                  className={`text-[10px] tracking-tight mt-1 font-bold transition-colors ${
                    isActive ? 'text-[#00FF87]' : 'text-zinc-400 group-hover:text-zinc-200'
                  }`}
                >
                  {item.label}
                </span>

                {isActive && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#00FF87] shadow-[0_0_6px_#00FF87]" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
