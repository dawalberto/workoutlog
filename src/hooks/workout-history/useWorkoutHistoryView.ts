import { useMemo, useState } from 'react';
import type { WorkoutHistoryLog } from '../../types';
import { AppTab } from '../../types';
import { useAppStore } from '../../store/appStore';
import { selectPersistedData } from '../../store/selectors';
import { useShallow } from 'zustand/react/shallow';
import {
  getWorkoutHistoryCalendarCells,
  getWorkoutHistoryStats,
  groupWorkoutHistoryByDate,
} from '../../utils/workoutHistory';

export function useWorkoutHistoryView() {
  const { workoutHistory } = useAppStore(useShallow(selectPersistedData));
  const deleteHistoryLog = useAppStore((state) => state.deleteHistoryLog);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth());
  const [selectedLog, setSelectedLog] = useState<WorkoutHistoryLog | null>(null);
  const [selectedDayWorkouts, setSelectedDayWorkouts] = useState<{
    dateLabel: string;
    workouts: WorkoutHistoryLog[];
  } | null>(null);

  const logsByDate = useMemo(
    () => groupWorkoutHistoryByDate(workoutHistory),
    [workoutHistory],
  );
  const { currentWeekCount, currentMonthCount, totalCount } = useMemo(
    () => getWorkoutHistoryStats(workoutHistory, new Date()),
    [workoutHistory],
  );
  const calendarCells = useMemo(
    () => getWorkoutHistoryCalendarCells(currentYear, currentMonth, logsByDate, today),
    [currentYear, currentMonth, logsByDate, today],
  );

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((year) => year - 1);
    } else {
      setCurrentMonth((month) => month - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((year) => year + 1);
    } else {
      setCurrentMonth((month) => month + 1);
    }
  };

  const handleGoToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  const handleCellClick = (dateKey: string, workouts: WorkoutHistoryLog[]) => {
    if (workouts.length === 0) return;
    if (workouts.length === 1) {
      setSelectedLog(workouts[0]);
      return;
    }

    const [year, month, day] = dateKey.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dateLabel = dateObj.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    setSelectedDayWorkouts({ dateLabel, workouts });
  };

  return {
    calendarCells,
    currentMonth,
    currentMonthCount,
    currentWeekCount,
    currentYear,
    deleteHistoryLog,
    handleCellClick,
    handleGoToday,
    handleNextMonth,
    handlePrevMonth,
    isViewingCurrentMonth: currentYear === today.getFullYear() && currentMonth === today.getMonth(),
    onGoToRoutines: () => setActiveTab(AppTab.ROUTINES),
    selectedDayWorkouts,
    selectedLog,
    setSelectedDayWorkouts,
    setSelectedLog,
    today,
    totalCount,
  };
}
