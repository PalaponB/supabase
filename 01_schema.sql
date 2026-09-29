-- =============================================================================
-- EV-ChargeOps : EV Charging Fleet Alarm & Maintenance Management System
-- Target       : Supabase (PostgreSQL 15+)
-- Install order : 1) 01_schema.sql  2) 02_rls.sql  3) 03_seed.sql
-- =============================================================================

-- Run each file separately in Supabase Dashboard > SQL Editor > New query

-- =============================================================================
-- 01. EXTENSIONS
-- =============================================================================
create extension if not exists pgcrypto with schema extensions;

-- =============================================================================
-- 02. TRIGGER HELPER
-- =============================================================================

-- Auto-update updated_at on every UPDATE
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- =============================================================================
-- 03. TABLES
-- =============================================================================

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  role        text not null default 'Viewer',
  created_at  timestamptz not null default now(),
  constraint profiles_role_check check (role in ('Admin', 'Technician', 'Viewer'))
);

create table if not exists public.machines (
  id          uuid primary key default gen_random_uuid(),
  machine_id  text not null,
  name        text not null,
  type        text not null,
  location    text,
  status      text not null default 'Available',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint machines_machine_id_key unique (machine_id),
  constraint machines_status_check
    check (status in ('Available', 'Charging', 'Fault', 'Under Service'))
);

create table if not exists public.alarms (
  id          uuid primary key default gen_random_uuid(),
  machine_id  uuid not null,
  alarm_code  text not null,
  description text not null,
  cause       text,
  status      text not null default 'Open',
  -- Peak telemetry captured when the alarm fired, for the AI analyzer. All three
  -- are nullable because older rows predate the columns and because a station
  -- may not report every channel. The analyzer treats a missing reading as
  -- unknown rather than as zero, so leaving one blank is safe.
  voltage_peak     numeric(7, 2),
  temperature_peak numeric(6, 2),
  current_peak     numeric(7, 2),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint alarms_status_check
    check (status in ('Open', 'In Progress', 'Closed')),
  -- Generous bounds that still catch a misplaced decimal point or a sensor
  -- reporting millivolts. 1500 V covers a 1000 V DC bus plus headroom;
  -- 250 C is past the point where a power module is already damaged.
  constraint alarms_voltage_peak_check
    check (voltage_peak is null or (voltage_peak >= 0 and voltage_peak <= 1500)),
  constraint alarms_temperature_peak_check
    check (temperature_peak is null or (temperature_peak >= -50 and temperature_peak <= 250)),
  constraint alarms_current_peak_check
    check (current_peak is null or (current_peak >= 0 and current_peak <= 1000)),
  constraint alarms_machine_id_fkey
    foreign key (machine_id) references public.machines (id) on delete cascade,
  -- supports the composite FK below, keeping maintenance_records consistent
  constraint alarms_id_machine_id_key unique (id, machine_id)
);

create table if not exists public.maintenance_records (
  id            uuid primary key default gen_random_uuid(),
  alarm_id      uuid,
  machine_id    uuid not null,
  technician_id uuid references public.profiles (id) on delete set null,
  action_taken  text not null,
  status        text not null default 'In Progress',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint maintenance_records_status_check
    check (status in ('In Progress', 'Completed', 'Waiting Part')),
  -- composite FK: NULL alarm_id skips the check (MATCH SIMPLE), so a log may
  -- exist for a machine without an alarm, but never against a mismatched one
  constraint maintenance_records_alarm_fkey
    foreign key (alarm_id, machine_id)
    references public.alarms (id, machine_id) on delete restrict,
  constraint maintenance_records_machine_id_fkey
    foreign key (machine_id) references public.machines (id) on delete cascade
);

-- =============================================================================
-- 04. AUTH + ROLE HELPERS
-- =============================================================================

-- Automatically create a profile row whenever a user signs up via Supabase Auth.
-- Note: first-ever account becomes 'Admin', all later accounts default to
-- 'Viewer'. Role can never be self-assigned from user metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    case when not exists (select 1 from public.profiles) then 'Admin' else 'Viewer' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Resolve the role of the caller without triggering RLS recursion on profiles.
create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role from public.profiles p where p.id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'Admin', false);
$$;

-- Admin + Technician are "staff": read/write on operational tables.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() in ('Admin', 'Technician'), false);
$$;

-- =============================================================================
-- 05. TRIGGERS (updated_at)
-- =============================================================================
do $$
declare
  t text;
begin
  foreach t in array array['machines', 'alarms', 'maintenance_records'] loop
    execute format('drop trigger if exists trg_set_updated_at on public.%I', t);
    execute format(
      'create trigger trg_set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t);
  end loop;
end;
$$;

-- =============================================================================
