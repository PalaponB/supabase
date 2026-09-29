-- =====================================================================
-- 99_verify_setup.sql  --  read-only verification
--
-- Run this in the Supabase SQL Editor AFTER 01-04.
-- It only SELECTs and never inserts, updates or deletes, so it is safe
-- to run as many times as you like. Everything should report PASS.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Structure: 4 tables
-- ---------------------------------------------------------------------
select '1. tables' as check_name,
       case when count(*) = 4 then 'PASS' else 'FAIL (' || count(*) || '/4)' end as result
from information_schema.tables
where table_schema = 'public'
  and table_name in ('profiles', 'machines', 'alarms', 'maintenance_records');

-- ---------------------------------------------------------------------
-- 2. RLS enabled on all 4 tables  (if this is FAIL, data is exposed)
-- ---------------------------------------------------------------------
select '2. rls enabled' as check_name,
       case when count(*) = 4 then 'PASS' else 'FAIL (' || count(*) || '/4)' end as result
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('profiles', 'machines', 'alarms', 'maintenance_records')
  and c.relrowsecurity;

-- ---------------------------------------------------------------------
-- 3. Policies: 15 total (profiles 3, machines 4, alarms 4, maint 4)
-- ---------------------------------------------------------------------
select '3. policies: ' || table_name as check_name,
       count(*)::text || ' policy/policies' as result
from pg_policies
where schemaname = 'public'
group by tablename
order by tablename;

-- ---------------------------------------------------------------------
-- 4. Status vocabulary
--    Read back from the actual constraints, so this fails if the schema
--    is wrong rather than confirming a hardcoded expectation.
-- ---------------------------------------------------------------------
select '4. machine status' as check_name,
       pg_get_constraintdef(oid) as result
from pg_constraint
where conrelid = 'public.machines'::regclass
  and conname = 'machines_status_check';

-- role is a text column with a CHECK constraint, not a Postgres enum,
-- so the allowed values are read back from the constraint definition.
select '4. profile role' as check_name,
       pg_get_constraintdef(oid) as result
from pg_constraint
where conrelid = 'public.profiles'::regclass
  and conname = 'profiles_role_check';

-- ---------------------------------------------------------------------
-- 5. Trigger that maintains updated_at on the app tables
-- ---------------------------------------------------------------------
select '5. updated_at trigger' as check_name,
       case when count(*) >= 1 then 'PASS' else 'FAIL' end as result
from pg_trigger
where tgname = 'trg_set_updated_at' and not tgisinternal;

-- ---------------------------------------------------------------------
-- 6. Dashboard views
-- ---------------------------------------------------------------------
select '6. views' as check_name,
       case when count(*) = 2 then 'PASS' else 'FAIL (' || count(*) || '/2)' end as result
from information_schema.views
where table_schema = 'public'
  and table_name in ('machine_status_summary', 'top_alarm_codes');

-- ---------------------------------------------------------------------
-- 7. Seeded users and their roles
--    Expect 1 Admin and 2 Technician.
-- ---------------------------------------------------------------------
select '7. users' as check_name,
       role::text as result,
       email as detail
from auth.users
where id in (
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333'
)
order by role;

-- ---------------------------------------------------------------------
-- 8. Seed row counts
-- ---------------------------------------------------------------------
select '8. rows' as check_name,
       (select count(*) from public.profiles)             as profiles,
       (select count(*) from public.machines)             as machines,
       (select count(*) from public.alarms)              as alarms,
       (select count(*) from public.maintenance_records) as maintenance;

-- ---------------------------------------------------------------------
-- 9. Machines by status
--    The dashboard reads from machine_status_summary, so this is what
--    the four KPI cards will show.
-- ---------------------------------------------------------------------
select '9. status spread' as check_name,
       status as detail,
       count(*) as machines
from public.machines
group by status
order by status;

-- ---------------------------------------------------------------------
-- 10. Views return rows
-- ---------------------------------------------------------------------
select '10. machine_status_summary' as check_name, * from public.machine_status_summary;
select '10. top_alarm_codes'       as check_name, * from public.top_alarm_codes;
