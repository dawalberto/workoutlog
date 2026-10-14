BEGIN;

SET LOCAL search_path = public, extensions;

SELECT plan(51);

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
    '21000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'rest-push-owner-a@example.test',
    '',
    now(),
    now(),
    now()
  ),
  (
    '21000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'rest-push-owner-b@example.test',
    '',
    now(),
    now(),
    now()
  ),
  (
    '21000000-0000-4000-8000-000000000003',
    'authenticated',
    'authenticated',
    'rest-push-owner-cap@example.test',
    '',
    now(),
    now(),
    now()
  )
ON CONFLICT (id) DO NOTHING;

SELECT ok(
  has_function_privilege('anon', 'public.upsert_push_subscription(text,text,text,text)', 'EXECUTE') IS FALSE,
  'anonymous users cannot upsert push subscriptions'
);
SELECT ok(
  has_function_privilege('anon', 'public.delete_push_subscription(text)', 'EXECUTE') IS FALSE,
  'anonymous users cannot delete push subscriptions'
);
SELECT ok(
  has_function_privilege('anon', 'public.schedule_rest_push(text,integer,text,text)', 'EXECUTE') IS FALSE,
  'anonymous users cannot schedule rest pushes'
);
SELECT ok(
  has_function_privilege('anon', 'public.cancel_rest_push(text)', 'EXECUTE') IS FALSE,
  'anonymous users cannot cancel rest pushes'
);
SELECT ok(
  has_function_privilege('authenticated', 'public.claim_due_rest_pushes(integer)', 'EXECUTE') IS FALSE,
  'authenticated users cannot claim due pushes'
);
SELECT ok(
  has_function_privilege('authenticated', 'public.complete_rest_push(uuid,text,text)', 'EXECUTE') IS FALSE,
  'authenticated users cannot complete pushes'
);
SELECT ok(
  has_function_privilege('authenticated', 'public.remove_push_subscription_by_endpoint(text)', 'EXECUTE') IS FALSE,
  'authenticated users cannot remove subscriptions by endpoint'
);
SELECT ok(
  has_function_privilege('authenticated', 'private.dispatch_due_rest_pushes()', 'EXECUTE') IS FALSE,
  'authenticated users cannot execute the private dispatcher'
);
SELECT ok(
  has_function_privilege('service_role', 'public.claim_due_rest_pushes(integer)', 'EXECUTE'),
  'service role can claim due pushes'
);
SELECT ok(
  has_function_privilege('service_role', 'public.complete_rest_push(uuid,text,text)', 'EXECUTE'),
  'service role can complete pushes'
);
SELECT ok(
  has_function_privilege('service_role', 'public.remove_push_subscription_by_endpoint(text)', 'EXECUTE'),
  'service role can remove subscriptions by endpoint'
);

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claim.sub',
  '21000000-0000-4000-8000-000000000001',
  true
);

SELECT ok(
  has_table_privilege('authenticated', 'public.push_subscriptions', 'SELECT'),
  'authenticated users can select subscriptions subject to RLS'
);
SELECT throws_ok(
  $$INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh, auth)
    VALUES (
      '21000000-0000-4000-8000-000000000001',
      'https://push.example.test/direct-subscription',
      'public-key',
      'auth-secret'
    )$$,
  '42501',
  NULL,
  'authenticated users cannot insert subscriptions directly'
);
SELECT throws_ok(
  $$INSERT INTO public.rest_push_schedules (
      user_id, subscription_id, fire_at, title, body
    )
    VALUES (
      '21000000-0000-4000-8000-000000000001',
      '21000000-0000-4000-8000-000000000099',
      now(),
      'Direct insert',
      ''
    )$$,
  '42501',
  NULL,
  'authenticated users cannot insert schedules directly'
);

