BEGIN;

-- History snapshots retain the exercise's status at the time of the workout.
ALTER TABLE public.workout_history_exercises ADD COLUMN is_optional boolean;
UPDATE private.sync_contract_tables
SET writable_columns = ARRAY['history_id', 'position', 'exercise_name', 'exercises_completed', 'sets_completed', 'sets_total', 'is_optional', 'created_at', 'updated_at']
WHERE table_name = 'workout_history_exercises';
INSERT INTO private.sync_contract_versions (version, accepted) VALUES (5, true);

DO $migration$
DECLARE
  v_definition text;
  v_original_definition text;
BEGIN
  SELECT pg_get_functiondef('public.sync_push(uuid,jsonb,integer)'::regprocedure) INTO v_definition;
  v_original_definition := v_definition;
  v_definition := replace(
    v_definition,
    '      IF v_table = ''routine_exercises'' THEN
        -- Older clients omit is_optional; preserve the stored choice.',
    '      IF v_table IN (''routine_exercises'', ''workout_history_exercises'') THEN
        -- Older clients omit is_optional; preserve the stored choice.'
  );
  IF v_definition = v_original_definition THEN
    RAISE EXCEPTION 'sync_push optional history branch was not installed';
  END IF;
  EXECUTE v_definition;
END;
$migration$;
REVOKE ALL ON FUNCTION public.sync_push(uuid, jsonb, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_push(uuid, jsonb, integer) TO authenticated;
COMMIT;
