BEGIN;

-- Multiple muscle groups per exercise. `categories` is additive and nullable;
-- `category` stays the primary (first) value for older accepted clients.

ALTER TABLE public.exercise_definitions ADD COLUMN categories text[];
ALTER TABLE public.routine_exercises ADD COLUMN categories text[];
ALTER TABLE public.rm_logs ADD COLUMN categories text[];
ALTER TABLE public.exercise_diaries ADD COLUMN categories text[];

UPDATE private.sync_contract_tables
SET writable_columns = ARRAY['id', 'name', 'category', 'categories', 'image_url', 'video_url', 'notes', 'default_sets', 'default_reps', 'default_weight', 'default_rest_seconds', 'created_at', 'updated_at']
WHERE table_name = 'exercise_definitions';

UPDATE private.sync_contract_tables
SET writable_columns = ARRAY['id', 'routine_id', 'definition_id', 'name', 'category', 'categories', 'notes', 'image_url', 'video_url', 'position', 'created_at', 'updated_at']
WHERE table_name = 'routine_exercises';

UPDATE private.sync_contract_tables
SET writable_columns = ARRAY['id', 'definition_id', 'exercise_name', 'category', 'categories', 'created_at', 'updated_at']
WHERE table_name = 'rm_logs';

UPDATE private.sync_contract_tables
SET writable_columns = ARRAY['id', 'definition_id', 'exercise_name', 'category', 'categories', 'created_at', 'updated_at']
WHERE table_name = 'exercise_diaries';

INSERT INTO private.sync_contract_versions (version, accepted) VALUES (2, true);

-- Extend the installed sync_push with one more branch: keep stored muscle
-- groups when an older accepted client upserts a row without `categories`.
-- Same dynamic pattern as 20261014154300 so validation and security attributes
-- stay intact.
DO $migration$
DECLARE
  v_definition text;
  v_original_definition text;
BEGIN
  SELECT pg_get_functiondef(
    'public.sync_push(uuid,jsonb,integer)'::regprocedure
  )
  INTO v_definition;
  v_original_definition := v_definition;

  IF strpos(
       v_definition,
       'sets_total = COALESCE(EXCLUDED.sets_total, stored.sets_total)'
     ) = 0 THEN
    RAISE EXCEPTION 'sync_push definition does not match the expected baseline';
  END IF;

  v_definition := replace(
    v_definition,
    '      ELSIF v_table = ''workout_history_exercises'' THEN
        v_update_assignments := replace(
          v_update_assignments,
          ''sets_total = EXCLUDED.sets_total'',
          ''sets_total = COALESCE(EXCLUDED.sets_total, stored.sets_total)''
        );
      END IF;',
    '      ELSIF v_table = ''workout_history_exercises'' THEN
        v_update_assignments := replace(
          v_update_assignments,
          ''sets_total = EXCLUDED.sets_total'',
          ''sets_total = COALESCE(EXCLUDED.sets_total, stored.sets_total)''
        );
      ELSIF v_table IN (''exercise_definitions'', ''routine_exercises'', ''rm_logs'', ''exercise_diaries'') THEN
        -- Older accepted clients do not send categories; keep any stored value.
        v_update_assignments := replace(
          v_update_assignments,
          ''categories = EXCLUDED.categories'',
          ''categories = COALESCE(EXCLUDED.categories, stored.categories)''
        );
      END IF;'
  );

  IF v_definition = v_original_definition THEN
    RAISE EXCEPTION 'sync_push categories branch was not installed';
  END IF;

  EXECUTE v_definition;
END;
$migration$;

REVOKE ALL ON FUNCTION public.sync_push(uuid, jsonb, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_push(uuid, jsonb, integer) TO authenticated;

COMMIT;
