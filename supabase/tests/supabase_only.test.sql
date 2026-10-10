BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;

SELECT plan(17);

INSERT INTO auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
)
VALUES
  (
    '40000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'sync-owner-a@example.test',
    '',
    now(),
    now(),
    now()
  ),
  (
    '40000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'sync-owner-b@example.test',
    '',
    now(),
    now(),
    now()
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.routines (user_id, id, name)
VALUES (
  '40000000-0000-4000-8000-000000000002',
  'owner-b-routine',
  'Owner B routine'
)
ON CONFLICT (user_id, id) DO NOTHING;

SELECT ok(
  to_regprocedure('public.get_sync_entitlement()') IS NOT NULL,
  'the authenticated sync entitlement RPC exists'
);
SELECT ok(
  has_function_privilege(
    'authenticated',
    'public.get_sync_entitlement()',
    'EXECUTE'
  ),
  'authenticated users can read their sync entitlement'
);
SELECT ok(
  NOT has_function_privilege(
    'anon',
    'public.get_sync_entitlement()',
    'EXECUTE'
  ),
  'anonymous users cannot read sync entitlements'
);
SELECT ok(
  to_regclass('public.user_entitlements') IS NULL,
  'the paid entitlement projection has been removed'
);
SELECT ok(
  to_regclass('private.billing_customers') IS NULL
  AND to_regclass('private.entitlement_sources') IS NULL
  AND to_regclass('private.stripe_webhook_events') IS NULL
  AND to_regclass('private.stripe_lifetime_payments') IS NULL
  AND to_regclass('private.stripe_lifetime_payment_disputes') IS NULL
  AND to_regclass('private.stripe_subscription_payments') IS NULL,
  'Stripe billing tables have been removed'
);
SELECT ok(
  to_regprocedure('public.get_billing_customer_id(uuid)') IS NULL
  AND to_regprocedure('public.store_billing_customer(uuid,text)') IS NULL
  AND to_regprocedure('public.get_billing_customer_owner(text)') IS NULL
  AND to_regprocedure('public.apply_provider_entitlement_event(text,text,timestamptz,text,uuid,text,text,text,boolean,timestamptz)') IS NULL
  AND to_regprocedure('public.link_lifetime_payment_intent(text,uuid,text,text,bigint,text)') IS NULL
  AND to_regprocedure('public.apply_lifetime_payment_event(text,text,timestamptz,text,bigint,bigint,text,text,text)') IS NULL
  AND to_regprocedure('public.link_subscription_payment_intent(text,text,text,text)') IS NULL
  AND to_regprocedure('public.classify_stripe_payment_intent(text)') IS NULL
  AND to_regprocedure('public.set_provider_entitlement_plan(uuid,text,text,text,text)') IS NULL
  AND to_regprocedure('public.get_account_entitlement(uuid)') IS NULL,
  'Stripe billing RPCs have been removed'
);

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claim.sub',
  '40000000-0000-4000-8000-000000000001',
  true
);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);

SELECT is(
  public.get_sync_entitlement(),
  '{"eligible": true}'::jsonb,
  'every authenticated user is eligible for cloud sync'
);
SELECT is(
  public.sync_push(
    '40000000-0000-4000-8000-000000000101',
    '[{
      "table": "routines",
      "operation": "upsert",
      "baseRevision": "0",
      "record": {
        "id": "owner-a-routine",
        "name": "Owner A routine"
      }
    }]'::jsonb
  )->>'operationId',
  '40000000-0000-4000-8000-000000000101',
  'an authenticated user can push a sync operation'
);
SELECT is(
  jsonb_typeof(
    public.sync_push(
      '40000000-0000-4000-8000-000000000101',
      '[{
        "table": "routines",
        "operation": "upsert",
        "baseRevision": "0",
        "record": {
          "id": "owner-a-routine",
          "name": "Owner A routine"
        }
      }]'::jsonb
    )->'changes'->0->'revision'
  ),
  'string',
  'sync revisions remain JSON strings for bigint-safe frontend cursors'
);
SELECT is(
  (
    SELECT count(*)::integer
    FROM public.routines
    WHERE id = 'owner-a-routine'
  ),
  1,
  'replaying an operation does not duplicate synchronized rows'
);
SELECT is(
  (
    SELECT count(*)::integer
    FROM public.routines
    WHERE id = 'owner-a-routine'
  ),
  1,
  'the owner can read their synchronized row'
);
SELECT is(
  (
    SELECT count(*)::integer
    FROM public.routines
    WHERE id = 'owner-b-routine'
  ),
  0,
  'the owner cannot read another users synchronized row'
);
SELECT ok(
  EXISTS (
    SELECT 1
    FROM public.routines
    WHERE id = 'owner-a-routine'
      AND server_revision > 0
      AND deleted_at IS NULL
  ),
  'the synchronized row retains revision and tombstone metadata'
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claim.sub',
  '40000000-0000-4000-8000-000000000002',
  true
);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);

SELECT is(
  public.get_sync_entitlement(),
  '{"eligible": true}'::jsonb,
  'another authenticated user is also eligible for cloud sync'
);
SELECT is(
  (
    SELECT count(*)::integer
    FROM public.routines
    WHERE id = 'owner-a-routine'
  ),
  0,
  'another user cannot read the first users synchronized row'
);
SELECT is(
  (
    SELECT count(*)::integer
    FROM public.routines
    WHERE id = 'owner-b-routine'
  ),
  1,
  'another user retains access to their own synchronized row'
);
SELECT throws_ok(
  $$SELECT public.sync_push(
      '40000000-0000-4000-8000-000000000102',
      '[{
        "table": "routines",
        "operation": "delete",
        "baseRevision": "1",
        "record": {"id": "owner-a-routine"}
      }]'::jsonb
    )$$,
  'P0001',
  'sync_stale_revision_conflict',
  'another user cannot apply a stale mutation to an inaccessible row'
);

SELECT * FROM finish();
ROLLBACK;
