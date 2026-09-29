-- =============================================================================
-- EV-ChargeOps : EV Charging Fleet Alarm and Maintenance Management System
-- Target: Supabase (PostgreSQL 15+).
--
-- Run one file per query tab, in this order:
--   01_schema.sql      tables, helper functions, triggers, indexes
--   02_rls.sql         grants and 15 row level security policies
--   03a_users.sql      3 auth users and roles
--   03b1_machines.sql  6 charger units
--   03b2_alarms.sql    5 alarm records
--   03b3_logs.sql      3 maintenance logs plus a count check
--
-- Seeded logins, password for all three: Password123!
--   admin@evchargeops.co.th    Admin
--   tech1@evchargeops.co.th    Technician
--   tech2@evchargeops.co.th    Technician
--
-- Every text literal in 03a, 03b1, 03b2 and 03b3 uses dollar quoting, so
-- those files contain zero single quotes. The SQL editor inserts a stray
-- quote when pasting, and inside a string that broke into the keyword into
-- and turned the next word into a relation reference. Dollar quoting makes
-- the seed files immune to that. Each SQL statement sits on one line.
--
-- Files are ASCII only and safe to re-run: inserts are idempotent.
-- Add Thai wording later from Table Editor or the REST API, not by paste.
-- =============================================================================
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
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint alarms_status_check
    check (status in ('Open', 'In Progress', 'Closed')),
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

-- =============================================================================
-- EV-ChargeOps : EV Charging Fleet Alarm & Maintenance Management System
-- Target       : Supabase (PostgreSQL 15+)
-- Install order : 1) 01_schema.sql  2) 02_rls.sql  3) 03_seed.sql
-- =============================================================================

-- Run each file separately in Supabase Dashboard > SQL Editor > New query

-- =============================================================================
-- 06. INDEXES
-- =============================================================================
create index if not exists idx_machines_status       on public.machines (status);
create index if not exists idx_alarms_machine        on public.alarms (machine_id);
create index if not exists idx_alarms_status         on public.alarms (status);
create index if not exists idx_alarms_created_at     on public.alarms (created_at desc);
create index if not exists idx_alarms_machine_status on public.alarms (machine_id, status);
create index if not exists idx_maint_alarm           on public.maintenance_records (alarm_id);
create index if not exists idx_maint_machine         on public.maintenance_records (machine_id);
create index if not exists idx_maint_technician      on public.maintenance_records (technician_id);
create index if not exists idx_maint_status          on public.maintenance_records (status);

-- =============================================================================
-- 07. ROW LEVEL SECURITY
-- =============================================================================
alter table public.profiles           enable row level security;
alter table public.machines           enable row level security;
alter table public.alarms             enable row level security;
alter table public.maintenance_records enable row level security;

revoke all on public.profiles            from anon;
revoke all on public.machines            from anon;
revoke all on public.alarms              from anon;
revoke all on public.maintenance_records from anon;

grant select, insert, update, delete on public.profiles            to authenticated;
grant select, insert, update, delete on public.machines            to authenticated;
grant select, insert, update, delete on public.alarms              to authenticated;
grant select, insert, update, delete on public.maintenance_records to authenticated;

grant usage on schema public to authenticated;
grant execute on function public.current_role() to authenticated;
grant execute on function public.is_admin()     to authenticated;
grant execute on function public.is_staff()     to authenticated;

-- profiles: rows are created only by the auth trigger, never by clients
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (true);

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles
  for delete to authenticated
  using (public.is_admin());

-- machines: read = any signed-in user, write = staff
drop policy if exists machines_select on public.machines;
create policy machines_select on public.machines
  for select to authenticated
  using (true);

drop policy if exists machines_insert on public.machines;
create policy machines_insert on public.machines
  for insert to authenticated
  with check (public.is_staff());

drop policy if exists machines_update on public.machines;
create policy machines_update on public.machines
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists machines_delete on public.machines;
create policy machines_delete on public.machines
  for delete to authenticated
  using (public.is_admin());

-- alarms: read = any signed-in user, write = staff, delete = admin
drop policy if exists alarms_select on public.alarms;
create policy alarms_select on public.alarms
  for select to authenticated
  using (true);

