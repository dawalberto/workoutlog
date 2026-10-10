BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;

SELECT plan(25);

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
VALUES
  (
    '10000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'rls-owner-a@example.test',
    '',
    now(),
    now(),
    now()
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'rls-owner-b@example.test',
    '',
    now(),
    now(),
    now()
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.routines (user_id, id, name)
VALUES
  ('10000000-0000-4000-8000-000000000001', 'rls-routine-a', 'Owner A routine'),
  ('10000000-0000-4000-8000-000000000001', 'rls-delete-a', 'Owner A deletable routine'),
  ('10000000-0000-4000-8000-000000000001', 'rls-tombstone-a', 'Owner A tombstone routine'),
  ('10000000-0000-4000-8000-000000000002', 'rls-routine-b', 'Owner B routine');

INSERT INTO public.exercise_definitions (
  user_id,
  id,
  name,
  category,
  default_reps,
  default_weight
)
VALUES
  (
    '10000000-0000-4000-8000-000000000001',
    'rls-definition-a',
    'Owner A definition',
    'strength',
    '"8-12"'::jsonb,
    '80'::jsonb
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'rls-definition-b',
    'Owner B definition',
    'strength',
    NULL,
    NULL
  );

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
  '10000000-0000-4000-8000-000000000001',
  'rls-exercise-a',
  'rls-routine-a',
  'rls-definition-a',
  'Owner A exercise snapshot',
  'strength',
  0
);

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);

SELECT ok(
  (
    SELECT count(*) = 12
      AND bool_and(relrowsecurity)
    FROM pg_class
    WHERE relnamespace = 'public'::regnamespace
      AND relkind = 'r'
      AND relname = ANY (ARRAY[
        'exercise_definitions',
        'routines',
        'routine_exercises',
        'workout_sets',
        'active_workout_sessions',
        'active_session_completed_sets',
        'rm_logs',
        'rm_records',
        'workout_history',
        'workout_history_exercises',
        'exercise_diaries',
        'exercise_diary_entries'
      ])
  ),
  'RLS is enabled on every exposed user-data table'
);

SELECT is(
  (SELECT count(*)::integer FROM public.routines WHERE id IN ('rls-routine-a', 'rls-routine-b')),
  1,
  'owner A reads only owner A routines'
);
SELECT is(
  (SELECT count(*)::integer FROM public.exercise_definitions WHERE id IN ('rls-definition-a', 'rls-definition-b')),
  1,
  'owner A reads only owner A definitions'
);
SELECT ok(
  (
    SELECT jsonb_typeof(default_reps) = 'string'
      AND jsonb_typeof(default_weight) = 'number'
    FROM public.exercise_definitions
    WHERE id = 'rls-definition-a'
  ),
  'definition defaults preserve their JSON scalar types'
);
SELECT set_config(
  'test.owner_a_initial_revision',
  (SELECT server_revision::text FROM public.routines WHERE id = 'rls-routine-a'),
  true
);