SELECT set_config(
  'test.rest_push_subscription_a',
  public.upsert_push_subscription(
    'https://push.example.test/shared-device',
    'public-key-a',
    'auth-secret-a',
    'WorkoutLog test'
  )::text,
  true
);
SELECT ok(
  current_setting('test.rest_push_subscription_a') IS NOT NULL,
  'owner A can register a push subscription'
);
SELECT set_config(
  'test.rest_push_schedule_a',
  public.schedule_rest_push(
    'https://push.example.test/shared-device',
    60000,
    'Descanso terminado',
    'Es hora de continuar.'
  )::text,
  true
);
SELECT ok(
  current_setting('test.rest_push_schedule_a') IS NOT NULL,
  'owner A can schedule a rest push'
);

SELECT set_config(
  'request.jwt.claim.sub',
  '21000000-0000-4000-8000-000000000002',
  true
);
SELECT is(
  (SELECT count(*)::integer FROM public.push_subscriptions),
  0,
  'owner B cannot see owner A subscriptions'
);
SELECT is(
  (SELECT count(*)::integer FROM public.rest_push_schedules),
  0,
  'owner B cannot see owner A schedules'
);
SELECT throws_ok(
  $$SELECT public.schedule_rest_push(
      'https://push.example.test/shared-device',
      60000,
      'Not yours',
      ''
    )$$,
  'P0002',
  'push_subscription_not_found',
  'a user cannot schedule a push for another owner subscription'
);
SELECT throws_ok(
  $$SELECT public.schedule_rest_push(
      'https://push.example.test/missing-device',
      999,
      'Too soon',
      ''
    )$$,
  'P0001',
  'rest_push_delay_invalid',
  'schedule delay must be at least one second'
);
SELECT throws_ok(
  $$SELECT public.schedule_rest_push(
      'https://push.example.test/missing-device',
      7200001,
      'Too late',
      ''
    )$$,
  'P0001',
  'rest_push_delay_invalid',
  'schedule delay cannot exceed two hours'
);
SELECT set_config(
  'request.jwt.claim.sub',
  '21000000-0000-4000-8000-000000000001',
  true
);
SELECT set_config(
  'test.rest_push_schedule_a_rescheduled',
  public.schedule_rest_push(
    'https://push.example.test/shared-device',
    120000,
    'Descanso reprogramado',
    ''
  )::text,
  true
);
SELECT is(
  (
    SELECT count(*)::integer
    FROM public.rest_push_schedules
    WHERE subscription_id = current_setting('test.rest_push_subscription_a')::uuid
      AND status = 'pending'
  ),
  1,
  'rescheduling leaves exactly one pending push for the subscription'
);
SELECT is(
  (
    SELECT count(*)::integer
    FROM public.rest_push_schedules
    WHERE id = current_setting('test.rest_push_schedule_a')::uuid
      AND status = 'cancelled'
  ),
  1,
  'rescheduling cancels the previous pending push'
);
SELECT public.cancel_rest_push('https://push.example.test/shared-device');
SELECT is(
  (
    SELECT count(*)::integer
    FROM public.rest_push_schedules
    WHERE subscription_id = current_setting('test.rest_push_subscription_a')::uuid
      AND status = 'pending'
  ),
  0,
  'cancel removes the pending push for the caller'
);
SELECT is(
  (
    SELECT count(*)::integer
    FROM public.rest_push_schedules
    WHERE subscription_id = current_setting('test.rest_push_subscription_a')::uuid
      AND status = 'cancelled'
  ),
  2,
  'rescheduling and cancel preserve both prior rows as cancelled'
);

