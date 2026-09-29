import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/format';

export const metadata: Metadata = { title: 'ภาพรวม' };

export default async function DashboardPage() {
  const { role } = await requireUser();
  const supabase = createClient();

  // One round trip for the counts, one for the recent alarms. The counts use
  // head requests so Postgres skips shipping rows back.
  const [machineCount, alarmCount, openAlarmCount, maintenanceCount, recentAlarms] =
    await Promise.all([
      supabase.from('machines').select('*', { count: 'exact', head: true }),
      supabase.from('alarms').select('*', { count: 'exact', head: true }),
      supabase
        .from('alarms')
        .select('*', { count: 'exact', head: true })
        .in('status', ['Open', 'In Progress']),
      supabase.from('maintenance_records').select('*', { count: 'exact', head: true }),
      supabase
        .from('alarms')
        .select('id, alarm_code, description, status, created_at, machines(machine_id, name)')
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

  const faultCount = await supabase
    .from('machines')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Fault');

  const stats = [
    { label: 'เครื่องจักรทั้งหมด', value: machineCount.count ?? 0, to: '/dashboard/machines' },
    { label: 'Alarms ทั้งหมด', value: alarmCount.count ?? 0, to: '/dashboard/alarms' },
    {
      label: 'Alarms ที่ยังค้างอยู่',
      value: openAlarmCount.count ?? 0,
      to: '/dashboard/alarms',
    },
    { label: 'เครื่องจักรที่มีความผิดปกติ', value: faultCount.count ?? 0, to: '/dashboard/machines' },
    {
      label: 'งานซ่อมบำรุง',
      value: maintenanceCount.count ?? 0,
      to: '/dashboard/maintenance',
    },
  ];

  const canSeeTeam = can(role, 'manageRoles');

  return (
    <>
      <div className="page-head">
        <div>
          <h1>ภาพรวมระบบ</h1>
          <p className="muted">สถานะเครื่องจักรชาร์จและงานซ่อมบำรุงล่าสุด</p>
        </div>
      </div>

      {role === 'Viewer' ? (
        <p className="notice">
          บัญชีของคุณเป็น <strong>Viewer</strong> จึงดูข้อมูลได้อย่างเดียว ปุ่มแก้ไขจะไม่แสดง
        </p>
      ) : null}

      <section className="stat-grid">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.to} className="stat">
            <p className="label">{stat.label}</p>
            <p className="value">{stat.value}</p>
          </Link>
        ))}
      </section>

      <section className="panel">
        <h2>Alarms ล่าสุด</h2>
        {recentAlarms.error ? (
          <p className="error">โหลดข้อมูลไม่สำเร็จ: {recentAlarms.error.message}</p>
        ) : recentAlarms.data.length === 0 ? (
          <p className="empty">ยังไม่มีรายการ Alarm</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>รหัส</th>
                <th>เครื่องจักร</th>
                <th>รายละเอียด</th>
                <th>สถานะ</th>
                <th>เวลา</th>
              </tr>
            </thead>
            <tbody>
              {recentAlarms.data.map((alarm) => {
                const machine = Array.isArray(alarm.machines)
                  ? alarm.machines[0]
                  : alarm.machines;

                return (
                  <tr key={alarm.id}>
                    <td>
                      <code>{alarm.alarm_code}</code>
                    </td>
                    <td>{machine?.name ?? '-'}</td>
                    <td>{alarm.description}</td>
                    <td>
                      <span className={`status ${alarm.status.toLowerCase().replace(/\s+/g, '-')}`}>
                        {alarm.status}
                      </span>
                    </td>
                    <td className="muted">{formatDateTime(alarm.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {canSeeTeam ? null : (
        <p className="muted">
          หน้า <Link href="/dashboard/team">สมาชิก</Link> เปิดให้เฉพาะผู้ดูแลระบบ
        </p>
      )}
    </>
  );
}
