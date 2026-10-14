BEGIN;

CREATE FUNCTION private.sync_parent_deleted_at(
  p_user_id uuid,
  p_table text,
  p_record jsonb
)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, private
AS $$
DECLARE
  v_deleted_at timestamptz;
  v_other_deleted_at timestamptz;
BEGIN
  CASE p_table
    WHEN 'routine_exercises' THEN
      SELECT parent.deleted_at
        INTO v_deleted_at
      FROM public.routines AS parent
      WHERE parent.user_id = p_user_id
        AND parent.id = p_record->>'routine_id'
      FOR SHARE;
      SELECT parent.deleted_at
        INTO v_other_deleted_at
      FROM public.exercise_definitions AS parent
      WHERE parent.user_id = p_user_id
        AND parent.id = p_record->>'definition_id'
      FOR SHARE;
      v_deleted_at := GREATEST(v_deleted_at, v_other_deleted_at);
    WHEN 'workout_sets' THEN
      SELECT parent.deleted_at
        INTO v_deleted_at
      FROM public.routine_exercises AS parent
      WHERE parent.user_id = p_user_id
        AND parent.routine_id = p_record->>'routine_id'
        AND parent.id = p_record->>'routine_exercise_id'
      FOR SHARE;
      SELECT parent.deleted_at
        INTO v_other_deleted_at
      FROM public.routines AS parent
      WHERE parent.user_id = p_user_id
        AND parent.id = p_record->>'routine_id'
      FOR SHARE;
      v_deleted_at := GREATEST(v_deleted_at, v_other_deleted_at);
    WHEN 'active_workout_sessions' THEN
      SELECT parent.deleted_at
        INTO v_deleted_at
      FROM public.routines AS parent
      WHERE parent.user_id = p_user_id
        AND parent.id = p_record->>'routine_id'
      FOR SHARE;
    WHEN 'active_session_completed_sets' THEN
      SELECT parent.deleted_at
        INTO v_deleted_at
      FROM public.active_workout_sessions AS parent
      WHERE parent.user_id = p_user_id
        AND parent.routine_id = p_record->>'routine_id'
      FOR SHARE;
      SELECT parent.deleted_at
        INTO v_other_deleted_at
      FROM public.workout_sets AS parent
      WHERE parent.user_id = p_user_id
        AND parent.routine_id = p_record->>'routine_id'
        AND parent.id = p_record->>'set_id'
      FOR SHARE;
      v_deleted_at := GREATEST(v_deleted_at, v_other_deleted_at);
    WHEN 'rm_logs' THEN
      SELECT parent.deleted_at
        INTO v_deleted_at
      FROM public.exercise_definitions AS parent
      WHERE parent.user_id = p_user_id
        AND parent.id = p_record->>'definition_id'
      FOR SHARE;
    WHEN 'rm_records' THEN
      SELECT parent.deleted_at
        INTO v_deleted_at
      FROM public.rm_logs AS parent
      WHERE parent.user_id = p_user_id
        AND parent.id = p_record->>'log_id'
      FOR SHARE;
    WHEN 'workout_history' THEN
      SELECT parent.deleted_at
        INTO v_deleted_at
      FROM public.routines AS parent
      WHERE parent.user_id = p_user_id
        AND parent.id = p_record->>'routine_id'
      FOR SHARE;
    WHEN 'workout_history_exercises' THEN
      SELECT parent.deleted_at
        INTO v_deleted_at
      FROM public.workout_history AS parent
      WHERE parent.user_id = p_user_id
        AND parent.id = p_record->>'history_id'
      FOR SHARE;
    WHEN 'exercise_diaries' THEN
      SELECT parent.deleted_at
        INTO v_deleted_at
      FROM public.exercise_definitions AS parent
      WHERE parent.user_id = p_user_id
        AND parent.id = p_record->>'definition_id'
      FOR SHARE;
    WHEN 'exercise_diary_entries' THEN
      SELECT parent.deleted_at
        INTO v_deleted_at
      FROM public.exercise_diaries AS parent
      WHERE parent.user_id = p_user_id
        AND parent.id = p_record->>'diary_id'
      FOR SHARE;
    ELSE
      v_deleted_at := NULL;
  END CASE;

  RETURN v_deleted_at;
END;
$$;

REVOKE ALL ON FUNCTION private.sync_parent_deleted_at(uuid, text, jsonb)
  FROM PUBLIC, anon, authenticated;

