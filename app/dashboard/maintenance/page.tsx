import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime, maintenanceStatusClass } from '@/lib/format';
import { MAINTENANCE_STATUS_LABEL } from '@/lib/constants';
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

  // The form filters alarms by the selected machine, so each option carries
  // its machine_id.
  const openAlarmOptions = alarms.map((a) => ({
    id: a.id,
    label: a.alarm_code,
    machineId: a.machine_id,
  }));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>งานซ่อมบำรุง</h1>
          <p className="muted">
            {canManage
              ? isAdmin
                ? 'คุณจัดการงานซ่อมบำรุงได้ทั้งหมด'
                : 'คุณสามารถบันทึกและแก้ไขเฉพาะงานของตัวเอง'
              : 'บัญชีของคุณดูข้อมูลได้อย่างเดียว'}
          </p>
        </div>
        <span className="muted">{records.length} รายการ</span>
      </div>

      {canManage ? (
        <section className="panel">
          <h2>บันทึกงานซ่อมบำรุง</h2>
          <CreateMaintenanceForm machines={machineOptions} openAlarms={openAlarmOptions} />
          <p className="muted" style={{ marginTop: '0.75rem' }}>
            ช่อง Alarm จะแสดงเฉพาะ Alarm ที่เปิดอยู่ของเครื่องจักรที่เลือก
          </p>
        </section>
      ) : null}

      <section className="panel">
        {recordsResult.error ? (
          <p className="error">โหลดข้อมูลไม่สำเร็จ: {recordsResult.error.message}</p>
        ) : records.length === 0 ? (
          <p className="empty">ยังไม่มีรายการงานซ่อมบำรุง</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>เครื่องจักร</th>
                <th>ผู้ดำเนินการ</th>
                <th>รายละเอียดงาน</th>
                <th>สถานะ</th>
                <th>เวลา</th>
                {canManage || canDelete ? <th>จัดการ</th> : null}
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const machine = Array.isArray(record.machines)
                  ? record.machines[0]
                  : record.machines;
                // Admin may edit any row, a Technician only their own. The same
                // rule is enforced by maintenance_records_update in 02_rls.sql.
                const canEditRow = isAdmin || record.technician_id === user.id;

                return (
                  <tr key={record.id}>
                    <td>{machine?.name ?? machine?.machine_id ?? '-'}</td>
                    <td className="muted">{technicianName(record.technician_id)}</td>
                    <td>{record.action_taken}</td>
                    <td>
                      <span className={maintenanceStatusClass(record.status)}>
                        {MAINTENANCE_STATUS_LABEL[record.status]}
                      </span>
                    </td>
                    <td className="muted">{formatDateTime(record.created_at)}</td>
                    {canManage || canDelete ? (
                      <td>
                        <div className="row-form">
                          {canEditRow ? (
                            <EditableRow
                              recordId={record.id}
                              actionTaken={record.action_taken}
                              status={record.status}
                            />
                          ) : (
                            <span className="muted">แก้ไขไม่ได้</span>
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
        )}
      </section>
    </>
  );
}
