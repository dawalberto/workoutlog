import React from 'react';
import { Download, FileJson, Upload, X } from 'lucide-react';
import { BackupExportPanel } from './data-backup/BackupExportPanel';
import { BackupImportPanel } from './data-backup/BackupImportPanel';
import { useDataBackup } from '../hooks/data-backup/useDataBackup';

export const DataBackupModal: React.FC = () => {
  const {
    isOpen,
    onClose,
    activeTab,
    setActiveTab,
    isProcessing,
    parsedData,
    fileInputRef,
    handleExecuteImport,
    exportData,
    exportActions,
    importState,
    importActions,
  } = useDataBackup();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-hidden">
      <div className="bg-[#1C1C1E] rounded-2xl sm:rounded-3xl border border-white/[0.1] shadow-2xl max-w-xl w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-white">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/[0.08] shrink-0 bg-[#1C1C1E]">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-[#00FF87]/15 border border-[#00FF87]/30 text-[#00FF87] shrink-0">
              <FileJson className="w-4 h-4 text-[#00FF87]" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white leading-tight">
                Copia de Seguridad &amp; Datos
              </h2>
              <p className="text-xs text-zinc-400">
                Exporta o restaura tus ejercicios y rutinas en formato JSON
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all"
            aria-label="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 sm:px-6 pt-3 pb-2 border-b border-white/[0.08] bg-black/20 shrink-0">
          <div className="flex items-center gap-1.5 bg-black/40 border border-white/[0.08] p-1 rounded-xl w-fit">
            <button
              id="tab-backup-export"
              type="button"
              onClick={() => setActiveTab('export')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold rounded-lg transition-all ${
                activeTab === 'export'
                  ? 'bg-[#00FF87] text-black shadow-[0_0_10px_rgba(0,255,135,0.3)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar</span>
            </button>
            <button
              id="tab-backup-import"
              type="button"
              onClick={() => setActiveTab('import')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold rounded-lg transition-all ${
                activeTab === 'import'
                  ? 'bg-[#00FF87] text-black shadow-[0_0_10px_rgba(0,255,135,0.3)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Importar</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:px-6 sm:py-5 space-y-4">
          {activeTab === 'export' && (
            <BackupExportPanel data={exportData} actions={exportActions} />
          )}
          {activeTab === 'import' && (
            <BackupImportPanel
              fileInputRef={fileInputRef}
              state={importState}
              actions={importActions}
            />
          )}
        </div>

        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-t border-white/[0.08] bg-black/30 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 min-h-[44px] text-xs font-bold text-zinc-400 hover:text-white rounded-xl hover:bg-white/[0.06] transition"
          >
            Cerrar
          </button>

          {activeTab === 'import' && parsedData && (
            <button
              id="btn-confirm-import"
              type="button"
              disabled={isProcessing}
              onClick={handleExecuteImport}
              className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[48px] text-xs font-extrabold rounded-xl bg-[#00FF87] hover:bg-[#00e57a] text-black shadow-[0_0_15px_rgba(0,255,135,0.3)] transition active:scale-[0.97] disabled:opacity-50"
            >
              <Upload className="w-4 h-4 stroke-[3]" />
              <span>{isProcessing ? 'Importando...' : 'Confirmar e Importar'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
