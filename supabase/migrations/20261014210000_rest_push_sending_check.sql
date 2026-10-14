BEGIN;

CREATE FUNCTION public.is_rest_push_sending(p_schedule_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rest_push_schedules AS schedule
    WHERE schedule.id = p_schedule_id
      AND schedule.status = 'sending'
  );
$$;

REVOKE ALL ON FUNCTION public.is_rest_push_sending(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_rest_push_sending(uuid)
  TO service_role;

COMMIT;
