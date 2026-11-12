BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;
SELECT plan(2);
INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES ('20000000-0000-4000-8000-000000000081', 'authenticated', 'authenticated', 'optional-history@example.test', '', now(), now(), now());
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000081', true);
SELECT public.sync_push('20000000-0000-4000-8000-000000000082',
  '[{"table":"workout_history","operation":"upsert","baseRevision":"0","record":{"id":"optional-history","routine_name":"Rutina","completed_at":"2026-11-12T00:00:00Z"}},{"table":"workout_history_exercises","operation":"upsert","baseRevision":"0","record":{"history_id":"optional-history","position":0,"exercise_name":"Press","sets_completed":0,"sets_total":1,"is_optional":true}}]'::jsonb, 5);
SELECT is((SELECT is_optional FROM public.workout_history_exercises WHERE history_id = 'optional-history'), true, 'version 5 stores optional history snapshot');
SELECT public.sync_push('20000000-0000-4000-8000-000000000083', jsonb_build_array(jsonb_build_object(
  'table', 'workout_history_exercises', 'operation', 'upsert',
  'baseRevision', (SELECT server_revision::text FROM public.workout_history_exercises WHERE history_id = 'optional-history'),
  'record', jsonb_build_object('history_id', 'optional-history', 'position', 0, 'exercise_name', 'Press', 'sets_completed', 0, 'sets_total', 1)
)), 4);
SELECT is((SELECT is_optional FROM public.workout_history_exercises WHERE history_id = 'optional-history'), true, 'legacy upsert preserves optional history snapshot');
SELECT * FROM finish();
ROLLBACK;
