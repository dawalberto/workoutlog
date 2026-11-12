BEGIN;

-- NULL means required and lets older clients omit the field without clearing it.
ALTER TABLE public.routine_exercises ADD COLUMN is_optional boolean;

UPDATE private.sync_contract_tables
SET writable_columns = ARRAY['id', 'routine_id', 'definition_id', 'name', 'category', 'categories', 'notes', 'image_url', 'video_url', 'is_optional', 'position', 'created_at', 'updated_at']
WHERE table_name = 'routine_exercises';

INSERT INTO private.sync_contract_versions (version, accepted) VALUES (4, true);

DO $migration$
DECLARE
  v_definition text;
  v_original_definition text;
BEGIN
  SELECT pg_get_functiondef('public.sync_push(uuid,jsonb,integer)'::regprocedure)
  INTO v_definition;
  v_original_definition := v_definition;
  v_definition := replace(
    v_definition,
    '      IF v_table = ''rm_records'' THEN',
    '      IF v_table = ''routine_exercises'' THEN
        -- Older clients omit is_optional; preserve the stored choice.
        v_update_assignments := replace(
          v_update_assignments,
          ''is_optional = EXCLUDED.is_optional'',
          ''is_optional = COALESCE(EXCLUDED.is_optional, stored.is_optional)''
        );
      END IF;

      IF v_table = ''rm_records'' THEN'
  );
  IF v_definition = v_original_definition THEN
    RAISE EXCEPTION 'sync_push optional exercise branch was not installed';
  END IF;
  EXECUTE v_definition;
END;
$migration$;

REVOKE ALL ON FUNCTION public.sync_push(uuid, jsonb, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_push(uuid, jsonb, integer) TO authenticated;

COMMIT;
