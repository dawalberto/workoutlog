BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;

SELECT plan(32);

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
    '20000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'sync-push-owner-a@example.test',
    '',
    now(),
    now(),
    now()
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'sync-push-owner-b@example.test',
    '',
    now(),
    now(),
    now()
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    'authenticated',
    'authenticated',
    'sync-push-owner-free@example.test',
    '',
    now(),
    now(),
    now()
  )
ON CONFLICT (id) DO NOTHING;

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claim.sub',
  '20000000-0000-4000-8000-000000000001',
  true
);

SELECT ok(
  has_function_privilege('anon', 'public.sync_push(uuid,jsonb)', 'EXECUTE')
    IS FALSE,
  'anonymous users cannot execute sync push'
);

SELECT set_config(
  'test.sync_push_first_response',
  public.sync_push(
    '20000000-0000-4000-8000-000000000011',
    '[{"table":"routines","operation":"upsert","baseRevision":"0","record":{"id":"sync-push-routine-a","name":"First"}}]'::jsonb
  )::text,
  true
);
SELECT ok(
  NOT (
    current_setting('test.sync_push_first_response')::jsonb
      #> '{changes,0}'
    ? 'record'
  ),
  'push results contain metadata only and no record body'
);
SELECT ok(
  (
    WITH receipt_columns AS (
      SELECT attribute.attname, attribute.atttypid
      FROM pg_attribute AS attribute
      JOIN pg_class AS relation ON relation.oid = attribute.attrelid
      JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
      WHERE namespace.nspname = 'private'
        AND relation.relname = 'sync_push_receipts'
        AND attribute.attnum > 0
        AND NOT attribute.attisdropped
    )
    SELECT EXISTS (
      SELECT 1 FROM receipt_columns
      WHERE attname = 'payload_hash' AND atttypid = 'bytea'::regtype
    )
      AND NOT EXISTS (
        SELECT 1 FROM receipt_columns WHERE attname = 'payload'
      )
  ),
  'operation receipts store a bytea digest instead of request payloads'
);
SELECT is(
  public.sync_push(
    '20000000-0000-4000-8000-000000000011',
    '[{"table":"routines","operation":"upsert","baseRevision":"0","record":{"id":"sync-push-routine-a","name":"First"}}]'::jsonb
  ),
  current_setting('test.sync_push_first_response')::jsonb,
  'the same operation replays the exact cached response'
);
SELECT is(
  (
    SELECT server_revision
    FROM public.routines
    WHERE id = 'sync-push-routine-a'
  ),
  (
    current_setting('test.sync_push_first_response')::jsonb
      #>> '{changes,0,revision}'
  )::bigint,
  'an idempotent replay does not advance the server revision'
);
SELECT throws_ok(
  $$SELECT public.sync_push(
      '20000000-0000-4000-8000-000000000011',
        '[{"table":"routines","operation":"upsert","baseRevision":"0","record":{"id":"sync-push-routine-a","name":"Different"}}]'::jsonb
    )$$,
  'P0001',
  'sync_operation_conflict',
  'reusing an operation ID with a different payload conflicts'
);

SELECT set_config(
  'test.sync_push_second_response',
  public.sync_push(
    '20000000-0000-4000-8000-000000000012',
    '[{"table":"routines","operation":"upsert","baseRevision":"0","record":{"id":"sync-push-routine-a","name":"Second"}}]'::jsonb
  )::text,
  true
);
SELECT ok(
  (
    current_setting('test.sync_push_second_response')::jsonb
      #>> '{changes,0,revision}'
  )::bigint
    > (
      current_setting('test.sync_push_first_response')::jsonb
        #>> '{changes,0,revision}'
    )::bigint,
  'a distinct accepted operation receives a higher server revision'
);
SELECT is(
    (SELECT name FROM public.routines WHERE id = 'sync-push-routine-a'),
    'Second',
    'a stale active-record upsert is accepted as the later server operation'
);

