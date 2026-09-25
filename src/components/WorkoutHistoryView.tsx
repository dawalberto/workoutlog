import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Flame,
  Clock,
  Sparkles,
  Layers,
  X
} from 'lucide-react';
import { WorkoutHistoryLog } from '../types';
import { WorkoutDetailModal } from './WorkoutDetailModal';
import { formatDetailedDuration } from '../utils/timeCalculations';

interface WorkoutHistoryViewProps {
  historyLogs: WorkoutHistoryLog[];
  onDeleteLog: (logId: string) => void;
  onGoToRoutines: () => void;
}

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const WEEKDAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export const WorkoutHistoryView: React.FC<WorkoutHistoryViewProps> = ({
  historyLogs,
  onDeleteLog,
  onGoToRoutines,
}) => {
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth());

  // Detail modal state for a selected workout log
  const [selectedLog, setSelectedLog] = useState<WorkoutHistoryLog | null>(null);

  // If a day has multiple workouts, show a quick selector modal
  const [selectedDayWorkouts, setSelectedDayWorkouts] = useState<{
    dateLabel: string;
    workouts: WorkoutHistoryLog[];
  } | null>(null);

  // Map history logs by 'YYYY-MM-DD'
  const logsByDate = useMemo(() => {
    const map = new Map<string, WorkoutHistoryLog[]>();
    historyLogs.forEach((log) => {
      const d = new Date(log.completedAt || log.endTime);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(log);
    });
    return map;
  }, [historyLogs]);

  // Statistics: Current Week, Current Month, Total
  const { currentWeekCount, currentMonthCount, totalCount } = useMemo(() => {
    const now = new Date();
    // Start of current ISO week (Monday)
    const dayOfWeek = now.getDay();
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);

    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    let weekCount = 0;
    let monthCount = 0;

    historyLogs.forEach((log) => {
      const d = new Date(log.completedAt || log.endTime);
      if (d >= startOfWeek && d <= endOfWeek) {
        weekCount++;
      }
      if (d.getFullYear() === curYear && d.getMonth() === curMonth) {
        monthCount++;
      }
    });

    return {
      currentWeekCount: weekCount,
      currentMonthCount: monthCount,
      totalCount: historyLogs.length,
    };
  }, [historyLogs]);

  // Navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleGoToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  // Calendar matrix calculation
  const calendarCells = useMemo(() => {
    // 1st day of month
    const firstDay = new Date(currentYear, currentMonth, 1);
    const firstDayOfWeek = firstDay.getDay(); // 0 is Sunday, 1 is Monday
    // Monday is index 0
    const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

    // Days in current month
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Days in previous month
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const cells: {
      day: number;
      dateKey: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      workouts: WorkoutHistoryLog[];
    }[] = [];

    // Preceding month trailing days
    for (let i = startOffset - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateKey = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({
        day,
        dateKey,
        isCurrentMonth: false,
        isToday: false,
        workouts: logsByDate.get(dateKey) || [],
      });
    }

    // Current month days
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({
        day,
        dateKey,
        isCurrentMonth: true,
        isToday: dateKey === todayKey,
        workouts: logsByDate.get(dateKey) || [],
      });
    }

    // Following month leading days to complete grid (multiples of 7)
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateKey = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      cells.push({
        day: i,
        dateKey,
        isCurrentMonth: false,
        isToday: false,
        workouts: logsByDate.get(dateKey) || [],
      });
    }

    return cells;
  }, [currentYear, currentMonth, logsByDate, today]);

  // Click on a day
  const handleCellClick = (dateKey: string, workouts: WorkoutHistoryLog[]) => {
    if (workouts.length === 0) return;

    if (workouts.length === 1) {
      setSelectedLog(workouts[0]);
    } else {
      // Multiple workouts on this day: show day list
      const [year, month, day] = dateKey.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day);
      const dateLabel = dateObj.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
      setSelectedDayWorkouts({
        dateLabel,
        workouts,
      });
    }
  };

  const isViewingCurrentMonth = currentYear === today.getFullYear() && currentMonth === today.getMonth();

  return (
    <div id="workout-history-container" className="max-w-4xl mx-auto px-3 sm:px-6 py-6 pb-24">
      {/* Top Header Card with Summary Metrics */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-zinc-200 p-4 sm:p-6 shadow-xs mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-xs">
              <CalendarIcon className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
                  Historial de Entrenamientos
                </h1>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                  {totalCount} {totalCount === 1 ? 'sesión' : 'sesiones'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-600 mt-0.5">
                Calendario de rutinas completadas y desglose de cada sesión.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {!isViewingCurrentMonth && (
              <button
                type="button"
                onClick={handleGoToday}
                className="px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-bold text-zinc-700 transition shadow-2xs active:scale-95"
              >
                Volver a Hoy
              </button>
            )}
          </div>
        </div>

        {/* Compact stats: Semana actual & Mes actual */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
          {/* Stat 1: Semana Actual */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Flame className="w-5 h-5 fill-current" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-800 block truncate">
                Esta semana
              </span>
              <span className="text-xl sm:text-2xl font-black text-zinc-900 font-mono leading-none block">
                {currentWeekCount}
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold truncate block mt-0.5">
                {currentWeekCount === 1 ? 'rutina completada' : 'rutinas completadas'}
              </span>
            </div>
          </div>

          {/* Stat 2: Mes Actual */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 text-amber-400 flex items-center justify-center shrink-0 shadow-2xs">
              <Trophy className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-zinc-500 block truncate">
                Este mes ({MONTH_NAMES[today.getMonth()]})
              </span>
              <span className="text-xl sm:text-2xl font-black text-zinc-900 font-mono leading-none block">
                {currentMonthCount}
              </span>
              <span className="text-[10px] text-zinc-500 font-semibold truncate block mt-0.5">
                {currentMonthCount === 1 ? 'rutina completada' : 'rutinas completadas'}
              </span>
            </div>
          </div>

          {/* Stat 3: Total Histórico */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 hidden sm:flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 text-zinc-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-zinc-500 block truncate">
                Total registrado
              </span>
              <span className="text-xl sm:text-2xl font-black text-zinc-900 font-mono leading-none block">
                {totalCount}
              </span>
              <span className="text-[10px] text-zinc-500 font-semibold truncate block mt-0.5">
                sesiones en histórico
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Card */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-zinc-200 shadow-xs overflow-hidden">
        {/* Month Navigation Bar */}
        <div className="p-4 sm:p-5 border-b border-zinc-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-black text-zinc-900 tracking-tight">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              id="btn-prev-month"
              type="button"
              onClick={handlePrevMonth}
              className="p-2 rounded-xl text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 transition-colors active:scale-95 border border-zinc-200"
              title="Mes anterior"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              id="btn-next-month"
              type="button"
              onClick={handleNextMonth}
              className="p-2 rounded-xl text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 transition-colors active:scale-95 border border-zinc-200"
              title="Mes siguiente"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-zinc-100 bg-zinc-50/70 text-center py-2 text-[11px] sm:text-xs font-bold text-zinc-500 uppercase tracking-wider">
          {WEEKDAY_NAMES.map((wName, idx) => (
            <div key={idx} className={idx >= 5 ? 'text-zinc-400' : ''}>
              {wName}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-zinc-100 bg-zinc-100/40">
          {calendarCells.map((cell, idx) => {
            const hasWorkouts = cell.workouts.length > 0;

            return (
              <div
                key={idx}
                onClick={() => handleCellClick(cell.dateKey, cell.workouts)}
                className={`min-h-[78px] sm:min-h-[105px] p-1.5 sm:p-2.5 flex flex-col justify-between transition-all ${
                  cell.isCurrentMonth ? 'bg-white' : 'bg-zinc-50/50 text-zinc-300'
                } ${cell.isToday ? 'ring-2 ring-inset ring-emerald-500/80' : ''} ${
                  hasWorkouts
                    ? 'cursor-pointer hover:bg-emerald-50/40'
                    : 'cursor-default'
                }`}
              >
                {/* Day number & indicators */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs sm:text-sm font-bold inline-flex items-center justify-center w-6 h-6 rounded-full ${
                      cell.isToday
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : cell.isCurrentMonth
                        ? 'text-zinc-800'
                        : 'text-zinc-400'
                    }`}
                  >
                    {cell.day}
                  </span>

                  {/* Badge with count if > 1 workout on this day */}
                  {cell.workouts.length > 1 && (
                    <span
                      className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-emerald-600 text-white shadow-2xs"
                      title={`${cell.workouts.length} entrenamientos`}
                    >
                      {cell.workouts.length}
                    </span>
                  )}
                </div>

                {/* Workout tags/chips */}
                <div className="space-y-1 mt-1">
                  {cell.workouts.map((w, wIdx) => {
                    // On mobile, show max 1 or dots; on tablet/desktop, show compact pill
                    if (wIdx > 1) return null;

                    return (
                      <div
                        key={w.id}
                        className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/90 rounded-lg px-1.5 py-0.5 text-[10px] font-bold text-emerald-900 truncate flex items-center gap-1 shadow-2xs transition-colors"
                        title={`${w.routineName} (${formatDetailedDuration(w.durationSeconds)})`}
                      >
                        <Flame className="w-2.5 h-2.5 text-emerald-600 shrink-0 fill-current" />
                        <span className="truncate hidden sm:inline">{w.routineName}</span>
                        <span className="sm:hidden font-mono text-[9px]">{w.completedSetsCount}s</span>
                      </div>
                    );
                  })}

                  {cell.workouts.length > 2 && (
                    <span className="text-[9px] font-bold text-emerald-700 block text-right">
                      +{cell.workouts.length - 2} más
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Empty State Help Card if no logs exist yet */}
      {totalCount === 0 && (
        <div className="mt-6 p-6 rounded-3xl border-2 border-dashed border-zinc-200 bg-white text-center">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto mb-3">
            <Trophy className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-zinc-900 mb-1">
            Tu calendario se llenará automáticamente
          </h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto mb-4">
            Cada vez que pulses «Finalizar entrenamiento» al terminar una sesión de rutina, se guardará aquí su resumen con el tiempo y series realizadas.
          </p>
          <button
            type="button"
            onClick={onGoToRoutines}
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs shadow-2xs transition-all active:scale-95"
          >
            Ir a mis Rutinas
          </button>
        </div>
      )}

      {/* Multiple workouts in one day selector modal */}
      {selectedDayWorkouts && (
        <div
          id="modal-day-workouts-selector"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setSelectedDayWorkouts(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-zinc-200 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-3">
              <div>
                <h3 className="text-sm sm:text-base font-black text-zinc-900 capitalize">
                  {selectedDayWorkouts.dateLabel}
                </h3>
                <span className="text-xs text-zinc-500 font-medium">
                  {selectedDayWorkouts.workouts.length} entrenamientos completados
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayWorkouts(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-xl hover:bg-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {selectedDayWorkouts.workouts.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => {
                    setSelectedLog(w);
                    setSelectedDayWorkouts(null);
                  }}
                  className="w-full p-3 rounded-2xl border border-zinc-200 hover:border-emerald-500 hover:bg-emerald-50/40 text-left transition-all flex items-center justify-between group shadow-2xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Flame className="w-4 h-4 fill-current" />
                    </div>
                    <div className="min-w-0">
                      <span className="block font-bold text-xs sm:text-sm text-zinc-900 group-hover:text-emerald-950 truncate">
                        {w.routineName}
                      </span>
                      <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-0.5">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-zinc-400" />
                          {formatDetailedDuration(w.durationSeconds)}
                        </span>
                        <span>•</span>
                        <span>{w.completedSetsCount}/{w.totalSetsCount} series</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 shrink-0 ml-2">
                    Ver desglose &rarr;
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Workout Detail Breakdown Modal */}
      <WorkoutDetailModal
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
        onDelete={onDeleteLog}
      />
    </div>
  );
};
