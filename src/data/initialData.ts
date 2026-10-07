import { ExerciseDefinition, Routine } from '../types';

export const INITIAL_EXERCISE_DEFINITIONS: ExerciseDefinition[] = [
  {
    id: 'starter-push-up',
    name: 'Push-up',
    category: 'Chest',
    defaultSetsCount: 3,
    defaultReps: 8,
    defaultWeight: 0,
    defaultRestSeconds: 60,
  },
  {
    id: 'starter-squat',
    name: 'Bodyweight Squat',
    category: 'Legs',
    defaultSetsCount: 3,
    defaultReps: 10,
    defaultWeight: 0,
    defaultRestSeconds: 60,
  },
  {
    id: 'starter-dumbbell-row',
    name: 'Dumbbell Row',
    category: 'Back',
    defaultSetsCount: 3,
    defaultReps: 10,
    defaultWeight: 10,
    defaultRestSeconds: 60,
  },
  {
    id: 'starter-plank',
    name: 'Plank',
    category: 'Core',
    defaultSetsCount: 3,
    defaultReps: 30,
    defaultWeight: 0,
    defaultRestSeconds: 45,
  },
];

const starterCreatedAt = '2026-01-01T00:00:00.000Z';

export const INITIAL_ROUTINES: Routine[] = [
  {
    id: 'starter-routine-full-body-a',
    name: 'Starter Full Body A',
    notes: 'An editable, equipment-light full-body routine.',
    createdAt: starterCreatedAt,
    updatedAt: starterCreatedAt,
    exercises: [
      {
        id: 'starter-routine-a-push-up',
        definitionId: 'starter-push-up',
        name: 'Push-up',
        category: 'Chest',
        sets: [
          { id: 'starter-routine-a-push-up-set-1', setNumber: 1, reps: 8, weight: 0, restSeconds: 60 },
          { id: 'starter-routine-a-push-up-set-2', setNumber: 2, reps: 8, weight: 0, restSeconds: 60 },
          { id: 'starter-routine-a-push-up-set-3', setNumber: 3, reps: 8, weight: 0, restSeconds: 60 },
        ],
      },
      {
        id: 'starter-routine-a-squat',
        definitionId: 'starter-squat',
        name: 'Bodyweight Squat',
        category: 'Legs',
        sets: [
          { id: 'starter-routine-a-squat-set-1', setNumber: 1, reps: 10, weight: 0, restSeconds: 60 },
          { id: 'starter-routine-a-squat-set-2', setNumber: 2, reps: 10, weight: 0, restSeconds: 60 },
          { id: 'starter-routine-a-squat-set-3', setNumber: 3, reps: 10, weight: 0, restSeconds: 60 },
        ],
      },
    ],
  },
  {
    id: 'starter-routine-full-body-b',
    name: 'Starter Full Body B',
    notes: 'An editable routine with a light dumbbell and core work.',
    createdAt: starterCreatedAt,
    updatedAt: starterCreatedAt,
    exercises: [
      {
        id: 'starter-routine-b-row',
        definitionId: 'starter-dumbbell-row',
        name: 'Dumbbell Row',
        category: 'Back',
        sets: [
          { id: 'starter-routine-b-row-set-1', setNumber: 1, reps: 10, weight: 10, restSeconds: 60 },
          { id: 'starter-routine-b-row-set-2', setNumber: 2, reps: 10, weight: 10, restSeconds: 60 },
          { id: 'starter-routine-b-row-set-3', setNumber: 3, reps: 10, weight: 10, restSeconds: 60 },
        ],
      },
      {
        id: 'starter-routine-b-plank',
        definitionId: 'starter-plank',
        name: 'Plank',
        category: 'Core',
        sets: [
          { id: 'starter-routine-b-plank-set-1', setNumber: 1, reps: 30, weight: 0, restSeconds: 45 },
          { id: 'starter-routine-b-plank-set-2', setNumber: 2, reps: 30, weight: 0, restSeconds: 45 },
          { id: 'starter-routine-b-plank-set-3', setNumber: 3, reps: 30, weight: 0, restSeconds: 45 },
        ],
      },
    ],
  },
];

export function getStarterData() {
  return {
    catalog: INITIAL_EXERCISE_DEFINITIONS.map((definition) => ({ ...definition })),
    routines: INITIAL_ROUTINES.map((routine) => ({
      ...routine,
      exercises: routine.exercises.map((exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set) => ({ ...set })),
      })),
    })),
  };
}
