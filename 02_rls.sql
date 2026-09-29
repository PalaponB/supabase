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

-- machines: read = any signed-in user, write = admin only
--
-- The fleet inventory is configuration, not operational state. A Technician
-- reports faults and works on them; they do not rename stations or change what
-- hardware is installed, so machine writes are admin only. This matches
-- manageMachines in lib/permissions.ts, and a Technician crafting a request
-- cannot get past the policy.
drop policy if exists machines_select on public.machines;
create policy machines_select on public.machines
  for select to authenticated
  using (true);

drop policy if exists machines_insert on public.machines;
create policy machines_insert on public.machines
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists machines_update on public.machines;
create policy machines_update on public.machines
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists machines_delete on public.machines;
create policy machines_delete on public.machines
  for delete to authenticated
  using (public.is_admin());

-- alarms: read = any signed-in user, open = admin, advance state = staff, delete = admin
drop policy if exists alarms_select on public.alarms;
create policy alarms_select on public.alarms
  for select to authenticated
  using (true);

-- Raising an alarm is an administrative judgement call, so it is admin only.
-- Technicians work the queue (alarms_update) rather than adding to it.
drop policy if exists alarms_insert on public.alarms;
create policy alarms_insert on public.alarms
  for insert to authenticated
  with check (public.is_admin());

-- RLS cannot restrict which columns are written, so this policy is what makes
-- setAlarmStatus possible for a Technician. The full record editor is admin only
-- in the application layer (editAlarmDetails); the residual risk is that a
-- Technician with a crafted request could also rewrite description or cause.
-- Tightening that needs a column-scoped trigger, which is out of scope here.
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
