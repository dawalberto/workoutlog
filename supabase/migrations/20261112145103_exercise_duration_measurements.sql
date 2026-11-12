BEGIN;

ALTER TABLE public.active_workout_sessions ADD COLUMN exercise_timings jsonb;
ALTER TABLE public.workout_history_exercises ADD COLUMN duration_measurement jsonb;

UPDATE private.sync_contract_tables
SET writable_columns = array_append(writable_columns, 'exercise_timings')
WHERE table_name = 'active_workout_sessions';
UPDATE private.sync_contract_tables
SET writable_columns = array_append(writable_columns, 'duration_measurement')
WHERE table_name = 'workout_history_exercises';
INSERT INTO private.sync_contract_versions (version, accepted) VALUES (6, true);

DO $migration$
DECLARE
  v_definition text;
  v_original text;
BEGIN
  SELECT pg_get_functiondef('public.sync_push(uuid,jsonb,integer)'::regprocedure) INTO v_definition;
  v_original := v_definition;
  v_definition := replace(v_definition,
    '      v_update_assignments := COALESCE(v_update_assignments || '', '', '''')',
    '      IF v_table = ''active_workout_sessions'' THEN
        v_update_assignments := replace(v_update_assignments,
          ''exercise_timings = EXCLUDED.exercise_timings'',
          ''exercise_timings = COALESCE(EXCLUDED.exercise_timings, stored.exercise_timings)'');
      ELSIF v_table = ''workout_history_exercises'' THEN
        v_update_assignments := replace(v_update_assignments,
          ''duration_measurement = EXCLUDED.duration_measurement'',
          ''duration_measurement = COALESCE(EXCLUDED.duration_measurement, stored.duration_measurement)'');
      END IF;

      v_update_assignments := COALESCE(v_update_assignments || '', '', '''')');
  IF v_definition = v_original THEN
    RAISE EXCEPTION 'sync_push duration compatibility branch was not installed';
  END IF;
  EXECUTE v_definition;
END;
$migration$;
REVOKE ALL ON FUNCTION public.sync_push(uuid, jsonb, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_push(uuid, jsonb, integer) TO authenticated;
COMMIT;
