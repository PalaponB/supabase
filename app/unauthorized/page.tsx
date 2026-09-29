import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { ROLE_DESCRIPTION, ROLE_LABEL } from '@/lib/permissions';
import LogoutButton from '@/components/LogoutButton';

export const metadata: Metadata = { title: 'ไม่มีสิทธิ์เข้าถึง' };

const ROLE_SUGGESTION = {
  Admin: 'คุณสามารถจัดการทุกส่วนได้อยู่แล้ว หากพบว่าเมนูบางส่วนไม่แสดง ให้ลองออกจากระบบแล้วเข้าใหม่',
  Technician: 'หน้านี้ต้องการสิทธิ์ของช่างซ่อมบำรุงหรือผู้ดูแลระบบ หากคุณเป็นช่างซ่อมบำรุงแล้วยังเข้าไม่ได้ ให้แจ้งผู้ดูแลระบบตรวจสอบบทบาทในหน้า profiles',
  Viewer: 'บัญชีของคุณมีสิทธิ์ดูข้อมูลอย่างเดียว การแก้ไขข้อมูลต้องเป็นช่างซ่อมบำรุงหรือผู้ดูแลระบบ',
} as const;

export default async function UnauthorizedPage() {
  const context = await requireUser();

  return (
    <main className="centered">
      <div className="login-wrap">
        <header>
          <h1>ไม่มีสิทธิ์เข้าถึงหน้านี้</h1>
          <p className="muted">
            คุณเข้าสู่ระบบแล้ว แต่บทบาทของคุณไม่อนุญาตให้เปิดหน้านี้
          </p>
        </header>

        <section className="panel">
          <p>
            บทบาทของคุณคือ <strong>{ROLE_LABEL[context.role]}</strong> ({context.role})
          </p>
          <p className="muted">{ROLE_DESCRIPTION[context.role]}</p>
          <p className="muted">{ROLE_SUGGESTION[context.role]}</p>
        </section>

        <div className="row-form">
          <a href="/dashboard">กลับไปหน้าแดชบอร์ด</a>
          <LogoutButton />
        </div>
      </div>
    </main>
  );
}
