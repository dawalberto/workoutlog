import React, { useState, useEffect, useMemo } from 'react';
import { Clock, X, Check, RotateCcw, Plus, Minus, Layers } from 'lucide-react';
import { InfiniteWheelColumn } from './InfiniteWheelColumn';

interface TimeWheelPickerModalProps {
  isOpen: boolean;
  initialSeconds: number;
  onClose: () => void;
  onConfirm: (totalSeconds: number, applyToAll?: boolean) => void;
  title?: string;
  subtitle?: string;
  allowApplyToAll?: boolean;
}

// Minutes list: 0 to 59
const MINUTES_LIST = Array.from({ length: 60 }, (_, i) => ({
  label: String(i),
  value: i,
}));

// Seconds list: 00 to 59
const SECONDS_LIST = Array.from({ length: 60 }, (_, i) => ({
  label: String(i).padStart(2, '0'),
  value: i,
}));

// Quick Gym Rest Presets (in seconds)
const PRESETS = [
  { label: '30s', seconds: 30 },
  { label: '45s', seconds: 45 },
  { label: '1:00', seconds: 60 },
  { label: '1:15', seconds: 75 },
  { label: '1:30', seconds: 90 },
  { label: '2:00', seconds: 120 },
  { label: '2:30', seconds: 150 },
  { label: '3:00', seconds: 180 },
  { label: '4:00', seconds: 240 },
  { label: '5:00', seconds: 300 },
];

