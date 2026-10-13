-- Local development fixture only. This is one ordinary, private test account.
INSERT INTO auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'workoutlog-local@example.test',
  '',
  now(),
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.exercise_definitions (
  user_id,
  id,
  name,
  category,
  default_sets,
  default_reps,
  default_weight,
  default_rest_seconds
)
VALUES
  (
    '00000000-0000-4000-8000-000000000001',
    'starter-push-up',
    'Push-up',
    'Chest',
    '3'::jsonb,
    '8'::jsonb,
    '0'::jsonb,
    '60'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000000001',
    'starter-squat',
    'Bodyweight Squat',
    'Legs',
    '3'::jsonb,
    '10'::jsonb,
    '0'::jsonb,
    '60'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000000001',
    'starter-dumbbell-row',
    'Dumbbell Row',
    'Back',
    '3'::jsonb,
    '10'::jsonb,
    '10'::jsonb,
    '60'::jsonb
  )
ON CONFLICT (user_id, id) DO NOTHING;

INSERT INTO public.routines (user_id, id, name, notes)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'starter-routine-full-body-a',
  'Starter Full Body A',
  'An editable, equipment-light full-body routine.'
)
ON CONFLICT (user_id, id) DO NOTHING;

INSERT INTO public.routine_exercises (
  user_id,
  id,
  routine_id,
  definition_id,
  name,
  category,
  position
)
VALUES
  (
    '00000000-0000-4000-8000-000000000001',
    'starter-routine-a-push-up',
    'starter-routine-full-body-a',
    'starter-push-up',
    'Push-up',
    'Chest',
    0
  ),
  (
    '00000000-0000-4000-8000-000000000001',
    'starter-routine-a-squat',
    'starter-routine-full-body-a',
    'starter-squat',
    'Bodyweight Squat',
    'Legs',
    1
  )
ON CONFLICT (user_id, id) DO NOTHING;

INSERT INTO public.workout_sets (
  user_id,
  id,
  routine_id,
  routine_exercise_id,
  position,
  reps,
  weight,
  rest_seconds
)
VALUES
  (
    '00000000-0000-4000-8000-000000000001',
    'starter-routine-a-push-up-set-1',
    'starter-routine-full-body-a',
    'starter-routine-a-push-up',
    0,
    '8'::jsonb,
    '0'::jsonb,
    '60'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000000001',
    'starter-routine-a-squat-set-1',
    'starter-routine-full-body-a',
    'starter-routine-a-squat',
    0,
    '10'::jsonb,
    '0'::jsonb,
    '60'::jsonb
  )
ON CONFLICT (user_id, id) DO NOTHING;