SELECT set_config(
  'test.rest_push_schedule_a_before_transfer',
  public.schedule_rest_push(
    'https://push.example.test/shared-device',
    60000,
    'Descanso antes de transferir',
    ''
  )::text,
  true
);
SELECT set_config(
  'request.jwt.claim.sub',
  '21000000-0000-4000-8000-000000000002',
  true
);
SELECT is(
  public.upsert_push_subscription(
    'https://push.example.test/shared-device',
    'public-key-b',
    'auth-secret-b',
    'WorkoutLog account B'
  ),
  current_setting('test.rest_push_subscription_a')::uuid,
  'upsert transfers the existing endpoint instead of creating a duplicate'
);
SELECT is(
  (
    SELECT user_id
    FROM public.push_subscriptions
    WHERE id = current_setting('test.rest_push_subscription_a')::uuid
  ),
  '21000000-0000-4000-8000-000000000002'::uuid,
  'upsert reassigns the endpoint to the new authenticated owner'
);
SELECT set_config(
  'request.jwt.claim.sub',
  '21000000-0000-4000-8000-000000000001',
  true
);
SELECT is(
  (
    SELECT count(*)::integer
    FROM public.rest_push_schedules
    WHERE id = current_setting('test.rest_push_schedule_a_before_transfer')::uuid
      AND status = 'cancelled'
  ),
  1,
  'endpoint transfer cancels the prior owner pending schedule'
);
SELECT set_config(
  'request.jwt.claim.sub',
  '21000000-0000-4000-8000-000000000001',
  true
);
SELECT public.delete_push_subscription('https://push.example.test/shared-device');
SELECT set_config(
  'request.jwt.claim.sub',
  '21000000-0000-4000-8000-000000000002',
  true
);
SELECT is(
  (
    SELECT count(*)::integer
    FROM public.push_subscriptions
    WHERE endpoint = 'https://push.example.test/shared-device'
  ),
  1,
  'a previous owner cannot delete the subscription after transfer'
);
SELECT ok(
  public.upsert_push_subscription(
    'https://push.example.test/client-delete',
    'public-key-delete',
    'auth-secret-delete',
    NULL
  ) IS NOT NULL,
  'owner B can register a second subscription'
);
SELECT public.delete_push_subscription('https://push.example.test/client-delete');
SELECT is(
  (
    SELECT count(*)::integer
    FROM public.push_subscriptions
    WHERE endpoint = 'https://push.example.test/client-delete'
  ),
  0,
  'a user can delete their own subscription'
);

SELECT set_config(
  'request.jwt.claim.sub',
  '21000000-0000-4000-8000-000000000003',
  true
);
DO $$
DECLARE
  subscription_number integer;
BEGIN
  FOR subscription_number IN 1..11 LOOP
    PERFORM public.upsert_push_subscription(
      pg_catalog.format(
        'https://push.example.test/cap-%s',
        subscription_number
      ),
      'public-key-cap',
      'auth-secret-cap',
      NULL
    );
  END LOOP;
END;
$$;
SELECT is(
  (SELECT count(*)::integer FROM public.push_subscriptions),
  10,
  'registering more than ten endpoints deletes the oldest subscriptions'
);

SELECT set_config(
  'request.jwt.claim.sub',
  '21000000-0000-4000-8000-000000000002',
  true
);
SELECT ok(
  public.upsert_push_subscription(
    'https://push.example.test/due',
    'public-key-due',
    'auth-secret-due',
    NULL
  ) IS NOT NULL,
  'owner B can register a subscription for a due push'
);
SELECT set_config(
  'test.rest_push_schedule_due',
  public.schedule_rest_push(
    'https://push.example.test/due',
    60000,
    'Due push',
    ''
  )::text,
  true
);
SELECT ok(
  current_setting('test.rest_push_schedule_due') IS NOT NULL,
  'a due push can be scheduled'
);
SELECT ok(
  public.upsert_push_subscription(
    'https://push.example.test/future',
    'public-key-future',
    'auth-secret-future',
    NULL
  ) IS NOT NULL,
  'owner B can register a subscription for a future push'
);
SELECT set_config(
  'test.rest_push_schedule_future',
  public.schedule_rest_push(
    'https://push.example.test/future',
    1800000,
    'Future push',
    ''
  )::text,
  true
);
SELECT ok(
  current_setting('test.rest_push_schedule_future') IS NOT NULL,
  'a future push can be scheduled'
);
SELECT ok(
  public.upsert_push_subscription(
    'https://push.example.test/stale',
    'public-key-stale',
    'auth-secret-stale',
    NULL
  ) IS NOT NULL,
  'owner B can register a subscription for a stale push'
);
SELECT set_config(
  'test.rest_push_schedule_stale',
  public.schedule_rest_push(
    'https://push.example.test/stale',
    1800000,
    'Stale push',
    ''
  )::text,
  true
);
SELECT ok(
  current_setting('test.rest_push_schedule_stale') IS NOT NULL,
  'a stale push can be scheduled'
);
SELECT set_config(
  'test.rest_push_schedule_dispatch',
  public.schedule_rest_push(
    'https://push.example.test/shared-device',
    1800000,
    'Dispatch push',
    ''
  )::text,
  true
);
RESET ROLE;
SELECT is(
  private.dispatch_due_rest_pushes(),
  NULL::bigint,
  'the dispatcher returns null when no schedules are due'
);