drop policy if exists alarms_insert on public.alarms;
create policy alarms_insert on public.alarms
  for insert to authenticated
  with check (public.is_staff());

drop policy if exists alarms_update on public.alarms;
create policy alarms_update on public.alarms
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists alarms_delete on public.alarms;
create policy alarms_delete on public.alarms
  for delete to authenticated
  using (public.is_admin());

-- maintenance_records: admin writes anything, technician writes own rows only
drop policy if exists maintenance_records_select on public.maintenance_records;
create policy maintenance_records_select on public.maintenance_records
  for select to authenticated
  using (true);

drop policy if exists maintenance_records_insert on public.maintenance_records;
create policy maintenance_records_insert on public.maintenance_records
  for insert to authenticated
  with check (public.is_staff());

drop policy if exists maintenance_records_update on public.maintenance_records;
create policy maintenance_records_update on public.maintenance_records
  for update to authenticated
  using (public.is_admin() or technician_id = auth.uid())
  with check (public.is_admin() or technician_id = auth.uid());

drop policy if exists maintenance_records_delete on public.maintenance_records;
create policy maintenance_records_delete on public.maintenance_records
  for delete to authenticated
  using (public.is_admin());

-- =============================================================================

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) select $$11111111-1111-4111-8111-111111111111$$::uuid, $$authenticated$$, $$authenticated$$, $$admin@evchargeops.co.th$$, extensions.crypt($$Password123!$$, extensions.gen_salt($$bf$$)), now(), $${"provider":"email","providers":["email"]}$$::jsonb, $${"full_name":"Natthawut Srisuwan"}$$::jsonb, now(), now() on conflict (id) do nothing;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) select $$22222222-2222-4222-8222-222222222222$$::uuid, $$authenticated$$, $$authenticated$$, $$tech1@evchargeops.co.th$$, extensions.crypt($$Password123!$$, extensions.gen_salt($$bf$$)), now(), $${"provider":"email","providers":["email"]}$$::jsonb, $${"full_name":"Somchai Jaidee"}$$::jsonb, now(), now() on conflict (id) do nothing;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) select $$33333333-3333-4333-8333-333333333333$$::uuid, $$authenticated$$, $$authenticated$$, $$tech2@evchargeops.co.th$$, extensions.crypt($$Password123!$$, extensions.gen_salt($$bf$$)), now(), $${"provider":"email","providers":["email"]}$$::jsonb, $${"full_name":"Piyaporn Wongtong"}$$::jsonb, now(), now() on conflict (id) do nothing;

update public.profiles set role = $$Admin$$ where id = $$11111111-1111-4111-8111-111111111111$$::uuid;

update public.profiles set role = $$Technician$$ where id = $$22222222-2222-4222-8222-222222222222$$::uuid;

update public.profiles set role = $$Technician$$ where id = $$33333333-3333-4333-8333-333333333333$$::uuid;

select count(*) as seeded_users from public.profiles;

insert into public.machines (machine_id, name, type, location, status) values ($$EV-DC-01$$, $$DC Charger Zone A Unit 1$$, $$DC Fast Charger 150kW$$, $$B1 Parking Zone A$$, $$Fault$$), ($$EV-DC-02$$, $$DC Charger Zone A Unit 2$$, $$DC Fast Charger 150kW$$, $$B1 Parking Zone A$$, $$Charging$$), ($$EV-AC-03$$, $$Public AC Charger$$, $$AC Charger 22kW$$, $$Public Lot Level 1$$, $$Available$$), ($$EV-DC-04$$, $$DC Charger Logistics Hub$$, $$DC Fast Charger 60kW$$, $$Ladkrabang DC Hub$$, $$Under Service$$), ($$EV-AC-05$$, $$HQ AC Charger$$, $$AC Charger 22kW$$, $$HQ Ground Floor VIP$$, $$Available$$), ($$EV-DC-06$$, $$Highway DC Station$$, $$DC Fast Charger 350kW$$, $$Chao Phraya Bridge Rest Stop$$, $$Charging$$) on conflict (machine_id) do nothing;

