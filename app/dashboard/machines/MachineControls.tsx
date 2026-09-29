'use client';

import { useState, useTransition } from 'react';
import { useFormState } from 'react-dom';
import { createMachine, deleteMachine, setMachineStatus } from './actions';
import { MACHINE_STATUSES, MACHINE_STATUS_LABEL } from '@/lib/constants';
import type { MachineStatus } from '@/lib/supabase/types';

type State = { error: string | null; ok: string | null };
const initialState: State = { error: null, ok: null };

/** Admin only: the create form is only rendered when the role check passes. */
export function CreateMachineForm() {
  const [state, formAction, pending] = useFormState(createMachine, initialState);

  return (
    <form action={formAction} className="row-form">
      <input name="machine_id" placeholder="รหัสเครื่องจักร" required />
      <input name="name" placeholder="ชื่อเครื่องจักร" required />
      <input name="type" placeholder="ประเภท เช่น DC Fast Charger 150kW" required />
      <input name="location" placeholder="สถานที่ตั้ง" />
      <select name="status" defaultValue="Available">
        {MACHINE_STATUSES.map((status) => (
          <option key={status} value={status}>
            {MACHINE_STATUS_LABEL[status]}
          </option>
        ))}
      </select>
      <button type="submit" className="small" disabled={pending}>
        {pending ? 'กำลังเพิ่ม...' : 'เพิ่มเครื่องจักร'}
      </button>

      {state.error ? (
        <p role="alert" className="error">
          {state.error}
        </p>
      ) : null}
      {state.ok ? <p className="ok">{state.ok}</p> : null}
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
    <div className="row-form">
      <select
        name="status"
        defaultValue={currentStatus}
        disabled={pending}
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
        className="small danger"
        disabled={pending}
        onClick={() => {
          const confirmed = window.confirm(
            `ยืนยันการลบ ${machineLabel} หรือไม่?\nการลบถาวร และงานซ่อมบำรุงของเครื่องนี้จะหายไปด้วย`,
          );
          if (confirmed) void run(() => deleteMachine(machineId));
        }}
      >
        {pending ? 'กำลังทำงาน...' : 'ลบ'}
      </button>

      {message.error ? (
        <p role="alert" className="error">
          {message.error}
        </p>
      ) : null}
      {message.ok ? <p className="ok">{message.ok}</p> : null}
    </div>
  );
}
