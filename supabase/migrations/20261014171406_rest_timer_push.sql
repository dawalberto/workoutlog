BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;
GRANT USAGE ON SCHEMA net TO postgres;
GRANT EXECUTE ON FUNCTION net.http_post(text, jsonb, jsonb, jsonb, integer)
  TO postgres;

CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT push_subscriptions_endpoint_https
    CHECK (pg_catalog.length(endpoint) <= 2048 AND endpoint LIKE 'https://%'),
  CONSTRAINT push_subscriptions_p256dh_length
    CHECK (pg_catalog.length(p256dh) BETWEEN 1 AND 128),
  CONSTRAINT push_subscriptions_auth_length
    CHECK (pg_catalog.length(auth) BETWEEN 1 AND 64),
  CONSTRAINT push_subscriptions_user_agent_length
    CHECK (user_agent IS NULL OR pg_catalog.length(user_agent) <= 512)
);

CREATE INDEX push_subscriptions_user_id_idx
  ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY push_subscriptions_owner_select
  ON public.push_subscriptions
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON TABLE public.push_subscriptions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.push_subscriptions TO authenticated;

CREATE TABLE public.rest_push_schedules (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL
    REFERENCES public.push_subscriptions(id) ON DELETE CASCADE,
  fire_at timestamptz NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts smallint NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rest_push_schedules_title_length
    CHECK (pg_catalog.length(title) BETWEEN 1 AND 120),
  CONSTRAINT rest_push_schedules_body_length
    CHECK (pg_catalog.length(body) <= 240),
  CONSTRAINT rest_push_schedules_status
    CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'cancelled')),
  CONSTRAINT rest_push_schedules_attempts_nonnegative
    CHECK (attempts >= 0),
  CONSTRAINT rest_push_schedules_last_error_length
    CHECK (last_error IS NULL OR pg_catalog.length(last_error) <= 500)
);

CREATE UNIQUE INDEX rest_push_schedules_one_pending_per_subscription_idx
  ON public.rest_push_schedules (subscription_id)
  WHERE status = 'pending';

CREATE INDEX rest_push_schedules_pending_fire_at_idx
  ON public.rest_push_schedules (fire_at)
  WHERE status = 'pending';

ALTER TABLE public.rest_push_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY rest_push_schedules_owner_select
  ON public.rest_push_schedules
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON TABLE public.rest_push_schedules FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.rest_push_schedules TO authenticated;

