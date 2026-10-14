BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;

SELECT plan(16);

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
    '30000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'sync-parent-owner-a@example.test',
    '',
    now(),
    now(),
    now()
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'sync-parent-owner-b@example.test',
    '',
    now(),
    now(),
    now()
  )
ON CONFLICT (id) DO NOTHING;

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claim.sub',
  '30000000-0000-4000-8000-000000000001',
  true
);

SELECT public.sync_push(
  '30000000-0000-4000-8000-000000000011',
  '[{"table":"workout_history","operation":"upsert","baseRevision":"0","record":{"id":"parent-deleted-history","routine_name":"Deleted parent","completed_at":"2026-10-14T12:00:00Z"}}]'::jsonb
);
SELECT public.sync_push(
  '30000000-0000-4000-8000-000000000012',
  '[{"table":"workout_history","operation":"delete","baseRevision":"0","record":{"id":"parent-deleted-history"}}]'::jsonb
);
SELECT set_config(
  'test.tombstoned_parent_response',
  public.sync_push(
    '30000000-0000-4000-8000-000000000013',
    '[{"table":"workout_history_exercises","operation":"upsert","baseRevision":"0","record":{"history_id":"parent-deleted-history","position":0,"exercise_name":"Synthetic exercise"}}]'::jsonb
  )::text,
  true
);
SELECT ok(
  current_setting('test.tombstoned_parent_response')::jsonb
    #>> '{changes,0,deletedAt}' IS NOT NULL,
  'upserting a child under a tombstoned parent succeeds as a tombstone'
);
SELECT ok(
  (
    SELECT deleted_at IS NOT NULL
      AND server_revision > (
        SELECT server_revision
        FROM public.workout_history
        WHERE id = 'parent-deleted-history'
      )
    FROM public.workout_history_exercises
    WHERE history_id = 'parent-deleted-history'
      AND position = 0
  ),
  'the child is tombstoned with a new server revision'
);
SELECT is(
  (
    SELECT server_revision
    FROM public.workout_history_exercises
    WHERE history_id = 'parent-deleted-history'
      AND position = 0
  ),
  (
    current_setting('test.tombstoned_parent_response')::jsonb
      #>> '{changes,0,revision}'
  )::bigint,
  'the successful push response reports the child revision'
);

SELECT public.sync_push(
  '30000000-0000-4000-8000-000000000014',
  '[{"table":"workout_history","operation":"upsert","baseRevision":"0","record":{"id":"parent-live-history","routine_name":"Live parent","completed_at":"2026-10-14T12:00:00Z"}}]'::jsonb
);
SELECT set_config(
  'test.live_parent_response',
  public.sync_push(
    '30000000-0000-4000-8000-000000000015',
    '[{"table":"workout_history_exercises","operation":"upsert","baseRevision":"0","record":{"history_id":"parent-live-history","position":0,"exercise_name":"Synthetic exercise"}}]'::jsonb
  )::text,
  true
);
SELECT ok(
  current_setting('test.live_parent_response')::jsonb
    #> '{changes,0,deletedAt}' = 'null'::jsonb
    AND (
      SELECT deleted_at IS NULL
      FROM public.workout_history_exercises
      WHERE history_id = 'parent-live-history'
        AND position = 0
    ),
  'a child under a live parent remains live'
);

SELECT public.sync_push(
  '30000000-0000-4000-8000-000000000016',
  '[{"table":"workout_history_exercises","operation":"delete","baseRevision":"0","record":{"history_id":"parent-live-history","position":0}}]'::jsonb
);
SELECT throws_ok(
  $$SELECT public.sync_push(
      '30000000-0000-4000-8000-000000000017',
      '[{"table":"workout_history_exercises","operation":"upsert","baseRevision":"0","record":{"history_id":"parent-live-history","position":0,"exercise_name":"Stale offline edit"}}]'::jsonb
    )$$,
  'P0001',
  'sync_stale_revision_conflict',
  'an upsert with a stale base still conflicts with a tombstoned child'
);

