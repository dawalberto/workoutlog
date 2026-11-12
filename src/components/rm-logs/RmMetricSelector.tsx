import { t } from '../../utils/i18n';
import React from 'react';
import { Dumbbell, Repeat } from 'lucide-react';
import type { RmMetric } from '../../types';

interface RmMetricSelectorProps {
  value: RmMetric;
  onChange: (metric: RmMetric) => void;
  idPrefix?: string;
}

/**
 * Segmented control that lets a user log an RM either as a lifted weight (kg) or
 * as a repetition count (e.g. jump-rope skips).
 */
export const RmMetricSelector: React.FC<RmMetricSelectorProps> = ({
  value,
  onChange,
  idPrefix = 'rm-metric',
}) => {
  const baseClass =
    'inline-flex items-center justify-center gap-1.5 min-h-[48px] px-3 rounded-lg text-xs font-extrabold transition-all active:scale-[0.97]';
  const activeClass = 'bg-[#00FF87] text-black shadow-[0_0_15px_rgba(0,255,135,0.25)]';
  const inactiveClass = 'text-zinc-400 hover:text-white';

  return (
    <div
      role="tablist"
      aria-label={t("Métrica del RM")}
      className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-zinc-900 border border-white/10"
    >
      <button
        id={`${idPrefix}-weight`}
        type="button"
        role="tab"
        aria-selected={value === 'weight'}
        onClick={() => onChange('weight')}
        className={`${baseClass} ${value === 'weight' ? activeClass : inactiveClass}`}
      >
        <Dumbbell className="w-3.5 h-3.5" />
        <span>{t("Peso (kg)")}</span>
      </button>
      <button
        id={`${idPrefix}-reps`}
        type="button"
        role="tab"
        aria-selected={value === 'reps'}
        onClick={() => onChange('reps')}
        className={`${baseClass} ${value === 'reps' ? activeClass : inactiveClass}`}
      >
        <Repeat className="w-3.5 h-3.5" />
        <span>{t("Repeticiones")}</span>
      </button>
    </div>
  );
};
