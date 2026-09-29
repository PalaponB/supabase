import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';
import { alarmStatusClass, formatDateTime } from '@/lib/format';
import { ALARM_STATUS_LABEL } from '@/lib/constants';
import { AlarmRowActions, CreateAlarmForm } from './AlarmControls';

export const metadata: Metadata = { title: 'Alarms' };

export default async function AlarmsPage() {
  const { role } = await requireUser();
  const canManage = can(role, 'manageAlarms');
  const canDelete = can(role, 'deleteAlarms');
  const canCreate = can(role, 'deleteAlarms');

  const supabase = createClient();
  const [alarmsResult, machinesResult] = await Promise.all([
    supabase
      .from('alarms')
      .select('id, alarm_code, description, cause, status, created_at, machine_id, machines(machine_id, name)')
      .order('created_at', { ascending: false }),
    supabase.from('machines').select('id, machine_id, name').order('machine_id'),
  ]);

  const alarms = alarmsResult.data;
  const machines = machinesResult.data ?? [];

  const openCount = alarms?.filter((a) => a.status === 'Open').length ?? 0;
  const inProgressCount = alarms?.filter((a) => a.status === 'In Progress').length ?? 0;
  const closedCount = alarms?.filter((a) => a.status === 'Closed').length ?? 0;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>รายการ Alarm</h1>
          <p className="muted">
            {canManage
              ? 'คุณสามารถอัปเดตสถานะได้'
              : 'บัญชีของคุณดูข้อมูลได้อย่างเดียว'}
          </p>
        </div>
        <span className="muted">
          เปิด {openCount} · กำลังทำ {inProgressCount} · ปิดแล้ว {closedCount}
        </span>
      </div>

      {canCreate ? (
        <section className="panel">
          <h2>เปิด Alarm ใหม่</h2>
          <CreateAlarmForm machines={machines} />
        </section>
      ) : null}

      <section className="panel">
        {alarmsResult.error ? (
          <p className="error">โหลดข้อมูลไม่สำเร็จ: {alarmsResult.error.message}</p>
        ) : !alarms || alarms.length === 0 ? (
          <p className="empty">ยังไม่มีรายการ Alarm</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>รหัส</th>
                <th>เครื่องจักร</th>
                <th>รายละเอียด</th>
                <th>สาเหตุ</th>
                <th>สถานะ</th>
                <th>เวลา</th>
                {canManage ? <th>จัดการ</th> : null}
              </tr>
            </thead>
            <tbody>
              {alarms.map((alarm) => {
                const machine = Array.isArray(alarm.machines)
                  ? alarm.machines[0]
                  : alarm.machines;

                return (
                  <tr key={alarm.id}>
                    <td>
                      <code>{alarm.alarm_code}</code>
                    </td>
                    <td>{machine?.name ?? machine?.machine_id ?? '-'}</td>
                    <td>{alarm.description}</td>
                    <td className="muted">{alarm.cause ?? '-'}</td>
                    <td>
                      <span className={alarmStatusClass(alarm.status)}>
                        {ALARM_STATUS_LABEL[alarm.status]}
                      </span>
                    </td>
                    <td className="muted">{formatDateTime(alarm.created_at)}</td>
                    {canManage ? (
                      <td>
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
        )}
      </section>
    </>
  );
}
