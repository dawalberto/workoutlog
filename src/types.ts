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

export interface WorkoutCompletionSummary {
  routineId: string;
  routineName: string;
  startTime: number;
  endTime: number;
  durationSeconds: number;
  completedSetsCount: number;
  totalSetsCount: number;
  completionPercentage: number;
  exercisesSummary: {
    name: string;
    completedSets: number;
    totalSets: number;
  }[];
}

