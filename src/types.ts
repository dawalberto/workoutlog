export interface WorkoutSet {
  id: string;
  setNumber: number;
  reps: number;
  weight: number; // in kg
  restSeconds: number; // in seconds (e.g. 60, 90, 120)
}

export interface Exercise {
  id: string;
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
}

export type ViewMode = 'list' | 'detail';
export type RoutineSubMode = 'edit' | 'execute';

