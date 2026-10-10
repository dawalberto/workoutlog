CREATE TABLE private.stripe_lifetime_payments (
  payment_intent_id text PRIMARY KEY CHECK (
    payment_intent_id ~ '^pi_[A-Za-z0-9]+$'
  ),
  provider text NOT NULL DEFAULT 'stripe' CHECK (provider = 'stripe'),
  source_type text NOT NULL DEFAULT 'lifetime' CHECK (source_type = 'lifetime'),
  source_id text NOT NULL CHECK (source_id ~ '^cs_test_[A-Za-z0-9]+$'),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id text NOT NULL CHECK (customer_id ~ '^cus_[A-Za-z0-9]+$'),
  amount_total bigint NOT NULL CHECK (amount_total > 0),
  currency text NOT NULL CHECK (currency ~ '^[a-z]{3}$'),
  amount_refunded bigint NOT NULL DEFAULT 0 CHECK (
    amount_refunded >= 0 AND amount_refunded <= amount_total
  ),
  last_refund_event_created_at timestamptz,
  last_refund_event_id text CHECK (
    last_refund_event_id IS NULL OR last_refund_event_id ~ '^evt_[A-Za-z0-9]+$'
  ),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (provider, source_type, source_id),
  FOREIGN KEY (provider, source_type, source_id)
    REFERENCES private.entitlement_sources (provider, source_type, source_id)
    ON DELETE CASCADE,
  CHECK (
    (last_refund_event_created_at IS NULL AND last_refund_event_id IS NULL)
    OR (last_refund_event_created_at IS NOT NULL AND last_refund_event_id IS NOT NULL)
  )
);

CREATE TABLE private.stripe_lifetime_payment_disputes (
  dispute_id text PRIMARY KEY CHECK (dispute_id ~ '^dp_[A-Za-z0-9]+$'),
  payment_intent_id text NOT NULL
    REFERENCES private.stripe_lifetime_payments (payment_intent_id)
    ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'won', 'lost')),
  last_event_created_at timestamptz NOT NULL,
  last_event_id text NOT NULL CHECK (last_event_id ~ '^evt_[A-Za-z0-9]+$'),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

ALTER TABLE private.entitlement_sources
  DROP CONSTRAINT entitlement_sources_check;
ALTER TABLE private.entitlement_sources
  ADD CONSTRAINT entitlement_sources_expiry_by_source_type_check CHECK (
    (source_type = 'subscription' AND valid_until IS NOT NULL)
    OR (source_type = 'lifetime' AND valid_until IS NULL)
  );

