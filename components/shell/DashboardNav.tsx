'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, PlugZap, Siren, Wrench, Users } from 'lucide-react';

export type NavItem = { href: string; label: string };

/**
 * Client nav so the active link can be derived from the current pathname.
 *
 * Exact match for /dashboard, prefix match for the rest, so /dashboard/alarms
 * does not leave both the parent and the child link highlighted. The labels are
 * supplied by the server layout, which already filtered out links the current
 * role may not open.
 */
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  '/dashboard': LayoutDashboard,
  '/dashboard/machines': PlugZap,
  '/dashboard/alarms': Siren,
  '/dashboard/maintenance': Wrench,
  '/dashboard/team': Users,
};

export default function DashboardNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="order-3 -mx-1 w-full overflow-x-auto md:order-none md:mx-0 md:w-auto md:flex-1">
      <ul className="flex items-center gap-1 px-1">
        {items.map((item) => {
          const active =
            item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = ICONS[item.href] ?? PlugZap;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`nav-link whitespace-nowrap ${
                  active ? 'nav-link-active' : ''
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
