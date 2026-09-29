'use client';

import { useState, useTransition } from 'react';
import { useFormState } from 'react-dom';
import { deleteMaintenance, saveMaintenance } from './actions';
import { MAINTENANCE_STATUSES, MAINTENANCE_STATUS_LABEL } from '@/lib/constants';
import type { MaintenanceStatus } from '@/lib/supabase/types';

type State = { error: string | null; ok: string | null };
const initialState: State = { error: null, ok: null };

type Option = { id: string; label: string };
type AlarmOption = { id: string; label: string; machineId: string };

export function CreateMaintenanceForm({
  machines,
  openAlarms,
}: {
  machines: Option[];
  openAlarms: AlarmOption[];
}) {
  const [state, formAction, pending] = useFormState(saveMaintenance, initialState);
  const [selectedMachine, setSelectedMachine] = useState('');

  // Only offer alarms that belong to the selected machine, so the composite
  // foreign key (alarm_id, machine_id) can never be violated.
  const matchingAlarms = openAlarms.filter((alarm) => alarm.machineId === selectedMachine);

  return (
    <form action={formAction} className="row-form">
      <select
        name="machine_id"
        required
        value={selectedMachine}
        onChange={(event) => setSelectedMachine(event.target.value)}
      >
        <option value="" disabled>
          เลือกเครื่องจักร
        </option>
        {machines.map((machine) => (
          <option key={machine.id} value={machine.id}>
            {machine.label}
          </option>
        ))}
      </select>

      <select name="alarm_id" defaultValue="">
        <option value="">ไม่ผูกกับ Alarm</option>
        {matchingAlarms.map((alarm) => (
          <option key={alarm.id} value={alarm.id}>
            {alarm.label}
          </option>
        ))}
      </select>

      <input name="action_taken" placeholder="รายละเอียดงานที่ดำเนินการ" required />
      <select name="status" defaultValue="In Progress">
        {MAINTENANCE_STATUSES.map((status) => (
          <option key={status} value={status}>
            {MAINTENANCE_STATUS_LABEL[status]}
          </option>
        ))}
      </select>
      <button type="submit" className="small" disabled={pending}>
        {pending ? 'กำลังบันทึก...' : 'บันทึกงาน'}
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

/** Inline edit. Only the row owner and Admin see this. */
export function EditMaintenanceForm({
  recordId,
  actionTaken,
  status,
  onDone,
}: {
  recordId: string;
  actionTaken: string;
  status: MaintenanceStatus;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useFormState(async (prev: State, formData: FormData) => {
    const result = await saveMaintenance(prev, formData);
    if (result.ok) onDone();
    return result;
  }, initialState);

  return (
    <form action={formAction} className="row-form">
      <input type="hidden" name="record_id" value={recordId} />
      <input name="action_taken" defaultValue={actionTaken} required />
      <select name="status" defaultValue={status}>
        {MAINTENANCE_STATUSES.map((value) => (
          <option key={value} value={value}>
            {MAINTENANCE_STATUS_LABEL[value]}
          </option>
        ))}
      </select>
      <button type="submit" className="small" disabled={pending}>
        {pending ? 'กำลังบันทึก...' : 'บันทึก'}
      </button>
      <button type="button" className="small" onClick={onDone} disabled={pending}>
        ยกเลิก
      </button>

      {state.error ? (
        <p role="alert" className="error">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

export function DeleteMaintenanceButton({ recordId }: { recordId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<State>(initialState);

  return (
    <div className="row-form">
      <button
        type="button"
        className="small danger"
        disabled={pending}
        onClick={() => {
          if (window.confirm('ยืนยันการลบรายการงานซ่อมบำรุงนี้หรือไม่?')) {
            startTransition(async () => {
              setMessage(await deleteMaintenance(recordId));
            });
          }
        }}
      >
        ลบ
      </button>
      {message.error ? (
        <p role="alert" className="error">
          {message.error}
        </p>
      ) : null}
    </div>
  );
}
