ALTER TABLE public.workout_history
  ADD COLUMN total_sets_count integer
    CONSTRAINT workout_history_total_sets_count_nonnegative
      CHECK (total_sets_count IS NULL OR total_sets_count >= 0),
  ADD COLUMN completion_percentage numeric
    CONSTRAINT workout_history_completion_percentage_range
      CHECK (
        completion_percentage IS NULL
        OR completion_percentage BETWEEN 0 AND 100
      );

ALTER TABLE public.workout_history_exercises
  ADD COLUMN sets_total integer
    CONSTRAINT workout_history_exercises_sets_total_nonnegative
      CHECK (sets_total IS NULL OR sets_total >= 0);

COMMENT ON COLUMN public.workout_history.total_sets_count IS
  'Nullable for legacy sync clients whose source did not persist total sets.';
COMMENT ON COLUMN public.workout_history.completion_percentage IS
  'Nullable for legacy sync clients whose source did not persist completion percentage.';
COMMENT ON COLUMN public.workout_history_exercises.sets_total IS
  'Nullable for legacy sync clients whose source did not persist exercise total sets.';

DO $migration$
DECLARE
  function_definition text;
  history_fields text :=
    $find$'duration_seconds', 'exercises_completed', 'sets_completed',$find$;
  exercise_fields text :=
    $find$'sets_completed', 'created_at', 'updated_at'$find$;
  insert_statement text :=
    $find$      v_sql := format(
        'INSERT INTO public.%1$I AS stored$find$;
BEGIN
  function_definition := pg_get_functiondef(
    'public.sync_push(uuid, jsonb)'::regprocedure
  );

  IF length(function_definition)
      - length(replace(function_definition, history_fields, ''))
      <> length(history_fields)
    OR length(function_definition)
      - length(replace(function_definition, exercise_fields, ''))
      <> length(exercise_fields)
    OR position(insert_statement IN function_definition) = 0 THEN
    RAISE EXCEPTION
      'sync_push definition differs from the expected workout-history contract';
  END IF;

  function_definition := replace(
    function_definition,
    history_fields,
    $replace$'duration_seconds', 'exercises_completed', 'sets_completed',
          'total_sets_count', 'completion_percentage',$replace$
  );
  function_definition := replace(
    function_definition,
    exercise_fields,
    $replace$'sets_completed', 'sets_total', 'created_at', 'updated_at'$replace$
  );
  function_definition := replace(
    function_definition,
    insert_statement,
    $replace$      IF v_table = 'workout_history' AND v_existing_row IS NOT NULL THEN
        IF NOT (v_record ? 'total_sets_count') THEN
          v_write_record := v_write_record || jsonb_build_object(
            'total_sets_count',
            v_existing_row->'total_sets_count'
          );
        END IF;
        IF NOT (v_record ? 'completion_percentage') THEN
          v_write_record := v_write_record || jsonb_build_object(
            'completion_percentage',
            v_existing_row->'completion_percentage'
          );
        END IF;
      ELSIF v_table = 'workout_history_exercises'
        AND v_existing_row IS NOT NULL
        AND NOT (v_record ? 'sets_total') THEN
        v_write_record := v_write_record || jsonb_build_object(
          'sets_total',
          v_existing_row->'sets_total'
        );
      END IF;

      v_sql := format(
        'INSERT INTO public.%1$I AS stored$replace$
  );

  EXECUTE function_definition;
END;
$migration$;
