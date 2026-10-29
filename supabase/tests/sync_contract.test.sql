BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;

SELECT plan(14);

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
  '20000000-0000-4000-8000-000000000091',
  'authenticated',
  'authenticated',
  'sync-contract-owner@example.test',
  '',
  now(),
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

SELECT is(
  (SELECT count(*)::integer FROM private.sync_contract_tables),
  12,
  'the private contract contains all twelve synced tables'
);

SELECT is(
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'table_name', table_name,
        'writable_columns', writable_columns,
        'identity_columns', identity_columns
      )
      ORDER BY table_name
    )
    FROM private.sync_contract_tables
  ),
  jsonb_build_array(
    jsonb_build_object('table_name', 'active_session_completed_sets', 'writable_columns', ARRAY['routine_id', 'set_id', 'created_at', 'updated_at'], 'identity_columns', ARRAY['routine_id', 'set_id']),
    jsonb_build_object('table_name', 'active_workout_sessions', 'writable_columns', ARRAY['routine_id', 'started_at', 'created_at', 'updated_at'], 'identity_columns', ARRAY['routine_id']),
    jsonb_build_object('table_name', 'exercise_definitions', 'writable_columns', ARRAY['id', 'name', 'category', 'categories', 'image_url', 'video_url', 'notes', 'default_sets', 'default_reps', 'default_weight', 'default_rest_seconds', 'created_at', 'updated_at'], 'identity_columns', ARRAY['id']),
    jsonb_build_object('table_name', 'exercise_diaries', 'writable_columns', ARRAY['id', 'definition_id', 'exercise_name', 'category', 'categories', 'created_at', 'updated_at'], 'identity_columns', ARRAY['id']),
    jsonb_build_object('table_name', 'exercise_diary_entries', 'writable_columns', ARRAY['id', 'diary_id', 'recorded_on', 'note', 'feeling', 'created_at', 'updated_at'], 'identity_columns', ARRAY['id']),
    jsonb_build_object('table_name', 'rm_logs', 'writable_columns', ARRAY['id', 'definition_id', 'exercise_name', 'category', 'categories', 'created_at', 'updated_at'], 'identity_columns', ARRAY['id']),
    jsonb_build_object('table_name', 'rm_records', 'writable_columns', ARRAY['id', 'log_id', 'weight', 'recorded_on', 'notes', 'created_at', 'updated_at'], 'identity_columns', ARRAY['id']),
    jsonb_build_object('table_name', 'routine_exercises', 'writable_columns', ARRAY['id', 'routine_id', 'definition_id', 'name', 'category', 'categories', 'notes', 'image_url', 'video_url', 'position', 'created_at', 'updated_at'], 'identity_columns', ARRAY['id']),
    jsonb_build_object('table_name', 'routines', 'writable_columns', ARRAY['id', 'name', 'notes', 'created_at', 'updated_at'], 'identity_columns', ARRAY['id']),
    jsonb_build_object('table_name', 'workout_history', 'writable_columns', ARRAY['id', 'routine_id', 'routine_name', 'started_at', 'completed_at', 'duration_seconds', 'exercises_completed', 'sets_completed', 'total_sets_count', 'completion_percentage', 'created_at', 'updated_at'], 'identity_columns', ARRAY['id']),
    jsonb_build_object('table_name', 'workout_history_exercises', 'writable_columns', ARRAY['history_id', 'position', 'exercise_name', 'exercises_completed', 'sets_completed', 'sets_total', 'created_at', 'updated_at'], 'identity_columns', ARRAY['history_id', 'position']),
    jsonb_build_object('table_name', 'workout_sets', 'writable_columns', ARRAY['id', 'routine_id', 'routine_exercise_id', 'position', 'reps', 'weight', 'rest_seconds', 'created_at', 'updated_at'], 'identity_columns', ARRAY['id'])
  ),
  'metadata matches every writable column and identity in the client contract'
);

SELECT is(
  (SELECT accepted FROM private.sync_contract_versions WHERE version = 1),
  true,
  'sync contract version 1 is accepted'
);

SELECT is(
  (SELECT accepted FROM private.sync_contract_versions WHERE version = 2),
  true,
  'sync contract version 2 is accepted'
);

SELECT ok(
  (
    SELECT count(*) = 1
    FROM pg_proc AS procedure
    JOIN pg_namespace AS namespace
      ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.proname = 'sync_push'
  )
    AND has_function_privilege(
      'authenticated',
      'public.sync_push(uuid,jsonb,integer)',
      'EXECUTE'
    )
    AND NOT has_function_privilege(
      'anon',
      'public.sync_push(uuid,jsonb,integer)',
      'EXECUTE'
    ),
  'exactly one sync_push overload is executable by authenticated users only'
);

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claim.sub',
  '20000000-0000-4000-8000-000000000091',
  true
);

SELECT lives_ok(
  $$SELECT public.sync_push(
      '20000000-0000-4000-8000-000000000091',
      '[{"table":"routines","operation":"upsert","baseRevision":"0","record":{"id":"sync-contract-legacy","name":"Legacy"}}]'::jsonb,
      NULL
    )$$,
  'a null contract version is temporarily accepted as legacy version 1'
);

SELECT throws_ok(
  $$SELECT public.sync_push(
      '20000000-0000-4000-8000-000000000092',
      '[{"table":"routines","operation":"upsert","baseRevision":"0","record":{"id":"sync-contract-unsupported","name":"Rejected"}}]'::jsonb,
      999
    )$$,
  'P0001',
  'sync_contract_version_unsupported',
  'an unsupported contract version is rejected'
);

RESET ROLE;
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM private.sync_push_receipts
    WHERE operation_id = '20000000-0000-4000-8000-000000000092'
  ),
  'an unsupported contract version writes no idempotency receipt'
);
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM public.routines
    WHERE user_id = '20000000-0000-4000-8000-000000000091'
      AND id = 'sync-contract-unsupported'
  ),
  'an unsupported contract version writes no synced row'
);

SET LOCAL ROLE authenticated;
SELECT throws_ok(
  $$SELECT public.sync_push(
      '20000000-0000-4000-8000-000000000093',
      '[{"table":"routines","operation":"upsert","baseRevision":"0","record":{"id":"sync-contract-unlisted","name":"Rejected","server_revision":900}}]'::jsonb,
      1
    )$$,
  'P0001',
  'sync_change_field_not_allowed',
  'a contract version does not permit unlisted columns'
);

RESET ROLE;
SELECT ok(
  NOT has_table_privilege('anon', 'private.sync_contract_tables', 'SELECT')
    AND NOT has_table_privilege('anon', 'private.sync_contract_versions', 'SELECT'),
  'anonymous users cannot read private contract metadata'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'private.sync_contract_tables', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'private.sync_contract_versions', 'SELECT'),
  'authenticated users cannot read private contract metadata'
);

SET LOCAL ROLE anon;
SELECT throws_ok(
  $$SELECT * FROM private.sync_contract_tables
      CROSS JOIN private.sync_contract_versions$$,
  '42501',
  NULL,
  'anonymous users cannot query private contract metadata'
);

SET LOCAL ROLE authenticated;
SELECT throws_ok(
  $$SELECT * FROM private.sync_contract_tables
      CROSS JOIN private.sync_contract_versions$$,
  '42501',
  NULL,
  'authenticated users cannot query private contract metadata'
);

ROLLBACK;