export const TimeWheelPickerModal: React.FC<TimeWheelPickerModalProps> = ({
  isOpen,
  initialSeconds,
  onClose,
  onConfirm,
  title = 'Tiempo de descanso',
  subtitle = 'Gira las ruletas de minutos y segundos',
  allowApplyToAll = false,
}) => {
  const safeInitial = Math.max(0, Number(initialSeconds) || 0);

  const [selectedMinutes, setSelectedMinutes] = useState<number>(Math.floor(safeInitial / 60));
  const [selectedSeconds, setSelectedSeconds] = useState<number>(safeInitial % 60);
  const [applyToAll, setApplyToAll] = useState<boolean>(false);

  // Sync state whenever modal opens or initialSeconds changes
  useEffect(() => {
    if (isOpen) {
      const s = Math.max(0, Number(initialSeconds) || 0);
      setSelectedMinutes(Math.floor(s / 60));
      setSelectedSeconds(s % 60);
      setApplyToAll(false);
    }
  }, [isOpen, initialSeconds]);

  const totalCalculatedSeconds = useMemo(() => {
    return selectedMinutes * 60 + selectedSeconds;
  }, [selectedMinutes, selectedSeconds]);

  if (!isOpen) return null;

  const handleApplyPreset = (secs: number) => {
    setSelectedMinutes(Math.floor(secs / 60));
    setSelectedSeconds(secs % 60);
  };

  const handleAdjustSeconds = (delta: number) => {
    const nextTotal = Math.max(0, totalCalculatedSeconds + delta);
    setSelectedMinutes(Math.floor(nextTotal / 60));
    setSelectedSeconds(nextTotal % 60);
  };

  const handleSave = () => {
    onConfirm(totalCalculatedSeconds, applyToAll);
    onClose();
  };

  return (
    <div
      id="time-wheel-picker-modal"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#1C1C1E] border border-white/[0.1] rounded-t-3xl sm:rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl flex flex-col text-white animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#00FF87]/15 border border-[#00FF87]/30 text-[#00FF87] flex items-center justify-center shadow-xs">
              <Clock className="w-5 h-5 text-[#00FF87]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                {title}
              </h3>
              <p className="text-xs text-[#A1A1AA]">{subtitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-white/[0.08] transition-colors"
            aria-label="Cerrar selector"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Formatted Time Display Box */}
        <div className="bg-zinc-900/90 border border-white/10 rounded-2xl p-4 mb-4 text-center shadow-inner relative overflow-hidden">
          <div className="flex items-baseline justify-center gap-2 font-mono">
            <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">
              {String(selectedMinutes).padStart(2, '0')}:
              {String(selectedSeconds).padStart(2, '0')}
            </span>
            <span className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider">
              ⏱️
            </span>
          </div>

          <div className="mt-1 flex items-center justify-center gap-2 text-xs">
            <span className="text-[#00FF87] font-extrabold font-mono">
              {totalCalculatedSeconds} segundos
            </span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-400">
              {selectedMinutes > 0 ? `${selectedMinutes} min ` : ''}
              {selectedSeconds > 0 || selectedMinutes === 0 ? `${selectedSeconds} seg` : ''}
            </span>
          </div>

          {/* Quick +/- 15s fine tuning nudges */}
          <div className="mt-3 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => handleAdjustSeconds(-15)}
              disabled={totalCalculatedSeconds <= 0}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-zinc-800 text-zinc-300 transition-colors flex items-center gap-1 active:scale-95"
            >
              <Minus className="w-3 h-3" />
              <span>15s</span>
            </button>
            <button
              type="button"
              onClick={() => handleAdjustSeconds(-30)}
              disabled={totalCalculatedSeconds < 30}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-zinc-800 text-zinc-300 transition-colors flex items-center gap-1 active:scale-95"
            >
              <Minus className="w-3 h-3" />
              <span>30s</span>
            </button>
            <button
              type="button"
              onClick={() => handleAdjustSeconds(15)}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors flex items-center gap-1 active:scale-95"
            >
              <Plus className="w-3 h-3" />
              <span>15s</span>
            </button>
            <button
              type="button"
              onClick={() => handleAdjustSeconds(30)}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors flex items-center gap-1 active:scale-95"
            >
              <Plus className="w-3 h-3" />
              <span>30s</span>
            </button>
          </div>
        </div>

        {/* Dual Infinite Apple-style Wheel Picker */}
        <div className="bg-[#18181A] border border-white/[0.08] rounded-2xl p-2 sm:p-3 mb-4 shadow-xl">
          <div className="flex items-center justify-around text-center text-xs font-black uppercase tracking-wider text-[#A1A1AA] pb-1 border-b border-white/5">
            <span className="flex-1">Minutos</span>
            <span className="w-8 text-zinc-600">:</span>
            <span className="flex-1">Segundos</span>
          </div>

          <div className="flex items-center justify-center gap-2">
            {/* Minutes Wheel */}
            <InfiniteWheelColumn
              items={MINUTES_LIST}
              selectedValue={selectedMinutes}
              onChange={setSelectedMinutes}
              unitLabel="min"
            />

            <div className="text-2xl font-black text-zinc-600 select-none pb-1">
              :
            </div>

            {/* Seconds Wheel */}
            <InfiniteWheelColumn
              items={SECONDS_LIST}
              selectedValue={selectedSeconds}
              onChange={setSelectedSeconds}
              unitLabel="seg"
            />
          </div>
        </div>

        {/* Quick Presets Carousel */}
        <div className="mb-4">
          <span className="block text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 mb-2">
            Ajustes rápidos de descanso:
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {PRESETS.map((p) => {
              const isMatch = totalCalculatedSeconds === p.seconds;
              return (
                <button
                  key={p.seconds}
                  type="button"
                  onClick={() => handleApplyPreset(p.seconds)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all active:scale-95 border ${
                    isMatch
                      ? 'bg-[#00FF87] text-black border-[#00FF87] shadow-[0_0_12px_rgba(0,255,135,0.35)]'
                      : 'bg-zinc-900 text-zinc-300 border-white/10 hover:border-white/30 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Optional "Apply to all sets of this exercise" toggle */}
        {allowApplyToAll && (
          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-900/60 border border-white/5 mb-4 cursor-pointer select-none hover:bg-zinc-900 transition-colors">
            <input
              type="checkbox"
              checked={applyToAll}
              onChange={(e) => setApplyToAll(e.target.checked)}
              className="w-4 h-4 rounded text-[#00FF87] bg-black border-white/20 focus:ring-[#00FF87] focus:ring-offset-0"
            />
            <div className="flex items-center gap-1.5 text-xs text-zinc-300 font-semibold">
              <Layers className="w-3.5 h-3.5 text-[#00E5FF]" />
              <span>Aplicar este descanso a todas las series del ejercicio</span>
            </div>
          </label>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[48px] px-4 rounded-xl text-xs font-bold text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-white/10 transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex-2 min-h-[48px] px-6 rounded-xl text-xs sm:text-sm font-black text-black bg-[#00FF87] hover:bg-[#00e57a] transition-all shadow-[0_0_20px_rgba(0,255,135,0.35)] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Guardar {totalCalculatedSeconds > 0 ? `(${totalCalculatedSeconds}s)` : '0s'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