SET LOCAL ROLE service_role;
UPDATE public.rest_push_schedules
SET fire_at = now() - interval '1 second'
WHERE id = current_setting('test.rest_push_schedule_due')::uuid;
UPDATE public.rest_push_schedules
SET status = 'sending',
    updated_at = now() - interval '2 minutes'
WHERE id = current_setting('test.rest_push_schedule_stale')::uuid;

SELECT is(
  (SELECT count(*)::integer FROM public.claim_due_rest_pushes(100)),
  1,
  'claim returns only the due push and fails stale sending rows'
);
SELECT ok(
  (
    SELECT status = 'sending' AND attempts = 1
    FROM public.rest_push_schedules
    WHERE id = current_setting('test.rest_push_schedule_due')::uuid
  ),
  'claim marks a due push sending and increments attempts'
);
SELECT is(
  (
    SELECT status
    FROM public.rest_push_schedules
    WHERE id = current_setting('test.rest_push_schedule_future')::uuid
  ),
  'pending',
  'claim leaves future pushes pending'
);
SELECT is(
  (SELECT count(*)::integer FROM public.claim_due_rest_pushes(100)),
  0,
  'a second claim finds no already-claimed push'
);
SELECT public.complete_rest_push(
  current_setting('test.rest_push_schedule_due')::uuid,
  'sent',
  NULL
);
SELECT is(
  (
    SELECT status
    FROM public.rest_push_schedules
    WHERE id = current_setting('test.rest_push_schedule_due')::uuid
  ),
  'sent',
  'complete marks a claimed push sent'
);
SELECT ok(
  (
    SELECT status = 'failed' AND last_error = 'stale'
    FROM public.rest_push_schedules
    WHERE id = current_setting('test.rest_push_schedule_stale')::uuid
  ),
  'a sending push older than sixty seconds fails with stale error'
);
SELECT public.remove_push_subscription_by_endpoint('https://push.example.test/future');
SELECT is(
  (
    SELECT count(*)::integer
    FROM public.push_subscriptions
    WHERE endpoint = 'https://push.example.test/future'
  ),
  0,
  'service role can remove a dead push subscription'
);
RESET ROLE;

SELECT is(
  private.dispatch_due_rest_pushes(),
  NULL::bigint,
  'the dispatcher still returns null when no pushes are due'
);

SET LOCAL ROLE service_role;
UPDATE public.rest_push_schedules
SET fire_at = now() - interval '1 second'
WHERE id = current_setting('test.rest_push_schedule_dispatch')::uuid;
RESET ROLE;

SELECT is(
  (
    SELECT count(*)::integer
    FROM vault.decrypted_secrets
    WHERE name IN ('rest_push_function_url', 'rest_push_dispatch_secret')
  ),
  0,
  'the local test database has no dispatcher Vault secrets'
);
SELECT ok(
  CASE
    WHEN (
      SELECT count(*) = 0
      FROM vault.decrypted_secrets
      WHERE name IN ('rest_push_function_url', 'rest_push_dispatch_secret')
    )
      THEN private.dispatch_due_rest_pushes() IS NULL
    ELSE TRUE
  END,
  'the dispatcher returns null without Vault secrets even when a push is due'
);
SELECT is(
  (SELECT count(*)::integer FROM cron.job WHERE jobname = 'dispatch-rest-pushes'),
  1,
  'the dispatch cron job is installed'
);
SELECT is(
  (SELECT count(*)::integer FROM cron.job WHERE jobname = 'cleanup-rest-pushes'),
  1,
  'the cleanup cron job is installed'
);

SELECT * FROM finish();
ROLLBACK;
