BEGIN;

-- Personal records (RMs) can track either a lifted weight in kg or a repetition
-- count (for example jump-rope skips). `metric` is additive and nullable: legacy
-- rows and older accepted clients keep working, and the client treats NULL as
-- 'weight'. Contract version 3 is accepted so v3 clients may send the column.

ALTER TABLE public.rm_records ADD COLUMN metric text;

ALTER TABLE public.rm_records
  ADD CONSTRAINT rm_records_metric_check
  CHECK (metric IS NULL OR metric IN ('weight', 'reps'));

UPDATE private.sync_contract_tables
SET writable_columns = ARRAY['id', 'log_id', 'weight', 'metric', 'recorded_on', 'notes', 'created_at', 'updated_at']
WHERE table_name = 'rm_records';

INSERT INTO private.sync_contract_versions (version, accepted) VALUES (3, true);

-- Extend the installed sync_push with one more branch, mirroring the categories
-- handling from 20261029170728: when an older accepted client upserts an
-- rm_records row without `metric`, keep the stored value instead of clearing it.
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
       'categories = COALESCE(EXCLUDED.categories, stored.categories)'
     ) = 0 THEN
    RAISE EXCEPTION 'sync_push definition does not match the expected categories baseline';
  END IF;

  v_definition := replace(
    v_definition,
    '      ELSIF v_table IN (''exercise_definitions'', ''routine_exercises'', ''rm_logs'', ''exercise_diaries'') THEN
        -- Older accepted clients do not send categories; keep any stored value.
        v_update_assignments := replace(
          v_update_assignments,
          ''categories = EXCLUDED.categories'',
          ''categories = COALESCE(EXCLUDED.categories, stored.categories)''
        );
      END IF;',
    '      ELSIF v_table IN (''exercise_definitions'', ''routine_exercises'', ''rm_logs'', ''exercise_diaries'') THEN
        -- Older accepted clients do not send categories; keep any stored value.
        v_update_assignments := replace(
          v_update_assignments,
          ''categories = EXCLUDED.categories'',
          ''categories = COALESCE(EXCLUDED.categories, stored.categories)''
        );
      END IF;

      IF v_table = ''rm_records'' THEN
        -- Older accepted clients do not send metric; keep any stored value.
        v_update_assignments := replace(
          v_update_assignments,
          ''metric = EXCLUDED.metric'',
          ''metric = COALESCE(EXCLUDED.metric, stored.metric)''
        );
      END IF;'
  );

  IF v_definition = v_original_definition THEN
    RAISE EXCEPTION 'sync_push metric branch was not installed';
  END IF;

  EXECUTE v_definition;
END;
$migration$;

REVOKE ALL ON FUNCTION public.sync_push(uuid, jsonb, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_push(uuid, jsonb, integer) TO authenticated;

COMMIT;
