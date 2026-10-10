CREATE OR REPLACE FUNCTION public.sync_push(p_operation_id uuid, p_changes jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, private
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_change jsonb;
  v_record jsonb;
  v_base_revision_text text;
  v_base_revision bigint;
  v_current_revision bigint;
  v_existing_row jsonb;
  v_table text;
  v_operation text;
  v_allowed_columns text[];
  v_key_columns text[];
  v_update_columns text[];
  v_conflict_columns text;
  v_update_assignments text;
  v_key_predicates text;
  v_write_record jsonb;
  v_sql text;
  v_row jsonb;
  v_id text;
  v_results jsonb := '[]'::jsonb;
  v_payload_hash bytea;
  v_response jsonb;
  v_inserted integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '28000',
      MESSAGE = 'sync_authentication_required';
  END IF;

  IF p_operation_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'sync_operation_id_required';
  END IF;

  IF p_changes IS NULL OR jsonb_typeof(p_changes) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'sync_batch_size_invalid';
  END IF;

  IF jsonb_array_length(p_changes) < 1
     OR jsonb_array_length(p_changes) > 100 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'sync_batch_size_invalid';
  END IF;

  v_payload_hash := extensions.digest(p_changes::text, 'sha256');

  INSERT INTO private.sync_push_receipts (user_id, operation_id, payload_hash)
  VALUES (v_user_id, p_operation_id, v_payload_hash)
  ON CONFLICT (user_id, operation_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF v_inserted = 0 THEN
    SELECT payload_hash, response
      INTO v_payload_hash, v_response
    FROM private.sync_push_receipts
    WHERE user_id = v_user_id
      AND operation_id = p_operation_id
    FOR UPDATE;

    IF v_payload_hash IS DISTINCT FROM extensions.digest(p_changes::text, 'sha256') THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'sync_operation_conflict';
    END IF;

    IF v_response IS NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'sync_operation_response_unavailable';
    END IF;

    RETURN v_response;
  END IF;

  FOR v_change IN
    SELECT value
    FROM jsonb_array_elements(p_changes) WITH ORDINALITY AS changes(value, ordinality)
    ORDER BY ordinality
  LOOP
    IF jsonb_typeof(v_change) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'sync_change_shape_invalid';
    END IF;

    IF v_change - ARRAY['table', 'operation', 'baseRevision', 'record'] <> '{}'::jsonb
       OR NOT (v_change ?& ARRAY['table', 'operation', 'baseRevision', 'record']) THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'sync_change_shape_invalid';
    END IF;

    v_table := v_change->>'table';
    v_operation := v_change->>'operation';
    v_base_revision_text := v_change->>'baseRevision';
    v_record := v_change->'record';

    IF v_table IS NULL
       OR v_operation IS NULL
       OR v_operation NOT IN ('upsert', 'delete') THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'sync_operation_not_allowed';
    END IF;

    IF jsonb_typeof(v_change->'baseRevision') IS DISTINCT FROM 'string'
       OR v_base_revision_text IS NULL
       OR v_base_revision_text !~ '^(0|[1-9][0-9]{0,18})$' THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'sync_base_revision_invalid';
    END IF;

    IF v_base_revision_text::numeric > 9223372036854775807 THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'sync_base_revision_invalid';
    END IF;

    v_base_revision := v_base_revision_text::bigint;

    CASE v_table
      WHEN 'exercise_definitions' THEN
        v_allowed_columns := ARRAY[
          'id', 'name', 'category', 'image_url', 'video_url', 'notes',
          'default_sets', 'default_reps', 'default_weight',
          'default_rest_seconds', 'created_at', 'updated_at'
        ];
        v_key_columns := ARRAY['id'];
      WHEN 'routines' THEN
        v_allowed_columns := ARRAY['id', 'name', 'notes', 'created_at', 'updated_at'];
        v_key_columns := ARRAY['id'];
      WHEN 'routine_exercises' THEN
        v_allowed_columns := ARRAY[
          'id', 'routine_id', 'definition_id', 'name', 'category', 'notes',
          'image_url', 'video_url', 'position', 'created_at', 'updated_at'
        ];
        v_key_columns := ARRAY['id'];
      WHEN 'workout_sets' THEN
        v_allowed_columns := ARRAY[
          'id', 'routine_id', 'routine_exercise_id', 'position', 'reps',
          'weight', 'rest_seconds', 'created_at', 'updated_at'
        ];
        v_key_columns := ARRAY['id'];
      WHEN 'active_workout_sessions' THEN
        v_allowed_columns := ARRAY[
          'routine_id', 'started_at', 'created_at', 'updated_at'
        ];
        v_key_columns := ARRAY['routine_id'];
      WHEN 'active_session_completed_sets' THEN
        v_allowed_columns := ARRAY[
          'routine_id', 'set_id', 'created_at', 'updated_at'
        ];
        v_key_columns := ARRAY['routine_id', 'set_id'];
      WHEN 'rm_logs' THEN
        v_allowed_columns := ARRAY[
          'id', 'definition_id', 'exercise_name', 'category',
          'created_at', 'updated_at'
        ];
        v_key_columns := ARRAY['id'];
      WHEN 'rm_records' THEN
        v_allowed_columns := ARRAY[
          'id', 'log_id', 'weight', 'recorded_on', 'notes',
          'created_at', 'updated_at'
        ];
        v_key_columns := ARRAY['id'];
      WHEN 'workout_history' THEN
        v_allowed_columns := ARRAY[
          'id', 'routine_id', 'routine_name', 'started_at', 'completed_at',
          'duration_seconds', 'exercises_completed', 'sets_completed',
          'created_at', 'updated_at'
        ];
        v_key_columns := ARRAY['id'];
      WHEN 'workout_history_exercises' THEN
        v_allowed_columns := ARRAY[
          'history_id', 'position', 'exercise_name', 'exercises_completed',
          'sets_completed', 'created_at', 'updated_at'
        ];
        v_key_columns := ARRAY['history_id', 'position'];
      WHEN 'exercise_diaries' THEN
        v_allowed_columns := ARRAY[
          'id', 'definition_id', 'exercise_name', 'category',
          'created_at', 'updated_at'
        ];
        v_key_columns := ARRAY['id'];
      WHEN 'exercise_diary_entries' THEN
        v_allowed_columns := ARRAY[
          'id', 'diary_id', 'recorded_on', 'note', 'feeling',
          'created_at', 'updated_at'
        ];
        v_key_columns := ARRAY['id'];
      ELSE
        RAISE EXCEPTION USING
          ERRCODE = 'P0001',
          MESSAGE = 'sync_table_not_allowed';
    END CASE;

    IF jsonb_typeof(v_record) IS DISTINCT FROM 'object'
       OR EXISTS (
         SELECT 1
         FROM jsonb_object_keys(v_record) AS fields(column_name)
         WHERE NOT fields.column_name = ANY(v_allowed_columns)
       ) THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'sync_change_field_not_allowed';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM unnest(v_key_columns) AS keys(column_name)
      WHERE NOT (v_record ? keys.column_name)
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'sync_change_identity_required';
    END IF;

    SELECT string_agg(
      format('stored.%1$I = input.%1$I', keys.column_name),
      ' AND '
    )
      INTO v_key_predicates
    FROM unnest(v_key_columns) AS keys(column_name);

    v_sql := format(
      'SELECT to_jsonb(stored)
       FROM public.%1$I AS stored
       JOIN (
         SELECT (jsonb_populate_record(NULL::public.%1$I, $2)).*
       ) AS input ON stored.user_id = $1 AND %2$s
       FOR UPDATE OF stored',
      v_table,
      v_key_predicates
    );
    EXECUTE v_sql INTO v_existing_row USING v_user_id, v_record;

    IF v_existing_row IS NULL THEN
      IF v_base_revision <> 0 THEN
        RAISE EXCEPTION USING
          ERRCODE = 'P0001',
          MESSAGE = 'sync_stale_revision_conflict';
      END IF;
    ELSE
      v_current_revision := (v_existing_row->>'server_revision')::bigint;
      IF v_base_revision > v_current_revision
         OR (
           v_operation = 'upsert'
           AND v_existing_row->>'deleted_at' IS NOT NULL
           AND v_base_revision < v_current_revision
         ) THEN
        RAISE EXCEPTION USING
          ERRCODE = 'P0001',
          MESSAGE = 'sync_stale_revision_conflict';
      END IF;
    END IF;

    IF v_operation = 'upsert' THEN
      v_update_columns := array_remove(v_allowed_columns, 'created_at');
      SELECT string_agg(format('%I', columns.column_name), ', ')
        INTO v_conflict_columns
      FROM unnest(ARRAY['user_id'] || v_key_columns) AS columns(column_name);

      SELECT string_agg(
        format('%1$I = EXCLUDED.%1$I', columns.column_name),
        ', '
      )
        INTO v_update_assignments
      FROM unnest(v_update_columns) AS columns(column_name)
      WHERE NOT columns.column_name = ANY(v_key_columns);

      v_update_assignments := COALESCE(v_update_assignments || ', ', '')
        || 'deleted_at = NULL';

      v_write_record := v_record || jsonb_build_object(
        'user_id', v_user_id,
        'created_at', COALESCE(
          v_record->'created_at',
          to_jsonb(transaction_timestamp())
        ),
        'updated_at', COALESCE(
          v_record->'updated_at',
          to_jsonb(transaction_timestamp())
        ),
        'server_revision', 0,
        'server_updated_at', to_jsonb(transaction_timestamp()),
        'deleted_at', NULL
      );

      IF v_table = 'workout_history' OR v_table = 'workout_history_exercises' THEN
        v_write_record := v_write_record || jsonb_build_object(
          'exercises_completed',
          COALESCE(v_record->'exercises_completed', '0'::jsonb),
          'sets_completed',
          COALESCE(v_record->'sets_completed', '0'::jsonb)
        );
      END IF;

      v_sql := format(
        'INSERT INTO public.%1$I AS stored
           SELECT (jsonb_populate_record(NULL::public.%1$I, $1)).*
         ON CONFLICT (%2$s) DO UPDATE SET %3$s
         WHERE $2 <= stored.server_revision
           AND (stored.deleted_at IS NULL OR $2 = stored.server_revision)
         RETURNING to_jsonb(stored)',
        v_table,
        v_conflict_columns,
        v_update_assignments
      );
      EXECUTE v_sql INTO v_row USING v_write_record, v_base_revision;
      IF v_row IS NULL THEN
        RAISE EXCEPTION USING
          ERRCODE = 'P0001',
          MESSAGE = 'sync_stale_revision_conflict';
      END IF;
    ELSE
      v_sql := format(
        'UPDATE public.%1$I AS stored
         SET deleted_at = clock_timestamp()
         FROM (
           SELECT (jsonb_populate_record(NULL::public.%1$I, $2)).*
         ) AS input
         WHERE stored.user_id = $1 AND %2$s
         RETURNING to_jsonb(stored)',
        v_table,
        v_key_predicates
      );
      EXECUTE v_sql INTO v_row USING v_user_id, v_record;

      IF v_row IS NULL THEN
        RAISE EXCEPTION USING
          ERRCODE = 'P0001',
          MESSAGE = 'sync_record_not_found';
      END IF;
    END IF;

    v_row := v_row || jsonb_build_object(
      'server_revision',
      v_row->>'server_revision'
    );

    CASE v_table
      WHEN 'active_session_completed_sets' THEN
        v_id := '['
          || to_json(v_row->>'routine_id')::text
          || ','
          || to_json(v_row->>'set_id')::text
          || ']';
      WHEN 'workout_history_exercises' THEN
        v_id := '['
          || to_json(v_row->>'history_id')::text
          || ','
          || to_json((v_row->>'position')::integer)::text
          || ']';
      WHEN 'active_workout_sessions' THEN
        v_id := v_row->>'routine_id';
      ELSE
        v_id := v_row->>'id';
    END CASE;

    v_results := v_results || jsonb_build_array(jsonb_build_object(
      'table', v_table,
      'id', v_id,
      'revision', v_row->>'server_revision',
      'deletedAt', v_row->'deleted_at'
    ));
  END LOOP;

  v_response := jsonb_build_object(
    'operationId', p_operation_id::text,
    'changes', v_results
  );

  UPDATE private.sync_push_receipts
  SET response = v_response
  WHERE user_id = v_user_id
    AND operation_id = p_operation_id;

  RETURN v_response;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_push(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_push(uuid, jsonb) TO authenticated;