CREATE FUNCTION public.upsert_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_previous_user_id uuid;
  v_subscription_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '28000',
      MESSAGE = 'push_authentication_required';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('push-user:' || v_user_id::text, 0)
  );
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('push-endpoint:' || p_endpoint, 0)
  );

  SELECT subscription.user_id, subscription.id
    INTO v_previous_user_id, v_subscription_id
  FROM public.push_subscriptions AS subscription
  WHERE subscription.endpoint = p_endpoint
  FOR UPDATE;

  IF FOUND AND v_previous_user_id IS DISTINCT FROM v_user_id THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        'push-subscription:' || v_subscription_id::text,
        0
      )
    );
    UPDATE public.rest_push_schedules AS schedule
    SET status = 'cancelled',
        updated_at = pg_catalog.now()
    WHERE schedule.subscription_id = v_subscription_id
      AND schedule.user_id = v_previous_user_id
      AND schedule.status = 'pending';
  END IF;

  INSERT INTO public.push_subscriptions (
    user_id,
    endpoint,
    p256dh,
    auth,
    user_agent
  )
  VALUES (
    v_user_id,
    p_endpoint,
    p_p256dh,
    p_auth,
    p_user_agent
  )
  ON CONFLICT (endpoint) DO UPDATE
    SET user_id = EXCLUDED.user_id,
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        user_agent = EXCLUDED.user_agent,
        updated_at = pg_catalog.now()
  RETURNING id INTO v_subscription_id;

  DELETE FROM public.push_subscriptions AS subscription
  WHERE subscription.id IN (
    SELECT older.id
    FROM public.push_subscriptions AS older
    WHERE older.user_id = v_user_id
    ORDER BY older.updated_at, older.created_at, older.id
    OFFSET 10
  );

  RETURN v_subscription_id;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_push_subscription(text, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_push_subscription(text, text, text, text)
  TO authenticated;

CREATE FUNCTION public.delete_push_subscription(p_endpoint text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '28000',
      MESSAGE = 'push_authentication_required';
  END IF;

  DELETE FROM public.push_subscriptions AS subscription
  WHERE subscription.endpoint = p_endpoint
    AND subscription.user_id = v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_push_subscription(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_push_subscription(text)
  TO authenticated;

CREATE FUNCTION public.schedule_rest_push(
  p_endpoint text,
  p_delay_ms integer,
  p_title text,
  p_body text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_subscription_id uuid;
  v_schedule_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '28000',
      MESSAGE = 'push_authentication_required';
  END IF;

  IF p_delay_ms IS NULL OR p_delay_ms NOT BETWEEN 1000 AND 7200000 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'rest_push_delay_invalid';
  END IF;

  SELECT subscription.id
    INTO v_subscription_id
  FROM public.push_subscriptions AS subscription
  WHERE subscription.endpoint = p_endpoint
    AND subscription.user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'push_subscription_not_found';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'push-subscription:' || v_subscription_id::text,
      0
    )
  );

  UPDATE public.rest_push_schedules AS schedule
  SET status = 'cancelled',
      updated_at = pg_catalog.now()
  WHERE schedule.subscription_id = v_subscription_id
    AND schedule.user_id = v_user_id
    AND schedule.status = 'pending';

  INSERT INTO public.rest_push_schedules (
    user_id,
    subscription_id,
    fire_at,
    title,
    body
  )
  VALUES (
    v_user_id,
    v_subscription_id,
    pg_catalog.now() + pg_catalog.make_interval(secs => p_delay_ms / 1000.0),
    p_title,
    p_body
  )
  RETURNING id INTO v_schedule_id;

  RETURN v_schedule_id;
END;
$$;

REVOKE ALL ON FUNCTION public.schedule_rest_push(text, integer, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.schedule_rest_push(text, integer, text, text)
  TO authenticated;

CREATE FUNCTION public.cancel_rest_push(p_endpoint text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_subscription_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '28000',
      MESSAGE = 'push_authentication_required';
  END IF;

  SELECT subscription.id
    INTO v_subscription_id
  FROM public.push_subscriptions AS subscription
  WHERE subscription.endpoint = p_endpoint
    AND subscription.user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'push-subscription:' || v_subscription_id::text,
      0
    )
  );

  UPDATE public.rest_push_schedules AS schedule
  SET status = 'cancelled',
      updated_at = pg_catalog.now()
  WHERE schedule.subscription_id = v_subscription_id
    AND schedule.user_id = v_user_id
    AND schedule.status = 'pending';
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_rest_push(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_rest_push(text)
  TO authenticated;

CREATE FUNCTION public.claim_due_rest_pushes(p_limit integer DEFAULT 100)
RETURNS TABLE (
  schedule_id uuid,
  endpoint text,
  p256dh text,
  auth text,
  title text,
  body text,
  fire_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 1000 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'rest_push_claim_limit_invalid';
  END IF;

  UPDATE public.rest_push_schedules AS schedule
  SET status = 'failed',
      last_error = 'stale',
      updated_at = pg_catalog.now()
  WHERE schedule.status = 'sending'
    AND schedule.updated_at < pg_catalog.now() - INTERVAL '60 seconds';

  RETURN QUERY
  WITH due AS (
    SELECT schedule.id
    FROM public.rest_push_schedules AS schedule
    WHERE schedule.status = 'pending'
      AND schedule.fire_at <= pg_catalog.now() + INTERVAL '500 milliseconds'
    ORDER BY schedule.fire_at, schedule.id
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  ),
  claimed AS (
    UPDATE public.rest_push_schedules AS schedule
    SET status = 'sending',
        attempts = schedule.attempts + 1,
        updated_at = pg_catalog.now()
    FROM due
    WHERE schedule.id = due.id
    RETURNING
      schedule.id,
      schedule.subscription_id,
      schedule.title,
      schedule.body,
      schedule.fire_at
  )
  SELECT
    claimed.id,
    subscription.endpoint,
    subscription.p256dh,
    subscription.auth,
    claimed.title,
    claimed.body,
    claimed.fire_at
  FROM claimed
  JOIN public.push_subscriptions AS subscription
    ON subscription.id = claimed.subscription_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_due_rest_pushes(integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_due_rest_pushes(integer)
  TO service_role;

CREATE FUNCTION public.complete_rest_push(
  p_schedule_id uuid,
  p_status text,
  p_error text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_status NOT IN ('sent', 'failed') THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'rest_push_completion_status_invalid';
  END IF;

  UPDATE public.rest_push_schedules AS schedule
  SET status = p_status,
      last_error = CASE
        WHEN p_status = 'failed' THEN pg_catalog.left(p_error, 500)
        ELSE NULL
      END,
      updated_at = pg_catalog.now()
  WHERE schedule.id = p_schedule_id
    AND schedule.status = 'sending';
END;
$$;

REVOKE ALL ON FUNCTION public.complete_rest_push(uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_rest_push(uuid, text, text)
  TO service_role;

CREATE FUNCTION public.remove_push_subscription_by_endpoint(p_endpoint text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.push_subscriptions AS subscription
  WHERE subscription.endpoint = p_endpoint;
END;
$$;

REVOKE ALL ON FUNCTION public.remove_push_subscription_by_endpoint(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.remove_push_subscription_by_endpoint(text)
  TO service_role;

CREATE FUNCTION private.dispatch_due_rest_pushes()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_function_url text;
  v_dispatch_secret text;
  v_request_id bigint;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.rest_push_schedules AS schedule
    WHERE schedule.status = 'pending'
      AND schedule.fire_at <= pg_catalog.now() + INTERVAL '500 milliseconds'
  ) THEN
    RETURN NULL;
  END IF;

  SELECT secret.decrypted_secret
    INTO v_function_url
  FROM vault.decrypted_secrets AS secret
  WHERE secret.name = 'rest_push_function_url';

  SELECT secret.decrypted_secret
    INTO v_dispatch_secret
  FROM vault.decrypted_secrets AS secret
  WHERE secret.name = 'rest_push_dispatch_secret';

  v_function_url := NULLIF(pg_catalog.btrim(v_function_url), '');
  v_dispatch_secret := NULLIF(
    pg_catalog.btrim(v_dispatch_secret),
    ''
  );

  IF v_function_url IS NULL OR v_dispatch_secret IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT net.http_post(
    url := v_function_url,
    headers := pg_catalog.jsonb_build_object(
      'Content-Type',
      'application/json',
      'x-dispatch-secret',
      v_dispatch_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 5000
  )
  INTO v_request_id;

  RETURN v_request_id;
END;
$$;

REVOKE ALL ON FUNCTION private.dispatch_due_rest_pushes()
  FROM PUBLIC, anon, authenticated;

CREATE FUNCTION private.cleanup_rest_push()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.rest_push_schedules AS schedule
  WHERE schedule.status IN ('sent', 'failed', 'cancelled')
    AND schedule.updated_at < pg_catalog.now() - INTERVAL '1 day';

  BEGIN
    DELETE FROM cron.job_run_details AS run
    WHERE run.end_time < pg_catalog.now() - INTERVAL '1 day';
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL;
  END;
END;
$$;

REVOKE ALL ON FUNCTION private.cleanup_rest_push()
  FROM PUBLIC, anon, authenticated;

SELECT cron.schedule(
  'dispatch-rest-pushes',
  '2 seconds',
  $$SELECT private.dispatch_due_rest_pushes()$$
);

SELECT cron.schedule(
  'cleanup-rest-pushes',
  '17 3 * * *',
  $$SELECT private.cleanup_rest_push()$$
);

COMMIT;