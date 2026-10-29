BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;

SELECT plan(6);

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
  '20000000-0000-4000-8000-000000000071',
  'authenticated',
  'authenticated',
  'sync-categories-owner@example.test',
  '',
  now(),
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claim.sub',
  '20000000-0000-4000-8000-000000000071',
  true
);

SELECT public.sync_push(
  '20000000-0000-4000-8000-000000000071',
  '[
    {"table":"exercise_definitions","operation":"upsert","baseRevision":"0","record":{"id":"sync-categories-def","name":"Plancha","category":"Core","categories":["Core","Piernas"]}},
    {"table":"rm_logs","operation":"upsert","baseRevision":"0","record":{"id":"sync-categories-rm","exercise_name":"Plancha","category":"Core","categories":["Core","Piernas"]}},
    {"table":"exercise_diaries","operation":"upsert","baseRevision":"0","record":{"id":"sync-categories-diary","exercise_name":"Plancha","category":"Core","categories":["Core","Piernas"]}}
  ]'::jsonb,
  2
);

SELECT is(
  (
    SELECT categories
    FROM public.exercise_definitions
    WHERE id = 'sync-categories-def'
  ),
  ARRAY['Core', 'Piernas'],
  'a definition stores multiple muscle groups'
);
SELECT is(
  (
    SELECT categories
    FROM public.rm_logs
    WHERE id = 'sync-categories-rm'
  ),
  ARRAY['Core', 'Piernas'],
  'an RM log stores multiple muscle groups'
);
SELECT is(
  (
    SELECT categories
    FROM public.exercise_diaries
    WHERE id = 'sync-categories-diary'
  ),
  ARRAY['Core', 'Piernas'],
  'an exercise diary stores multiple muscle groups'
);

-- An older accepted client (contract version 1) does not send `categories`.
SELECT public.sync_push(
  '20000000-0000-4000-8000-000000000072',
  jsonb_build_array(
    jsonb_build_object(
      'table', 'exercise_definitions',
      'operation', 'upsert',
      'baseRevision', (
        SELECT server_revision::text
        FROM public.exercise_definitions
        WHERE id = 'sync-categories-def'
      ),
      'record', jsonb_build_object(
        'id', 'sync-categories-def',
        'name', 'Plancha revisada',
        'category', 'Core'
      )
    )
  ),
  1
);

SELECT ok(
  (
    SELECT name = 'Plancha revisada'
      AND categories = ARRAY['Core', 'Piernas']
    FROM public.exercise_definitions
    WHERE id = 'sync-categories-def'
  ),
  'a partial legacy upsert preserves stored muscle groups'
);

SELECT is(
  (
    SELECT to_jsonb(definition)->'categories'
    FROM public.exercise_definitions AS definition
    WHERE id = 'sync-categories-def'
  ),
  '["Core","Piernas"]'::jsonb,
  'muscle groups are available in the owner-scoped pull source'
);

SELECT public.sync_push(
  '20000000-0000-4000-8000-000000000073',
  jsonb_build_array(
    jsonb_build_object(
      'table', 'exercise_definitions',
      'operation', 'upsert',
      'baseRevision', (
        SELECT server_revision::text
        FROM public.exercise_definitions
        WHERE id = 'sync-categories-def'
      ),
      'record', jsonb_build_object(
        'id', 'sync-categories-def',
        'name', 'Plancha revisada',
        'category', 'Pecho',
        'categories', ARRAY['Pecho', 'Hombros']
      )
    )
  ),
  2
);

SELECT is(
  (
    SELECT categories
    FROM public.exercise_definitions
    WHERE id = 'sync-categories-def'
  ),
  ARRAY['Pecho', 'Hombros'],
  'an explicit update replaces the stored muscle groups'
);

SELECT * FROM finish();
ROLLBACK;
