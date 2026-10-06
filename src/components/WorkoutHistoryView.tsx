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
import { WorkoutHistoryLog, ExerciseRmLog, ExerciseDiary } from '../types';
import { WorkoutDetailModal } from './WorkoutDetailModal';
import { formatDetailedDuration } from '../utils/timeCalculations';

interface WorkoutHistoryViewProps {
  historyLogs: WorkoutHistoryLog[];
  rmLogs?: ExerciseRmLog[];
  exerciseDiary?: ExerciseDiary[];
  onOpenDiary?: (exerciseName: string, exerciseId?: string) => void;
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
  rmLogs = [],
  exerciseDiary = [],
  onOpenDiary,
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
    <div id="workout-history-container" className="min-h-screen bg-[#0D0D0D] text-white pb-28 pt-4 sm:pt-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Top Header Card with Bento Summary Metrics */}
        <div className="bg-[#1C1C1E] rounded-2xl border border-white/[0.08] p-5 sm:p-6 shadow-xl mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/10 text-[#00FF87] flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(0,255,135,0.2)]">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Historial de Entrenamientos
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-[#00FF87]/15 text-[#00FF87] border border-[#00FF87]/30">
                    {totalCount} {totalCount === 1 ? 'sesión' : 'sesiones'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#A1A1AA] mt-0.5">
                  Calendario de rutinas completadas y desglose de cada sesión.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {!isViewingCurrentMonth && (
                <button
                  type="button"
                  onClick={handleGoToday}
                  className="px-4 min-h-[44px] rounded-xl border border-white/10 bg-zinc-900 hover:bg-zinc-800 text-xs font-bold text-white transition active:scale-95 shadow-inner"
                >
                  Volver a Hoy
                </button>
              )}
            </div>
          </div>

          {/* Bento stats: Semana actual & Mes actual */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Stat 1: Semana Actual */}
            <div className="p-4 rounded-2xl bg-zinc-900/90 border border-[#00FF87]/30 flex items-center gap-3 shadow-inner">
              <div className="w-10 h-10 rounded-xl bg-[#00FF87]/15 text-[#00FF87] flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(0,255,135,0.2)]">
                <Flame className="w-5 h-5 fill-current" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#00FF87] block truncate">
                  Esta semana
                </span>
                <span className="text-xl sm:text-2xl font-black text-white font-mono leading-none block">
                  {currentWeekCount}
                </span>
                <span className="text-[10px] text-zinc-400 font-semibold truncate block mt-0.5">
                  {currentWeekCount === 1 ? 'rutina completada' : 'rutinas completadas'}
                </span>
              </div>
            </div>

            {/* Stat 2: Mes Actual */}
            <div className="p-4 rounded-2xl bg-zinc-900/90 border border-[#00E5FF]/30 flex items-center gap-3 shadow-inner">
              <div className="w-10 h-10 rounded-xl bg-[#00E5FF]/15 text-[#00E5FF] flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(0,229,255,0.2)]">
                <Trophy className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#00E5FF] block truncate">
                  Este mes ({MONTH_NAMES[today.getMonth()]})
                </span>
                <span className="text-xl sm:text-2xl font-black text-white font-mono leading-none block">
                  {currentMonthCount}
                </span>
                <span className="text-[10px] text-zinc-400 font-semibold truncate block mt-0.5">
                  {currentMonthCount === 1 ? 'rutina completada' : 'rutinas completadas'}
                </span>
              </div>
            </div>

            {/* Stat 3: Total Histórico */}
            <div className="p-4 rounded-2xl bg-zinc-900/90 border border-white/10 hidden sm:flex items-center gap-3 shadow-inner">
              <div className="w-10 h-10 rounded-xl bg-zinc-800 text-zinc-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-[#00FF87]" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-zinc-400 block truncate">
                  Total registrado
                </span>
                <span className="text-xl sm:text-2xl font-black text-white font-mono leading-none block">
                  {totalCount}
                </span>
                <span className="text-[10px] text-zinc-400 font-semibold truncate block mt-0.5">
                  sesiones en histórico
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Card */}
        <div className="bg-[#1C1C1E] rounded-2xl border border-white/[0.08] shadow-xl overflow-hidden mb-6">
          {/* Month Navigation Bar */}
          <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </h2>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                id="btn-prev-month"
                type="button"
                onClick={handlePrevMonth}
                className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors active:scale-95 border border-white/10 flex items-center justify-center"
                title="Mes anterior"
                aria-label="Mes anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                id="btn-next-month"
                type="button"
                onClick={handleNextMonth}
                className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors active:scale-95 border border-white/10 flex items-center justify-center"
                title="Mes siguiente"
                aria-label="Mes siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 border-b border-white/[0.06] bg-zinc-900/60 text-center py-2.5 text-[11px] sm:text-xs font-extrabold text-[#A1A1AA] uppercase tracking-wider">
            {WEEKDAY_NAMES.map((wName, idx) => (
              <div key={idx} className={idx >= 5 ? 'text-zinc-500' : ''}>
                {wName}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-white/[0.06] bg-black/40">
            {calendarCells.map((cell, idx) => {
              const hasWorkouts = cell.workouts.length > 0;

              return (
                <div
                  key={idx}
                  onClick={() => handleCellClick(cell.dateKey, cell.workouts)}
                  className={`min-h-[78px] sm:min-h-[105px] p-1.5 sm:p-2.5 flex flex-col justify-between transition-all ${
                    cell.isCurrentMonth ? 'bg-[#1C1C1E]' : 'bg-[#121214]/60 text-zinc-600'
                  } ${cell.isToday ? 'ring-2 ring-inset ring-[#00FF87]' : ''} ${
                    hasWorkouts
                      ? 'cursor-pointer hover:bg-[#00FF87]/[0.06]'
                      : 'cursor-default'
                  }`}
                >
                  {/* Day number & indicators */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs sm:text-sm font-bold inline-flex items-center justify-center w-6 h-6 rounded-full ${
                        cell.isToday
                          ? 'bg-[#00FF87] text-black font-black shadow-[0_0_10px_rgba(0,255,135,0.6)]'
                          : cell.isCurrentMonth
                          ? 'text-white'
                          : 'text-zinc-600'
                      }`}
                    >
                      {cell.day}
                    </span>

                    {/* Badge with count if > 1 workout on this day */}
                    {cell.workouts.length > 1 && (
                      <span
                        className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-[#00FF87] text-black shadow-[0_0_8px_rgba(0,255,135,0.4)]"
                        title={`${cell.workouts.length} entrenamientos`}
                      >
                        {cell.workouts.length}
                      </span>
                    )}
                  </div>

                  {/* Workout tags/chips */}
                  <div className="space-y-1 mt-1">
                    {cell.workouts.map((w, wIdx) => {
                      if (wIdx > 1) return null;

                      return (
                        <div
                          key={w.id}
                          className="bg-[#00FF87]/15 hover:bg-[#00FF87]/25 border border-[#00FF87]/30 rounded-lg px-1.5 py-0.5 text-[10px] font-bold text-[#00FF87] truncate flex items-center gap-1 shadow-inner transition-colors"
                          title={`${w.routineName} (${formatDetailedDuration(w.durationSeconds)})`}
                        >
                          <Flame className="w-2.5 h-2.5 text-[#00FF87] shrink-0 fill-current" />
                          <span className="truncate hidden sm:inline">{w.routineName}</span>
                          <span className="sm:hidden font-mono text-[9px]">{w.completedSetsCount}s</span>
                        </div>
                      );
                    })}

                    {cell.workouts.length > 2 && (
                      <span className="text-[9px] font-bold text-[#00FF87] block text-right">
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
        <div className="mt-6 p-6 rounded-2xl border border-white/[0.08] bg-[#1C1C1E] text-center max-w-md mx-auto shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-white/10 text-[#00FF87] flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(0,255,135,0.2)]">
            <Trophy className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">
            Tu calendario se llenará automáticamente
          </h3>
          <p className="text-xs text-[#A1A1AA] max-w-sm mx-auto mb-5 leading-relaxed">
            Cada vez que pulses «Finalizar entrenamiento» al terminar una sesión de rutina, se guardará aquí su resumen con el tiempo y series realizadas.
          </p>
          <button
            type="button"
            onClick={onGoToRoutines}
            className="px-6 min-h-[48px] rounded-2xl bg-[#00FF87] hover:bg-[#00e57a] text-black font-extrabold text-sm shadow-[0_0_20px_rgba(0,255,135,0.35)] transition-all active:scale-[0.97]"
          >
            Ir a mis Rutinas
          </button>
        </div>
      )}

      {/* Multiple workouts in one day selector modal */}
      {selectedDayWorkouts && (
        <div
          id="modal-day-workouts-selector"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setSelectedDayWorkouts(null)}
        >
          <div
            className="bg-[#1C1C1E] rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-white/[0.08] animate-in zoom-in-95 duration-200 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-3">
              <div>
                <h3 className="text-sm sm:text-base font-black text-white capitalize">
                  {selectedDayWorkouts.dateLabel}
                </h3>
                <span className="text-xs text-[#A1A1AA] font-medium">
                  {selectedDayWorkouts.workouts.length} entrenamientos completados
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayWorkouts(null)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800"
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
                  className="w-full p-3.5 rounded-2xl border border-white/10 hover:border-[#00FF87] bg-zinc-900 hover:bg-[#00FF87]/10 text-left transition-all flex items-center justify-between group shadow-inner active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-black border border-white/10 text-[#00FF87] flex items-center justify-center shrink-0">
                      <Flame className="w-4 h-4 fill-current" />
                    </div>
                    <div className="min-w-0">
                      <span className="block font-bold text-xs sm:text-sm text-white group-hover:text-[#00FF87] truncate">
                        {w.routineName}
                      </span>
                      <div className="flex items-center gap-2 text-[11px] text-[#A1A1AA] mt-0.5">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-zinc-500" />
                          {formatDetailedDuration(w.durationSeconds)}
                        </span>
                        <span>•</span>
                        <span>{w.completedSetsCount}/{w.totalSetsCount} series</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#00FF87] shrink-0 ml-2">
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
        rmLogs={rmLogs}
        exerciseDiary={exerciseDiary}
        onOpenDiary={onOpenDiary}
        onClose={() => setSelectedLog(null)}
        onDelete={onDeleteLog}
      />
      </div>
    </div>
  );
};