REVOKE ALL ON TABLE private.stripe_lifetime_payments
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE private.stripe_lifetime_payment_disputes
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.link_lifetime_payment_intent(
  p_payment_intent_id text,
  p_user_id uuid,
  p_customer_id text,
  p_source_id text,
  p_amount_total bigint,
  p_currency text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, private
AS $$
DECLARE
  v_mapped_user_id uuid;
  v_existing private.stripe_lifetime_payments%ROWTYPE;
  v_source_active boolean;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'billing_service_role_required';
  END IF;

  IF p_payment_intent_id IS NULL
     OR p_payment_intent_id !~ '^pi_[A-Za-z0-9]+$'
     OR p_user_id IS NULL
     OR p_customer_id IS NULL
     OR p_customer_id !~ '^cus_[A-Za-z0-9]+$'
     OR p_source_id IS NULL
     OR p_source_id !~ '^cs_test_[A-Za-z0-9]+$'
     OR p_amount_total IS NULL
     OR p_amount_total <= 0
     OR p_currency IS NULL
     OR p_currency !~ '^[a-z]{3}$' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'billing_lifetime_payment_input_invalid';
  END IF;

  SELECT user_id
    INTO v_mapped_user_id
  FROM private.billing_customers
  WHERE stripe_customer_id = p_customer_id;

  IF v_mapped_user_id IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'billing_customer_owner_mismatch';
  END IF;

  SELECT *
    INTO v_existing
  FROM private.stripe_lifetime_payments
  WHERE payment_intent_id = p_payment_intent_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing.source_id IS DISTINCT FROM p_source_id
       OR v_existing.user_id IS DISTINCT FROM p_user_id
       OR v_existing.customer_id IS DISTINCT FROM p_customer_id
       OR v_existing.amount_total IS DISTINCT FROM p_amount_total
       OR v_existing.currency IS DISTINCT FROM p_currency THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'billing_lifetime_payment_conflict';
    END IF;

    PERFORM 1
    FROM private.entitlement_sources
    WHERE provider = 'stripe'
      AND source_type = 'lifetime'
      AND source_id = p_source_id
      AND user_id = p_user_id
      AND customer_id = p_customer_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'billing_lifetime_source_unmatched';
    END IF;

    RETURN true;
  END IF;

  SELECT active
    INTO v_source_active
  FROM private.entitlement_sources
  WHERE provider = 'stripe'
    AND source_type = 'lifetime'
    AND source_id = p_source_id
    AND user_id = p_user_id
    AND customer_id = p_customer_id
  FOR UPDATE;

  IF NOT FOUND OR NOT v_source_active THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'billing_lifetime_source_unmatched';
  END IF;

  SELECT *
    INTO v_existing
  FROM private.stripe_lifetime_payments
  WHERE payment_intent_id = p_payment_intent_id;

  IF FOUND THEN
    IF v_existing.source_id IS DISTINCT FROM p_source_id
       OR v_existing.user_id IS DISTINCT FROM p_user_id
       OR v_existing.customer_id IS DISTINCT FROM p_customer_id
       OR v_existing.amount_total IS DISTINCT FROM p_amount_total
       OR v_existing.currency IS DISTINCT FROM p_currency THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'billing_lifetime_payment_conflict';
    END IF;
    RETURN true;
  END IF;

  INSERT INTO private.stripe_lifetime_payments (
    payment_intent_id,
    source_id,
    user_id,
    customer_id,
    amount_total,
    currency
  )
  VALUES (
    p_payment_intent_id,
    p_source_id,
    p_user_id,
    p_customer_id,
    p_amount_total,
    p_currency
  );

  RETURN true;
END;
$$;

CREATE FUNCTION public.apply_lifetime_payment_event(
  p_event_id text,
  p_event_type text,
  p_event_created_at timestamptz,
  p_payment_intent_id text,
  p_amount bigint,
  p_amount_refunded bigint,
  p_currency text,
  p_dispute_id text,
  p_dispute_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, private
AS $$
DECLARE
  v_payment private.stripe_lifetime_payments%ROWTYPE;
  v_source private.entitlement_sources%ROWTYPE;
  v_dispute private.stripe_lifetime_payment_disputes%ROWTYPE;
  v_fingerprint bytea;
  v_existing_fingerprint bytea;
  v_mapped_user_id uuid;
  v_inserted integer;
  v_active boolean;
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
     OR p_payment_intent_id IS NULL
     OR p_payment_intent_id !~ '^pi_[A-Za-z0-9]+$' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'billing_lifetime_payment_event_invalid';
  END IF;

  IF p_event_type = 'charge.refunded' THEN
    IF p_amount IS NULL
       OR p_amount <= 0
       OR p_amount_refunded IS NULL
       OR p_amount_refunded <= 0
       OR p_amount_refunded > p_amount
       OR p_currency IS NULL
       OR p_currency !~ '^[a-z]{3}$'
       OR p_dispute_id IS NOT NULL
       OR p_dispute_status IS NOT NULL THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'billing_lifetime_refund_invalid';
    END IF;
  ELSIF p_event_type IN (
    'charge.dispute.created',
    'charge.dispute.updated',
    'charge.dispute.closed'
  ) THEN
    IF p_amount IS NOT NULL
       OR p_amount_refunded IS NOT NULL
       OR p_currency IS NOT NULL
       OR p_dispute_id IS NULL
       OR p_dispute_id !~ '^dp_[A-Za-z0-9]+$'
       OR p_dispute_status IS NULL
       OR p_dispute_status NOT IN ('pending', 'won', 'lost')
       OR (p_event_type = 'charge.dispute.closed' AND p_dispute_status = 'pending') THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'billing_lifetime_dispute_invalid';
    END IF;
  ELSE
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'billing_lifetime_payment_event_invalid';
  END IF;

  SELECT *
    INTO v_payment
  FROM private.stripe_lifetime_payments
  WHERE payment_intent_id = p_payment_intent_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'billing_lifetime_payment_unmatched';
  END IF;

  SELECT user_id
    INTO v_mapped_user_id
  FROM private.billing_customers
  WHERE stripe_customer_id = v_payment.customer_id;

  IF v_mapped_user_id IS DISTINCT FROM v_payment.user_id THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'billing_customer_owner_mismatch';
  END IF;

  PERFORM 1
  FROM auth.users
  WHERE id = v_payment.user_id
  FOR UPDATE;

  SELECT *
    INTO v_source
  FROM private.entitlement_sources
  WHERE provider = 'stripe'
    AND source_type = 'lifetime'
    AND source_id = v_payment.source_id
  FOR UPDATE;

  IF NOT FOUND
     OR v_source.user_id IS DISTINCT FROM v_payment.user_id
     OR v_source.customer_id IS DISTINCT FROM v_payment.customer_id THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'billing_lifetime_source_unmatched';
  END IF;

  IF p_event_type = 'charge.refunded'
     AND (
       p_amount IS DISTINCT FROM v_payment.amount_total
       OR p_currency IS DISTINCT FROM v_payment.currency
     ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'billing_lifetime_refund_payment_mismatch';
  END IF;

  v_fingerprint := extensions.digest(
    convert_to(
      jsonb_build_object(
        'eventType', p_event_type,
        'eventCreatedAt', p_event_created_at,
        'paymentIntentId', p_payment_intent_id,
        'amount', p_amount,
        'amountRefunded', p_amount_refunded,
        'currency', p_currency,
        'disputeId', p_dispute_id,
        'disputeStatus', p_dispute_status
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

  IF p_event_type = 'charge.refunded' THEN
    IF v_payment.last_refund_event_created_at IS NOT NULL
       AND p_event_created_at < v_payment.last_refund_event_created_at THEN
      RETURN jsonb_build_object(
        'result', 'stale',
        'applied', false,
        'duplicate', false,
        'stale', true
      );
    END IF;

    UPDATE private.stripe_lifetime_payments
       SET amount_refunded = greatest(amount_refunded, p_amount_refunded),
           last_refund_event_created_at = greatest(
             COALESCE(last_refund_event_created_at, p_event_created_at),
             p_event_created_at
           ),
           last_refund_event_id = p_event_id,
           updated_at = v_now
     WHERE payment_intent_id = p_payment_intent_id
     RETURNING amount_refunded INTO v_payment.amount_refunded;
  ELSE
    SELECT *
      INTO v_dispute
    FROM private.stripe_lifetime_payment_disputes
    WHERE dispute_id = p_dispute_id
    FOR UPDATE;

    IF FOUND THEN
      IF v_dispute.payment_intent_id IS DISTINCT FROM p_payment_intent_id THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'billing_lifetime_dispute_payment_mismatch';
      END IF;

      IF p_event_created_at < v_dispute.last_event_created_at
         OR (
           p_event_created_at = v_dispute.last_event_created_at
           AND p_dispute_status = 'won'
           AND v_dispute.status <> 'won'
         ) THEN
        RETURN jsonb_build_object(
          'result', 'stale',
          'applied', false,
          'duplicate', false,
          'stale', true
        );
      END IF;

      UPDATE private.stripe_lifetime_payment_disputes
         SET status = p_dispute_status,
             last_event_created_at = greatest(
               last_event_created_at,
               p_event_created_at
             ),
             last_event_id = p_event_id,
             updated_at = v_now
       WHERE dispute_id = p_dispute_id;
    ELSE
      INSERT INTO private.stripe_lifetime_payment_disputes (
        dispute_id,
        payment_intent_id,
        status,
        last_event_created_at,
        last_event_id,
        updated_at
      )
      VALUES (
        p_dispute_id,
        p_payment_intent_id,
        p_dispute_status,
        p_event_created_at,
        p_event_id,
        v_now
      );
    END IF;
  END IF;

  SELECT
    v_payment.amount_refunded < v_payment.amount_total
      AND NOT EXISTS (
        SELECT 1
        FROM private.stripe_lifetime_payment_disputes
        WHERE payment_intent_id = p_payment_intent_id
          AND status <> 'won'
      )
    INTO v_active;

  UPDATE private.entitlement_sources
     SET active = v_active,
         last_event_created_at = greatest(
           last_event_created_at,
           p_event_created_at
         ),
         last_event_id = p_event_id,
         updated_at = v_now
   WHERE provider = 'stripe'
     AND source_type = 'lifetime'
     AND source_id = v_payment.source_id
     AND user_id = v_payment.user_id
     AND customer_id = v_payment.customer_id;

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
  WHERE user_id = v_payment.user_id;

  v_tier := CASE WHEN v_premium THEN 'premium' ELSE 'free' END;

  INSERT INTO public.user_entitlements (user_id, tier, valid_until, updated_at)
  VALUES (v_payment.user_id, v_tier, v_valid_until, v_now)
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

REVOKE ALL ON FUNCTION public.link_lifetime_payment_intent(
  text,
  uuid,
  text,
  text,
  bigint,
  text
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_lifetime_payment_event(
  text,
  text,
  timestamptz,
  text,
  bigint,
  bigint,
  text,
  text,
  text
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.link_lifetime_payment_intent(
  text,
  uuid,
  text,
  text,
  bigint,
  text
) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_lifetime_payment_event(
  text,
  text,
  timestamptz,
  text,
  bigint,
  bigint,
  text,
  text,
  text
) TO service_role;