RESET ROLE;
INSERT INTO public.workout_history (
  user_id,
  id,
  routine_name,
  completed_at,
  deleted_at
)
VALUES
  (
    '30000000-0000-4000-8000-000000000001',
    'repair-history',
    'Deleted repair parent',
    '2026-10-14T12:00:00Z',
    now()
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    'repair-history',
    'Live other-owner parent',
    '2026-10-14T12:00:00Z',
    NULL
  );
INSERT INTO public.workout_history_exercises (
  user_id,
  history_id,
  position,
  exercise_name
)
VALUES
  (
    '30000000-0000-4000-8000-000000000001',
    'repair-history',
    0,
    'Orphaned synthetic exercise'
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    'repair-history',
    0,
    'Live other-owner exercise'
  );
SELECT set_config(
  'test.repair_child_revision',
  (
    SELECT server_revision::text
    FROM public.workout_history_exercises
    WHERE user_id = '30000000-0000-4000-8000-000000000001'
      AND history_id = 'repair-history'
      AND position = 0
  ),
  true
);
SELECT private.repair_tombstoned_sync_children();
SELECT ok(
  (
    SELECT deleted_at IS NOT NULL
    FROM public.workout_history_exercises
    WHERE user_id = '30000000-0000-4000-8000-000000000001'
      AND history_id = 'repair-history'
      AND position = 0
  ),
  'the repair tombstones existing live children under deleted parents'
);
SELECT ok(
  (
    SELECT server_revision > current_setting('test.repair_child_revision')::bigint
    FROM public.workout_history_exercises
    WHERE user_id = '30000000-0000-4000-8000-000000000001'
      AND history_id = 'repair-history'
      AND position = 0
  ),
  'the repair advances the child revision'
);
SELECT ok(
  (
    SELECT deleted_at IS NULL
    FROM public.workout_history_exercises
    WHERE user_id = '30000000-0000-4000-8000-000000000002'
      AND history_id = 'repair-history'
      AND position = 0
  ),
  'the repair matches parents and children within the same owner'
);

INSERT INTO public.routines (user_id, id, name)
VALUES (
  '30000000-0000-4000-8000-000000000002',
  'cascade-routine',
  'Other owner routine'
);
INSERT INTO public.routine_exercises (
  user_id,
  id,
  routine_id,
  name,
  position
)
VALUES (
  '30000000-0000-4000-8000-000000000002',
  'cascade-exercise',
  'cascade-routine',
  'Other owner exercise',
  0
);
INSERT INTO public.workout_sets (
  user_id,
  id,
  routine_id,
  routine_exercise_id,
  position,
  reps,
  weight
)
VALUES (
  '30000000-0000-4000-8000-000000000002',
  'cascade-set',
  'cascade-routine',
  'cascade-exercise',
  0,
  '8'::jsonb,
  '20'::jsonb
);
INSERT INTO public.active_workout_sessions (
  user_id,
  routine_id,
  started_at
)
VALUES (
  '30000000-0000-4000-8000-000000000002',
  'cascade-routine',
  '2026-10-14T12:00:00Z'
);
INSERT INTO public.active_session_completed_sets (
  user_id,
  routine_id,
  set_id
)
VALUES (
  '30000000-0000-4000-8000-000000000002',
  'cascade-routine',
  'cascade-set'
);
INSERT INTO public.routines (user_id, id, name, deleted_at)
VALUES (
  '30000000-0000-4000-8000-000000000001',
  'direct-deleted-routine',
  'Deleted direct parent',
  now()
);
INSERT INTO public.routine_exercises (
  user_id,
  id,
  routine_id,
  name,
  position
)
VALUES (
  '30000000-0000-4000-8000-000000000001',
  'direct-live-exercise',
  'direct-deleted-routine',
  'Live intermediate parent',
  0
);

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claim.sub',
  '30000000-0000-4000-8000-000000000001',
  true
);

