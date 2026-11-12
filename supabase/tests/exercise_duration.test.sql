BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;
SELECT plan(4);
INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES ('30000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'duration-owner@example.test', '', now(), now(), now());
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);
SELECT public.sync_push('30000000-0000-4000-8000-000000000011', '[{"table":"routines","operation":"upsert","baseRevision":"0","record":{"id":"duration-routine","name":"Test"}},{"table":"active_workout_sessions","operation":"upsert","baseRevision":"0","record":{"routine_id":"duration-routine","started_at":"2026-01-01T00:00:00Z","exercise_timings":{"exercise":{"startedAt":1}}}},{"table":"workout_history","operation":"upsert","baseRevision":"0","record":{"id":"duration-history","routine_name":"Test","completed_at":"2026-01-01T00:00:00Z"}},{"table":"workout_history_exercises","operation":"upsert","baseRevision":"0","record":{"history_id":"duration-history","position":0,"exercise_name":"Squat","duration_measurement":{"exerciseId":"exercise","configuration":"[]","durationSeconds":90}}}]'::jsonb, 6);
SELECT is((SELECT exercise_timings->'exercise'->>'startedAt' FROM public.active_workout_sessions WHERE routine_id = 'duration-routine'), '1', 'session timing is stored');
SELECT is((SELECT duration_measurement->>'durationSeconds' FROM public.workout_history_exercises WHERE history_id = 'duration-history'), '90', 'history measurement is stored');
SELECT public.sync_push('30000000-0000-4000-8000-000000000012', jsonb_build_array(
  jsonb_build_object('table','active_workout_sessions','operation','upsert','baseRevision',(SELECT server_revision::text FROM public.active_workout_sessions WHERE routine_id='duration-routine'),'record',jsonb_build_object('routine_id','duration-routine','started_at','2026-01-01T00:00:00Z')),
  jsonb_build_object('table','workout_history_exercises','operation','upsert','baseRevision',(SELECT server_revision::text FROM public.workout_history_exercises WHERE history_id='duration-history'),'record',jsonb_build_object('history_id','duration-history','position',0,'exercise_name','Squat'))
), 5);
SELECT is((SELECT exercise_timings->'exercise'->>'startedAt' FROM public.active_workout_sessions WHERE routine_id = 'duration-routine'), '1', 'old client retains timing');
SELECT is((SELECT duration_measurement->>'durationSeconds' FROM public.workout_history_exercises WHERE history_id = 'duration-history'), '90', 'old client retains measurement');
SELECT * FROM finish();
ROLLBACK;
