'use client';

import { useState, useTransition } from 'react';
import { useFormState } from 'react-dom';
import { Loader2, Save, Trash2, X } from 'lucide-react';
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

  // Only alarms belonging to the selected machine are offered, so the composite
  // foreign key (alarm_id, machine_id) can never be violated by the pairing.
  const matchingAlarms = openAlarms.filter((alarm) => alarm.machineId === selectedMachine);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <select
        name="machine_id"
        required
        value={selectedMachine}
        onChange={(event) => setSelectedMachine(event.target.value)}
        className="field lg:col-span-2"
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

      <select name="alarm_id" defaultValue="" className="field">
        <option value="">ไม่ผูกกับ Alarm</option>
        {matchingAlarms.map((alarm) => (
          <option key={alarm.id} value={alarm.id}>
            {alarm.label}
          </option>
        ))}
      </select>

      <input name="action_taken" placeholder="รายละเอียดงานที่ดำเนินการ" className="field" required />
      <select name="status" defaultValue="In Progress" className="field">
        {MAINTENANCE_STATUSES.map((status) => (
          <option key={status} value={status}>
            {MAINTENANCE_STATUS_LABEL[status]}
          </option>
        ))}
      </select>
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Save className="h-4 w-4" aria-hidden="true" />
        )}
        บันทึกงาน
      </button>

      {state.error ? (
        <p role="alert" className="alert-error sm:col-span-2 lg:col-span-5">
          {state.error}
        </p>
      ) : null}
      {state.ok ? <p className="alert-ok sm:col-span-2 lg:col-span-5">{state.ok}</p> : null}

      <p className="text-xs text-ink-subtle sm:col-span-2 lg:col-span-5 dark:text-slate-500">
        ช่อง Alarm จะแสดงเฉพาะ Alarm ที่เปิดอยู่ของเครื่องจักรที่เลือก
      </p>
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
  const [state, formAction, pending] = useFormState(
    async (prev: State, formData: FormData) => {
      const result = await saveMaintenance(prev, formData);
      if (result.ok) onDone();
      return result;
    },
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-1.5">
      <input type="hidden" name="record_id" value={recordId} />
      <input
        name="action_taken"
        defaultValue={actionTaken}
        required
        aria-label="รายละเอียดงาน"
        className="field w-40 py-1.5 text-xs"
      />
      <select
        name="status"
        defaultValue={status}
        aria-label="สถานะงาน"
        className="field w-auto py-1.5 text-xs"
      >
        {MAINTENANCE_STATUSES.map((value) => (
          <option key={value} value={value}>
            {MAINTENANCE_STATUS_LABEL[value]}
          </option>
        ))}
      </select>
      <button type="submit" className="btn btn-sm" disabled={pending}>
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Save className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        บันทึก
      </button>
      <button type="button" className="btn btn-sm" onClick={onDone} disabled={pending}>
        <X className="h-3.5 w-3.5" aria-hidden="true" />
        ยกเลิก
      </button>

      {state.error ? <span className="w-full text-xs text-red-600 dark:text-red-400">{state.error}</span> : null}
    </form>
  );
}

export function DeleteMaintenanceButton({ recordId }: { recordId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<State>(initialState);

  return (
    <button
      type="button"
      className="btn btn-sm btn-danger"
      disabled={pending}
      onClick={() => {
        if (window.confirm('ยืนยันการลบรายการงานซ่อมบำรุงนี้หรือไม่?')) {
          startTransition(async () => {
            setMessage(await deleteMaintenance(recordId));
          });
        }
      }}
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      ลบ
      {message.error ? (
        <span role="status" className="ml-1 text-xs">
          {message.error}
        </span>
      ) : null}
    </button>
  );
}