SELECT lives_ok(
  $$INSERT INTO public.routines (user_id, id, name)
    VALUES ('10000000-0000-4000-8000-000000000001', 'rls-insert-a', 'Owner A inserted')$$,
  'owner A can insert an owned routine'
);
SELECT throws_ok(
  $$INSERT INTO public.routines (user_id, id, name)
    VALUES ('10000000-0000-4000-8000-000000000002', 'rls-insert-b-as-a', 'Not owned')$$,
  '42501',
  NULL,
  'owner A cannot insert a row for owner B'
);
SELECT throws_ok(
  $$INSERT INTO public.routine_exercises (
      user_id, id, routine_id, definition_id, name, position
    ) VALUES (
      '10000000-0000-4000-8000-000000000001',
      'rls-cross-definition',
      'rls-routine-a',
      'rls-definition-b',
      'Cross-owner reference',
      1
    )$$,
  '23503',
  NULL,
  'owner A cannot reference owner B definition through a composite foreign key'
);
SELECT lives_ok(
  $$UPDATE public.routines
    SET name = 'Owner A hijacked routine'
    WHERE user_id = '10000000-0000-4000-8000-000000000002'
      AND id = 'rls-routine-b'$$,
  'owner A update of owner B routine affects no rows'
);
SELECT lives_ok(
  $$UPDATE public.routines
    SET name = 'Owner A updated routine', server_revision = 0
    WHERE id = 'rls-routine-a'$$,
  'owner A can update an owned routine without choosing its revision'
);
SELECT throws_ok(
  $$UPDATE public.routines
    SET user_id = '10000000-0000-4000-8000-000000000002'
    WHERE id = 'rls-routine-a'$$,
  '42501',
  NULL,
  'owner A cannot reassign its row to owner B'
);
SELECT is(
  (SELECT name FROM public.routines WHERE id = 'rls-routine-a'),
  'Owner A updated routine',
  'owner A reads back its updated routine'
);
SELECT ok(
  (
    SELECT server_revision > current_setting('test.owner_a_initial_revision')::bigint
    FROM public.routines
    WHERE id = 'rls-routine-a'
  ),
  'server assigns an increasing revision after an accepted update'
);
SELECT lives_ok(
  $$UPDATE public.routines
    SET deleted_at = clock_timestamp()
    WHERE id = 'rls-tombstone-a'$$,
  'owner A can synchronize a deletion tombstone'
);
SELECT ok(
  (
    SELECT deleted_at IS NOT NULL AND server_revision > 0
    FROM public.routines
    WHERE id = 'rls-tombstone-a'
  ),
  'tombstone updates retain the row and receive server revisions'
);
SELECT throws_ok(
  $$DELETE FROM public.routines
    WHERE user_id = '10000000-0000-4000-8000-000000000002'
      AND id = 'rls-routine-b'$$,
  '42501',
  NULL,
  'authenticated clients cannot physically delete routines'
);
SELECT throws_ok(
  $$DELETE FROM public.routines WHERE id = 'rls-delete-a'$$,
  '42501',
  NULL,
  'owner A cannot physically delete an owned routine'
);
SELECT is(
  (SELECT count(*)::integer FROM public.routines WHERE id = 'rls-delete-a'),
  1,
  'the physical delete attempt preserves the owner row'
);
SELECT set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
SELECT is(
  (SELECT count(*)::integer FROM public.routines WHERE id IN ('rls-routine-a', 'rls-routine-b')),
  1,
  'owner B reads only owner B routines'
);
SELECT is(
  (SELECT count(*)::integer FROM public.exercise_definitions WHERE id IN ('rls-definition-a', 'rls-definition-b')),
  1,
  'owner B reads only owner B definitions'
);
SELECT lives_ok(
  $$UPDATE public.routines
    SET name = 'Owner B hijacked routine'
    WHERE user_id = '10000000-0000-4000-8000-000000000001'
      AND id = 'rls-routine-a'$$,
  'owner B update of owner A routine affects no rows'
);
SELECT throws_ok(
  $$INSERT INTO public.routines (user_id, id, name)
    VALUES ('10000000-0000-4000-8000-000000000001', 'rls-insert-a-as-b', 'Not owned')$$,
  '42501',
  NULL,
  'owner B cannot insert a row for owner A'
);
SELECT throws_ok(
  $$DELETE FROM public.routines
    WHERE user_id = '10000000-0000-4000-8000-000000000001'
      AND id = 'rls-routine-a'$$,
  '42501',
  NULL,
  'authenticated clients cannot physically delete another owner row'
);
SELECT throws_ok(
  $$DELETE FROM public.routines WHERE id = 'rls-routine-b'$$,
  '42501',
  NULL,
  'owner B cannot physically delete an owned routine'
);
SELECT is(
  (SELECT count(*)::integer FROM public.routines WHERE id = 'rls-routine-b'),
  1,
  'the second physical delete attempt preserves the owner row'
);
SELECT set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
SELECT is(
  (SELECT name FROM public.routines WHERE id = 'rls-routine-a'),
  'Owner A updated routine',
  'owner A row remains unchanged after owner B update and delete attempts'
);

SELECT * FROM finish();
ROLLBACK;
