BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;

SELECT plan(9);

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
  '10000000-0000-4000-8000-000000000011',
  'authenticated',
  'authenticated',
  'sync-write-owner@example.test',
  '',
  now(),
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.routines (user_id, id, name)
VALUES (
  '10000000-0000-4000-8000-000000000011',
  'sync-existing-routine',
  'Existing routine'
);

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000011',
  true
);

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM unnest(ARRAY[
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
    ]) AS tables(table_name)
    CROSS JOIN unnest(ARRAY['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']) AS privileges(privilege)
    WHERE has_table_privilege(
      'authenticated',
      format('public.%I', tables.table_name),
      privileges.privilege
    )
       OR has_table_privilege(
         'anon',
         format('public.%I', tables.table_name),
         privileges.privilege
       )
  ),
  'client roles cannot directly write any synced table'
);
SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM unnest(ARRAY[
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
    ]) AS tables(table_name)
    WHERE NOT has_table_privilege(
      'authenticated',
      format('public.%I', tables.table_name),
      'SELECT'
    )
       OR has_table_privilege(
         'anon',
         format('public.%I', tables.table_name),
         'SELECT'
       )
  ),
  'authenticated retains pull reads and anon has no table read access'
);
SELECT is(
  (SELECT count(*)::integer FROM public.routines WHERE id = 'sync-existing-routine'),
  1,
  'authenticated can read its own synced rows'
);
SELECT throws_ok(
  $$INSERT INTO public.routines (user_id, id, name)
    VALUES (
      '10000000-0000-4000-8000-000000000011',
      'sync-direct-insert',
      'Direct insert'
    )$$,
  '42501',
  NULL,
  'authenticated cannot directly insert an owned row'
);
SELECT throws_ok(
  $$UPDATE public.routines
    SET name = 'Direct update'
    WHERE id = 'sync-existing-routine'$$,
  '42501',
  NULL,
  'authenticated cannot directly update an owned row'
);
SELECT lives_ok(
  $$SELECT public.sync_push(
      '20000000-0000-4000-8000-000000000011',
      '[{"table":"routines","operation":"upsert","baseRevision":"0","record":{"id":"sync-rpc-routine","name":"RPC inserted"}}]'::jsonb
    )$$,
  'sync_push can insert while direct table writes are revoked'
);
SELECT is(
  (SELECT name FROM public.routines WHERE id = 'sync-rpc-routine'),
  'RPC inserted',
  'sync_push inserted the owned row'
);
SELECT set_config(
  'test.sync_rpc_insert_revision',
  (SELECT server_revision::text FROM public.routines WHERE id = 'sync-rpc-routine'),
  true
);
SELECT lives_ok(
  $$SELECT public.sync_push(
      '20000000-0000-4000-8000-000000000012',
      jsonb_build_array(jsonb_build_object(
        'table', 'routines',
        'operation', 'upsert',
        'baseRevision', current_setting('test.sync_rpc_insert_revision'),
        'record', jsonb_build_object('id', 'sync-rpc-routine', 'name', 'RPC updated')
      ))
    )$$,
  'sync_push can update while direct table writes are revoked'
);
SELECT is(
  (SELECT name FROM public.routines WHERE id = 'sync-rpc-routine'),
  'RPC updated',
  'sync_push updated the owned row'
);

SELECT * FROM finish();
ROLLBACK;
