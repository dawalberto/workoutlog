BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;

SELECT plan(12);

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
  '20000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'sync-history-metrics-owner@example.test',
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

SELECT public.sync_push(
  '20000000-0000-4000-8000-000000000031',
  '[
    {"table":"workout_history","operation":"upsert","baseRevision":"0","record":{"id":"sync-history-metrics","routine_name":"Strength A","completed_at":"2026-10-07T12:00:00Z","exercises_completed":2,"sets_completed":8,"total_sets_count":12,"completion_percentage":66.67}},
    {"table":"workout_history_exercises","operation":"upsert","baseRevision":"0","record":{"history_id":"sync-history-metrics","position":0,"exercise_name":"Squat","sets_completed":5,"sets_total":6}},
    {"table":"workout_history_exercises","operation":"upsert","baseRevision":"0","record":{"history_id":"sync-history-metrics","position":1,"exercise_name":"Press","sets_completed":3,"sets_total":6}}
  ]'::jsonb
);
SELECT ok(
  (
    SELECT sets_completed = 8
      AND total_sets_count = 12
      AND completion_percentage = 66.67
    FROM public.workout_history
    WHERE id = 'sync-history-metrics'
  ),
  'pushed history preserves completed sets, total sets, and percentage'
);
SELECT is(
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'name', exercise_name,
        'completedSets', sets_completed,
        'totalSets', sets_total
      )
      ORDER BY position
    )
    FROM public.workout_history_exercises
    WHERE history_id = 'sync-history-metrics'
  ),
  '[
    {"name":"Squat","completedSets":5,"totalSets":6},
    {"name":"Press","completedSets":3,"totalSets":6}
  ]'::jsonb,
  'pushed exercise summaries preserve names and both set counts'
);
SELECT public.sync_push(
  '20000000-0000-4000-8000-000000000037',
  jsonb_build_array(
    jsonb_build_object(
      'table', 'workout_history',
      'operation', 'upsert',
      'baseRevision', (
        SELECT server_revision::text
        FROM public.workout_history
        WHERE id = 'sync-history-metrics'
      ),
      'record', jsonb_build_object(
        'id', 'sync-history-metrics',
        'routine_name', 'Strength A, revised',
        'completed_at', '2026-10-07T12:00:00Z'
      )
    ),
    jsonb_build_object(
      'table', 'workout_history_exercises',
      'operation', 'upsert',
      'baseRevision', (
        SELECT server_revision::text
        FROM public.workout_history_exercises
        WHERE history_id = 'sync-history-metrics'
          AND position = 1
      ),
      'record', jsonb_build_object(
        'history_id', 'sync-history-metrics',
        'position', 1,
        'exercise_name', 'Press, revised'
      )
    )
  )
);
SELECT ok(
  (
    SELECT total_sets_count = 12
      AND completion_percentage = 66.67
    FROM public.workout_history
    WHERE id = 'sync-history-metrics'
  )
  AND (
    SELECT sets_total = 6
    FROM public.workout_history_exercises
    WHERE history_id = 'sync-history-metrics'
      AND position = 1
  ),
  'partial upserts preserve previously stored completion metrics'
);
SELECT is(
  (
    SELECT to_jsonb(history)->>'total_sets_count'
    FROM public.workout_history AS history
    WHERE id = 'sync-history-metrics'
  ),
  '12',
  'history total is available in the owner-scoped pull source'
);
SELECT is(
  (
    SELECT to_jsonb(history)->>'completion_percentage'
    FROM public.workout_history AS history
    WHERE id = 'sync-history-metrics'
  ),
  '66.67',
  'history percentage is available in the owner-scoped pull source'
);
SELECT is(
  (
    SELECT to_jsonb(exercise)->>'sets_total'
    FROM public.workout_history_exercises AS exercise
    WHERE history_id = 'sync-history-metrics'
      AND position = 1
  ),
  '6',
  'exercise total is available in the owner-scoped pull source'
);

SELECT public.sync_push(
  '20000000-0000-4000-8000-000000000032',
  '[
    {"table":"workout_history","operation":"upsert","baseRevision":"0","record":{"id":"sync-history-unknown-metrics","routine_name":"Legacy source","completed_at":"2026-10-07T12:00:00Z"}},
    {"table":"workout_history_exercises","operation":"upsert","baseRevision":"0","record":{"history_id":"sync-history-unknown-metrics","position":0,"exercise_name":"Unknown totals"}}
  ]'::jsonb
);
SELECT ok(
  (
    SELECT total_sets_count IS NULL
      AND completion_percentage IS NULL
    FROM public.workout_history
    WHERE id = 'sync-history-unknown-metrics'
  ),
  'omitted aggregate metrics stay unknown instead of becoming zero'
);
SELECT ok(
  (
    SELECT sets_total IS NULL
    FROM public.workout_history_exercises
    WHERE history_id = 'sync-history-unknown-metrics'
  ),
  'an omitted exercise total stays unknown instead of becoming zero'
);

SELECT throws_ok(
  $$SELECT public.sync_push(
      '20000000-0000-4000-8000-000000000033',
      '[{"table":"workout_history","operation":"upsert","baseRevision":"0","record":{"id":"sync-history-negative-total","routine_name":"Invalid","completed_at":"2026-10-07T12:00:00Z","total_sets_count":-1}}]'::jsonb
    )$$,
  '23514',
  NULL,
  'negative aggregate totals are rejected'
);
SELECT throws_ok(
  $$SELECT public.sync_push(
      '20000000-0000-4000-8000-000000000034',
      '[{"table":"workout_history","operation":"upsert","baseRevision":"0","record":{"id":"sync-history-high-percentage","routine_name":"Invalid","completed_at":"2026-10-07T12:00:00Z","completion_percentage":100.01}}]'::jsonb
    )$$,
  '23514',
  NULL,
  'percentages above one hundred are rejected'
);
SELECT throws_ok(
  $$SELECT public.sync_push(
      '20000000-0000-4000-8000-000000000035',
      '[{"table":"workout_history_exercises","operation":"upsert","baseRevision":"0","record":{"history_id":"sync-history-metrics","position":2,"exercise_name":"Invalid","sets_total":-1}}]'::jsonb
    )$$,
  '23514',
  NULL,
  'negative exercise totals are rejected'
);

SELECT throws_ok(
  $$SELECT public.sync_push(
      '20000000-0000-4000-8000-000000000036',
      '[{"table":"workout_history","operation":"upsert","baseRevision":"0","record":{"id":"sync-history-low-percentage","routine_name":"Invalid","completed_at":"2026-10-07T12:00:00Z","completion_percentage":-0.01}}]'::jsonb
    )$$,
  '23514',
  NULL,
  'negative percentages are rejected'
);

SELECT * FROM finish();
ROLLBACK;