CREATE FUNCTION private.repair_tombstoned_sync_children()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, private
AS $$
BEGIN
  UPDATE public.routine_exercises AS child
  SET deleted_at = parent.deleted_at
  FROM public.routines AS parent
  WHERE child.user_id = parent.user_id
    AND child.routine_id = parent.id
    AND child.deleted_at IS NULL
    AND parent.deleted_at IS NOT NULL;

  UPDATE public.routine_exercises AS child
  SET deleted_at = parent.deleted_at
  FROM public.exercise_definitions AS parent
  WHERE child.user_id = parent.user_id
    AND child.definition_id = parent.id
    AND child.deleted_at IS NULL
    AND parent.deleted_at IS NOT NULL;

  UPDATE public.workout_sets AS child
  SET deleted_at = parent.deleted_at
  FROM public.routine_exercises AS parent
  WHERE child.user_id = parent.user_id
    AND child.routine_id = parent.routine_id
    AND child.routine_exercise_id = parent.id
    AND child.deleted_at IS NULL
    AND parent.deleted_at IS NOT NULL;

  UPDATE public.workout_sets AS child
  SET deleted_at = parent.deleted_at
  FROM public.routines AS parent
  WHERE child.user_id = parent.user_id
    AND child.routine_id = parent.id
    AND child.deleted_at IS NULL
    AND parent.deleted_at IS NOT NULL;

  UPDATE public.active_workout_sessions AS child
  SET deleted_at = parent.deleted_at
  FROM public.routines AS parent
  WHERE child.user_id = parent.user_id
    AND child.routine_id = parent.id
    AND child.deleted_at IS NULL
    AND parent.deleted_at IS NOT NULL;

  UPDATE public.workout_history AS child
  SET deleted_at = parent.deleted_at
  FROM public.routines AS parent
  WHERE child.user_id = parent.user_id
    AND child.routine_id = parent.id
    AND child.deleted_at IS NULL
    AND parent.deleted_at IS NOT NULL;

  UPDATE public.rm_logs AS child
  SET deleted_at = parent.deleted_at
  FROM public.exercise_definitions AS parent
  WHERE child.user_id = parent.user_id
    AND child.definition_id = parent.id
    AND child.deleted_at IS NULL
    AND parent.deleted_at IS NOT NULL;

  UPDATE public.exercise_diaries AS child
  SET deleted_at = parent.deleted_at
  FROM public.exercise_definitions AS parent
  WHERE child.user_id = parent.user_id
    AND child.definition_id = parent.id
    AND child.deleted_at IS NULL
    AND parent.deleted_at IS NOT NULL;

  UPDATE public.active_session_completed_sets AS child
  SET deleted_at = parent.deleted_at
  FROM public.active_workout_sessions AS parent
  WHERE child.user_id = parent.user_id
    AND child.routine_id = parent.routine_id
    AND child.deleted_at IS NULL
    AND parent.deleted_at IS NOT NULL;

  UPDATE public.active_session_completed_sets AS child
  SET deleted_at = parent.deleted_at
  FROM public.workout_sets AS parent
  WHERE child.user_id = parent.user_id
    AND child.routine_id = parent.routine_id
    AND child.set_id = parent.id
    AND child.deleted_at IS NULL
    AND parent.deleted_at IS NOT NULL;

  UPDATE public.rm_records AS child
  SET deleted_at = parent.deleted_at
  FROM public.rm_logs AS parent
  WHERE child.user_id = parent.user_id
    AND child.log_id = parent.id
    AND child.deleted_at IS NULL
    AND parent.deleted_at IS NOT NULL;

  UPDATE public.workout_history_exercises AS child
  SET deleted_at = parent.deleted_at
  FROM public.workout_history AS parent
  WHERE child.user_id = parent.user_id
    AND child.history_id = parent.id
    AND child.deleted_at IS NULL
    AND parent.deleted_at IS NOT NULL;

  UPDATE public.exercise_diary_entries AS child
  SET deleted_at = parent.deleted_at
  FROM public.exercise_diaries AS parent
  WHERE child.user_id = parent.user_id
    AND child.diary_id = parent.id
    AND child.deleted_at IS NULL
    AND parent.deleted_at IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION private.repair_tombstoned_sync_children()
  FROM PUBLIC, anon, authenticated;

CREATE FUNCTION private.cascade_tombstoned_sync_children()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, private
AS $$
DECLARE
  v_deleted_at timestamptz;
