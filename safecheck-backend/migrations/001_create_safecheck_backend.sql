-- SafeCheck AI / Detector de Golpes backend schema
-- Applied to Supabase project pwlblezbjnumlmqevcgu on 2026-09-09.

create extension if not exists pgcrypto;

create table if not exists public.safecheck_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.safecheck_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  input_type text not null check (input_type in ('message','url','pix','offer','profile','image','pdf','other')),
  input_preview text,
  input_hash text,
  score integer not null check (score between 0 and 100),
  risk_level text not null check (risk_level in ('very_low','low','moderate','high','critical')),
  summary text not null,
  reasons jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  signals jsonb not null default '{}'::jsonb,
  source_file_name text,
  engine_version text not null default 'safecheck-server-2.0',
  created_at timestamptz not null default now()
);

create index if not exists safecheck_analyses_user_created_idx
  on public.safecheck_analyses (user_id, created_at desc);

alter table public.safecheck_profiles enable row level security;
alter table public.safecheck_analyses enable row level security;

revoke all on table public.safecheck_profiles from anon;
revoke all on table public.safecheck_analyses from anon;
grant select, insert, update, delete on table public.safecheck_profiles to authenticated;
grant select, insert, delete on table public.safecheck_analyses to authenticated;

drop policy if exists "safecheck_profiles_select_own" on public.safecheck_profiles;
create policy "safecheck_profiles_select_own" on public.safecheck_profiles
for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "safecheck_profiles_insert_own" on public.safecheck_profiles;
create policy "safecheck_profiles_insert_own" on public.safecheck_profiles
for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "safecheck_profiles_update_own" on public.safecheck_profiles;
create policy "safecheck_profiles_update_own" on public.safecheck_profiles
for update to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "safecheck_profiles_delete_own" on public.safecheck_profiles;
create policy "safecheck_profiles_delete_own" on public.safecheck_profiles
for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "safecheck_analyses_select_own" on public.safecheck_analyses;
create policy "safecheck_analyses_select_own" on public.safecheck_analyses
for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "safecheck_analyses_insert_own" on public.safecheck_analyses;
create policy "safecheck_analyses_insert_own" on public.safecheck_analyses
for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "safecheck_analyses_delete_own" on public.safecheck_analyses;
create policy "safecheck_analyses_delete_own" on public.safecheck_analyses
for delete to authenticated using ((select auth.uid()) = user_id);

create or replace function public.safecheck_touch_profile()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.safecheck_touch_profile() from public;
grant execute on function public.safecheck_touch_profile() to authenticated;

drop trigger if exists safecheck_profiles_touch_updated_at on public.safecheck_profiles;
create trigger safecheck_profiles_touch_updated_at
before update on public.safecheck_profiles
for each row execute function public.safecheck_touch_profile();
