import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';
import { machineStatusClass } from '@/lib/format';
import { CreateMachineForm, MachineRowActions } from './MachineControls';

export const metadata: Metadata = { title: 'เครื่องจักร' };

export default async function MachinesPage() {
  const { role } = await requireUser();
  const canManage = can(role, 'manageMachines');

  const supabase = createClient();
  const { data: machines, error } = await supabase
    .from('machines')
    .select('id, machine_id, name, type, location, status, updated_at')
    .order('machine_id', { ascending: true });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>เครื่องจักรชาร์จ</h1>
          <p className="muted">
            {canManage
              ? 'คุณมีสิทธิ์เพิ่ม แก้ไข และลบเครื่องจักร'
              : 'บัญชีของคุณดูข้อมูลได้อย่างเดียว'}
          </p>
        </div>
        <span className="muted">{machines?.length ?? 0} เครื่อง</span>
      </div>

      {canManage ? (
        <section className="panel">
          <h2>เพิ่มเครื่องจักรใหม่</h2>
          <CreateMachineForm />
        </section>
      ) : null}

      <section className="panel">
        {error ? (
          <p className="error">โหลดข้อมูลไม่สำเร็จ: {error.message}</p>
        ) : !machines || machines.length === 0 ? (
          <p className="empty">ยังไม่มีเครื่องจักรในระบบ</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>รหัส</th>
                <th>ชื่อ</th>
                <th>ประเภท</th>
                <th>สถานที่ตั้ง</th>
                <th>สถานะ</th>
                {canManage ? <th>จัดการ</th> : null}
              </tr>
            </thead>
            <tbody>
              {machines.map((machine) => (
                <tr key={machine.id}>
                  <td>
                    <code>{machine.machine_id}</code>
                  </td>
                  <td>{machine.name}</td>
                  <td className="muted">{machine.type}</td>
                  <td className="muted">{machine.location ?? '-'}</td>
                  <td>
                    <span className={machineStatusClass(machine.status)}>
                      {machine.status}
                    </span>
                  </td>
                  {canManage ? (
                    <td>
                      <MachineRowActions
                        machineId={machine.id}
                        machineLabel={machine.machine_id}
                        currentStatus={machine.status}
                      />
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
