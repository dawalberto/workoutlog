import React from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Check,
  Edit2,
  FileText,
  Minus,
  Plus,
  Trash2,
} from 'lucide-react';
import type { ExerciseRmLog, RmRecord } from '../../types';
import { formatRmDate } from '../../utils/rmCalculations';

interface RmRecordHistoryProps {
  log: ExerciseRmLog;
  editingRecordId: string | null;
  editWeight: string;
  setEditWeight: (value: string) => void;
  editDate: string;
  setEditDate: (value: string) => void;
  editNotes: string;
  setEditNotes: (value: string) => void;
  onOpenQuickLog: () => void;
  onCancelEdit: () => void;
  onStartEditRecord: (record: RmRecord) => void;
  onSaveEditRecord: (logId: string, recordId: string) => void;
  onDeleteRecord: (logId: string, recordId: string) => void;
}

export const RmRecordHistory: React.FC<RmRecordHistoryProps> = ({
  log,
  editingRecordId,
  editWeight,
  setEditWeight,
  editDate,
  setEditDate,
  editNotes,
  setEditNotes,
  onOpenQuickLog,
  onCancelEdit,
  onStartEditRecord,
  onSaveEditRecord,
  onDeleteRecord,
}) => (
  <div className="border-t border-white/[0.08] bg-black/40 p-4 sm:p-5 animate-in slide-in-from-top-2 duration-150">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
        <Calendar className="w-3.5 h-3.5 text-[#00FF87]" />
        <span>Historial de registros ({log.records.length})</span>
      </h3>

      <button
        type="button"
        onClick={onOpenQuickLog}
        className="text-xs font-bold text-[#00FF87] hover:underline inline-flex items-center gap-1"
      >
        <Plus className="w-3.5 h-3.5" /> <span>Añadir registro hoy</span>
      </button>
    </div>

    <div className="space-y-2">
      {log.records.map((record, rIdx) => {
        const nextRecord = log.records[rIdx + 1];
        const diff = nextRecord ? record.weight - nextRecord.weight : 0;
        const isEditingThis = editingRecordId === record.id;

        if (isEditingThis) {
          return (
            <div
              key={record.id}
              className="p-3.5 rounded-2xl bg-[#1C1C1E] border border-[#00FF87]/50 shadow-lg"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-0.5">
                    Peso (kg) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={editWeight}
                    onChange={(e) => setEditWeight(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 text-xs font-bold rounded-xl border border-white/10 bg-zinc-900 text-white focus:outline-none focus:border-[#00FF87]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-0.5">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 text-xs font-semibold rounded-xl border border-white/10 bg-zinc-900 text-white focus:outline-none focus:border-[#00FF87]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-0.5">
                    Notas (opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="RPE 9.5, agarre cerrado..."
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl border border-white/10 bg-zinc-900 text-white focus:outline-none focus:border-[#00FF87]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onCancelEdit}
                  className="px-3 min-h-[40px] text-xs font-semibold text-zinc-400 hover:text-white rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => onSaveEditRecord(log.id, record.id)}
                  className="px-4 min-h-[40px] text-xs font-bold text-black bg-[#00FF87] hover:bg-[#00e57a] rounded-xl flex items-center gap-1 active:scale-95"
                >
                  <Check className="w-3.5 h-3.5" /> Guardar
                </button>
              </div>
            </div>
          );
        }

        return (
          <div
            key={record.id}
            className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/90 border border-white/[0.06] hover:border-white/15 transition-all text-xs"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-mono font-black text-sm sm:text-base text-white min-w-[70px]">
                {record.weight} kg
              </span>

              {nextRecord && (
                <span
                  className={`inline-flex items-center gap-0.5 font-bold text-[11px] px-2 py-0.5 rounded-full ${
                    diff > 0
                      ? 'bg-[#00FF87]/20 text-[#00FF87]'
                      : diff < 0
                      ? 'bg-rose-500/20 text-rose-400'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {diff > 0 ? (
                    <>
                      <ArrowUpRight className="w-3 h-3 text-[#00FF87]" />
                      +{diff.toFixed(1)} kg
                    </>
                  ) : diff < 0 ? (
                    <>
                      <ArrowDownRight className="w-3 h-3 text-rose-400" />
                      {diff.toFixed(1)} kg
                    </>
                  ) : (
                    <>
                      <Minus className="w-3 h-3 text-zinc-500" />
                      0 kg
                    </>
                  )}
                </span>
              )}

              <span className="text-zinc-400 font-medium">
                {formatRmDate(record.date)}
              </span>

              {record.notes && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[#A1A1AA] bg-zinc-800/80 px-2 py-0.5 rounded-md border border-white/5 truncate max-w-xs">
                  <FileText className="w-3 h-3 shrink-0 text-zinc-500" />
                  <span className="truncate">{record.notes}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => onStartEditRecord(record)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                title="Editar registro"
                aria-label="Editar registro"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => onDeleteRecord(log.id, record.id)}
                className="p-1.5 text-zinc-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                title="Eliminar registro"
                aria-label="Eliminar registro"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
