'use client';

import { useState } from 'react';
import type { MaintenanceStatus } from '@/lib/supabase/types';
import { EditMaintenanceForm } from './MaintenanceControls';

/**
 * Expands into the inline edit form on demand, so the table stays compact.
 * The parent only renders this for the row owner and for Admin, matching the
 * maintenance_records_update policy.
 */
export function EditableRow({
  recordId,
  actionTaken,
  status,
}: {
  recordId: string;
  actionTaken: string;
  status: MaintenanceStatus;
}) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <button type="button" className="small" onClick={() => setEditing(true)}>
        แก้ไข
      </button>
    );
  }

  return (
    <EditMaintenanceForm
      recordId={recordId}
      actionTaken={actionTaken}
      status={status}
      onDone={() => setEditing(false)}
    />
  );
}
