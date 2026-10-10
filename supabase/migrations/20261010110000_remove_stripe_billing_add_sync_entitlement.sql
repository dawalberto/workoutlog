DROP FUNCTION IF EXISTS public.get_billing_customer_id(uuid);
DROP FUNCTION IF EXISTS public.store_billing_customer(uuid, text);
DROP FUNCTION IF EXISTS public.get_billing_customer_owner(text);
DROP FUNCTION IF EXISTS public.apply_provider_entitlement_event(
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
);
DROP FUNCTION IF EXISTS public.link_lifetime_payment_intent(
  text,
  uuid,
  text,
  text,
  bigint,
  text
);
DROP FUNCTION IF EXISTS public.apply_lifetime_payment_event(
  text,
  text,
  timestamptz,
  text,
  bigint,
  bigint,
  text,
  text,
  text
);
DROP FUNCTION IF EXISTS public.link_subscription_payment_intent(
  text,
  text,
  text,
  text
);
DROP FUNCTION IF EXISTS public.classify_stripe_payment_intent(text);
DROP FUNCTION IF EXISTS public.set_provider_entitlement_plan(
  uuid,
  text,
  text,
  text,
  text
);
DROP FUNCTION IF EXISTS public.get_account_entitlement(uuid);

DROP TABLE IF EXISTS private.stripe_lifetime_payment_disputes;
DROP TABLE IF EXISTS private.stripe_lifetime_payments;
DROP TABLE IF EXISTS private.stripe_subscription_payments;
DROP TABLE IF EXISTS private.stripe_webhook_events;
DROP TABLE IF EXISTS private.entitlement_sources;
DROP TABLE IF EXISTS private.billing_customers;
DROP TABLE IF EXISTS public.user_entitlements;

CREATE FUNCTION public.get_sync_entitlement()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '28000',
      MESSAGE = 'sync_authentication_required';
  END IF;

  RETURN jsonb_build_object('eligible', true);
END;
$$;

REVOKE ALL ON FUNCTION public.get_sync_entitlement() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_sync_entitlement() TO authenticated;
