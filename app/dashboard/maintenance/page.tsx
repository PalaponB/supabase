import type { Metadata } from 'next';
import { AlertCircle, Inbox, Wrench } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';
import { formatCount } from '@/lib/dashboard';
import { formatDateTime } from '@/lib/format';
import StatusBadge from '@/components/ui/StatusBadge';
import {
  CreateMaintenanceForm,
  DeleteMaintenanceButton,
} from './MaintenanceControls';
import { EditableRow } from './EditableRow';

export const metadata: Metadata = { title: 'งานซ่อมบำรุง' };

export default async function MaintenancePage() {
  const { user, role } = await requireUser();
  const canManage = can(role, 'manageMaintenance');
  const canDelete = can(role, 'deleteMaintenance');
  const isAdmin = role === 'Admin';

  const supabase = createClient();
  const [recordsResult, machinesResult, alarmsResult, profilesResult] = await Promise.all([
    supabase
      .from('maintenance_records')
      .select(
        'id, alarm_id, machine_id, technician_id, action_taken, status, created_at, machines(machine_id, name)',
      )
      .order('created_at', { ascending: false }),
    supabase.from('machines').select('id, machine_id, name').order('machine_id'),
    supabase
      .from('alarms')
      .select('id, machine_id, alarm_code')
      .in('status', ['Open', 'In Progress']),
    supabase.from('profiles').select('id, full_name').order('full_name'),
  ]);

  const records = recordsResult.data ?? [];
  const machines = machinesResult.data ?? [];
  const alarms = alarmsResult.data ?? [];
  const profiles = profilesResult.data ?? [];

  const technicianName = (id: string | null) => {
    if (!id) return '-';
    return profiles.find((p) => p.id === id)?.full_name ?? 'ไม่ทราบชื่อ';
  };

  const machineOptions = machines.map((m) => ({
    id: m.id,
    label: `${m.machine_id} — ${m.name}`,
  }));

  // Each option carries its machine_id so the client form can filter the alarm
  // list down to the selected machine.
  const openAlarmOptions = alarms.map((a) => ({
    id: a.id,
    label: a.alarm_code,
    machineId: a.machine_id,
  }));

  const pendingCount = records.filter((r) => r.status !== 'Completed').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink dark:text-slate-50">
            งานซ่อมบำรุง
          </h1>
          <p className="mt-1 text-sm text-ink-muted dark:text-slate-400">
            {canManage
              ? isAdmin
                ? 'คุณจัดการงานซ่อมบำรุงได้ทั้งหมด'
                : 'คุณสามารถบันทึกและแก้ไขเฉพาะงานของตัวเอง'
              : 'บัญชีของคุณดูข้อมูลได้อย่างเดียว'}
          </p>
        </div>
        <p className="text-sm text-ink-subtle dark:text-slate-500">
          {formatCount(records.length)} รายการ · ค้างอยู่ {formatCount(pendingCount)}
        </p>
      </div>

      {canManage ? (
        <section className="card">
          <header className="card-header">
            <h2 className="card-title">บันทึกงานซ่อมบำรุง</h2>
            <Wrench className="h-4 w-4 text-ink-subtle dark:text-slate-500" aria-hidden="true" />
          </header>
          <div className="p-5">
            <CreateMaintenanceForm machines={machineOptions} openAlarms={openAlarmOptions} />
          </div>
        </section>
      ) : null}

      <section className="card">
        {recordsResult.error ? (
          <p className="alert-error m-5 flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            โหลดข้อมูลไม่สำเร็จ: {recordsResult.error.message}
          </p>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-14 text-center">
            <Inbox className="h-6 w-6 text-ink-subtle dark:text-slate-600" aria-hidden="true" />
            <p className="text-sm text-ink-muted dark:text-slate-400">ยังไม่มีรายการงานซ่อมบำรุง</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead className="border-b border-line bg-surface-muted/60 dark:border-slate-800 dark:bg-slate-800/20">
                <tr>
                  <th scope="col" className="table-head px-5 py-3">เครื่องจักร</th>
                  <th scope="col" className="table-head px-5 py-3">ผู้ดำเนินการ</th>
                  <th scope="col" className="table-head px-5 py-3">รายละเอียดงาน</th>
                  <th scope="col" className="table-head px-5 py-3">สถานะ</th>
                  <th scope="col" className="table-head px-5 py-3">เวลา</th>
                  {canManage || canDelete ? (
                    <th scope="col" className="table-head px-5 py-3">จัดการ</th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-line dark:divide-slate-800">
                {records.map((record) => {
                  const machine = Array.isArray(record.machines)
                    ? record.machines[0]
                    : record.machines;
                  // Admin may edit any row, a Technician only their own. The same
                  // rule is enforced by maintenance_records_update in 02_rls.sql.
                  const canEditRow = isAdmin || record.technician_id === user.id;

                  return (
                    <tr
                      key={record.id}
                      className="transition-colors hover:bg-surface-muted/60 dark:hover:bg-slate-800/30"
                    >
                      <td className="whitespace-nowrap px-5 py-3 font-medium text-ink dark:text-slate-200">
                        {machine?.name ?? machine?.machine_id ?? '-'}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-ink-muted dark:text-slate-400">
                        {technicianName(record.technician_id)}
                      </td>
                      <td className="px-5 py-3 text-ink-muted dark:text-slate-400">
                        <span className="line-clamp-1">{record.action_taken}</span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <StatusBadge status={record.status} />
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-xs tabular-nums text-ink-subtle dark:text-slate-500">
                        {formatDateTime(record.created_at)}
                      </td>
                      {canManage || canDelete ? (
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap items-start gap-2">
                            {canEditRow ? (
                              <EditableRow
                                recordId={record.id}
                                actionTaken={record.action_taken}
                                status={record.status}
                              />
                            ) : (
                              <span className="text-xs text-ink-subtle dark:text-slate-500">
                                แก้ไขไม่ได้
                              </span>
                            )}
                            {canDelete ? <DeleteMaintenanceButton recordId={record.id} /> : null}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