insert into public.alarms (machine_id, alarm_code, description, cause, status, created_at) select id, $$ERR-CABLE-01$$, $$Charging gun fails to lock with the CCS2 connector$$, $$Lock actuator jammed, cable damaged$$, $$Open$$, now() - make_interval(days => 2) from public.machines where machine_id = $$EV-DC-01$$ and not exists (select 1 from public.alarms where alarm_code = $$ERR-CABLE-01$$);

insert into public.alarms (machine_id, alarm_code, description, cause, status, created_at) select id, $$ERR-MODULE-OVERHEAT$$, $$Power module overheated above 85 degrees Celsius$$, $$Module cooling fan failed and cabinet air is too hot$$, $$In Progress$$, now() - make_interval(hours => 30) from public.machines where machine_id = $$EV-DC-01$$ and not exists (select 1 from public.alarms where alarm_code = $$ERR-MODULE-OVERHEAT$$);

insert into public.alarms (machine_id, alarm_code, description, cause, status, created_at) select id, $$ERR-INSULATOR-02$$, $$Insulation resistance below 100 kOhm$$, $$HV insulator set 2 is damaged from moisture$$, $$Open$$, now() - make_interval(days => 3) from public.machines where machine_id = $$EV-DC-04$$ and not exists (select 1 from public.alarms where alarm_code = $$ERR-INSULATOR-02$$);

insert into public.alarms (machine_id, alarm_code, description, cause, status, created_at) select id, $$ERR-COMM-03$$, $$Lost connection to OCPP backend, heartbeat missing 5 min$$, $$Fiber uplink loose at distribution cabinet$$, $$In Progress$$, now() - make_interval(days => 1) from public.machines where machine_id = $$EV-DC-06$$ and not exists (select 1 from public.alarms where alarm_code = $$ERR-COMM-03$$);

insert into public.alarms (machine_id, alarm_code, description, cause, status, created_at) select id, $$ERR-GROUND-FAULT$$, $$Ground fault detected, power cut for safety$$, $$PE ground wire loose at terminal block$$, $$Closed$$, now() - make_interval(days => 5) from public.machines where machine_id = $$EV-AC-03$$ and not exists (select 1 from public.alarms where alarm_code = $$ERR-GROUND-FAULT$$);

insert into public.maintenance_records (alarm_id, machine_id, technician_id, action_taken, status, created_at) select al.id, al.machine_id, p.id, $$Disassembled lock actuator, cleaned rail, re-greased$$, $$In Progress$$, now() - make_interval(days => 1) from public.alarms al, public.profiles p where al.alarm_code = $$ERR-CABLE-01$$ and p.id = $$22222222-2222-4222-8222-222222222222$$::uuid and not exists (select 1 from public.maintenance_records mr where mr.alarm_id = al.id);

insert into public.maintenance_records (alarm_id, machine_id, technician_id, action_taken, status, created_at) select al.id, al.machine_id, p.id, $$Inspection confirmed damaged insulator, awaiting replacement part$$, $$Waiting Part$$, now() - make_interval(days => 2) from public.alarms al, public.profiles p where al.alarm_code = $$ERR-INSULATOR-02$$ and p.id = $$33333333-3333-4333-8333-333333333333$$::uuid and not exists (select 1 from public.maintenance_records mr where mr.alarm_id = al.id);

insert into public.maintenance_records (alarm_id, machine_id, technician_id, action_taken, status, created_at) select al.id, al.machine_id, p.id, $$Replaced fiber uplink, rebooted gateway, link stable$$, $$Completed$$, now() - make_interval(hours => 20) from public.alarms al, public.profiles p where al.alarm_code = $$ERR-COMM-03$$ and p.id = $$22222222-2222-4222-8222-222222222222$$::uuid and not exists (select 1 from public.maintenance_records mr where mr.alarm_id = al.id);

select (select count(*) from public.machines) as machines, (select count(*) from public.alarms) as alarms, (select count(*) from public.maintenance_records) as maintenance_logs, (select count(*) from public.profiles) as profiles;