BEGIN
  v_deleted_at := NEW.deleted_at;
  IF OLD.deleted_at IS NOT NULL OR v_deleted_at IS NULL THEN
    RETURN NEW;
  END IF;

  CASE TG_TABLE_NAME
    WHEN 'routines' THEN
      UPDATE public.routine_exercises AS child
      SET deleted_at = v_deleted_at
      WHERE child.user_id = NEW.user_id
        AND child.routine_id = NEW.id
        AND child.deleted_at IS NULL;
      UPDATE public.workout_sets AS child
      SET deleted_at = v_deleted_at
      WHERE child.user_id = NEW.user_id
        AND child.routine_id = NEW.id
        AND child.deleted_at IS NULL;
      UPDATE public.active_workout_sessions AS child
      SET deleted_at = v_deleted_at
      WHERE child.user_id = NEW.user_id
        AND child.routine_id = NEW.id
        AND child.deleted_at IS NULL;
      UPDATE public.workout_history AS child
      SET deleted_at = v_deleted_at
      WHERE child.user_id = NEW.user_id
        AND child.routine_id = NEW.id
        AND child.deleted_at IS NULL;
    WHEN 'exercise_definitions' THEN
      UPDATE public.routine_exercises AS child
      SET deleted_at = v_deleted_at
      WHERE child.user_id = NEW.user_id
        AND child.definition_id = NEW.id
        AND child.deleted_at IS NULL;
      UPDATE public.rm_logs AS child
      SET deleted_at = v_deleted_at
      WHERE child.user_id = NEW.user_id
        AND child.definition_id = NEW.id
        AND child.deleted_at IS NULL;
      UPDATE public.exercise_diaries AS child
      SET deleted_at = v_deleted_at
      WHERE child.user_id = NEW.user_id
        AND child.definition_id = NEW.id
        AND child.deleted_at IS NULL;
    WHEN 'routine_exercises' THEN
      UPDATE public.workout_sets AS child
      SET deleted_at = v_deleted_at
      WHERE child.user_id = NEW.user_id
        AND child.routine_id = NEW.routine_id
        AND child.routine_exercise_id = NEW.id
        AND child.deleted_at IS NULL;
    WHEN 'active_workout_sessions' THEN
      UPDATE public.active_session_completed_sets AS child
      SET deleted_at = v_deleted_at
      WHERE child.user_id = NEW.user_id
        AND child.routine_id = NEW.routine_id
        AND child.deleted_at IS NULL;
    WHEN 'workout_sets' THEN
      UPDATE public.active_session_completed_sets AS child
      SET deleted_at = v_deleted_at
      WHERE child.user_id = NEW.user_id
        AND child.routine_id = NEW.routine_id
        AND child.set_id = NEW.id
        AND child.deleted_at IS NULL;
    WHEN 'rm_logs' THEN
      UPDATE public.rm_records AS child
      SET deleted_at = v_deleted_at
      WHERE child.user_id = NEW.user_id
        AND child.log_id = NEW.id
        AND child.deleted_at IS NULL;
    WHEN 'workout_history' THEN
      UPDATE public.workout_history_exercises AS child
      SET deleted_at = v_deleted_at
      WHERE child.user_id = NEW.user_id
        AND child.history_id = NEW.id
        AND child.deleted_at IS NULL;
    WHEN 'exercise_diaries' THEN
      UPDATE public.exercise_diary_entries AS child
      SET deleted_at = v_deleted_at
      WHERE child.user_id = NEW.user_id
        AND child.diary_id = NEW.id
        AND child.deleted_at IS NULL;
    ELSE
      NULL;
  END CASE;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.cascade_tombstoned_sync_children()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER cascade_tombstoned_children
AFTER UPDATE OF deleted_at ON public.routines
FOR EACH ROW
WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
EXECUTE FUNCTION private.cascade_tombstoned_sync_children();

CREATE TRIGGER cascade_tombstoned_children
AFTER UPDATE OF deleted_at ON public.exercise_definitions
FOR EACH ROW
WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
EXECUTE FUNCTION private.cascade_tombstoned_sync_children();

CREATE TRIGGER cascade_tombstoned_children
AFTER UPDATE OF deleted_at ON public.routine_exercises
FOR EACH ROW
WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
EXECUTE FUNCTION private.cascade_tombstoned_sync_children();

CREATE TRIGGER cascade_tombstoned_children
AFTER UPDATE OF deleted_at ON public.active_workout_sessions
FOR EACH ROW
WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
EXECUTE FUNCTION private.cascade_tombstoned_sync_children();

CREATE TRIGGER cascade_tombstoned_children
AFTER UPDATE OF deleted_at ON public.workout_sets
FOR EACH ROW
WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
EXECUTE FUNCTION private.cascade_tombstoned_sync_children();

CREATE TRIGGER cascade_tombstoned_children
AFTER UPDATE OF deleted_at ON public.rm_logs
FOR EACH ROW
WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
EXECUTE FUNCTION private.cascade_tombstoned_sync_children();

CREATE TRIGGER cascade_tombstoned_children
AFTER UPDATE OF deleted_at ON public.workout_history
FOR EACH ROW
WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
EXECUTE FUNCTION private.cascade_tombstoned_sync_children();

