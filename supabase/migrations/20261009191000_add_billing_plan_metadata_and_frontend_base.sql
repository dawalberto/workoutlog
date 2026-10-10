ALTER TABLE private.entitlement_sources
  ADD COLUMN plan_id text;

UPDATE private.entitlement_sources
SET plan_id = 'lifetime'
WHERE source_type = 'lifetime';

ALTER TABLE private.entitlement_sources
  ADD CONSTRAINT entitlement_sources_plan_matches_source_check CHECK (
    plan_id IS NULL
    OR (source_type = 'subscription' AND plan_id IN ('monthly', 'annual'))
    OR (source_type = 'lifetime' AND plan_id = 'lifetime')
  );

CREATE FUNCTION public.set_provider_entitlement_plan(
  p_user_id uuid,
  p_source_type text,
  p_source_id text,
  p_plan_id text,
  p_event_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, private
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'billing_service_role_required';
  END IF;

  IF p_user_id IS NULL
     OR p_source_id IS NULL
     OR p_event_id IS NULL
     OR p_event_id !~ '^evt_[A-Za-z0-9]+$'
     OR NOT (
       (p_source_type = 'subscription'
        AND p_source_id ~ '^sub_[A-Za-z0-9]+$'
        AND p_plan_id IN ('monthly', 'annual'))
       OR (p_source_type = 'lifetime'
           AND p_source_id ~ '^cs_test_[A-Za-z0-9]+$'
           AND p_plan_id = 'lifetime')
     ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'billing_plan_metadata_invalid';
  END IF;

  UPDATE private.entitlement_sources
  SET plan_id = p_plan_id
  WHERE provider = 'stripe'
    AND user_id = p_user_id
    AND source_type = p_source_type
    AND source_id = p_source_id
    AND last_event_id = p_event_id;

  IF FOUND THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM private.entitlement_sources
    WHERE provider = 'stripe'
      AND user_id = p_user_id
      AND source_type = p_source_type
      AND source_id = p_source_id
      AND plan_id = p_plan_id
  );
END;
$$;

CREATE FUNCTION public.get_account_entitlement(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, private
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'account_entitlement_user_id_required';
  END IF;

  IF auth.role() IS DISTINCT FROM 'service_role'
     AND (
       auth.role() IS DISTINCT FROM 'authenticated'
       OR auth.uid() IS DISTINCT FROM p_user_id
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'account_entitlement_owner_mismatch';
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'tier', entitlement.tier,
      'valid_until', entitlement.valid_until,
      'active_plan_ids', COALESCE(
        (
          SELECT jsonb_agg(active_plans.plan_id ORDER BY active_plans.plan_id)
          FROM (
            SELECT DISTINCT source.plan_id
            FROM private.entitlement_sources AS source
            WHERE source.user_id = entitlement.user_id
              AND source.active
              AND source.plan_id IS NOT NULL
              AND (source.valid_until IS NULL OR source.valid_until > statement_timestamp())
          ) AS active_plans
        ),
        '[]'::jsonb
      )
    )
    FROM public.user_entitlements AS entitlement
    WHERE entitlement.user_id = p_user_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.set_provider_entitlement_plan(
  uuid,
  text,
  text,
  text,
  text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_provider_entitlement_plan(
  uuid,
  text,
  text,
  text,
  text
) TO service_role;

REVOKE ALL ON FUNCTION public.get_account_entitlement(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_account_entitlement(uuid)
  TO authenticated, service_role;
