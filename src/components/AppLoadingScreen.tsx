/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Flame } from 'lucide-react';

export const AppLoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-3xl bg-[#1C1C1E] border border-white/10 text-white flex items-center justify-center shadow-[0_0_30px_rgba(0,255,135,0.25)] animate-pulse">
          <Flame className="w-8 h-8 text-[#00FF87] fill-current drop-shadow-[0_0_12px_rgba(0,255,135,0.8)]" />
        </div>
        <div className="flex items-center gap-2.5 text-zinc-400 text-xs font-bold tracking-wider uppercase">
          <div className="w-2 h-2 rounded-full bg-[#00FF87] animate-ping" />
          <span>Iniciando WorkoutLog...</span>
        </div>
      </div>
    </div>
  );
};
