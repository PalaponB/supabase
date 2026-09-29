import { redirect } from 'next/navigation';
import { getAuthContext } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';
import LogoutButton from '@/components/LogoutButton';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'ภาพรวม' },
  { href: '/dashboard/machines', label: 'เครื่องจักร' },
  { href: '/dashboard/alarms', label: 'Alarms' },
  { href: '/dashboard/maintenance', label: 'งานซ่อมบำรุง' },
  { href: '/dashboard/team', label: 'สมาชิก' },
] as const;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Every page under /dashboard is behind this guard, so no child component
  // needs to repeat the check. middleware already redirected anonymous users.
  const context = await getAuthContext();
  if (!context) redirect('/login');

  const supabase = createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', context.user.id)
    .single();

  const role = profile?.role ?? context.role;
  const displayName = profile?.full_name?.trim() || context.user.email || 'ผู้ใช้งาน';

  return (
    <div className="app-shell">
      <header className="topbar">
        <span className="brand">EV-ChargeOps</span>

        <nav className="nav">
          {NAV_ITEMS.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="user-chip">
          <span className={`badge ${role.toLowerCase()}`}>{role}</span>
          <span className="muted">{displayName}</span>
          {can(role, 'manageRoles') ? null : <span className="muted">โหมดดูข้อมูล</span>}
          <LogoutButton />
        </div>
      </header>

      <main className="content">{children}</main>
    </div>
  );
}
