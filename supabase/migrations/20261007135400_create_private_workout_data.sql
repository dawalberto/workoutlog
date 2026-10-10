CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE private.sync_revision (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  revision bigint NOT NULL CHECK (revision >= 0)
);

INSERT INTO private.sync_revision (singleton, revision)
VALUES (true, 0);

REVOKE ALL ON TABLE private.sync_revision FROM PUBLIC, anon, authenticated;

CREATE FUNCTION private.next_sync_revision()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, private
AS $$
DECLARE
  next_revision bigint;
BEGIN
  UPDATE private.sync_revision
  SET revision = revision + 1
  WHERE singleton
  RETURNING revision INTO next_revision;

  RETURN next_revision;
END;
$$;

REVOKE ALL ON FUNCTION private.next_sync_revision() FROM PUBLIC, anon, authenticated;

CREATE FUNCTION private.set_workout_sync_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, private
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.created_at := OLD.created_at;
  ELSE
    NEW.created_at := COALESCE(NEW.created_at, transaction_timestamp());
  END IF;

  NEW.server_revision := private.next_sync_revision();
  NEW.server_updated_at := clock_timestamp();

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.set_workout_sync_metadata() FROM PUBLIC, anon, authenticated;

CREATE TABLE public.exercise_definitions (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id text NOT NULL,
  name text NOT NULL,
  category text,
  image_url text,
  video_url text,
  notes text,
  default_sets jsonb CHECK (
    default_sets IS NULL OR jsonb_typeof(default_sets) IN ('number', 'string')
  ),
  default_reps jsonb CHECK (
    default_reps IS NULL OR jsonb_typeof(default_reps) IN ('number', 'string')
  ),
  default_weight jsonb CHECK (
    default_weight IS NULL OR jsonb_typeof(default_weight) IN ('number', 'string')
  ),
  default_rest_seconds jsonb CHECK (
    default_rest_seconds IS NULL OR jsonb_typeof(default_rest_seconds) IN ('number', 'string')
  ),
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  server_revision bigint NOT NULL DEFAULT 0 CHECK (server_revision >= 0),
  server_updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  deleted_at timestamptz,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE public.routines (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id text NOT NULL,
  name text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  server_revision bigint NOT NULL DEFAULT 0 CHECK (server_revision >= 0),
  server_updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  deleted_at timestamptz,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE public.routine_exercises (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id text NOT NULL,
  routine_id text NOT NULL,
  definition_id text,
  name text NOT NULL,
  category text,
  notes text,
  image_url text,
  video_url text,
  position integer NOT NULL CHECK (position >= 0),
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  server_revision bigint NOT NULL DEFAULT 0 CHECK (server_revision >= 0),
  server_updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  deleted_at timestamptz,
  PRIMARY KEY (user_id, id),
  UNIQUE (user_id, routine_id, id),
  FOREIGN KEY (user_id, routine_id)
    REFERENCES public.routines(user_id, id),
  FOREIGN KEY (user_id, definition_id)
    REFERENCES public.exercise_definitions(user_id, id)
    ON DELETE SET NULL (definition_id)
);

CREATE TABLE public.workout_sets (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id text NOT NULL,
  routine_id text NOT NULL,
  routine_exercise_id text NOT NULL,
  position integer NOT NULL CHECK (position >= 0),
  reps jsonb NOT NULL CHECK (jsonb_typeof(reps) IN ('number', 'string')),
  weight jsonb NOT NULL CHECK (jsonb_typeof(weight) IN ('number', 'string')),
  rest_seconds jsonb CHECK (
    rest_seconds IS NULL OR jsonb_typeof(rest_seconds) IN ('number', 'string')
  ),
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  server_revision bigint NOT NULL DEFAULT 0 CHECK (server_revision >= 0),
  server_updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  deleted_at timestamptz,
  PRIMARY KEY (user_id, id),
  UNIQUE (user_id, routine_id, id),
  FOREIGN KEY (user_id, routine_id, routine_exercise_id)
    REFERENCES public.routine_exercises(user_id, routine_id, id)
);

CREATE TABLE public.active_workout_sessions (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  routine_id text NOT NULL,
  started_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  server_revision bigint NOT NULL DEFAULT 0 CHECK (server_revision >= 0),
  server_updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  deleted_at timestamptz,
  PRIMARY KEY (user_id, routine_id),
  FOREIGN KEY (user_id, routine_id)
    REFERENCES public.routines(user_id, id)
);

CREATE TABLE public.active_session_completed_sets (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  routine_id text NOT NULL,
  set_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  server_revision bigint NOT NULL DEFAULT 0 CHECK (server_revision >= 0),
  server_updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  deleted_at timestamptz,
  PRIMARY KEY (user_id, routine_id, set_id),
  FOREIGN KEY (user_id, routine_id)
    REFERENCES public.active_workout_sessions(user_id, routine_id),
  FOREIGN KEY (user_id, routine_id, set_id)
    REFERENCES public.workout_sets(user_id, routine_id, id)
);

CREATE TABLE public.rm_logs (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id text NOT NULL,
  definition_id text,
  exercise_name text NOT NULL,
  category text,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  server_revision bigint NOT NULL DEFAULT 0 CHECK (server_revision >= 0),
  server_updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  deleted_at timestamptz,
  PRIMARY KEY (user_id, id),
  FOREIGN KEY (user_id, definition_id)
    REFERENCES public.exercise_definitions(user_id, id)
    ON DELETE SET NULL (definition_id)
);

CREATE TABLE public.rm_records (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id text NOT NULL,
  log_id text NOT NULL,
  weight jsonb NOT NULL CHECK (jsonb_typeof(weight) IN ('number', 'string')),
  recorded_on date NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  server_revision bigint NOT NULL DEFAULT 0 CHECK (server_revision >= 0),
  server_updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  deleted_at timestamptz,
  PRIMARY KEY (user_id, id),
  FOREIGN KEY (user_id, log_id)
    REFERENCES public.rm_logs(user_id, id)
);

CREATE TABLE public.workout_history (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id text NOT NULL,
  routine_id text,
  routine_name text NOT NULL,
  started_at timestamptz,
  completed_at timestamptz NOT NULL,
  duration_seconds integer CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  exercises_completed integer NOT NULL DEFAULT 0 CHECK (exercises_completed >= 0),
  sets_completed integer NOT NULL DEFAULT 0 CHECK (sets_completed >= 0),
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  server_revision bigint NOT NULL DEFAULT 0 CHECK (server_revision >= 0),
  server_updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  deleted_at timestamptz,
  PRIMARY KEY (user_id, id),
  FOREIGN KEY (user_id, routine_id)
    REFERENCES public.routines(user_id, id)
    ON DELETE SET NULL (routine_id)
);

CREATE TABLE public.workout_history_exercises (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  history_id text NOT NULL,
  position integer NOT NULL CHECK (position >= 0),
  exercise_name text NOT NULL,
  exercises_completed integer NOT NULL DEFAULT 0 CHECK (exercises_completed >= 0),
  sets_completed integer NOT NULL DEFAULT 0 CHECK (sets_completed >= 0),
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  server_revision bigint NOT NULL DEFAULT 0 CHECK (server_revision >= 0),
  server_updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  deleted_at timestamptz,
  PRIMARY KEY (user_id, history_id, position),
  FOREIGN KEY (user_id, history_id)
    REFERENCES public.workout_history(user_id, id)
);

CREATE TABLE public.exercise_diaries (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id text NOT NULL,
  definition_id text,
  exercise_name text NOT NULL,
  category text,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  server_revision bigint NOT NULL DEFAULT 0 CHECK (server_revision >= 0),
  server_updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  deleted_at timestamptz,
  PRIMARY KEY (user_id, id),
  FOREIGN KEY (user_id, definition_id)
    REFERENCES public.exercise_definitions(user_id, id)
    ON DELETE SET NULL (definition_id)
);

CREATE TABLE public.exercise_diary_entries (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id text NOT NULL,
  diary_id text NOT NULL,
  recorded_on date NOT NULL,
  note text NOT NULL,
  feeling text,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  server_revision bigint NOT NULL DEFAULT 0 CHECK (server_revision >= 0),
  server_updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  deleted_at timestamptz,
  PRIMARY KEY (user_id, id),
  FOREIGN KEY (user_id, diary_id)
    REFERENCES public.exercise_diaries(user_id, id)
);

CREATE TABLE public.user_entitlements (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tier text NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium')),
  valid_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp()
);

CREATE INDEX exercise_definitions_owner_revision_idx
  ON public.exercise_definitions (user_id, server_revision);
CREATE INDEX routines_owner_revision_idx
  ON public.routines (user_id, server_revision);
CREATE INDEX routine_exercises_owner_revision_idx
  ON public.routine_exercises (user_id, server_revision);
CREATE INDEX routine_exercises_parent_idx
  ON public.routine_exercises (user_id, routine_id);
CREATE INDEX routine_exercises_definition_idx
  ON public.routine_exercises (user_id, definition_id)
  WHERE definition_id IS NOT NULL;
CREATE INDEX workout_sets_owner_revision_idx
  ON public.workout_sets (user_id, server_revision);
CREATE INDEX workout_sets_parent_idx
  ON public.workout_sets (user_id, routine_id, routine_exercise_id);
CREATE INDEX active_workout_sessions_owner_revision_idx
  ON public.active_workout_sessions (user_id, server_revision);
CREATE INDEX active_session_completed_sets_owner_revision_idx
  ON public.active_session_completed_sets (user_id, server_revision);
CREATE INDEX rm_logs_owner_revision_idx
  ON public.rm_logs (user_id, server_revision);
CREATE INDEX rm_logs_definition_idx
  ON public.rm_logs (user_id, definition_id)
  WHERE definition_id IS NOT NULL;
CREATE INDEX rm_records_owner_revision_idx
  ON public.rm_records (user_id, server_revision);
CREATE INDEX rm_records_log_idx
  ON public.rm_records (user_id, log_id);
CREATE INDEX workout_history_owner_revision_idx
  ON public.workout_history (user_id, server_revision);
CREATE INDEX workout_history_routine_idx
  ON public.workout_history (user_id, routine_id)
  WHERE routine_id IS NOT NULL;
CREATE INDEX workout_history_exercises_owner_revision_idx
  ON public.workout_history_exercises (user_id, server_revision);
CREATE INDEX exercise_diaries_owner_revision_idx
  ON public.exercise_diaries (user_id, server_revision);
CREATE INDEX exercise_diaries_definition_idx
  ON public.exercise_diaries (user_id, definition_id)
  WHERE definition_id IS NOT NULL;
CREATE INDEX exercise_diary_entries_owner_revision_idx
  ON public.exercise_diary_entries (user_id, server_revision);
CREATE INDEX exercise_diary_entries_parent_idx
  ON public.exercise_diary_entries (user_id, diary_id);

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
      'CREATE TRIGGER set_workout_sync_metadata
       BEFORE INSERT OR UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION private.set_workout_sync_metadata()',
      table_name
    );

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', table_name);
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE ON TABLE public.%I TO authenticated',
      table_name
    );

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated
       USING (user_id = (select auth.uid()))',
      table_name || '_owner_select',
      table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated
       WITH CHECK (user_id = (select auth.uid()))',
      table_name || '_owner_insert',
      table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated
       USING (user_id = (select auth.uid()))
       WITH CHECK (user_id = (select auth.uid()))',
      table_name || '_owner_update',
      table_name
    );
  END LOOP;
END;
$$;

ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.user_entitlements FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.user_entitlements TO authenticated;

CREATE POLICY user_entitlements_owner_select
  ON public.user_entitlements
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));
