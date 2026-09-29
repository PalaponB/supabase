'use client';

import { useState, useTransition } from 'react';
import { useFormState } from 'react-dom';
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
    <form action={formAction} className="row-form">
      <select name="machine_id" required defaultValue="">
        <option value="" disabled>
          เลือกเครื่องจักร
        </option>
        {machines.map((machine) => (
          <option key={machine.id} value={machine.id}>
            {machine.machine_id} — {machine.name}
          </option>
        ))}
      </select>
      <input name="alarm_code" placeholder="รหัส เช่น ERR-CABLE-01" required />
      <input name="description" placeholder="รายละเอียด" required />
      <input name="cause" placeholder="สาเหตุ" />
      <select name="status" defaultValue="Open">
        {ALARM_STATUSES.map((status) => (
          <option key={status} value={status}>
            {ALARM_STATUS_LABEL[status]}
          </option>
        ))}
      </select>
      <button type="submit" className="small" disabled={pending}>
        {pending ? 'กำลังเพิ่ม...' : 'เปิด Alarm'}
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

/**
 * Admin and Technician. The status select is the main Technician action.
 * When canDelete is false the delete button is not rendered at all.
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
    <div className="row-form">
      <select
        defaultValue={currentStatus}
        disabled={pending}
        aria-label={`สถานะของ ${alarmCode}`}
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
          className="small danger"
          disabled={pending}
          onClick={() => {
            if (window.confirm(`ยืนยันการลบ Alarm ${alarmCode} หรือไม่?`)) {
              void run(() => deleteAlarm(alarmId));
            }
          }}
        >
          ลบ
        </button>
      ) : null}

      {message.error ? (
        <p role="alert" className="error">
          {message.error}
        </p>
      ) : null}
      {message.ok ? <p className="ok">{message.ok}</p> : null}
    </div>
  );
}