SELECT public.sync_push(
  '30000000-0000-4000-8000-000000000018',
  '[{"table":"routines","operation":"upsert","baseRevision":"0","record":{"id":"cascade-routine","name":"Cascade routine"}}]'::jsonb
);
SELECT public.sync_push(
  '30000000-0000-4000-8000-000000000019',
  '[{"table":"routine_exercises","operation":"upsert","baseRevision":"0","record":{"id":"cascade-exercise","routine_id":"cascade-routine","name":"Cascade exercise","position":0}}]'::jsonb
);
SELECT public.sync_push(
  '30000000-0000-4000-8000-000000000020',
  '[{"table":"workout_sets","operation":"upsert","baseRevision":"0","record":{"id":"cascade-set","routine_id":"cascade-routine","routine_exercise_id":"cascade-exercise","position":0,"reps":8,"weight":20}}]'::jsonb
);
SELECT public.sync_push(
  '30000000-0000-4000-8000-000000000021',
  '[{"table":"active_workout_sessions","operation":"upsert","baseRevision":"0","record":{"routine_id":"cascade-routine","started_at":"2026-10-14T12:00:00Z"}}]'::jsonb
);
SELECT public.sync_push(
  '30000000-0000-4000-8000-000000000022',
  '[{"table":"active_session_completed_sets","operation":"upsert","baseRevision":"0","record":{"routine_id":"cascade-routine","set_id":"cascade-set"}}]'::jsonb
);
SELECT set_config(
  'test.cascade_revisions',
  (
    SELECT jsonb_build_object(
      'exercise', (
        SELECT server_revision
        FROM public.routine_exercises
        WHERE user_id = '30000000-0000-4000-8000-000000000001'
          AND id = 'cascade-exercise'
      ),
      'set', (
        SELECT server_revision
        FROM public.workout_sets
        WHERE user_id = '30000000-0000-4000-8000-000000000001'
          AND id = 'cascade-set'
      ),
      'session', (
        SELECT server_revision
        FROM public.active_workout_sessions
        WHERE user_id = '30000000-0000-4000-8000-000000000001'
          AND routine_id = 'cascade-routine'
      ),
      'completed', (
        SELECT server_revision
        FROM public.active_session_completed_sets
        WHERE user_id = '30000000-0000-4000-8000-000000000001'
          AND routine_id = 'cascade-routine'
          AND set_id = 'cascade-set'
      )
    )::text
  ),
  true
);
SELECT public.sync_push(
  '30000000-0000-4000-8000-000000000023',
  '[{"table":"routines","operation":"delete","baseRevision":"0","record":{"id":"cascade-routine"}}]'::jsonb
);
RESET ROLE;
SELECT ok(
  (
    SELECT deleted_at IS NOT NULL
      AND server_revision > (
        current_setting('test.cascade_revisions')::jsonb->>'exercise'
      )::bigint
    FROM public.routine_exercises
    WHERE user_id = '30000000-0000-4000-8000-000000000001'
      AND id = 'cascade-exercise'
  )
  AND (
    SELECT deleted_at IS NOT NULL
      AND server_revision > (
        current_setting('test.cascade_revisions')::jsonb->>'set'
      )::bigint
    FROM public.workout_sets
    WHERE user_id = '30000000-0000-4000-8000-000000000001'
      AND id = 'cascade-set'
  )
  AND (
    SELECT deleted_at IS NOT NULL
      AND server_revision > (
        current_setting('test.cascade_revisions')::jsonb->>'session'
      )::bigint
    FROM public.active_workout_sessions
    WHERE user_id = '30000000-0000-4000-8000-000000000001'
      AND routine_id = 'cascade-routine'
  )
  AND (
    SELECT deleted_at IS NOT NULL
      AND server_revision > (
        current_setting('test.cascade_revisions')::jsonb->>'completed'
      )::bigint
    FROM public.active_session_completed_sets
    WHERE user_id = '30000000-0000-4000-8000-000000000001'
      AND routine_id = 'cascade-routine'
      AND set_id = 'cascade-set'
  ),
  'routine tombstones cascade through exercises, sets, sessions, and completions with new revisions'
);
SELECT ok(
  (
    SELECT bool_and(deleted_at IS NULL)
    FROM (
      SELECT deleted_at FROM public.routines
      WHERE user_id = '30000000-0000-4000-8000-000000000002'
        AND id = 'cascade-routine'
      UNION ALL
      SELECT deleted_at FROM public.routine_exercises
      WHERE user_id = '30000000-0000-4000-8000-000000000002'
        AND id = 'cascade-exercise'
      UNION ALL
      SELECT deleted_at FROM public.workout_sets
      WHERE user_id = '30000000-0000-4000-8000-000000000002'
        AND id = 'cascade-set'
      UNION ALL
      SELECT deleted_at FROM public.active_workout_sessions
      WHERE user_id = '30000000-0000-4000-8000-000000000002'
        AND routine_id = 'cascade-routine'
      UNION ALL
      SELECT deleted_at FROM public.active_session_completed_sets
      WHERE user_id = '30000000-0000-4000-8000-000000000002'
        AND routine_id = 'cascade-routine'
        AND set_id = 'cascade-set'
    ) AS other_owner_rows
  ),
  'the parent cascade is scoped to the deleting owner'
);

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claim.sub',
  '30000000-0000-4000-8000-000000000001',
  true
);
SELECT set_config(
  'test.direct_set_response',
  public.sync_push(
    '30000000-0000-4000-8000-000000000024',
    '[{"table":"workout_sets","operation":"upsert","baseRevision":"0","record":{"id":"direct-set","routine_id":"direct-deleted-routine","routine_exercise_id":"direct-live-exercise","position":0,"reps":8,"weight":20}}]'::jsonb
  )::text,
  true
);
SELECT ok(
  current_setting('test.direct_set_response')::jsonb
    #>> '{changes,0,deletedAt}' IS NOT NULL
    AND (
      SELECT deleted_at IS NOT NULL
      FROM public.workout_sets
      WHERE user_id = '30000000-0000-4000-8000-000000000001'
        AND id = 'direct-set'
    ),
  'a set under a tombstoned routine is tombstoned even when its exercise is live'
);

