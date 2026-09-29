'use client';

import { useState, useTransition } from 'react';
import { useFormState } from 'react-dom';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { createMachine, deleteMachine, setMachineStatus } from './actions';
import { MACHINE_STATUSES, MACHINE_STATUS_LABEL } from '@/lib/constants';
import type { MachineStatus } from '@/lib/supabase/types';

type State = { error: string | null; ok: string | null };
const initialState: State = { error: null, ok: null };

/** Admin only: the form is only rendered once the role check passes. */
export function CreateMachineForm() {
  const [state, formAction, pending] = useFormState(createMachine, initialState);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
      <input name="machine_id" placeholder="รหัสเครื่องจักร" className="field" required />
      <input name="name" placeholder="ชื่อเครื่องจักร" className="field" required />
      <input name="type" placeholder="ประเภท เช่น DC Fast 150kW" className="field" required />
      <input name="location" placeholder="สถานที่ตั้ง" className="field" />
      <select name="status" defaultValue="Available" className="field">
        {MACHINE_STATUSES.map((status) => (
          <option key={status} value={status}>
            {MACHINE_STATUS_LABEL[status]}
          </option>
        ))}
      </select>
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Plus className="h-4 w-4" aria-hidden="true" />
        )}
        เพิ่มเครื่องจักร
      </button>

      {state.error ? (
        <p role="alert" className="alert-error sm:col-span-2 lg:col-span-6">
          {state.error}
        </p>
      ) : null}
      {state.ok ? <p className="alert-ok sm:col-span-2 lg:col-span-6">{state.ok}</p> : null}
    </form>
  );
}

/** Admin only: status change and delete for a single machine row. */
export function MachineRowActions({
  machineId,
  machineLabel,
  currentStatus,
}: {
  machineId: string;
  machineLabel: string;
  currentStatus: MachineStatus;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<State>(initialState);

  const run = (action: () => Promise<State>) => {
    startTransition(async () => {
      setMessage(await action());
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        name="status"
        defaultValue={currentStatus}
        disabled={pending}
        aria-label={`เปลี่ยนสถานะ ${machineLabel}`}
        className="field w-auto py-1.5 text-xs"
        onChange={(event) => {
          const next = event.target.value as MachineStatus;
          void run(() => setMachineStatus(machineId, next));
        }}
      >
        {MACHINE_STATUSES.map((status) => (
          <option key={status} value={status}>
            {MACHINE_STATUS_LABEL[status]}
          </option>
        ))}
      </select>

      <button
        type="button"
        className="btn btn-sm btn-danger"
        disabled={pending}
        onClick={() => {
          const confirmed = window.confirm(
            `ยืนยันการลบ ${machineLabel} หรือไม่?\nการลบถาวร และงานซ่อมบำรุงของเครื่องนี้จะหายไปด้วย`,
          );
          if (confirmed) void run(() => deleteMachine(machineId));
        }}
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        ลบ
      </button>

      {/* aria-live so the outcome of the select is announced to screen readers
          instead of only appearing visually. */}
      <span role="status" aria-live="polite" className="text-xs">
        {pending ? <span className="text-ink-subtle dark:text-slate-500">กำลังบันทึก...</span> : null}
        {message.error ? <span className="text-red-600 dark:text-red-400">{message.error}</span> : null}
        {message.ok ? (
          <span className="text-emerald-600 dark:text-emerald-400">{message.ok}</span>
        ) : null}
      </span>
    </div>
  );
}
