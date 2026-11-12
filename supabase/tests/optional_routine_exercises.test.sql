BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;
SELECT plan(4);

INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES ('20000000-0000-4000-8000-000000000071', 'authenticated', 'authenticated', 'optional-exercise@example.test', '', now(), now(), now());
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000071', true);

SELECT public.sync_push('20000000-0000-4000-8000-000000000072',
  '[{"table":"routines","operation":"upsert","baseRevision":"0","record":{"id":"optional-routine","name":"Routine"}},{"table":"routine_exercises","operation":"upsert","baseRevision":"0","record":{"id":"optional-exercise","routine_id":"optional-routine","name":"Press","position":0,"is_optional":true}}]'::jsonb, 4);
SELECT is((SELECT is_optional FROM public.routine_exercises WHERE id = 'optional-exercise'), true, 'version 4 stores optional flag');

SELECT public.sync_push('20000000-0000-4000-8000-000000000073', jsonb_build_array(jsonb_build_object(
  'table', 'routine_exercises', 'operation', 'upsert',
  'baseRevision', (SELECT server_revision::text FROM public.routine_exercises WHERE id = 'optional-exercise'),
  'record', jsonb_build_object('id', 'optional-exercise', 'routine_id', 'optional-routine', 'name', 'Press revised', 'position', 0)
)), 3);
SELECT is((SELECT is_optional FROM public.routine_exercises WHERE id = 'optional-exercise'), true, 'legacy upsert preserves optional flag');

SELECT public.sync_push('20000000-0000-4000-8000-000000000074', jsonb_build_array(jsonb_build_object(
  'table', 'routine_exercises', 'operation', 'upsert',
  'baseRevision', (SELECT server_revision::text FROM public.routine_exercises WHERE id = 'optional-exercise'),
  'record', jsonb_build_object('id', 'optional-exercise', 'routine_id', 'optional-routine', 'name', 'Press', 'position', 0, 'is_optional', false)
)), 4);
SELECT is((SELECT is_optional FROM public.routine_exercises WHERE id = 'optional-exercise'), false, 'version 4 can make an exercise required again');
SELECT throws_ok($$SELECT public.sync_push('20000000-0000-4000-8000-000000000075', '[{"table":"routine_exercises","operation":"upsert","baseRevision":"0","record":{"id":"invalid","routine_id":"optional-routine","name":"Invalid","position":1,"is_optional":"invalid"}}]'::jsonb, 4)$$,
  '22P02', NULL, 'invalid boolean is rejected');
SELECT * FROM finish();
ROLLBACK;
