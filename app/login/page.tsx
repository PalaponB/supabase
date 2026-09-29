import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = {
  title: 'เข้าสู่ระบบ | EV-ChargeOps',
  description: 'ระบบจัดการเครื่องจักรชาร์จไฟฟ้าและงานซ่อมบำรุง',
};

type SearchParams = { next?: string };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // Already signed in: skip the form. middleware also redirects, this is the
  // second layer that keeps the page correct when it is rendered directly.
  const user = await getUser();
  if (user) redirect('/dashboard');

  const next = searchParams.next?.startsWith('/') ? searchParams.next : '/dashboard';

  return (
    <main className="centered">
      <div className="login-wrap">
        <header>
          <h1>EV-ChargeOps</h1>
          <p className="muted">ระบบจัดการเครื่องจักรชาร์จและงานซ่อมบำรุง</p>
        </header>

        <LoginForm next={next} />

        <section className="hint">
          <h2>บัญชีทดลองใช้งาน</h2>
          <p className="muted">รหัสผ่านเดียวกันทั้งหมด: Password123!</p>
          <ul>
            <li>
              <code>admin@evchargeops.co.th</code> — ผู้ดูแลระบบ
            </li>
            <li>
              <code>tech1@evchargeops.co.th</code> — ช่างซ่อมบำรุง
            </li>
            <li>
              <code>tech2@evchargeops.co.th</code> — ช่างซ่อมบำรุง
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