SELECT public.sync_push(
  '30000000-0000-4000-8000-000000000025',
  '[{"table":"workout_history","operation":"upsert","baseRevision":"0","record":{"id":"other-device-history","routine_name":"Other device","completed_at":"2026-10-14T12:00:00Z"}}]'::jsonb
);
SELECT public.sync_push(
  '30000000-0000-4000-8000-000000000026',
  '[{"table":"workout_history_exercises","operation":"upsert","baseRevision":"0","record":{"history_id":"other-device-history","position":0,"exercise_name":"Other device exercise"}}]'::jsonb
);
SELECT set_config(
  'test.other_device_child_revision',
  (
    SELECT server_revision::text
    FROM public.workout_history_exercises
    WHERE user_id = '30000000-0000-4000-8000-000000000001'
      AND history_id = 'other-device-history'
      AND position = 0
  ),
  true
);
SELECT public.sync_push(
  '30000000-0000-4000-8000-000000000027',
  '[{"table":"workout_history","operation":"delete","baseRevision":"0","record":{"id":"other-device-history"}}]'::jsonb
);
SELECT ok(
  (
    SELECT deleted_at IS NOT NULL
      AND server_revision > current_setting('test.other_device_child_revision')::bigint
    FROM public.workout_history_exercises
    WHERE user_id = '30000000-0000-4000-8000-000000000001'
      AND history_id = 'other-device-history'
      AND position = 0
  ),
  'a child pushed by another device is tombstoned when its parent is deleted'
);
SELECT lives_ok(
  $$SELECT set_config(
      'test.old_base_parent_response',
      public.sync_push(
        '30000000-0000-4000-8000-000000000036',
        jsonb_build_array(jsonb_build_object(
          'table', 'workout_history_exercises',
          'operation', 'upsert',
          'baseRevision', current_setting('test.other_device_child_revision'),
          'record', jsonb_build_object(
            'history_id', 'other-device-history',
            'position', 0,
            'exercise_name', 'Old offline edit'
          )
        ))
      )::text,
      true
    )$$,
  'an old offline upsert under a tombstoned parent is acknowledged'
);
SELECT ok(
  COALESCE(
    current_setting('test.old_base_parent_response', true) IS NOT NULL
      AND current_setting('test.old_base_parent_response', true)::jsonb
        #>> '{changes,0,deletedAt}' IS NOT NULL
      AND (
        SELECT deleted_at IS NOT NULL
          AND server_revision > current_setting('test.other_device_child_revision')::bigint
          AND server_revision = (
            current_setting('test.old_base_parent_response', true)::jsonb
              #>> '{changes,0,revision}'
          )::bigint
        FROM public.workout_history_exercises
        WHERE user_id = '30000000-0000-4000-8000-000000000001'
          AND history_id = 'other-device-history'
          AND position = 0
      ),
    false
  ),
  'the old-base child upsert acknowledges a new revision without resurrection'
);

