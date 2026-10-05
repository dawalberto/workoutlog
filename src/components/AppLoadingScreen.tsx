/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Flame } from 'lucide-react';

export const AppLoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-zinc-950 text-white flex items-center justify-center shadow-lg animate-pulse">
          <Flame className="w-6 h-6 text-emerald-400 fill-current" />
        </div>
        <div className="flex items-center gap-2 text-zinc-500 text-xs font-semibold">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>Cargando WorkoutLog...</span>
        </div>
      </div>
    </div>
  );
};