CREATE TRIGGER cascade_tombstoned_children
AFTER UPDATE OF deleted_at ON public.exercise_diaries
FOR EACH ROW
WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
EXECUTE FUNCTION private.cascade_tombstoned_sync_children();

SELECT private.repair_tombstoned_sync_children();

DO $migration$
DECLARE
  v_definition text;
  v_original_definition text;
BEGIN
  -- Reuse the installed full definition so its validation and security attributes remain intact.
  SELECT pg_get_functiondef(
    'public.sync_push(uuid,jsonb,integer)'::regprocedure
  )
  INTO v_definition;
  v_original_definition := v_definition;

  IF strpos(v_definition, 'v_write_record jsonb;') = 0
     OR strpos(v_definition, '      v_write_record := v_record || jsonb_build_object(') = 0
     OR strpos(v_definition, '''deleted_at'', NULL') = 0
     OR strpos(v_definition, '''deleted_at = NULL''') = 0
     OR strpos(v_definition, 'EXECUTE v_sql INTO v_existing_row USING v_user_id, v_record;') = 0
     OR strpos(v_definition, 'IF v_base_revision <> 0 THEN') = 0
     OR strpos(v_definition, 'WHERE $2 <= stored.server_revision') = 0
     OR strpos(v_definition, 'EXECUTE v_sql INTO v_row USING v_write_record, v_base_revision;') = 0 THEN
    RAISE EXCEPTION 'sync_push definition does not match the expected migration baseline';
  END IF;

  v_definition := replace(
    v_definition,
    'v_write_record jsonb;',
    'v_write_record jsonb;
  v_parent_deleted_at timestamptz;'
  );
  v_definition := replace(
    v_definition,
    'EXECUTE v_sql INTO v_existing_row USING v_user_id, v_record;',
    'IF v_operation = ''upsert'' THEN
      v_parent_deleted_at := private.sync_parent_deleted_at(v_user_id, v_table, v_record);
    END IF;

    EXECUTE v_sql INTO v_existing_row USING v_user_id, v_record;'
  );
  v_definition := replace(
    v_definition,
    'IF v_base_revision <> 0 THEN',
    'IF v_parent_deleted_at IS NULL AND v_base_revision <> 0 THEN'
  );
  v_definition := replace(
    v_definition,
    'IF v_base_revision > v_current_revision
         OR (
           v_operation = ''upsert''
           AND v_existing_row->>''deleted_at'' IS NOT NULL
           AND v_base_revision < v_current_revision
         ) THEN',
    'IF v_parent_deleted_at IS NULL AND (
           v_base_revision > v_current_revision
           OR (
             v_operation = ''upsert''
             AND v_existing_row->>''deleted_at'' IS NOT NULL
             AND v_base_revision < v_current_revision
           )
         ) THEN'
  );
  v_definition := replace(
    v_definition,
    '''deleted_at'', NULL',
    '''deleted_at'', v_parent_deleted_at'
  );
  v_definition := replace(
    v_definition,
    '''deleted_at = NULL''',
    '''deleted_at = EXCLUDED.deleted_at'''
  );
  v_definition := replace(
    v_definition,
    'WHERE $2 <= stored.server_revision
           AND (stored.deleted_at IS NULL OR $2 = stored.server_revision)',
    'WHERE ($2 <= stored.server_revision OR $3 IS NOT NULL)
           AND (
             stored.deleted_at IS NULL
             OR $2 = stored.server_revision
             OR $3 IS NOT NULL
           )'
  );
  v_definition := replace(
    v_definition,
    'EXECUTE v_sql INTO v_row USING v_write_record, v_base_revision;',
    'EXECUTE v_sql INTO v_row USING v_write_record, v_base_revision, v_parent_deleted_at;'
  );

  IF strpos(
       v_definition,
       'v_parent_deleted_at := private.sync_parent_deleted_at(v_user_id, v_table, v_record);'
     ) = 0
     OR strpos(
       v_definition,
       'WHERE ($2 <= stored.server_revision OR $3 IS NOT NULL)'
     ) = 0
     OR strpos(
       v_definition,
       'EXECUTE v_sql INTO v_row USING v_write_record, v_base_revision, v_parent_deleted_at;'
     ) = 0
     OR strpos(v_definition, 'IF v_base_revision <> 0 THEN') > 0 THEN
    RAISE EXCEPTION 'sync_push tombstone-parent guard was not installed before revision checks';
  END IF;

  IF v_definition = v_original_definition THEN
    RAISE EXCEPTION 'sync_push definition was not extended';
  END IF;

  EXECUTE v_definition;
END;
$migration$;

COMMIT;
