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

INSERT INTO public.user_entitlements (user_id, tier, valid_until)
VALUES ('00000000-0000-4000-8000-000000000001', 'premium', NULL)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.exercise_definitions (
  user_id,
  id,
  name,
  category,
  notes,
  default_sets,
  default_reps,
  default_weight,
  default_rest_seconds
)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'local-squat',
  'Squat',
  'strength',
  'Local private fixture',
  '3'::jsonb,
  '10'::jsonb,
  '"bodyweight"'::jsonb,
  '90'::jsonb
)
ON CONFLICT (user_id, id) DO NOTHING;

INSERT INTO public.routines (user_id, id, name, notes)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'local-full-body',
  'Local full body',
  'Editable local development fixture'
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
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'local-squat-in-routine',
  'local-full-body',
  'local-squat',
  'Squat',
  'strength',
  0
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
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'local-squat-set-1',
  'local-full-body',
  'local-squat-in-routine',
  0,
  '10'::jsonb,
  '45'::jsonb,
  '90'::jsonb
)
ON CONFLICT (user_id, id) DO NOTHING;

INSERT INTO public.active_workout_sessions (user_id, routine_id, started_at)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'local-full-body',
  '2026-10-01T12:00:00Z'
)
ON CONFLICT (user_id, routine_id) DO NOTHING;

INSERT INTO public.active_session_completed_sets (user_id, routine_id, set_id)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'local-full-body',
  'local-squat-set-1'
)
ON CONFLICT (user_id, routine_id, set_id) DO NOTHING;

INSERT INTO public.rm_logs (
  user_id,
  id,
  definition_id,
  exercise_name,
  category
)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'local-squat-rm-log',
  'local-squat',
  'Squat',
  'strength'
)
ON CONFLICT (user_id, id) DO NOTHING;

INSERT INTO public.rm_records (
  user_id,
  id,
  log_id,
  weight,
  recorded_on,
  notes
)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'local-squat-rm-record',
  'local-squat-rm-log',
  '100'::jsonb,
  '2026-10-01',
  'Local fixture record'
)
ON CONFLICT (user_id, id) DO NOTHING;

INSERT INTO public.workout_history (
  user_id,
  id,
  routine_id,
  routine_name,
  started_at,
  completed_at,
  duration_seconds,
  exercises_completed,
  sets_completed
)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'local-history-1',
  'local-full-body',
  'Local full body snapshot',
  '2026-10-01T12:00:00Z',
  '2026-10-01T12:30:00Z',
  1800,
  1,
  1
)
ON CONFLICT (user_id, id) DO NOTHING;

INSERT INTO public.workout_history_exercises (
  user_id,
  history_id,
  position,
  exercise_name,
  exercises_completed,
  sets_completed
)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'local-history-1',
  0,
  'Squat snapshot',
  1,
  1
)
ON CONFLICT (user_id, history_id, position) DO NOTHING;

INSERT INTO public.exercise_diaries (
  user_id,
  id,
  definition_id,
  exercise_name,
  category
)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'local-squat-diary',
  'local-squat',
  'Squat',
  'strength'
)
ON CONFLICT (user_id, id) DO NOTHING;

INSERT INTO public.exercise_diary_entries (
  user_id,
  id,
  diary_id,
  recorded_on,
  note,
  feeling
)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'local-squat-diary-entry-1',
  'local-squat-diary',
  '2026-10-01',
  'Local development fixture entry',
  'strong'
)
ON CONFLICT (user_id, id) DO NOTHING;
