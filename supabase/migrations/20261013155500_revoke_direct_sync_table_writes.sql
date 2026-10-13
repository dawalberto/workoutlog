-- Synced rows must pass through sync_push for validation, revision checks, and
-- idempotency. Keep owner RLS policies as defense in depth; table grants block
-- direct client writes while SELECT remains available for pull reads.
DO $$
DECLARE
  table_name text;
  synced_tables text[] := ARRAY[
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
  ];
BEGIN
  FOREACH table_name IN ARRAY synced_tables LOOP
    EXECUTE format(
      'REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.%I
       FROM PUBLIC, anon, authenticated',
      table_name
    );
  END LOOP;
END;
$$;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE
  ON TABLE private.sync_revision, private.sync_push_receipts
  FROM PUBLIC, anon, authenticated;
