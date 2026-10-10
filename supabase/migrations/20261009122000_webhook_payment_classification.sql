CREATE TABLE private.stripe_subscription_payments (
  payment_intent_id text PRIMARY KEY CHECK (
    payment_intent_id ~ '^pi_[A-Za-z0-9]+$'
  ),
  provider text NOT NULL DEFAULT 'stripe' CHECK (provider = 'stripe'),
  source_type text NOT NULL DEFAULT 'subscription'
    CHECK (source_type = 'subscription'),
  source_id text NOT NULL CHECK (source_id ~ '^sub_[A-Za-z0-9]+$'),
  invoice_id text NOT NULL CHECK (invoice_id ~ '^in_[A-Za-z0-9]+$'),
  customer_id text NOT NULL CHECK (customer_id ~ '^cus_[A-Za-z0-9]+$'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (provider, source_type, source_id)
    REFERENCES private.entitlement_sources (provider, source_type, source_id)
    ON DELETE CASCADE
);

CREATE INDEX stripe_subscription_payments_invoice_idx
  ON private.stripe_subscription_payments (invoice_id);

REVOKE ALL ON TABLE private.stripe_subscription_payments
  FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.link_subscription_payment_intent(
  p_payment_intent_id text,
  p_invoice_id text,
  p_subscription_id text,
  p_customer_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, private
AS $$
DECLARE
  v_source_customer_id text;
  v_existing private.stripe_subscription_payments%ROWTYPE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'billing_service_role_required';
  END IF;

  IF p_payment_intent_id IS NULL
     OR p_payment_intent_id !~ '^pi_[A-Za-z0-9]+$'
     OR p_invoice_id IS NULL
     OR p_invoice_id !~ '^in_[A-Za-z0-9]+$'
     OR p_subscription_id IS NULL
     OR p_subscription_id !~ '^sub_[A-Za-z0-9]+$'
     OR p_customer_id IS NULL
     OR p_customer_id !~ '^cus_[A-Za-z0-9]+$' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'billing_subscription_payment_input_invalid';
  END IF;

  SELECT customer_id
    INTO v_source_customer_id
  FROM private.entitlement_sources
  WHERE provider = 'stripe'
    AND source_type = 'subscription'
    AND source_id = p_subscription_id
  FOR UPDATE;

  IF NOT FOUND OR v_source_customer_id IS DISTINCT FROM p_customer_id THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'billing_subscription_payment_source_unmatched';
  END IF;

  SELECT *
    INTO v_existing
  FROM private.stripe_subscription_payments
  WHERE payment_intent_id = p_payment_intent_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing.invoice_id IS DISTINCT FROM p_invoice_id
       OR v_existing.source_id IS DISTINCT FROM p_subscription_id
       OR v_existing.customer_id IS DISTINCT FROM p_customer_id THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'billing_subscription_payment_conflict';
    END IF;
    RETURN true;
  END IF;

  INSERT INTO private.stripe_subscription_payments (
    payment_intent_id,
    source_id,
    invoice_id,
    customer_id
  )
  VALUES (
    p_payment_intent_id,
    p_subscription_id,
    p_invoice_id,
    p_customer_id
  );

  RETURN true;
END;
$$;

CREATE FUNCTION public.classify_stripe_payment_intent(
  p_payment_intent_id text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, private
AS $$
DECLARE
  v_is_lifetime boolean;
  v_is_subscription boolean;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'billing_service_role_required';
  END IF;

  IF p_payment_intent_id IS NULL
     OR p_payment_intent_id !~ '^pi_[A-Za-z0-9]+$' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'billing_payment_intent_input_invalid';
  END IF;

  SELECT EXISTS (
           SELECT 1
           FROM private.stripe_lifetime_payments
           WHERE payment_intent_id = p_payment_intent_id
         ),
         EXISTS (
           SELECT 1
           FROM private.stripe_subscription_payments
           WHERE payment_intent_id = p_payment_intent_id
         )
    INTO v_is_lifetime, v_is_subscription;

  IF v_is_lifetime AND v_is_subscription THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'billing_payment_intent_classification_conflict';
  END IF;

  IF v_is_lifetime THEN
    RETURN 'lifetime';
  END IF;
  IF v_is_subscription THEN
    RETURN 'subscription';
  END IF;
  RETURN 'unmatched';
END;
$$;

REVOKE ALL ON FUNCTION public.link_subscription_payment_intent(
  text,
  text,
  text,
  text
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.classify_stripe_payment_intent(
  text
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.link_subscription_payment_intent(
  text,
  text,
  text,
  text
) TO service_role;
GRANT EXECUTE ON FUNCTION public.classify_stripe_payment_intent(
  text
) TO service_role;
