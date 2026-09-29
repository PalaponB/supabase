import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PlugZap, Eye } from 'lucide-react';
import { getAuthContext } from '@/lib/auth';
import { can, ROLE_LABEL } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';
import LogoutButton from '@/components/LogoutButton';
import AppNav, { type NavItem } from './AppNav';
import ThemeToggle from '@/components/theme/ThemeToggle';

/**
 * The authenticated application chrome: header, navigation and page frame.
 *
 * Lives in its own component rather than in a layout file because the routes it
 * wraps are split across two segments (/dashboard plus the top level master data
 * pages). A route group layout would work too, but keeping the markup here means
 * the navigation and the guard stay in one place if the URL layout changes again.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'ภาพรวม' },
  { href: '/machines', label: 'เครื่องจักร' },
  { href: '/alarms', label: 'Alarms' },
  { href: '/maintenance', label: 'งานซ่อมบำรุง' },
  { href: '/dashboard/team', label: 'สมาชิก' },
];

const ROLE_BADGE: Record<string, string> = {
  Admin: 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300',
  Technician: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
  Viewer: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const context = await getAuthContext();
  if (!context) {
    // The guard runs before any child renders, so a signed out visitor never
    // receives protected markup. middleware already bounced them; the session
    // can also expire between the two hops, so this is not redundant.
    redirect('/login');
  }

  const supabase = createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', context.user.id)
    .single();

  const role = profile?.role ?? context.role;
  const displayName = profile?.full_name?.trim() || context.user.email || 'ผู้ใช้งาน';
  const readOnly = !can(role, 'manageMachines') && !can(role, 'manageMaintenance');

  // The Team link is hidden for non-Admins rather than shown-and-rejected, so
  // the navigation matches what the page will actually allow. The RLS policy
  // remains the real gate.
  const items = NAV_ITEMS.filter(
    (item) => item.href !== '/dashboard/team' || can(role, 'manageRoles'),
  );

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur dark:border-slate-800 dark:bg-[#0b0f16]/85">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white dark:bg-brand-500 dark:text-brand-950">
              <PlugZap className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold tracking-tight text-ink dark:text-slate-50">
              EV-ChargeOps
            </span>
          </Link>

          <AppNav items={items} />

          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <span className="hidden text-right text-xs leading-tight sm:block">
              <span className="block font-medium text-ink dark:text-slate-200">{displayName}</span>
              <span className="block text-ink-subtle dark:text-slate-500">{ROLE_LABEL[role]}</span>
            </span>

            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                ROLE_BADGE[role] ?? ROLE_BADGE.Viewer
              }`}
            >
              {role}
            </span>

            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>

        {readOnly ? (
          <p className="border-t border-line bg-surface-muted px-4 py-1.5 text-center text-xs text-ink-subtle sm:px-6 dark:border-slate-800 dark:bg-slate-800/20 dark:text-slate-500">
            <Eye className="mr-1 inline h-3 w-3" aria-hidden="true" />
            โหมดดูข้อมูลอย่างเดียว — ปุ่มแก้ไขจะไม่แสดง
          </p>
        ) : null}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">{children}</main>
    </div>
  );
}
