import type { Metadata } from 'next';
import { requireRole } from '@/lib/auth';
import { ROLE_DESCRIPTION, ROLE_LABEL } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/format';
import { RoleSelect } from './RoleSelect';

export const metadata: Metadata = { title: 'สมาชิก' };

export default async function TeamPage() {
  // Only an Admin may open this page. Technicians and Viewers are redirected
  // to /unauthorized before any data is read.
  const { user } = await requireRole(['Admin']);
  const supabase = createClient();

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, created_at')
    .order('role', { ascending: true });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>สมาชิกและสิทธิ์การเข้าถึง</h1>
          <p className="muted">เฉพาะผู้ดูแลระบบจึงเปลี่ยนบทบาทได้</p>
        </div>
        <span className="muted">{profiles?.length ?? 0} คน</span>
      </div>

      <section className="panel">
        <h2>สิทธิ์ของแต่ละบทบาท</h2>
        <table>
          <thead>
            <tr>
              <th>บทบาท</th>
              <th>ความสามารถ</th>
            </tr>
          </thead>
          <tbody>
            {(['Admin', 'Technician', 'Viewer'] as const).map((role) => (
              <tr key={role}>
                <td>
                  <span className={`badge ${role.toLowerCase()}`}>{role}</span>{' '}
                  {ROLE_LABEL[role]}
                </td>
                <td className="muted">{ROLE_DESCRIPTION[role]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2>รายชื่อสมาชิก</h2>
        {error ? (
          <p className="error">โหลดข้อมูลไม่สำเร็จ: {error.message}</p>
        ) : !profiles || profiles.length === 0 ? (
          <p className="empty">ยังไม่มีสมาชิกในระบบ</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ชื่อ</th>
                <th>บทบาท</th>
                <th>สมัครเมื่อ</th>
                <th>เปลี่ยนบทบาท</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => (
                <tr key={profile.id}>
                  <td>{profile.full_name?.trim() || 'ไม่ระบุชื่อ'}</td>
                  <td>
                    <span className={`badge ${profile.role.toLowerCase()}`}>
                      {profile.role}
                    </span>
                  </td>
                  <td className="muted">{formatDateTime(profile.created_at)}</td>
                  <td>
                    <RoleSelect
                      userId={profile.id}
                      currentRole={profile.role}
                      isSelf={profile.id === user.id}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
