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
  notes?: string;
  videoUrl?: string;
  sets: WorkoutSet[];
}

export interface Routine {
  id: string;
  name: string;
  notes?: string;
  exercises: Exercise[];
  createdAt: string;
  updatedAt: string;
}

export type ViewMode = 'list' | 'detail';
export type RoutineSubMode = 'edit' | 'execute';
