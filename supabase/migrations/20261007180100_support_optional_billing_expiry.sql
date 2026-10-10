-- Keep lifetime expiry optional while subscription periods remain required.
CREATE OR REPLACE FUNCTION public.apply_provider_entitlement_event(
  p_event_id text,
  p_event_type text,
  p_event_created_at timestamptz,
  p_customer_id text,
  p_user_id uuid,
  p_source_type text,
  p_source_id text,
  p_tier text,
  p_active boolean,
  p_valid_until timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, private
AS $$
DECLARE
  v_mapped_user_id uuid;
  v_fingerprint bytea;
  v_existing_fingerprint bytea;
  v_existing_user_id uuid;
  v_existing_customer_id text;
  v_updated_user_id uuid;
  v_inserted integer;
  v_now timestamptz := clock_timestamp();
  v_premium boolean;
  v_valid_until timestamptz;
  v_tier text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'billing_service_role_required';
  END IF;

  IF p_event_id IS NULL
     OR p_event_id !~ '^evt_[A-Za-z0-9]+$'
     OR p_event_type IS NULL
     OR p_event_created_at IS NULL
     OR NOT isfinite(p_event_created_at)
     OR p_event_created_at < timestamptz '2000-01-01 00:00:00+00'
     OR p_event_created_at > v_now + interval '5 minutes'
     OR p_customer_id IS NULL
     OR p_customer_id !~ '^cus_[A-Za-z0-9]+$'
     OR p_user_id IS NULL
     OR p_source_id IS NULL
     OR p_tier IS DISTINCT FROM 'premium'
     OR p_active IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'billing_event_input_invalid';
  END IF;

  IF p_source_type = 'subscription' THEN
    IF p_event_type NOT IN (
         'customer.subscription.created',
         'customer.subscription.updated',
         'customer.subscription.deleted'
       )
       OR p_source_id !~ '^sub_[A-Za-z0-9]+$'
       OR p_valid_until IS NULL
       OR NOT isfinite(p_valid_until)
       OR (p_event_type = 'customer.subscription.deleted' AND p_active) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'billing_subscription_input_invalid';
    END IF;
  ELSIF p_source_type = 'lifetime' THEN
    IF p_event_type <> 'checkout.session.completed'
       OR p_source_id !~ '^cs_test_[A-Za-z0-9]+$'
       OR NOT p_active
       OR p_valid_until IS NOT NULL THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'billing_lifetime_input_invalid';
    END IF;
  ELSE
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'billing_source_type_invalid';
  END IF;

  SELECT user_id
    INTO v_mapped_user_id
  FROM private.billing_customers
  WHERE stripe_customer_id = p_customer_id;

  IF v_mapped_user_id IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'billing_customer_owner_mismatch';
  END IF;

  PERFORM 1
  FROM auth.users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'billing_user_not_found';
  END IF;

  v_fingerprint := extensions.digest(
    convert_to(
      jsonb_build_object(
        'eventType', p_event_type,
        'eventCreatedAt', p_event_created_at,
        'customerId', p_customer_id,
        'userId', p_user_id,
        'sourceType', p_source_type,
        'sourceId', p_source_id,
        'tier', p_tier,
        'active', p_active,
        'validUntil', p_valid_until
      )::text,
      'UTF8'
    ),
    'sha256'
  );

  INSERT INTO private.stripe_webhook_events (
    event_id,
    event_type,
    event_created_at,
    payload_fingerprint
  )
  VALUES (p_event_id, p_event_type, p_event_created_at, v_fingerprint)
  ON CONFLICT (event_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted = 0 THEN
    SELECT payload_fingerprint
      INTO v_existing_fingerprint
    FROM private.stripe_webhook_events
    WHERE event_id = p_event_id;

    IF v_existing_fingerprint IS DISTINCT FROM v_fingerprint THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'billing_event_id_conflict';
    END IF;

    RETURN jsonb_build_object(
      'result', 'duplicate',
      'applied', false,
      'duplicate', true,
      'stale', false
    );
  END IF;

  SELECT user_id, customer_id
    INTO v_existing_user_id, v_existing_customer_id
  FROM private.entitlement_sources
  WHERE provider = 'stripe'
    AND source_type = p_source_type
    AND source_id = p_source_id;

  IF FOUND
     AND (
       v_existing_user_id IS DISTINCT FROM p_user_id
       OR v_existing_customer_id IS DISTINCT FROM p_customer_id
     ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'billing_source_owner_mismatch';
  END IF;

  INSERT INTO private.entitlement_sources (
    provider,
    source_type,
    source_id,
    user_id,
    customer_id,
    tier,
    active,
    valid_until,
    last_event_created_at,
    last_event_id,
    updated_at
  )
  VALUES (
    'stripe',
    p_source_type,
    p_source_id,
    p_user_id,
    p_customer_id,
    p_tier,
    p_active,
    p_valid_until,
    p_event_created_at,
    p_event_id,
    v_now
  )
  ON CONFLICT (provider, source_type, source_id) DO UPDATE
    SET active = EXCLUDED.active,
        valid_until = EXCLUDED.valid_until,
        last_event_created_at = EXCLUDED.last_event_created_at,
        last_event_id = EXCLUDED.last_event_id,
        updated_at = EXCLUDED.updated_at
    WHERE entitlement_sources.user_id = EXCLUDED.user_id
      AND entitlement_sources.customer_id = EXCLUDED.customer_id
      AND entitlement_sources.last_event_created_at
        < EXCLUDED.last_event_created_at
  RETURNING user_id INTO v_updated_user_id;

  IF v_updated_user_id IS NULL THEN
    SELECT user_id, customer_id
      INTO v_existing_user_id, v_existing_customer_id
    FROM private.entitlement_sources
    WHERE provider = 'stripe'
      AND source_type = p_source_type
      AND source_id = p_source_id;

    IF v_existing_user_id IS DISTINCT FROM p_user_id
       OR v_existing_customer_id IS DISTINCT FROM p_customer_id THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'billing_source_owner_mismatch';
    END IF;

    RETURN jsonb_build_object(
      'result', 'stale',
      'applied', false,
      'duplicate', false,
      'stale', true
    );
  END IF;

  SELECT
    COALESCE(
      bool_or(active AND (valid_until IS NULL OR valid_until > v_now)),
      false
    ),
    CASE
      WHEN bool_or(active AND valid_until IS NULL) THEN NULL
      ELSE max(valid_until) FILTER (
        WHERE active AND valid_until > v_now
      )
    END
    INTO v_premium, v_valid_until
  FROM private.entitlement_sources
  WHERE user_id = p_user_id;

  v_tier := CASE WHEN v_premium THEN 'premium' ELSE 'free' END;

  INSERT INTO public.user_entitlements (user_id, tier, valid_until, updated_at)
  VALUES (p_user_id, v_tier, v_valid_until, v_now)
  ON CONFLICT (user_id) DO UPDATE
    SET tier = EXCLUDED.tier,
        valid_until = EXCLUDED.valid_until,
        updated_at = EXCLUDED.updated_at;

  RETURN jsonb_build_object(
    'result', 'applied',
    'applied', true,
    'duplicate', false,
    'stale', false,
    'tier', v_tier,
    'validUntil', v_valid_until
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_provider_entitlement_event(
  text,
  text,
  timestamptz,
  text,
  uuid,
  text,
  text,
  text,
  boolean,
  timestamptz
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.apply_provider_entitlement_event(
  text,
  text,
  timestamptz,
  text,
  uuid,
  text,
  text,
  text,
  boolean,
  timestamptz
) TO service_role;