SELECT throws_ok(
  $$SELECT public.sync_push(
      '20000000-0000-4000-8000-000000000013',
      '[{"table":"routines","operation":"upsert","baseRevision":"0","record":{"id":"spoof-user","name":"No","user_id":"20000000-0000-4000-8000-000000000002"}}]'::jsonb
    )$$,
  'P0001',
  'sync_change_field_not_allowed',
  'the database rejects client ownership fields'
);
SELECT throws_ok(
  $$SELECT public.sync_push(
      '20000000-0000-4000-8000-000000000014',
      '[{"table":"routines","operation":"upsert","baseRevision":"0","record":{"id":"spoof-revision","name":"No","server_revision":900}}]'::jsonb
    )$$,
  'P0001',
  'sync_change_field_not_allowed',
  'the database rejects client server revisions'
);
SELECT throws_ok(
  $$SELECT public.sync_push(
      '20000000-0000-4000-8000-000000000015',
      '[{"table":"routines","operation":"upsert","baseRevision":"0","record":{"id":"spoof-server-time","name":"No","server_updated_at":"2000-01-01T00:00:00Z"}}]'::jsonb
    )$$,
  'P0001',
  'sync_change_field_not_allowed',
  'the database rejects client server timestamps'
);

SELECT set_config(
  'test.sync_push_delete_response',
  public.sync_push(
    '20000000-0000-4000-8000-000000000016',
    '[{"table":"routines","operation":"delete","baseRevision":"0","record":{"id":"sync-push-routine-a"}}]'::jsonb
  )::text,
  true
);
SELECT ok(
  current_setting('test.sync_push_delete_response')::jsonb
    #>> '{changes,0,deletedAt}' IS NOT NULL,
  'delete writes a server-time tombstone'
);
SELECT is(
  public.sync_push(
    '20000000-0000-4000-8000-000000000016',
    '[{"table":"routines","operation":"delete","baseRevision":"0","record":{"id":"sync-push-routine-a"}}]'::jsonb
  ),
  current_setting('test.sync_push_delete_response')::jsonb,
  'a stale delete retry replays its original tombstone'
);
SELECT ok(
  (
    SELECT deleted_at IS NOT NULL
    FROM public.routines
    WHERE id = 'sync-push-routine-a'
  ),
  'a delete retry retains the row instead of physically deleting it'
);
SELECT throws_ok(
  $$SELECT public.sync_push(
      '20000000-0000-4000-8000-000000000017',
      '[{"table":"routines","operation":"upsert","baseRevision":"0","record":{"id":"sync-push-routine-a","name":"Stale offline edit"}}]'::jsonb
    )$$,
  'P0001',
  'sync_stale_revision_conflict',
  'a stale upsert from an offline device conflicts with the tombstone'
);
SELECT ok(
  (
    SELECT deleted_at IS NOT NULL
    FROM public.routines
    WHERE id = 'sync-push-routine-a'
  ),
  'an upsert cannot resurrect a tombstoned row'
);
SELECT set_config(
  'test.sync_push_tombstone_revision',
  current_setting('test.sync_push_delete_response')::jsonb
    #>> '{changes,0,revision}',
  true
);
SELECT set_config(
  'test.sync_push_restore_response',
  public.sync_push(
    '20000000-0000-4000-8000-000000000021',
    jsonb_build_array(jsonb_build_object(
      'table', 'routines',
      'operation', 'upsert',
      'baseRevision', current_setting('test.sync_push_tombstone_revision'),
      'record', jsonb_build_object(
        'id', 'sync-push-routine-a',
        'name', 'Restored after observing tombstone'
      )
    ))
  )::text,
  true
);
SELECT ok(
  current_setting('test.sync_push_restore_response')::jsonb
    #> '{changes,0,deletedAt}' = 'null'::jsonb,
  'a client that observed the tombstone revision can deliberately restore it'
);
SELECT ok(
  (
    current_setting('test.sync_push_restore_response')::jsonb
      #>> '{changes,0,revision}'
  )::bigint
    > current_setting('test.sync_push_tombstone_revision')::bigint,
  'a deliberate restore receives a new server revision'
);
SELECT throws_ok(
  $$SELECT public.sync_push(
      '20000000-0000-4000-8000-000000000022',
      jsonb_build_array(jsonb_build_object(
        'table', 'routines',
        'operation', 'upsert',
        'baseRevision', '9223372036854775807',
        'record', jsonb_build_object(
          'id', 'sync-push-routine-a',
          'name', 'Future revision'
        )
      ))
    )$$,
  'P0001',
  'sync_stale_revision_conflict',
  'an upsert cannot claim a future server revision'
);
SELECT throws_ok(
  $$SELECT public.sync_push(
      '20000000-0000-4000-8000-000000000023',
      '[{"table":"routines","operation":"upsert","baseRevision":"1","record":{"id":"sync-push-missing-with-base","name":"No"}}]'::jsonb
    )$$,
  'P0001',
  'sync_stale_revision_conflict',
  'a missing row cannot be created from a nonzero base revision'
);
SELECT is(
  (SELECT count(*)::integer
   FROM public.routines
   WHERE id = 'sync-push-missing-with-base'),
  0,
  'a rejected missing-row upsert does not create the row'
);

