-- SafeCheck AI — Structured Billing PostgreSQL schema
-- Target: Supabase project pwlblezbjnumlmqevcgu
-- Purpose: replace dynamic KV billing state with normalized, indexed, auditable tables.
-- Safe to apply repeatedly where objects use IF NOT EXISTS / CREATE OR REPLACE.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1) Current subscription state (one canonical row per SafeCheck user/provider)
-- ---------------------------------------------------------------------------
create table if not exists public.safecheck_billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'asaas' check (provider in ('asaas','stripe','manual')),
  plan text not null check (plan in ('pro','premium')),
  status text not null check (status in (
    'checkout_pending','active','trialing','past_due','canceled','expired','suspended','refunded'
  )),
  currency text not null default 'BRL' check (char_length(currency) = 3),
  price_cents integer not null check (price_cents > 0),
  billing_interval text not null default 'month' check (billing_interval in ('month')),
  provider_customer_id text,
  provider_subscription_id text,
  last_provider_payment_id text,
  next_due_date date,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  pending_plan text check (pending_plan is null or pending_plan in ('pro','premium')),
  plan_change_at timestamptz,
  last_payment_value_cents integer check (last_payment_value_cents is null or last_payment_value_cents >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create unique index if not exists safecheck_billing_subscriptions_provider_subscription_uidx
  on public.safecheck_billing_subscriptions (provider, provider_subscription_id)
  where provider_subscription_id is not null;

create index if not exists safecheck_billing_subscriptions_provider_customer_idx
  on public.safecheck_billing_subscriptions (provider, provider_customer_id)
  where provider_customer_id is not null;

create index if not exists safecheck_billing_subscriptions_status_idx
  on public.safecheck_billing_subscriptions (status, next_due_date);

-- ---------------------------------------------------------------------------
-- 2) Checkout lifecycle. Keeps reusable checkout state without mixing it into
--    entitlement state.
-- ---------------------------------------------------------------------------
create table if not exists public.safecheck_billing_checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  provider text not null default 'asaas' check (provider in ('asaas','stripe')),
  provider_checkout_id text not null,
  external_reference text not null,
  plan text not null check (plan in ('pro','premium')),
  price_cents integer not null check (price_cents > 0),
  status text not null default 'pending' check (status in ('pending','paid','canceled','expired','failed')),
  checkout_url text,
  provider_customer_id text,
  provider_subscription_id text,
  expires_at timestamptz,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_checkout_id),
  unique (provider, external_reference, provider_checkout_id)
);

create index if not exists safecheck_billing_checkout_user_created_idx
  on public.safecheck_billing_checkout_sessions (user_id, created_at desc);

create index if not exists safecheck_billing_checkout_pending_idx
  on public.safecheck_billing_checkout_sessions (status, expires_at)
  where status = 'pending';

-- ---------------------------------------------------------------------------
-- 3) Webhook idempotency. Store only a digest + sanitized details by default;
--    do not persist full card/customer payloads here.
-- ---------------------------------------------------------------------------
create table if not exists public.safecheck_billing_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('asaas','stripe')),
  provider_event_id text not null,
  event_type text not null,
  object_type text,
  provider_object_id text,
  user_id uuid references auth.users(id) on delete set null,
  payload_sha256 text,
  processing_status text not null default 'received' check (processing_status in ('received','processed','ignored','failed')),
  attempt_count integer not null default 1 check (attempt_count >= 1),
  last_error_code text,
  details jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, provider_event_id)
);

create index if not exists safecheck_billing_events_user_received_idx
  on public.safecheck_billing_webhook_events (user_id, received_at desc)
  where user_id is not null;

create index if not exists safecheck_billing_events_status_received_idx
  on public.safecheck_billing_webhook_events (processing_status, received_at);

-- ---------------------------------------------------------------------------
-- 4) Append-only operational audit trail. No complete secrets/card data.
-- ---------------------------------------------------------------------------
create table if not exists public.safecheck_billing_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  actor_type text not null check (actor_type in ('user','webhook','system','admin')),
  actor_reference text,
  action text not null,
  provider text check (provider is null or provider in ('asaas','stripe','manual')),
  provider_object_id text,
  old_state jsonb,
  new_state jsonb,
  request_id text,
  created_at timestamptz not null default now()
);

create index if not exists safecheck_billing_audit_user_created_idx
  on public.safecheck_billing_audit_log (user_id, created_at desc)
  where user_id is not null;

create index if not exists safecheck_billing_audit_action_created_idx
  on public.safecheck_billing_audit_log (action, created_at desc);

-- ---------------------------------------------------------------------------
-- 5) Atomic server-side rate limiting for financially sensitive operations.
-- ---------------------------------------------------------------------------
create table if not exists public.safecheck_billing_rate_limits (
  scope text not null,
  subject text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (scope, subject)
);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.safecheck_billing_touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.safecheck_billing_touch_updated_at() from public;
grant execute on function public.safecheck_billing_touch_updated_at() to service_role;

 drop trigger if exists safecheck_billing_subscriptions_touch on public.safecheck_billing_subscriptions;
create trigger safecheck_billing_subscriptions_touch
before update on public.safecheck_billing_subscriptions
for each row execute function public.safecheck_billing_touch_updated_at();

 drop trigger if exists safecheck_billing_checkout_touch on public.safecheck_billing_checkout_sessions;
