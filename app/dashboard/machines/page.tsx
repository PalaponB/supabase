import type { Metadata } from 'next';
import { AlertCircle, Inbox, Plus, PlugZap } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';
import { formatCount } from '@/lib/dashboard';
import StatusBadge from '@/components/ui/StatusBadge';
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink dark:text-slate-50">
            เครื่องจักรชาร์จ
          </h1>
          <p className="mt-1 text-sm text-ink-muted dark:text-slate-400">
            {canManage
              ? 'คุณมีสิทธิ์เพิ่ม แก้ไข และลบเครื่องจักร'
              : 'บัญชีของคุณดูข้อมูลได้อย่างเดียว'}
          </p>
        </div>
        <p className="text-sm text-ink-subtle dark:text-slate-500">
          {formatCount(machines?.length ?? 0)} เครื่อง
        </p>
      </div>

      {canManage ? (
        <section className="card">
          <header className="card-header">
            <h2 className="card-title">เพิ่มเครื่องจักรใหม่</h2>
            <Plus className="h-4 w-4 text-ink-subtle dark:text-slate-500" aria-hidden="true" />
          </header>
          <div className="p-5">
            <CreateMachineForm />
          </div>
        </section>
      ) : null}

      <section className="card">
        {error ? (
          <p className="alert-error m-5 flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            โหลดข้อมูลไม่สำเร็จ: {error.message}
          </p>
        ) : !machines || machines.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-14 text-center">
            <Inbox className="h-6 w-6 text-ink-subtle dark:text-slate-600" aria-hidden="true" />
            <p className="text-sm text-ink-muted dark:text-slate-400">ยังไม่มีเครื่องจักรในระบบ</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-line bg-surface-muted/60 dark:border-slate-800 dark:bg-slate-800/20">
                <tr>
                  <th scope="col" className="table-head px-5 py-3">รหัส</th>
                  <th scope="col" className="table-head px-5 py-3">ชื่อ</th>
                  <th scope="col" className="table-head px-5 py-3">ประเภท</th>
                  <th scope="col" className="table-head px-5 py-3">สถานที่ตั้ง</th>
                  <th scope="col" className="table-head px-5 py-3">สถานะ</th>
                  {canManage ? <th scope="col" className="table-head px-5 py-3">จัดการ</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-line dark:divide-slate-800">
                {machines.map((machine) => (
                  <tr
                    key={machine.id}
                    className="transition-colors hover:bg-surface-muted/60 dark:hover:bg-slate-800/30"
                  >
                    <td className="whitespace-nowrap px-5 py-3">
                      <code className="rounded bg-surface-sunken px-1.5 py-0.5 font-mono text-xs font-medium text-ink dark:bg-slate-800 dark:text-slate-200">
                        {machine.machine_id}
                      </code>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 font-medium text-ink dark:text-slate-200">
                      {machine.name}
                    </td>
                    <td className="px-5 py-3 text-ink-muted dark:text-slate-400">{machine.type}</td>
                    <td className="px-5 py-3 text-ink-muted dark:text-slate-400">
                      {machine.location ?? '-'}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3">
                      <StatusBadge status={machine.status} />
                    </td>
                    {canManage ? (
                      <td className="px-5 py-3">
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
          </div>
        )}
      </section>

      {!canManage ? (
        <p className="flex items-center gap-1.5 text-xs text-ink-subtle dark:text-slate-500">
          <PlugZap className="h-3.5 w-3.5" aria-hidden="true" />
          การเพิ่ม แก้ไข และลบเครื่องจักรสงวนไว้สำหรับผู้ดูแลระบบ
        </p>
      ) : null}
    </div>
  );
}