SELECT throws_ok(
  $$SELECT public.sync_push(
      '20000000-0000-4000-8000-000000000018',
      '[
        {"table":"routines","operation":"upsert","baseRevision":"0","record":{"id":"sync-push-rollback-routine","name":"Must roll back"}},
        {"table":"workout_sets","operation":"upsert","baseRevision":"0","record":{"id":"sync-push-invalid-set","routine_id":"sync-push-rollback-routine","routine_exercise_id":"missing-exercise","position":0,"reps":8,"weight":20}}
      ]'::jsonb
    )$$,
  '23503',
  NULL,
  'an invalid child foreign key rolls back the whole batch'
);
SELECT is(
  (SELECT count(*)::integer FROM public.routines WHERE id = 'sync-push-rollback-routine'),
  0,
  'a failed batch does not persist earlier operations'
);

SELECT set_config(
  'request.jwt.claim.sub',
  '20000000-0000-4000-8000-000000000002',
  true
);
SELECT is(
  (SELECT count(*)::integer FROM public.routines WHERE id = 'sync-push-routine-a'),
  0,
  'owner B cannot read owner A rows'
);
SELECT public.sync_push(
    '20000000-0000-4000-8000-000000000011',
    '[{"table":"routines","operation":"upsert","baseRevision":"0","record":{"id":"sync-push-routine-a","name":"Owner B"}}]'::jsonb
  );
SELECT is(
  (SELECT name FROM public.routines WHERE id = 'sync-push-routine-a'),
  'Owner B',
  'operation receipts and writes are scoped to the authenticated owner'
);

SELECT set_config(
  'test.sync_push_snapshots_response',
  public.sync_push(
    '20000000-0000-4000-8000-000000000019',
    '[
      {"table":"workout_history","operation":"upsert","baseRevision":"0","record":{"id":"sync-push-history","routine_name":"Snapshot routine","completed_at":"2026-10-07T12:00:00Z"}},
      {"table":"workout_history_exercises","operation":"upsert","baseRevision":"0","record":{"history_id":"sync-push-history","position":2,"exercise_name":"Snapshot exercise"}},
      {"table":"exercise_definitions","operation":"upsert","baseRevision":"0","record":{"id":"sync-push-definition","name":"Scalar types","default_reps":"8-12","default_weight":80}}
    ]'::jsonb
  )::text,
  true
);
SELECT is(
  current_setting('test.sync_push_snapshots_response')::jsonb
    #>> '{changes,1,id}',
  '["sync-push-history",2]',
  'the push response preserves composite client identities'
);
SELECT ok(
  (
    SELECT bool_and(NOT change ? 'record')
    FROM jsonb_array_elements(
      current_setting('test.sync_push_snapshots_response')::jsonb->'changes'
    ) AS results(change)
  )
  AND (
    SELECT default_reps = '"8-12"'::jsonb
      AND default_weight = '80'::jsonb
    FROM public.exercise_definitions
    WHERE id = 'sync-push-definition'
  ),
  'push results omit record bodies while writes preserve scalar values'
);
SELECT throws_ok(
  $$SELECT * FROM private.sync_push_receipts$$,
  '42501',
  NULL,
  'authenticated users cannot read private operation receipts'
);
SELECT set_config(
  'request.jwt.claim.sub',
  '20000000-0000-4000-8000-000000000001',
  true
);
SELECT is(
  (SELECT count(*)::integer FROM public.routines WHERE id = 'sync-push-routine-a'),
  1,
  'owner A cannot read owner B rows with the same client ID'
);
SELECT is(
  (SELECT name FROM public.routines WHERE id = 'sync-push-routine-a'),
  'Restored after observing tombstone',
  'owner B writes cannot change owner A rows'
);
SELECT set_config(
  'request.jwt.claim.sub',
  '20000000-0000-4000-8000-000000000003',
  true
);
SELECT lives_ok(
  $$SELECT public.sync_push(
      '20000000-0000-4000-8000-000000000020',
      '[{"table":"routines","operation":"upsert","baseRevision":"0","record":{"id":"free-routine","name":"No"}}]'::jsonb
    )$$,
  'authenticated account without payment entitlement can push'
);
SELECT is(
  (
    SELECT count(*)::integer
    FROM public.routines
    WHERE id = 'free-routine'
  ),
  1,
  'account-based push persists its owner-scoped routine'
);

SELECT * FROM finish();
ROLLBACK;
