import type { Metadata } from 'next';
import { AlertCircle, Inbox, Plus, Siren } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';
import { formatCount } from '@/lib/dashboard';
import { formatDateTime } from '@/lib/format';
import StatusBadge from '@/components/ui/StatusBadge';
import { AlarmRowActions, CreateAlarmForm } from './AlarmControls';

export const metadata: Metadata = { title: 'Alarms' };

export default async function AlarmsPage() {
  const { role } = await requireUser();
  const canManage = can(role, 'manageAlarms');
  const canDelete = can(role, 'deleteAlarms');
  // Creating an alarm rewrites history, so it stays Admin-only even though
  // Technicians may move an existing alarm through its states.
  const canCreate = can(role, 'deleteAlarms');

  const supabase = createClient();
  const [alarmsResult, machinesResult] = await Promise.all([
    supabase
      .from('alarms')
      .select(
        'id, alarm_code, description, cause, status, created_at, machine_id, machines(machine_id, name)',
      )
      .order('created_at', { ascending: false }),
    supabase.from('machines').select('id, machine_id, name').order('machine_id'),
  ]);

  const alarms = alarmsResult.data;
  const machines = machinesResult.data ?? [];

  const openCount = alarms?.filter((a) => a.status === 'Open').length ?? 0;
  const inProgressCount = alarms?.filter((a) => a.status === 'In Progress').length ?? 0;
  const closedCount = alarms?.filter((a) => a.status === 'Closed').length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink dark:text-slate-50">
            รายการ Alarm
          </h1>
          <p className="mt-1 text-sm text-ink-muted dark:text-slate-400">
            {canManage ? 'คุณสามารถอัปเดตสถานะได้' : 'บัญชีของคุณดูข้อมูลได้อย่างเดียว'}
          </p>
        </div>
        <p className="text-sm text-ink-subtle dark:text-slate-500">
          เปิด {formatCount(openCount)} · กำลังทำ {formatCount(inProgressCount)} · ปิดแล้ว{' '}
          {formatCount(closedCount)}
        </p>
      </div>

      {canCreate ? (
        <section className="card">
          <header className="card-header">
            <h2 className="card-title">เปิด Alarm ใหม่</h2>
            <Plus className="h-4 w-4 text-ink-subtle dark:text-slate-500" aria-hidden="true" />
          </header>
          <div className="p-5">
            <CreateAlarmForm machines={machines} />
          </div>
        </section>
      ) : null}

      <section className="card">
        {alarmsResult.error ? (
          <p className="alert-error m-5 flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            โหลดข้อมูลไม่สำเร็จ: {alarmsResult.error.message}
          </p>
        ) : !alarms || alarms.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-14 text-center">
            <Inbox className="h-6 w-6 text-ink-subtle dark:text-slate-600" aria-hidden="true" />
            <p className="text-sm text-ink-muted dark:text-slate-400">ยังไม่มีรายการ Alarm</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b border-line bg-surface-muted/60 dark:border-slate-800 dark:bg-slate-800/20">
                <tr>
                  <th scope="col" className="table-head px-5 py-3">รหัส</th>
                  <th scope="col" className="table-head px-5 py-3">เครื่องจักร</th>
                  <th scope="col" className="table-head px-5 py-3">รายละเอียด</th>
                  <th scope="col" className="table-head px-5 py-3">สาเหตุ</th>
                  <th scope="col" className="table-head px-5 py-3">สถานะ</th>
                  <th scope="col" className="table-head px-5 py-3">เวลา</th>
                  {canManage ? <th scope="col" className="table-head px-5 py-3">จัดการ</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-line dark:divide-slate-800">
                {alarms.map((alarm) => {
                  const machine = Array.isArray(alarm.machines)
                    ? alarm.machines[0]
                    : alarm.machines;

                  return (
                    <tr
                      key={alarm.id}
                      className="transition-colors hover:bg-surface-muted/60 dark:hover:bg-slate-800/30"
                    >
                      <td className="whitespace-nowrap px-5 py-3">
                        <code className="rounded bg-surface-sunken px-1.5 py-0.5 font-mono text-xs font-medium text-ink dark:bg-slate-800 dark:text-slate-200">
                          {alarm.alarm_code}
                        </code>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 font-medium text-ink dark:text-slate-200">
                        {machine?.name ?? machine?.machine_id ?? '-'}
                      </td>
                      <td className="px-5 py-3 text-ink-muted dark:text-slate-400">
                        <span className="line-clamp-1">{alarm.description}</span>
                      </td>
                      <td className="px-5 py-3 text-ink-muted dark:text-slate-400">
                        <span className="line-clamp-1">{alarm.cause ?? '-'}</span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <StatusBadge status={alarm.status} />
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-xs tabular-nums text-ink-subtle dark:text-slate-500">
                        {formatDateTime(alarm.created_at)}
                      </td>
                      {canManage ? (
                        <td className="px-5 py-3">
                          <AlarmRowActions
                            alarmId={alarm.id}
                            alarmCode={alarm.alarm_code}
                            currentStatus={alarm.status}
                            canDelete={canDelete}
                          />
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

      {!canDelete ? (
        <p className="flex items-center gap-1.5 text-xs text-ink-subtle dark:text-slate-500">
          <Siren className="h-3.5 w-3.5" aria-hidden="true" />
          การเปิดและลบ Alarm สงวนไว้สำหรับผู้ดูแลระบบ คุณสามารถอัปเดตสถานะได้เท่านั้น
        </p>
      ) : null}
    </div>
  );
}