SELECT public.sync_push(
  '30000000-0000-4000-8000-000000000028',
  '[{"table":"workout_history","operation":"upsert","baseRevision":"0","record":{"id":"client-delete-history","routine_name":"Client delete order","completed_at":"2026-10-14T12:00:00Z"}}]'::jsonb
);
SELECT public.sync_push(
  '30000000-0000-4000-8000-000000000029',
  '[{"table":"workout_history_exercises","operation":"upsert","baseRevision":"0","record":{"history_id":"client-delete-history","position":0,"exercise_name":"Client delete exercise"}}]'::jsonb
);
SELECT public.sync_push(
  '30000000-0000-4000-8000-000000000030',
  '[{"table":"workout_history_exercises","operation":"delete","baseRevision":"0","record":{"history_id":"client-delete-history","position":0}}]'::jsonb
);
SELECT public.sync_push(
  '30000000-0000-4000-8000-000000000031',
  '[{"table":"workout_history","operation":"delete","baseRevision":"0","record":{"id":"client-delete-history"}}]'::jsonb
);
SELECT ok(
  (
    SELECT deleted_at IS NOT NULL
    FROM public.workout_history_exercises
    WHERE user_id = '30000000-0000-4000-8000-000000000001'
      AND history_id = 'client-delete-history'
      AND position = 0
  )
  AND (
    SELECT deleted_at IS NOT NULL
    FROM public.workout_history
    WHERE user_id = '30000000-0000-4000-8000-000000000001'
      AND id = 'client-delete-history'
  ),
  'client child-delete then parent-delete operations both succeed'
);

SELECT public.sync_push(
  '30000000-0000-4000-8000-000000000032',
  '[{"table":"workout_history","operation":"upsert","baseRevision":"0","record":{"id":"remote-delete-history","routine_name":"Remote delete order","completed_at":"2026-10-14T12:00:00Z"}}]'::jsonb
);
SELECT public.sync_push(
  '30000000-0000-4000-8000-000000000033',
  '[{"table":"workout_history_exercises","operation":"upsert","baseRevision":"0","record":{"history_id":"remote-delete-history","position":0,"exercise_name":"Remote delete exercise"}}]'::jsonb
);
SELECT public.sync_push(
  '30000000-0000-4000-8000-000000000034',
  '[{"table":"workout_history","operation":"delete","baseRevision":"0","record":{"id":"remote-delete-history"}}]'::jsonb
);
SELECT set_config(
  'test.late_child_delete_response',
  public.sync_push(
    '30000000-0000-4000-8000-000000000035',
    '[{"table":"workout_history_exercises","operation":"delete","baseRevision":"0","record":{"history_id":"remote-delete-history","position":0}}]'::jsonb
  )::text,
  true
);
SELECT ok(
  current_setting('test.late_child_delete_response')::jsonb
    #>> '{changes,0,deletedAt}' IS NOT NULL
    AND (
      SELECT deleted_at IS NOT NULL
      FROM public.workout_history_exercises
      WHERE user_id = '30000000-0000-4000-8000-000000000001'
        AND history_id = 'remote-delete-history'
        AND position = 0
    ),
  'a late child delete after a remote parent delete is acknowledged without a stale conflict'
);

SELECT * FROM finish();
ROLLBACK;
