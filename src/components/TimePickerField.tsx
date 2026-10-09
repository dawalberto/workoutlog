import React, { useState } from 'react';
import { Clock } from 'lucide-react';
import { TimeWheelPickerModal } from './TimeWheelPickerModal';

interface TimePickerFieldProps {
  value: number | string;
  onChange: (seconds: number) => void;
  onApplyToAllSets?: (seconds: number) => void;
  allowApplyToAll?: boolean;
  label?: string;
  variant?: 'table' | 'form' | 'compact';
  disabled?: boolean;
  className?: string;
  modalTitle?: string;
  modalSubtitle?: string;
}

export const formatTimeDisplay = (totalSec: number): { formatted: string; fullText: string } => {
  const safe = Math.max(0, Number(totalSec) || 0);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;

  const formatted = `${mins}:${String(secs).padStart(2, '0')}`;
  let fullText = '';
  if (mins > 0 && secs > 0) {
    fullText = `${mins}m ${secs}s`;
  } else if (mins > 0) {
    fullText = `${mins} min`;
  } else {
    fullText = `${secs} seg`;
  }

  return { formatted, fullText };
};

export const TimePickerField: React.FC<TimePickerFieldProps> = ({
  value,
  onChange,
  onApplyToAllSets,
  allowApplyToAll = false,
  label,
  variant = 'form',
  disabled = false,
  className = '',
  modalTitle,
  modalSubtitle,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const numSeconds = Math.max(0, Number(value) || 0);
  const { formatted, fullText } = formatTimeDisplay(numSeconds);

  const handleConfirm = (newSeconds: number, applyToAll?: boolean) => {
    onChange(newSeconds);
    if (applyToAll && onApplyToAllSets) {
      onApplyToAllSets(newSeconds);
    }
  };

  if (variant === 'table') {
    return (
      <>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(true)}
          title={`Descanso: ${fullText} (${numSeconds}s) - Pulsa para modificar con ruleta`}
          className={`group min-h-[44px] px-2.5 py-1.5 rounded-xl border border-white/10 hover:border-[#00FF87] bg-zinc-900 hover:bg-[#00FF87]/10 text-white transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-inner ${className}`}
        >
          <Clock className="w-3.5 h-3.5 text-[#00FF87] group-hover:animate-pulse shrink-0" />
          <span className="font-mono text-xs font-black tracking-tight text-white group-hover:text-[#00FF87]">
            {formatted}
          </span>
          <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">
            ({numSeconds}s)
          </span>
        </button>

        <TimeWheelPickerModal
          isOpen={isOpen}
          initialSeconds={numSeconds}
          onClose={() => setIsOpen(false)}
          onConfirm={handleConfirm}
          title={modalTitle || 'Tiempo de descanso del set'}
          subtitle={modalSubtitle || 'Gira las ruletas de minutos y segundos'}
          allowApplyToAll={allowApplyToAll}
        />
      </>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`w-full ${className}`}>
        {label && (
          <label className="block text-[10px] font-bold text-zinc-400 mb-1">
            {label}
          </label>
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(true)}
          title={`Tiempo: ${fullText} (${numSeconds}s)`}
          className="w-full min-h-[44px] px-2.5 py-1.5 rounded-xl border border-white/10 hover:border-[#00FF87] bg-black/40 hover:bg-[#00FF87]/10 text-white transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-inner"
        >
          <Clock className="w-3.5 h-3.5 text-[#00FF87] shrink-0" />
          <span className="font-mono text-xs font-black text-white">
            {formatted}
          </span>
          <span className="text-[10px] text-zinc-400 font-mono">
            ({numSeconds}s)
          </span>
        </button>

        <TimeWheelPickerModal
          isOpen={isOpen}
          initialSeconds={numSeconds}
          onClose={() => setIsOpen(false)}
          onConfirm={handleConfirm}
          title={modalTitle || label || 'Tiempo de descanso'}
          subtitle={modalSubtitle || 'Gira las ruletas de minutos y segundos'}
          allowApplyToAll={allowApplyToAll}
        />
      </div>
    );
  }

  return (
    <>
      <div className={`w-full ${className}`}>
        {label && (
          <label className="block text-[11px] font-extrabold text-[#A1A1AA] uppercase tracking-wider mb-1">
            {label}
          </label>
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(true)}
          className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border border-white/10 hover:border-[#00FF87] bg-zinc-900 hover:bg-[#00FF87]/5 text-white transition-all flex items-center justify-between group active:scale-[0.99] shadow-inner"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-zinc-800 group-hover:bg-[#00FF87]/20 flex items-center justify-center transition-colors shrink-0">
              <Clock className="w-4 h-4 text-[#00FF87]" />
            </div>
            <div className="text-left min-w-0">
              <span className="block font-mono text-sm sm:text-base font-black text-white group-hover:text-[#00FF87] tracking-tight">
                {formatted} ⏱️
              </span>
              <span className="block text-[11px] text-zinc-400 font-medium">
                {fullText} ({numSeconds} segundos)
              </span>
            </div>
          </div>

          <span className="text-[11px] font-bold text-[#00FF87] bg-[#00FF87]/10 group-hover:bg-[#00FF87]/20 px-2.5 py-1 rounded-lg border border-[#00FF87]/20 transition-all shrink-0">
            Modificar ruleta &rarr;
          </span>
        </button>
      </div>

      <TimeWheelPickerModal
        isOpen={isOpen}
        initialSeconds={numSeconds}
        onClose={() => setIsOpen(false)}
        onConfirm={handleConfirm}
        title={modalTitle || label || 'Seleccionar tiempo'}
        subtitle={modalSubtitle || 'Gira las ruletas estilo Apple para fijar el tiempo'}
        allowApplyToAll={allowApplyToAll}
      />
    </>
  );
};
