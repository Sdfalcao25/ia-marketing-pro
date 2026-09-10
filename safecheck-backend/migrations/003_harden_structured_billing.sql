-- SafeCheck AI — Structured billing hardening
-- Apply after 002_structured_billing_postgres.sql.

alter table public.safecheck_billing_subscriptions
  drop constraint if exists safecheck_billing_subscriptions_status_check;

alter table public.safecheck_billing_subscriptions
  add constraint safecheck_billing_subscriptions_status_check
  check (status in (
    'checkout_pending','inactive','active','trialing','past_due',
    'canceled','expired','suspended','refunded'
  ));

create or replace function public.safecheck_billing_claim_webhook_event(
  p_provider text,
  p_provider_event_id text,
  p_event_type text,
  p_object_type text default null,
  p_provider_object_id text default null,
  p_payload_sha256 text default null
)
returns table(event_id uuid, is_new boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_status text;
begin
  insert into public.safecheck_billing_webhook_events(
    provider,
    provider_event_id,
    event_type,
    object_type,
    provider_object_id,
    payload_sha256,
    processing_status,
    attempt_count
  ) values (
    p_provider,
    p_provider_event_id,
    p_event_type,
    p_object_type,
    p_provider_object_id,
    p_payload_sha256,
    'received',
    1
  )
  on conflict (provider, provider_event_id) do nothing
  returning id into v_id;

  if v_id is not null then
    return query select v_id, true;
    return;
  end if;

  select id, processing_status
  into v_id, v_status
  from public.safecheck_billing_webhook_events
  where provider = p_provider
    and provider_event_id = p_provider_event_id
  for update;

  if v_status in ('processed','ignored') then
    return query select v_id, false;
    return;
  end if;

  update public.safecheck_billing_webhook_events
  set event_type = p_event_type,
      object_type = coalesce(p_object_type, object_type),
      provider_object_id = coalesce(p_provider_object_id, provider_object_id),
      payload_sha256 = coalesce(p_payload_sha256, payload_sha256),
      processing_status = 'received',
      attempt_count = attempt_count + 1,
      last_error_code = null,
      processed_at = null
  where id = v_id;

  return query select v_id, true;
end;
$$;

revoke all on function public.safecheck_billing_claim_webhook_event(text,text,text,text,text,text)
from public, anon, authenticated;
grant execute on function public.safecheck_billing_claim_webhook_event(text,text,text,text,text,text)
to service_role;
