import type { WorkoutHistoryLog } from '../types';

export interface WorkoutHistoryCalendarCell {
  day: number;
  dateKey: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  workouts: WorkoutHistoryLog[];
}

export interface WorkoutHistoryStats {
  currentWeekCount: number;
  currentMonthCount: number;
  totalCount: number;
}

export function getWorkoutHistoryDateKey(log: WorkoutHistoryLog): string {
  const date = new Date(log.completedAt || log.endTime);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function groupWorkoutHistoryByDate(
  historyLogs: WorkoutHistoryLog[],
): Map<string, WorkoutHistoryLog[]> {
  const logsByDate = new Map<string, WorkoutHistoryLog[]>();
  historyLogs.forEach((log) => {
    const dateKey = getWorkoutHistoryDateKey(log);
    const workouts = logsByDate.get(dateKey);
    if (workouts) {
      workouts.push(log);
    } else {
      logsByDate.set(dateKey, [log]);
    }
  });
  return logsByDate;
}

export function getWorkoutHistoryStats(
  historyLogs: WorkoutHistoryLog[],
  now: Date,
): WorkoutHistoryStats {
  const dayOfWeek = now.getDay();
  const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
  const startOfWeek = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + diffToMonday,
    0,
    0,
    0,
    0,
  );
  const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
  let currentWeekCount = 0;
  let currentMonthCount = 0;

  historyLogs.forEach((log) => {
    const date = new Date(log.completedAt || log.endTime);
    if (date >= startOfWeek && date <= endOfWeek) currentWeekCount += 1;
    if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()) {
      currentMonthCount += 1;
    }
  });

  return {
    currentWeekCount,
    currentMonthCount,
    totalCount: historyLogs.length,
  };
}

export function getWorkoutHistoryCalendarCells(
  year: number,
  month: number,
  logsByDate: Map<string, WorkoutHistoryLog[]>,
  today: Date,
): WorkoutHistoryCalendarCell[] {
  const firstDay = new Date(year, month, 1);
  const firstDayOfWeek = firstDay.getDay();
  const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const cells: WorkoutHistoryCalendarCell[] = [];

  for (let i = startOffset - 1; i >= 0; i -= 1) {
    const day = daysInPrevMonth - i;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const dateKey = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push({
      day,
      dateKey,
      isCurrentMonth: false,
      isToday: false,
      workouts: logsByDate.get(dateKey) || [],
    });
  }

  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push({
      day,
      dateKey,
      isCurrentMonth: true,
      isToday: dateKey === todayKey,
      workouts: logsByDate.get(dateKey) || [],
    });
  }

  const remaining = (7 - (cells.length % 7)) % 7;
  for (let day = 1; day <= remaining; day += 1) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const dateKey = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push({
      day,
      dateKey,
      isCurrentMonth: false,
      isToday: false,
      workouts: logsByDate.get(dateKey) || [],
    });
  }

  return cells;
}