create trigger safecheck_billing_checkout_touch
before update on public.safecheck_billing_checkout_sessions
for each row execute function public.safecheck_billing_touch_updated_at();

-- ---------------------------------------------------------------------------
-- Atomic rate limiter. Only trusted server code may execute it.
-- ---------------------------------------------------------------------------
create or replace function public.safecheck_billing_consume_rate_limit(
  p_scope text,
  p_subject text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := now();
  v_count integer;
begin
  if p_scope is null or p_subject is null or p_limit < 1 or p_window_seconds < 1 then
    return false;
  end if;

  insert into public.safecheck_billing_rate_limits(scope, subject, window_started_at, request_count, updated_at)
  values (p_scope, p_subject, v_now, 1, v_now)
  on conflict (scope, subject) do update
    set window_started_at = case
          when public.safecheck_billing_rate_limits.window_started_at <= v_now - make_interval(secs => p_window_seconds)
          then v_now else public.safecheck_billing_rate_limits.window_started_at end,
        request_count = case
          when public.safecheck_billing_rate_limits.window_started_at <= v_now - make_interval(secs => p_window_seconds)
          then 1 else public.safecheck_billing_rate_limits.request_count + 1 end,
        updated_at = v_now
  returning request_count into v_count;

  return v_count <= p_limit;
end;
$$;

revoke all on function public.safecheck_billing_consume_rate_limit(text,text,integer,integer) from public, anon, authenticated;
grant execute on function public.safecheck_billing_consume_rate_limit(text,text,integer,integer) to service_role;

-- ---------------------------------------------------------------------------
-- Webhook claim/idempotency helper. A unique provider/event pair is claimed
-- once. Duplicate deliveries do not create duplicate state transitions.
-- ---------------------------------------------------------------------------
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
begin
  insert into public.safecheck_billing_webhook_events(
    provider, provider_event_id, event_type, object_type, provider_object_id, payload_sha256
  ) values (
    p_provider, p_provider_event_id, p_event_type, p_object_type, p_provider_object_id, p_payload_sha256
  )
  on conflict (provider, provider_event_id) do nothing
  returning id into v_id;

  if v_id is not null then
    return query select v_id, true;
    return;
  end if;

  select id into v_id
  from public.safecheck_billing_webhook_events
  where provider = p_provider and provider_event_id = p_provider_event_id;

  return query select v_id, false;
end;
$$;

revoke all on function public.safecheck_billing_claim_webhook_event(text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.safecheck_billing_claim_webhook_event(text,text,text,text,text,text) to service_role;

-- ---------------------------------------------------------------------------
-- RLS: customers can read only their own subscription/checkout state.
-- Financial mutation is server-only. Webhook/audit/rate-limit tables are never
-- exposed to normal authenticated clients.
-- ---------------------------------------------------------------------------
alter table public.safecheck_billing_subscriptions enable row level security;
alter table public.safecheck_billing_checkout_sessions enable row level security;
alter table public.safecheck_billing_webhook_events enable row level security;
alter table public.safecheck_billing_audit_log enable row level security;
alter table public.safecheck_billing_rate_limits enable row level security;

revoke all on table public.safecheck_billing_subscriptions from anon, authenticated;
revoke all on table public.safecheck_billing_checkout_sessions from anon, authenticated;
revoke all on table public.safecheck_billing_webhook_events from anon, authenticated;
revoke all on table public.safecheck_billing_audit_log from anon, authenticated;
revoke all on table public.safecheck_billing_rate_limits from anon, authenticated;

grant select on table public.safecheck_billing_subscriptions to authenticated;
grant select on table public.safecheck_billing_checkout_sessions to authenticated;
grant all on table public.safecheck_billing_subscriptions to service_role;
grant all on table public.safecheck_billing_checkout_sessions to service_role;
grant all on table public.safecheck_billing_webhook_events to service_role;
grant all on table public.safecheck_billing_audit_log to service_role;
grant all on table public.safecheck_billing_rate_limits to service_role;

drop policy if exists safecheck_billing_subscriptions_select_own on public.safecheck_billing_subscriptions;
create policy safecheck_billing_subscriptions_select_own
on public.safecheck_billing_subscriptions
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists safecheck_billing_checkout_select_own on public.safecheck_billing_checkout_sessions;
create policy safecheck_billing_checkout_select_own
on public.safecheck_billing_checkout_sessions
for select to authenticated
using ((select auth.uid()) = user_id);

-- No INSERT/UPDATE/DELETE policies for authenticated users by design.
-- service_role is used by trusted billing functions and bypasses RLS.

comment on table public.safecheck_billing_subscriptions is 'Canonical SafeCheck paid subscription state. Server-managed; user can read only own row.';
comment on table public.safecheck_billing_checkout_sessions is 'SafeCheck checkout lifecycle, separated from entitlement state.';
comment on table public.safecheck_billing_webhook_events is 'Idempotent webhook delivery ledger with minimized/sanitized event data.';
comment on table public.safecheck_billing_audit_log is 'Append-only billing state transition audit log; never store card secrets.';
comment on table public.safecheck_billing_rate_limits is 'Atomic billing operation rate limiter for trusted server code.';
