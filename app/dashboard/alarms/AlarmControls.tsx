'use client';

import { useState, useTransition } from 'react';
import { useFormState } from 'react-dom';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { createAlarm, deleteAlarm, setAlarmStatus } from './actions';
import { ALARM_STATUSES, ALARM_STATUS_LABEL } from '@/lib/constants';
import type { AlarmStatus } from '@/lib/supabase/types';

type State = { error: string | null; ok: string | null };
const initialState: State = { error: null, ok: null };

/** Admin only. */
export function CreateAlarmForm({
  machines,
}: {
  machines: { id: string; machine_id: string; name: string }[];
}) {
  const [state, formAction, pending] = useFormState(createAlarm, initialState);

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
    >
      <select name="machine_id" required defaultValue="" className="field lg:col-span-2">
        <option value="" disabled>
          เลือกเครื่องจักร
        </option>
        {machines.map((machine) => (
          <option key={machine.id} value={machine.id}>
            {machine.machine_id} — {machine.name}
          </option>
        ))}
      </select>
      <input name="alarm_code" placeholder="รหัส เช่น ERR-CABLE-01" className="field" required />
      <input name="description" placeholder="รายละเอียด" className="field" required />
      <input name="cause" placeholder="สาเหตุ" className="field" />
      <select name="status" defaultValue="Open" className="field">
        {ALARM_STATUSES.map((status) => (
          <option key={status} value={status}>
            {ALARM_STATUS_LABEL[status]}
          </option>
        ))}
      </select>
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Plus className="h-4 w-4" aria-hidden="true" />
        )}
        เปิด Alarm
      </button>

      {state.error ? (
        <p role="alert" className="alert-error sm:col-span-2 lg:col-span-5">
          {state.error}
        </p>
      ) : null}
      {state.ok ? <p className="alert-ok sm:col-span-2 lg:col-span-5">{state.ok}</p> : null}
    </form>
  );
}

/**
 * Admin and Technician. The status select is the main Technician action. When
 * canDelete is false the delete button is not rendered at all.
 */
export function AlarmRowActions({
  alarmId,
  alarmCode,
  currentStatus,
  canDelete,
}: {
  alarmId: string;
  alarmCode: string;
  currentStatus: AlarmStatus;
  canDelete: boolean;
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
        defaultValue={currentStatus}
        disabled={pending}
        aria-label={`สถานะของ ${alarmCode}`}
        className="field w-auto py-1.5 text-xs"
        onChange={(event) => {
          const next = event.target.value as AlarmStatus;
          void run(() => setAlarmStatus(alarmId, next));
        }}
      >
        {ALARM_STATUSES.map((status) => (
          <option key={status} value={status}>
            {ALARM_STATUS_LABEL[status]}
          </option>
        ))}
      </select>

      {canDelete ? (
        <button
          type="button"
          className="btn btn-sm btn-danger"
          disabled={pending}
          onClick={() => {
            if (window.confirm(`ยืนยันการลบ Alarm ${alarmCode} หรือไม่?`)) {
              void run(() => deleteAlarm(alarmId));
            }
          }}
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          ลบ
        </button>
      ) : null}

      <span role="status" aria-live="polite" className="text-xs">
        {pending ? <span className="text-ink-subtle dark:text-slate-500">กำลังบันทึก...</span> : null}
        {message.error ? <span className="text-red-600 dark:text-red-400">{message.error}</span> : null}
        {message.ok ? <span className="text-emerald-600 dark:text-emerald-400">{message.ok}</span> : null}
      </span>
    </div>
  );
}
