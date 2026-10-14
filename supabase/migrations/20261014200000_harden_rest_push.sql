BEGIN;

CREATE OR REPLACE FUNCTION private.is_allowed_push_endpoint(p_endpoint text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  WITH parsed AS (
    SELECT pg_catalog.regexp_match(
      p_endpoint,
      '^https://([^/:@?#]+)(:([0-9]+))?([/?#].*)?$'
    ) AS parts
  )
  SELECT CASE
    WHEN pg_catalog.strpos(p_endpoint, pg_catalog.chr(92)) > 0 THEN FALSE
    WHEN p_endpoint ~ '[[:cntrl:]]' THEN FALSE
    WHEN parts IS NULL THEN FALSE
    WHEN parts[3] IS NOT NULL AND parts[3] <> '443' THEN FALSE
    ELSE
      pg_catalog.lower(parts[1]) IN (
        'fcm.googleapis.com',
        'android.googleapis.com'
      )
      OR pg_catalog.lower(parts[1]) ~
        '^[a-z0-9-]+(\.[a-z0-9-]+)*\.push\.apple\.com$'
      OR pg_catalog.lower(parts[1]) ~
        '^[a-z0-9-]+(\.[a-z0-9-]+)*\.push\.services\.mozilla\.com$'
      OR pg_catalog.lower(parts[1]) ~
        '^[a-z0-9-]+(\.[a-z0-9-]+)*\.notify\.windows\.com$'
  END
  FROM parsed;
$$;

REVOKE ALL ON FUNCTION private.is_allowed_push_endpoint(text)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.upsert_push_subscription(
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

  IF NOT private.is_allowed_push_endpoint(p_endpoint) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'push_endpoint_not_allowed';
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
      AND schedule.status IN ('pending', 'sending');
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

ALTER TABLE public.push_subscriptions
  ADD CONSTRAINT push_subscriptions_endpoint_allowed
  CHECK (private.is_allowed_push_endpoint(endpoint))
  NOT VALID;

DELETE FROM public.push_subscriptions AS subscription
WHERE NOT private.is_allowed_push_endpoint(subscription.endpoint);

ALTER TABLE public.push_subscriptions
  VALIDATE CONSTRAINT push_subscriptions_endpoint_allowed;

CREATE OR REPLACE FUNCTION public.schedule_rest_push(
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
    AND schedule.status IN ('pending', 'sending');

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

CREATE OR REPLACE FUNCTION public.cancel_rest_push(p_endpoint text)
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
    AND schedule.status IN ('pending', 'sending');
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_rest_push(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_rest_push(text)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.complete_rest_push(
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

COMMIT;
