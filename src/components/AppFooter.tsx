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
    <footer className="mt-auto py-6 px-4 text-center">
      <button
        id="btn-footer-backup-link"
        type="button"
        onClick={onOpenBackup}
        className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
      >
        <ArrowDownUp className="w-3.5 h-3.5" />
        <span>Copia de seguridad (Importar / Exportar JSON)</span>
      </button>
    </footer>
  );
};
