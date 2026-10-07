/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowDownUp } from 'lucide-react';

export interface AppFooterProps {
  onOpenBackup: () => void;
}

export const AppFooter: React.FC<AppFooterProps> = ({ onOpenBackup }) => {
  return (
    <footer className="mt-auto py-8 pb-24 px-4 text-center">
      <button
        id="btn-footer-backup-link"
        type="button"
        onClick={onOpenBackup}
        className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-500 hover:text-[#00FF87] transition-colors py-2 px-3 rounded-xl hover:bg-zinc-900 border border-transparent hover:border-white/10"
      >
        <ArrowDownUp className="w-3.5 h-3.5 text-zinc-400" />
        <span>Copia de seguridad (Importar / Exportar JSON)</span>
      </button>
    </footer>
  );
};
