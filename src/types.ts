export interface WorkoutSet {
  id: string;
  setNumber: number;
  reps: number | string;
  weight: number | string; // in kg
  restSeconds: number | string; // in seconds (e.g. 60, 90, 120)
}

export interface Exercise {
  id: string;
  definitionId?: string;
  name: string;
  category?: string;
  notes?: string;
  imageUrl?: string;
  videoUrl?: string;
  sets: WorkoutSet[];
}

export interface ExerciseDefinition {
  id: string;
  name: string;
  category?: string;
  imageUrl?: string;
  videoUrl?: string;
  notes?: string;
  defaultSetsCount?: number;
  defaultReps?: number;
  defaultWeight?: number;
  defaultRestSeconds?: number;
  createdAt?: string;
}

export interface Routine {
  id: string;
  name: string;
  notes?: string;
  exercises: Exercise[];
  createdAt: string;
  updatedAt: string;
}

export enum AppTab {
  ROUTINES = 'routines',
  EXERCISES = 'exercises',
  RMS = 'rms',
  HISTORY = 'history',
  DIARY = 'diary',
}

export type DiaryFeeling = 'good' | 'neutral' | 'bad';

export interface ExerciseDiaryEntry {
  id: string;
  date: string; // YYYY-MM-DD
  note: string; // The rich note text
  feeling?: DiaryFeeling; // 🟢 'good' | 🟠 'neutral' | 🔴 'bad'
  createdAt?: string; // ISO
  updatedAt?: string; // ISO
}

export interface ExerciseDiary {
  id: string;
  exerciseId?: string; // ExerciseDefinition ID from catalog
  exerciseName: string; // Name in catalog
  category?: string;
  entries: ExerciseDiaryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface RmRecord {
  id: string;
  weight: number; // in kg
  date: string; // YYYY-MM-DD
  notes?: string;
}

export interface ExerciseRmLog {
  id: string;
  exerciseId?: string; // ID of ExerciseDefinition if linked
  exerciseName: string; // name in catalog
  category?: string;
  records: RmRecord[];
  createdAt: string;
  updatedAt: string;
}

export type ViewMode = 'list' | 'detail';
export type RoutineSubMode = 'edit' | 'execute';

export interface ActiveWorkoutSession {
  routineId: string;
  startTime: number; // Date.now() timestamp when started (ms)
  completedSetIds: string[]; // array of set IDs marked complete
}

export interface ActiveRestTimer {
  routineId: string;
  initialSeconds: number;
  targetEndTime: number; // Date.now() + initialSeconds * 1000
  exerciseName?: string;
  setNumber?: number;
  key?: number;
}

export interface WorkoutCompletionSummary {
  routineId: string;
  routineName: string;
  startTime: number;
  endTime: number;
  durationSeconds: number;
  completedSetsCount: number;
  totalSetsCount: number | null;
  completionPercentage: number | null;
  exercisesSummary: {
    name: string;
    completedSets: number;
    totalSets: number | null;
    position?: number;
    summaryText?: string;
    sets?: WorkoutSet[];
  }[];
}

export interface WorkoutHistoryLog extends WorkoutCompletionSummary {
  id: string; // unique ID of this completed workout log
  completedAt: string; // ISO date-time string (e.g. "2026-09-24T12:00:00.000Z")
}
