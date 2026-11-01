BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;

SELECT plan(4);

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
  '20000000-0000-4000-8000-000000000081',
  'authenticated',
  'authenticated',
  'sync-rm-metric-owner@example.test',
  '',
  now(),
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claim.sub',
  '20000000-0000-4000-8000-000000000081',
  true
);

-- A contract version 3 client stores the metric with the record.
SELECT public.sync_push(
  '20000000-0000-4000-8000-000000000081',
  '[
    {"table":"rm_logs","operation":"upsert","baseRevision":"0","record":{"id":"sync-metric-log","exercise_name":"Comba"}},
    {"table":"rm_records","operation":"upsert","baseRevision":"0","record":{"id":"sync-metric-record","log_id":"sync-metric-log","weight":120,"metric":"reps","recorded_on":"2026-10-31"}}
  ]'::jsonb,
  3
);

SELECT is(
  (
    SELECT metric
    FROM public.rm_records
    WHERE id = 'sync-metric-record'
  ),
  'reps',
  'a version 3 record stores a repetition metric'
);

-- An older accepted client (contract version 1) does not send `metric`.
SELECT public.sync_push(
  '20000000-0000-4000-8000-000000000082',
  jsonb_build_array(
    jsonb_build_object(
      'table', 'rm_records',
      'operation', 'upsert',
      'baseRevision', (
        SELECT server_revision::text
        FROM public.rm_records
        WHERE id = 'sync-metric-record'
      ),
      'record', jsonb_build_object(
        'id', 'sync-metric-record',
        'log_id', 'sync-metric-log',
        'weight', 130,
        'recorded_on', '2026-10-31'
      )
    )
  ),
  1
);

SELECT ok(
  (
    SELECT weight = '130'::jsonb AND metric = 'reps'
    FROM public.rm_records
    WHERE id = 'sync-metric-record'
  ),
  'a partial legacy upsert preserves the stored metric'
);

SELECT is(
  (
    SELECT to_jsonb(rm_record)->'metric'
    FROM public.rm_records AS rm_record
    WHERE id = 'sync-metric-record'
  ),
  '"reps"'::jsonb,
  'the metric is available in the owner-scoped pull source'
);

SELECT throws_ok(
  $$SELECT public.sync_push(
      '20000000-0000-4000-8000-000000000083',
      '[{"table":"rm_records","operation":"upsert","baseRevision":"0","record":{"id":"sync-metric-invalid","log_id":"sync-metric-log","weight":10,"metric":"invalid","recorded_on":"2026-10-31"}}]'::jsonb,
      3
    )$$,
  '23514',
  NULL,
  'the metric check rejects values outside weight and reps'
);

SELECT * FROM finish();
ROLLBACK;
